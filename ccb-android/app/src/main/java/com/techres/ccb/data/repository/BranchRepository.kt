package com.techres.ccb.data.repository

import android.content.SharedPreferences
import android.util.Log
import com.techres.ccb.data.local.dao.BrandDao
import com.techres.ccb.data.local.dao.BranchDao
import com.techres.ccb.data.local.entity.BrandEntity
import com.techres.ccb.data.local.entity.BranchEntity
import com.techres.ccb.data.remote.api.MasterDataApi
import com.techres.ccb.data.remote.dto.BrandDto
import com.techres.ccb.data.remote.dto.BranchDto
import kotlinx.coroutines.flow.Flow
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BranchRepository @Inject constructor(
    private val api: MasterDataApi,
    private val authRepository: AuthRepository,
    private val brandDao: BrandDao,
    private val branchDao: BranchDao,
    private val sharedPreferences: SharedPreferences
) {
    companion object {
        private const val TAG = "BranchRepository"
        private const val KEY_SELECTED_BRAND_ID = "selected_brand_id"
        private const val KEY_SELECTED_BRAND_NAME = "selected_brand_name"
        private const val KEY_SELECTED_BRANCH_ID = "selected_branch_id"
        private const val KEY_SELECTED_BRANCH_NAME = "selected_branch_name"
        private const val KEY_SELECTED_BRANCH_ADDRESS = "selected_branch_address"
    }

    // ============ LOCAL DB OPERATIONS ============

    /**
     * Get all brands from local DB
     */
    fun getAllBrandsLocal(): Flow<List<BrandEntity>> {
        return brandDao.getAllActive()
    }

    /**
     * Get all branches from local DB
     */
    fun getAllBranchesLocal(): Flow<List<BranchEntity>> {
        return branchDao.getAllActive()
    }

    /**
     * Get branches by brand from local DB
     */
    fun getBranchesByBrandLocal(brandId: String): Flow<List<BranchEntity>> {
        return branchDao.getByBrand(brandId)
    }

    /**
     * Get branches by brand (sync version)
     */
    suspend fun getBranchesByBrandSync(brandId: String): List<BranchEntity> {
        return branchDao.getByBrandSync(brandId)
    }

    /**
     * Get brand by ID from local DB
     */
    suspend fun getBrandById(brandId: String): BrandEntity? {
        return brandDao.getById(brandId)
    }

    /**
     * Get branch by ID from local DB
     */
    suspend fun getBranchById(branchId: String): BranchEntity? {
        return branchDao.getById(branchId)
    }

    /**
     * Get count of brands
     */
    suspend fun getBrandsCount(): Int {
        return brandDao.getCount()
    }

    /**
     * Get count of branches
     */
    suspend fun getBranchesCount(): Int {
        return branchDao.getCount()
    }

    // ============ API SYNC OPERATIONS ============

    /**
     * Sync brands and branches from API to local DB
     */
    suspend fun syncBrandsAndBranches(): Result<Int> {
        return try {
            val token = authRepository.getAccessToken()
            Log.d(TAG, "syncBrandsAndBranches - Token: ${token?.take(20)}...")

            if (token == null) {
                Log.e(TAG, "syncBrandsAndBranches - No token available")
                return Result.failure(Exception("Chưa đăng nhập"))
            }

            Log.d(TAG, "syncBrandsAndBranches - Calling API...")
            val response = api.getBrands("Bearer $token")
            Log.d(TAG, "syncBrandsAndBranches - Response code: ${response.code()}")

            if (response.isSuccessful && response.body() != null) {
                val brandsResponse = response.body()!!
                Log.d(TAG, "syncBrandsAndBranches - Success: ${brandsResponse.success}, Data count: ${brandsResponse.data?.size ?: 0}")

                if (brandsResponse.success && brandsResponse.data != null) {
                    val brandDtos = brandsResponse.data
                    val now = Instant.now().toString()

                    // Convert and save brands
                    val brandEntities = brandDtos.map { dto ->
                        BrandEntity(
                            id = dto.id,
                            name = dto.name,
                            code = dto.code,
                            logo = dto.logo,
                            companyId = dto.companyId,
                            companyName = dto.companyName,
                            isActive = dto.isActive,
                            syncedAt = now
                        )
                    }
                    brandDao.syncBrands(brandEntities)
                    Log.d(TAG, "syncBrandsAndBranches - Saved ${brandEntities.size} brands")

                    // Convert and save branches
                    val branchEntities = brandDtos.flatMap { brand ->
                        brand.branches?.map { dto ->
                            BranchEntity(
                                id = dto.id,
                                brandId = dto.brandId,
                                brandName = dto.brandName ?: brand.name,
                                name = dto.name,
                                code = dto.code,
                                address = dto.address,
                                phone = dto.phone,
                                isActive = dto.isActive,
                                syncedAt = now
                            )
                        } ?: emptyList()
                    }
                    branchDao.syncBranches(branchEntities)
                    Log.d(TAG, "syncBrandsAndBranches - Saved ${branchEntities.size} branches")

                    Result.success(brandEntities.size + branchEntities.size)
                } else {
                    val errorMsg = brandsResponse.message ?: "Không thể tải danh sách thương hiệu"
                    Log.e(TAG, "syncBrandsAndBranches - API error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                Log.e(TAG, "syncBrandsAndBranches - HTTP error: ${response.code()} - ${response.message()}")
                Log.e(TAG, "syncBrandsAndBranches - Error body: $errorBody")
                Result.failure(Exception("Lỗi ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "syncBrandsAndBranches - Exception: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Get all brands from API (for backward compatibility)
     */
    suspend fun getBrands(): Result<List<BrandDto>> {
        return try {
            val token = authRepository.getAccessToken()
                ?: return Result.failure(Exception("Chưa đăng nhập"))

            val response = api.getBrands("Bearer $token")
            if (response.isSuccessful && response.body() != null) {
                val brandsResponse = response.body()!!
                if (brandsResponse.success && brandsResponse.data != null) {
                    Result.success(brandsResponse.data)
                } else {
                    Result.failure(Exception(brandsResponse.message ?: "Không thể tải danh sách thương hiệu"))
                }
            } else {
                Result.failure(Exception("Lỗi ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ============ SELECTED BRANCH OPERATIONS ============

    /**
     * Save selected branch info (to SharedPreferences for quick access)
     */
    fun saveSelectedBranch(brandId: String, brandName: String, branchId: String, branchName: String, branchAddress: String?) {
        sharedPreferences.edit().apply {
            putString(KEY_SELECTED_BRAND_ID, brandId)
            putString(KEY_SELECTED_BRAND_NAME, brandName)
            putString(KEY_SELECTED_BRANCH_ID, branchId)
            putString(KEY_SELECTED_BRANCH_NAME, branchName)
            putString(KEY_SELECTED_BRANCH_ADDRESS, branchAddress)
            apply()
        }
        Log.d(TAG, "saveSelectedBranch - Brand: $brandName, Branch: $branchName")
    }

    /**
     * Save selected branch from entities
     */
    fun saveSelectedBranch(brand: BrandEntity, branch: BranchEntity) {
        saveSelectedBranch(
            brandId = brand.id,
            brandName = brand.name,
            branchId = branch.id,
            branchName = branch.name,
            branchAddress = branch.address
        )
    }

    /**
     * Save selected branch from DTOs (backward compatibility)
     */
    fun saveSelectedBranch(brand: BrandDto, branch: BranchDto) {
        saveSelectedBranch(
            brandId = brand.id,
            brandName = brand.name,
            branchId = branch.id,
            branchName = branch.name,
            branchAddress = branch.address
        )
    }

    fun getSelectedBrandId(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRAND_ID, null)
    }

    fun getSelectedBrandName(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRAND_NAME, null)
    }

    fun getSelectedBranchId(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRANCH_ID, null)
    }

    fun getSelectedBranchName(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRANCH_NAME, null)
    }

    fun getSelectedBranchAddress(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRANCH_ADDRESS, null)
    }

    fun hasBranchSelected(): Boolean {
        return getSelectedBranchId() != null
    }

    fun clearSelectedBranch() {
        sharedPreferences.edit().apply {
            remove(KEY_SELECTED_BRAND_ID)
            remove(KEY_SELECTED_BRAND_NAME)
            remove(KEY_SELECTED_BRANCH_ID)
            remove(KEY_SELECTED_BRANCH_NAME)
            remove(KEY_SELECTED_BRANCH_ADDRESS)
            apply()
        }
    }
}
