package com.techres.ccb.presentation.screens.settings

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    val reconnectResult: ReconnectResult? = null
)

data class ReconnectResult(
    val accountId: String,
    val success: Boolean,
    val message: String
)

@HiltViewModel
class FoodPartnerConnectionViewModel @Inject constructor(
    private val syncRepository: SyncRepository,
    private val foodPlatformRepository: FoodPlatformRepository
) : ViewModel() {

    companion object {
        private const val TAG = "FoodPartnerVM"
    }

    private val _uiState = MutableStateFlow(FoodPartnerConnectionUiState())
    val uiState: StateFlow<FoodPartnerConnectionUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())

    /**
     * Load food platform accounts from local sync data
     * Data is synced via sync/full endpoint and stored in SharedPreferences
     */
    fun loadAccounts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Read food platform data from local storage (synced via sync/full)
                val foodPlatformData = syncRepository.getFoodPlatformData()
                Log.d(TAG, "loadAccounts - foodPlatformData: ${foodPlatformData != null}")

                if (foodPlatformData == null) {
                    Log.d(TAG, "loadAccounts - No food platform data found in local storage")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            accounts = emptyList(),
                            lastSyncTime = null,
                            error = "Chưa có dữ liệu cổng liên kết. Vui lòng đồng bộ dữ liệu."
                        )
                    }
                    return@launch
                }

                // Map accounts from sync data
                val accounts = foodPlatformData.accounts?.map { accountData ->
                    FoodPartnerAccount(
                        id = accountData.account.id,
                        platform = accountData.account.platform,
                        displayName = accountData.account.displayName,
                        username = accountData.account.username,
                        status = accountData.account.status,
                        lastError = accountData.account.lastError,
                        errorCount = accountData.account.errorCount ?: 0
                    )
                } ?: emptyList()

                Log.d(TAG, "loadAccounts - Found ${accounts.size} accounts")

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        accounts = accounts,
                        lastSyncTime = foodPlatformData.syncedAt,
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

                val result = if (response.status == 200 && response.data?.reconnected == true) {
                    ReconnectResult(
                        accountId = accountId,
                        success = true,
                        message = "Kết nối lại thành công"
                    )
                } else {
                    ReconnectResult(
                        accountId = accountId,
                        success = false,
                        message = response.message ?: "Không thể kết nối lại"
                    )
                }

                _uiState.update {
                    it.copy(
                        reconnectingAccountId = null,
                        reconnectResult = result
                    )
                }

                // Update local account status if reconnect was successful
                if (result.success) {
                    // Update the account status in the UI
                    val updatedAccounts = _uiState.value.accounts.map { account ->
                        if (account.id == accountId) {
                            account.copy(status = "CONNECTED", lastError = null, errorCount = 0)
                        } else {
                            account
                        }
                    }
                    _uiState.update { it.copy(accounts = updatedAccounts) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "reconnectAccount - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        reconnectingAccountId = null,
                        reconnectResult = ReconnectResult(
                            accountId = accountId,
                            success = false,
                            message = e.message ?: "Có lỗi xảy ra"
                        )
                    )
                }
            }
        }
    }

    fun clearReconnectResult() {
        _uiState.update { it.copy(reconnectResult = null) }
    }
}
