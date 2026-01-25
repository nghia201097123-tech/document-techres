package com.techres.ccb.data.repository

import android.util.Log
import com.techres.ccb.data.remote.api.FoodPlatformApi
import com.techres.ccb.data.remote.dto.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FoodPlatformRepository @Inject constructor(
    private val foodPlatformApi: FoodPlatformApi
) {
    companion object {
        private const val TAG = "FoodPlatformRepository"
    }

    /**
     * Sync food platform config from server
     * Gets accounts (connected + disconnected) and store mappings for a branch
     */
    suspend fun syncFoodPlatformConfig(branchId: String): FoodPlatformSyncResponse {
        return try {
            Log.d(TAG, "Syncing food platform config for branch $branchId")
            val response = foodPlatformApi.getFoodPlatformSync(branchId)

            if (response.isSuccessful && response.body() != null) {
                Log.d(TAG, "Sync successful: ${response.body()?.data?.accounts?.size ?: 0} accounts")
                response.body()!!
            } else {
                Log.e(TAG, "Sync failed: ${response.errorBody()?.string()}")
                FoodPlatformSyncResponse(
                    status = response.code(),
                    message = "Không thể đồng bộ dữ liệu",
                    data = null
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync error: ${e.message}", e)
            FoodPlatformSyncResponse(
                status = 500,
                message = e.message ?: "Có lỗi xảy ra",
                data = null
            )
        }
    }

    /**
     * Create a new food platform account
     */
    suspend fun createAccount(
        tenantId: String,
        platform: String,
        authType: String,
        displayName: String? = null
    ): Result<CreatedAccountDto> {
        return try {
            Log.d(TAG, "Creating account for platform $platform")
            val request = CreateAccountRequest(tenantId, platform, authType, displayName)
            val response = foodPlatformApi.createAccount(request)

            if (response.isSuccessful && response.body()?.data != null) {
                Log.d(TAG, "Account created: ${response.body()?.data?.id}")
                Result.success(response.body()!!.data!!)
            } else {
                val errorMsg = response.body()?.message ?: "Không thể tạo tài khoản"
                Log.e(TAG, "Create account failed: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Create account error: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Login with username/password
     */
    suspend fun login(
        accountId: String,
        username: String,
        password: String,
        branchId: String? = null
    ): Result<LoginResultDto> {
        return try {
            Log.d(TAG, "Logging in account $accountId")
            val request = FoodPlatformLoginRequest(username, password, branchId)
            val response = foodPlatformApi.login(accountId, request)

            if (response.isSuccessful && response.body()?.status == 200) {
                Log.d(TAG, "Login successful: ${response.body()?.data}")
                Result.success(response.body()!!.data!!)
            } else {
                val errorMsg = response.body()?.message ?: "Đăng nhập thất bại"
                Log.e(TAG, "Login failed: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Login error: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Request OTP for phone authentication
     */
    suspend fun requestOtp(accountId: String, phoneNumber: String): Result<RequestOtpResultDto> {
        return try {
            Log.d(TAG, "Requesting OTP for account $accountId")
            val request = RequestOtpRequest(phoneNumber)
            val response = foodPlatformApi.requestOtp(accountId, request)

            if (response.isSuccessful && response.body()?.status == 200) {
                Log.d(TAG, "OTP requested successfully")
                Result.success(response.body()!!.data!!)
            } else {
                val errorMsg = response.body()?.message ?: "Gửi OTP thất bại"
                Log.e(TAG, "Request OTP failed: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Request OTP error: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Verify OTP
     */
    suspend fun verifyOtp(accountId: String, otp: String): Result<VerifyOtpResultDto> {
        return try {
            Log.d(TAG, "Verifying OTP for account $accountId")
            val request = VerifyOtpRequest(otp)
            val response = foodPlatformApi.verifyOtp(accountId, request)

            if (response.isSuccessful && response.body()?.status == 200) {
                Log.d(TAG, "OTP verified successfully")
                Result.success(response.body()!!.data!!)
            } else {
                val errorMsg = response.body()?.message ?: "Xác thực OTP thất bại"
                Log.e(TAG, "Verify OTP failed: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Verify OTP error: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Select store after OTP verification
     */
    suspend fun selectStore(
        accountId: String,
        merchantId: String,
        storeName: String
    ): Result<LoginResultDto> {
        return try {
            Log.d(TAG, "Selecting store for account $accountId")
            val request = SelectStoreRequest(merchantId, storeName)
            val response = foodPlatformApi.selectStore(accountId, request)

            if (response.isSuccessful && response.body()?.status == 200) {
                Log.d(TAG, "Store selected successfully")
                Result.success(response.body()!!.data!!)
            } else {
                val errorMsg = response.body()?.message ?: "Chọn cửa hàng thất bại"
                Log.e(TAG, "Select store failed: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Select store error: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Reconnect a disconnected account
     */
    suspend fun reconnectAccount(accountId: String): ReconnectResponse {
        return try {
            Log.d(TAG, "Reconnecting account $accountId")
            val response = foodPlatformApi.reconnectAccount(accountId)

            if (response.isSuccessful && response.body() != null) {
                Log.d(TAG, "Reconnect response: ${response.body()}")
                response.body()!!
            } else {
                Log.e(TAG, "Reconnect failed: ${response.errorBody()?.string()}")
                ReconnectResponse(
                    status = response.code(),
                    message = "Không thể kết nối lại",
                    data = null
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Reconnect error: ${e.message}", e)
            ReconnectResponse(
                status = 500,
                message = e.message ?: "Có lỗi xảy ra",
                data = null
            )
        }
    }

    /**
     * Test connection - verify account can connect to platform
     */
    suspend fun testConnection(accountId: String): Result<TestConnectionResultDto> {
        return try {
            Log.d(TAG, "Testing connection for account $accountId")
            val response = foodPlatformApi.testConnection(accountId)

            if (response.isSuccessful && response.body()?.status == 200) {
                Log.d(TAG, "Test connection successful: ${response.body()?.data}")
                Result.success(response.body()!!.data!!)
            } else {
                val errorMsg = response.body()?.message ?: "Kiểm tra kết nối thất bại"
                Log.e(TAG, "Test connection failed: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Test connection error: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Disconnect account from platform
     */
    suspend fun disconnectAccount(accountId: String): Result<DisconnectResultDto> {
        return try {
            Log.d(TAG, "Disconnecting account $accountId")
            val response = foodPlatformApi.disconnectAccount(accountId)

            if (response.isSuccessful && response.body()?.status == 200) {
                Log.d(TAG, "Disconnect successful: ${response.body()?.data}")
                Result.success(response.body()!!.data!!)
            } else {
                val errorMsg = response.body()?.message ?: "Ngắt kết nối thất bại"
                Log.e(TAG, "Disconnect failed: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Disconnect error: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Get disconnected accounts for a branch
     */
    suspend fun getDisconnectedAccounts(branchId: String): List<DisconnectedAccount> {
        return try {
            val response = foodPlatformApi.getDisconnectedAccounts(branchId)
            if (response.isSuccessful && response.body() != null) {
                response.body()?.data?.disconnectedAccounts?.map { dto ->
                    DisconnectedAccount(
                        accountId = dto.accountId,
                        platform = dto.platform,
                        displayName = dto.displayName,
                        username = dto.username,
                        status = dto.status,
                        lastError = dto.lastError,
                        errorCount = dto.errorCount ?: 0
                    )
                } ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Get disconnected accounts error: ${e.message}", e)
            emptyList()
        }
    }
}

data class DisconnectedAccount(
    val accountId: String,
    val platform: String,
    val displayName: String?,
    val username: String?,
    val status: String,
    val lastError: String?,
    val errorCount: Int
)
