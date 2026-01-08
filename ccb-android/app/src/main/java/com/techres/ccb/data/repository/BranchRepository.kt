package com.techres.ccb.data.repository

import android.content.SharedPreferences
import android.util.Log
import com.techres.ccb.data.remote.api.MasterDataApi
import com.techres.ccb.data.remote.dto.BrandDto
import com.techres.ccb.data.remote.dto.BranchDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BranchRepository @Inject constructor(
    private val api: MasterDataApi,
    private val authRepository: AuthRepository,
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

    /**
     * Get all brands with their branches
     */
    suspend fun getBrands(): Result<List<BrandDto>> {
        return try {
            val token = authRepository.getAccessToken()
            Log.d(TAG, "getBrands - Token: ${token?.take(20)}...")

            if (token == null) {
                Log.e(TAG, "getBrands - No token available")
                return Result.failure(Exception("Chưa đăng nhập"))
            }

            Log.d(TAG, "getBrands - Calling API...")
            val response = api.getBrands("Bearer $token")
            Log.d(TAG, "getBrands - Response code: ${response.code()}")

            if (response.isSuccessful && response.body() != null) {
                val brandsResponse = response.body()!!
                Log.d(TAG, "getBrands - Success: ${brandsResponse.success}, Data count: ${brandsResponse.data?.size ?: 0}")

                if (brandsResponse.success && brandsResponse.data != null) {
                    Log.d(TAG, "getBrands - Brands loaded: ${brandsResponse.data.map { it.name }}")
                    Result.success(brandsResponse.data)
                } else {
                    val errorMsg = brandsResponse.message ?: "Không thể tải danh sách thương hiệu"
                    Log.e(TAG, "getBrands - API error: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                Log.e(TAG, "getBrands - HTTP error: ${response.code()} - ${response.message()}")
                Log.e(TAG, "getBrands - Error body: $errorBody")
                Result.failure(Exception("Lỗi ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "getBrands - Exception: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Get branches by brand ID
     */
    suspend fun getBranchesByBrand(brandId: String): Result<List<BranchDto>> {
        return try {
            val token = authRepository.getAccessToken()
                ?: return Result.failure(Exception("Chưa đăng nhập"))

            val response = api.getBranchesByBrand("Bearer $token", brandId)
            if (response.isSuccessful && response.body() != null) {
                val branchesResponse = response.body()!!
                if (branchesResponse.success && branchesResponse.data != null) {
                    Result.success(branchesResponse.data)
                } else {
                    Result.failure(Exception(branchesResponse.message ?: "Không thể tải danh sách chi nhánh"))
                }
            } else {
                Result.failure(Exception(response.message() ?: "Lỗi kết nối"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Save selected branch info
     */
    fun saveSelectedBranch(brand: BrandDto, branch: BranchDto) {
        sharedPreferences.edit().apply {
            putString(KEY_SELECTED_BRAND_ID, brand.id)
            putString(KEY_SELECTED_BRAND_NAME, brand.name)
            putString(KEY_SELECTED_BRANCH_ID, branch.id)
            putString(KEY_SELECTED_BRANCH_NAME, branch.name)
            putString(KEY_SELECTED_BRANCH_ADDRESS, branch.address)
            apply()
        }
    }

    /**
     * Get selected brand ID
     */
    fun getSelectedBrandId(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRAND_ID, null)
    }

    /**
     * Get selected brand name
     */
    fun getSelectedBrandName(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRAND_NAME, null)
    }

    /**
     * Get selected branch ID
     */
    fun getSelectedBranchId(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRANCH_ID, null)
    }

    /**
     * Get selected branch name
     */
    fun getSelectedBranchName(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRANCH_NAME, null)
    }

    /**
     * Get selected branch address
     */
    fun getSelectedBranchAddress(): String? {
        return sharedPreferences.getString(KEY_SELECTED_BRANCH_ADDRESS, null)
    }

    /**
     * Check if a branch is selected
     */
    fun hasBranchSelected(): Boolean {
        return getSelectedBranchId() != null
    }

    /**
     * Clear selected branch
     */
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
