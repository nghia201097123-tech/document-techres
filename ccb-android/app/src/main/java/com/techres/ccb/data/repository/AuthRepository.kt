package com.techres.ccb.data.repository

import android.content.SharedPreferences
import com.techres.ccb.data.remote.api.MasterDataApi
import com.techres.ccb.data.remote.dto.LoginRequest
import com.techres.ccb.data.remote.dto.LoginResponse
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
        private const val KEY_BRANCH_ID = "branch_id"
        private const val KEY_BRANCH_NAME = "branch_name"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_STAFF_ID = "current_staff_id"
        private const val KEY_STAFF_NAME = "current_staff_name"
        private const val KEY_STAFF_ROLE = "current_staff_role"
    }

    suspend fun login(storeCode: String, deviceId: String, deviceName: String?): Result<LoginResponse> {
        return try {
            val response = api.login(
                LoginRequest(
                    storeCode = storeCode,
                    deviceId = deviceId,
                    deviceName = deviceName,
                    deviceType = "android",
                    appVersion = "1.0.0"
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                saveAuthData(loginResponse)
                Result.success(loginResponse)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyPin(pinCode: String): Result<VerifyPinResponse> {
        return try {
            val token = getAccessToken() ?: return Result.failure(Exception("No access token"))
            val response = api.verifyPin("Bearer $token", VerifyPinRequest(pinCode))
            if (response.isSuccessful && response.body() != null) {
                val pinResponse = response.body()!!
                saveStaffData(pinResponse)
                Result.success(pinResponse)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun saveAuthData(response: LoginResponse) {
        sharedPreferences.edit().apply {
            putString(KEY_ACCESS_TOKEN, response.accessToken)
            putString(KEY_BRANCH_ID, response.branchId)
            putString(KEY_BRANCH_NAME, response.branchName)
            putString(KEY_DEVICE_ID, response.deviceId)
            apply()
        }
    }

    private fun saveStaffData(response: VerifyPinResponse) {
        sharedPreferences.edit().apply {
            putString(KEY_STAFF_ID, response.staffId)
            putString(KEY_STAFF_NAME, response.staffName)
            putString(KEY_STAFF_ROLE, response.role)
            apply()
        }
    }

    fun getAccessToken(): String? {
        return sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
    }

    fun getBranchId(): String? {
        return sharedPreferences.getString(KEY_BRANCH_ID, null)
    }

    fun getBranchName(): String? {
        return sharedPreferences.getString(KEY_BRANCH_NAME, null)
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

    fun getCurrentStaffRole(): String? {
        return sharedPreferences.getString(KEY_STAFF_ROLE, null)
    }

    fun isLoggedIn(): Boolean {
        return getAccessToken() != null && getBranchId() != null
    }

    fun isStaffLoggedIn(): Boolean {
        return getCurrentStaffId() != null
    }

    fun logout() {
        sharedPreferences.edit().apply {
            remove(KEY_ACCESS_TOKEN)
            remove(KEY_BRANCH_ID)
            remove(KEY_BRANCH_NAME)
            remove(KEY_DEVICE_ID)
            remove(KEY_STAFF_ID)
            remove(KEY_STAFF_NAME)
            remove(KEY_STAFF_ROLE)
            apply()
        }
    }

    fun logoutStaff() {
        sharedPreferences.edit().apply {
            remove(KEY_STAFF_ID)
            remove(KEY_STAFF_NAME)
            remove(KEY_STAFF_ROLE)
            apply()
        }
    }
}
