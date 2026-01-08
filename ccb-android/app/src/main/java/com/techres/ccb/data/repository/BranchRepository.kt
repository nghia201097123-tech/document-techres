package com.techres.ccb.data.repository

import android.content.SharedPreferences
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
                Result.failure(Exception(response.message() ?: "Lỗi kết nối"))
            }
        } catch (e: Exception) {
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
