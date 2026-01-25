package com.techres.ccb.data.repository

import android.util.Log
import com.techres.ccb.data.remote.api.FoodPlatformApi
import com.techres.ccb.data.remote.dto.FoodPlatformSyncResponse
import com.techres.ccb.data.remote.dto.ReconnectResponse
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
    suspend fun syncFoodPlatformConfig(branchId: Int): FoodPlatformSyncResponse {
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
     * Get disconnected accounts for a branch
     */
    suspend fun getDisconnectedAccounts(branchId: Int): List<DisconnectedAccount> {
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
