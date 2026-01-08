package com.techres.ccb.data.repository

import android.content.SharedPreferences
import com.techres.ccb.data.remote.api.MasterDataApi
import com.techres.ccb.data.remote.dto.LoginRequest
import com.techres.ccb.data.remote.dto.LoginResponse
import com.techres.ccb.data.remote.dto.LoginUserDto
import com.techres.ccb.data.remote.dto.VerifyPinRequest
import com.techres.ccb.data.remote.dto.VerifyPinResponse
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: MasterDataApi,
    private val sharedPreferences: SharedPreferences
) {
    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_TENANT_ID = "tenant_id"
        private const val KEY_BRANCH_ID = "branch_id"
        private const val KEY_BRANCH_NAME = "branch_name"
        private const val KEY_BRAND_ID = "brand_id"
        private const val KEY_BRAND_NAME = "brand_name"
        private const val KEY_COMPANY_ID = "company_id"
        private const val KEY_COMPANY_NAME = "company_name"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_STAFF_ID = "current_staff_id"
        private const val KEY_STAFF_NAME = "current_staff_name"
        private const val KEY_STAFF_CODE = "current_staff_code"
        private const val KEY_STAFF_USERNAME = "current_staff_username"
        private const val KEY_STAFF_ROLE = "current_staff_role"
        private const val KEY_STAFF_AVATAR = "current_staff_avatar"
    }

    /**
     * Login using tenant ID, username and password (similar to web-dashboard)
     * Calls OAuth API via api-gateway: POST /api/tenant/auth/login
     */
    suspend fun login(
        tenantId: String,
        username: String,
        password: String,
        deviceId: String? = null,
        deviceName: String? = null
    ): Result<LoginResponse> {
        return try {
            val response = api.login(
                LoginRequest(
                    tenantId = tenantId,
                    username = username,
                    password = password,
                    deviceId = deviceId,
                    deviceName = deviceName
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!

                // Check if we got a valid access token
                if (loginResponse.accessToken != null) {
                    saveAuthData(tenantId, loginResponse.accessToken, loginResponse.user)
                    Result.success(loginResponse)
                } else if (loginResponse.requiresTwoFactor == true) {
                    Result.failure(Exception("Yêu cầu xác thực 2 yếu tố"))
                } else {
                    Result.failure(Exception(loginResponse.message ?: loginResponse.error ?: "Đăng nhập thất bại"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                // Try to parse error message from JSON
                val errorMessage = try {
                    val gson = com.google.gson.Gson()
                    val errorResponse = gson.fromJson(errorBody, LoginResponse::class.java)
                    errorResponse.message ?: errorResponse.error ?: "Đăng nhập thất bại"
                } catch (e: Exception) {
                    errorBody ?: response.message() ?: "Đăng nhập thất bại"
                }
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyPin(pinCode: String): Result<VerifyPinResponse> {
        return try {
            val branchId = getBranchId() ?: return Result.failure(Exception("Chưa có thông tin chi nhánh"))
            val response = api.verifyPin(
                VerifyPinRequest(
                    branchId = branchId,
                    pinCode = pinCode
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val pinResponse = response.body()!!
                if (pinResponse.success && pinResponse.data != null) {
                    saveStaffData(pinResponse)
                    Result.success(pinResponse)
                } else {
                    Result.failure(Exception(pinResponse.message ?: "Mã PIN không hợp lệ"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun saveAuthData(
        tenantId: String,
        token: String,
        user: LoginUserDto?
    ) {
        sharedPreferences.edit().apply {
            putString(KEY_ACCESS_TOKEN, token)
            putString(KEY_TENANT_ID, tenantId)

            // Save user info from OAuth response
            user?.let {
                putString(KEY_STAFF_ID, it.id)
                putString(KEY_STAFF_NAME, it.name)
                putString(KEY_STAFF_USERNAME, it.username)
                putString(KEY_STAFF_ROLE, it.role)
                putString(KEY_STAFF_AVATAR, it.avatarUrl)
                it.tenantId?.let { id -> putString(KEY_COMPANY_ID, id) }
                it.branchId?.let { id -> putString(KEY_BRANCH_ID, id) }
            }

            apply()
        }
    }

    private fun saveStaffData(response: VerifyPinResponse) {
        val staff = response.data ?: return
        sharedPreferences.edit().apply {
            putString(KEY_STAFF_ID, staff.id)
            putString(KEY_STAFF_NAME, staff.name)
            putString(KEY_STAFF_CODE, staff.code)
            putString(KEY_STAFF_ROLE, staff.role)
            apply()
        }
    }

    fun getAccessToken(): String? {
        return sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
    }

    fun getTenantId(): String? {
        return sharedPreferences.getString(KEY_TENANT_ID, null)
    }

    fun getBranchId(): String? {
        return sharedPreferences.getString(KEY_BRANCH_ID, null)
    }

    fun getBranchName(): String? {
        return sharedPreferences.getString(KEY_BRANCH_NAME, null)
    }

    fun getBrandId(): String? {
        return sharedPreferences.getString(KEY_BRAND_ID, null)
    }

    fun getBrandName(): String? {
        return sharedPreferences.getString(KEY_BRAND_NAME, null)
    }

    fun getCompanyId(): String? {
        return sharedPreferences.getString(KEY_COMPANY_ID, null)
    }

    fun getCompanyName(): String? {
        return sharedPreferences.getString(KEY_COMPANY_NAME, null)
    }

    fun getDeviceId(): String? {
        return sharedPreferences.getString(KEY_DEVICE_ID, null)
    }

    fun getCurrentStaffId(): String? {
        return sharedPreferences.getString(KEY_STAFF_ID, null)
    }

    fun getCurrentStaffName(): String? {
        return sharedPreferences.getString(KEY_STAFF_NAME, null)
    }

    fun getCurrentStaffCode(): String? {
        return sharedPreferences.getString(KEY_STAFF_CODE, null)
    }

    fun getCurrentStaffUsername(): String? {
        return sharedPreferences.getString(KEY_STAFF_USERNAME, null)
    }

    fun getCurrentStaffRole(): String? {
        return sharedPreferences.getString(KEY_STAFF_ROLE, null)
    }

    fun getCurrentStaffAvatar(): String? {
        return sharedPreferences.getString(KEY_STAFF_AVATAR, null)
    }

    fun isLoggedIn(): Boolean {
        return getAccessToken() != null
    }

    fun isStaffLoggedIn(): Boolean {
        return getCurrentStaffId() != null
    }

    fun logout() {
        sharedPreferences.edit().apply {
            remove(KEY_ACCESS_TOKEN)
            remove(KEY_TENANT_ID)
            remove(KEY_BRANCH_ID)
            remove(KEY_BRANCH_NAME)
            remove(KEY_BRAND_ID)
            remove(KEY_BRAND_NAME)
            remove(KEY_COMPANY_ID)
            remove(KEY_COMPANY_NAME)
            remove(KEY_DEVICE_ID)
            remove(KEY_STAFF_ID)
            remove(KEY_STAFF_NAME)
            remove(KEY_STAFF_CODE)
            remove(KEY_STAFF_USERNAME)
            remove(KEY_STAFF_ROLE)
            remove(KEY_STAFF_AVATAR)
            apply()
        }
    }

    fun logoutStaff() {
        sharedPreferences.edit().apply {
            remove(KEY_STAFF_ID)
            remove(KEY_STAFF_NAME)
            remove(KEY_STAFF_CODE)
            remove(KEY_STAFF_USERNAME)
            remove(KEY_STAFF_ROLE)
            remove(KEY_STAFF_AVATAR)
            apply()
        }
    }
}
