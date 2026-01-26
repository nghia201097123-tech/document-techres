package com.techres.ccb.presentation.screens.settings

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.FoodPlatformAccountDao
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.FoodPlatformRepository
import com.techres.ccb.data.repository.SyncRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class FoodPartnerConnectionUiState(
    val isLoading: Boolean = false,
    val accounts: List<FoodPartnerAccount> = emptyList(),
    val error: String? = null,
    val lastSyncTime: String? = null,
    val reconnectingAccountId: String? = null,
    val testingAccountId: String? = null,
    val disconnectingAccountId: String? = null,
    val actionResult: ActionResult? = null
)

data class ActionResult(
    val accountId: String,
    val action: String, // "test", "reconnect", "disconnect"
    val success: Boolean,
    val message: String
)

// Keep for backward compatibility
data class ReconnectResult(
    val accountId: String,
    val success: Boolean,
    val message: String
)

@HiltViewModel
class FoodPartnerConnectionViewModel @Inject constructor(
    private val syncRepository: SyncRepository,
    private val foodPlatformRepository: FoodPlatformRepository,
    private val foodPlatformAccountDao: FoodPlatformAccountDao,
    private val authRepository: AuthRepository
) : ViewModel() {

    companion object {
        private const val TAG = "FoodPartnerVM"
    }

    private val _uiState = MutableStateFlow(FoodPartnerConnectionUiState())
    val uiState: StateFlow<FoodPartnerConnectionUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())

    /**
     * Load food platform accounts from Room database
     * Data is synced via sync/full endpoint and stored in Room DB
     */
    fun loadAccounts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Get current branch ID for logging
                val branchId = authRepository.getBranchId()
                Log.d(TAG, "loadAccounts - Current branchId: $branchId")

                // Get ALL accounts from database (no filter)
                // This ensures we display all available accounts regardless of branchId
                val accountEntities = foodPlatformAccountDao.getAllForDebug()
                Log.d(TAG, "loadAccounts - getAllForDebug returned ${accountEntities.size} accounts")

                // Log each account for debugging
                accountEntities.forEach { account ->
                    Log.d(TAG, "loadAccounts - Account: id=${account.id}, branchId=${account.branchId}, platform=${account.platform}, status=${account.status}, isActive=${account.isActive}")
                }

                if (accountEntities.isEmpty()) {
                    Log.d(TAG, "loadAccounts - No food platform accounts found in Room DB")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            accounts = emptyList(),
                            lastSyncTime = null,
                            error = null
                        )
                    }
                    return@launch
                }

                // Map entities to UI model
                val accounts = accountEntities.map { entity ->
                    FoodPartnerAccount(
                        id = entity.id,
                        platform = entity.platform,
                        displayName = entity.displayName,
                        username = entity.username,
                        status = entity.status,
                        lastError = entity.lastError,
                        errorCount = entity.errorCount
                    )
                }

                // Get last sync time from first account
                val lastSyncTime = accountEntities.firstOrNull()?.syncedAt

                Log.d(TAG, "loadAccounts - Successfully loaded ${accounts.size} accounts")

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        accounts = accounts,
                        lastSyncTime = lastSyncTime,
                        error = null
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadAccounts - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Có lỗi xảy ra"
                    )
                }
            }
        }
    }

    /**
     * Reconnect a disconnected food platform account
     * Calls the reconnect API on api-app-food
     */
    fun reconnectAccount(accountId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(reconnectingAccountId = accountId) }

            try {
                val response = foodPlatformRepository.reconnectAccount(accountId)

                val success = response.status == 200 && response.data?.reconnected == true
                val message = if (success) "Kết nối lại thành công" else (response.message ?: "Không thể kết nối lại")

                // Update local account status if reconnect was successful
                if (success) {
                    // Update in Room DB
                    foodPlatformAccountDao.updateStatus(accountId, "CONNECTED", null, 0)
                }

                val updatedAccounts = if (success) {
                    _uiState.value.accounts.map { account ->
                        if (account.id == accountId) {
                            account.copy(status = "CONNECTED", lastError = null, errorCount = 0)
                        } else {
                            account
                        }
                    }
                } else {
                    _uiState.value.accounts
                }

                _uiState.update {
                    it.copy(
                        reconnectingAccountId = null,
                        accounts = updatedAccounts,
                        actionResult = ActionResult(
                            accountId = accountId,
                            action = "reconnect",
                            success = success,
                            message = message
                        )
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "reconnectAccount - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        reconnectingAccountId = null,
                        actionResult = ActionResult(
                            accountId = accountId,
                            action = "reconnect",
                            success = false,
                            message = e.message ?: "Có lỗi xảy ra"
                        )
                    )
                }
            }
        }
    }

    fun clearReconnectResult() {
        _uiState.update { it.copy(actionResult = null) }
    }

    /**
     * Test connection for a food platform account
     */
    fun testConnection(accountId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(testingAccountId = accountId) }

            try {
                val result = foodPlatformRepository.testConnection(accountId)

                result.fold(
                    onSuccess = { testResult ->
                        _uiState.update {
                            it.copy(
                                testingAccountId = null,
                                actionResult = ActionResult(
                                    accountId = accountId,
                                    action = "test",
                                    success = testResult.success == true,
                                    message = testResult.message ?: "Kết nối thành công"
                                )
                            )
                        }
                    },
                    onFailure = { e ->
                        _uiState.update {
                            it.copy(
                                testingAccountId = null,
                                actionResult = ActionResult(
                                    accountId = accountId,
                                    action = "test",
                                    success = false,
                                    message = e.message ?: "Kiểm tra kết nối thất bại"
                                )
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "testConnection - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        testingAccountId = null,
                        actionResult = ActionResult(
                            accountId = accountId,
                            action = "test",
                            success = false,
                            message = e.message ?: "Có lỗi xảy ra"
                        )
                    )
                }
            }
        }
    }

    /**
     * Disconnect a food platform account
     */
    fun disconnectAccount(accountId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(disconnectingAccountId = accountId) }

            try {
                val result = foodPlatformRepository.disconnectAccount(accountId)

                result.fold(
                    onSuccess = { disconnectResult ->
                        // Update in Room DB
                        foodPlatformAccountDao.updateStatus(accountId, "DISCONNECTED", null, 0)

                        // Update the account status in the UI
                        val updatedAccounts = _uiState.value.accounts.map { account ->
                            if (account.id == accountId) {
                                account.copy(status = "DISCONNECTED")
                            } else {
                                account
                            }
                        }

                        _uiState.update {
                            it.copy(
                                disconnectingAccountId = null,
                                accounts = updatedAccounts,
                                actionResult = ActionResult(
                                    accountId = accountId,
                                    action = "disconnect",
                                    success = true,
                                    message = "Đã ngắt kết nối thành công"
                                )
                            )
                        }
                    },
                    onFailure = { e ->
                        _uiState.update {
                            it.copy(
                                disconnectingAccountId = null,
                                actionResult = ActionResult(
                                    accountId = accountId,
                                    action = "disconnect",
                                    success = false,
                                    message = e.message ?: "Ngắt kết nối thất bại"
                                )
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "disconnectAccount - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        disconnectingAccountId = null,
                        actionResult = ActionResult(
                            accountId = accountId,
                            action = "disconnect",
                            success = false,
                            message = e.message ?: "Có lỗi xảy ra"
                        )
                    )
                }
            }
        }
    }

    fun clearActionResult() {
        _uiState.update { it.copy(actionResult = null) }
    }
}
