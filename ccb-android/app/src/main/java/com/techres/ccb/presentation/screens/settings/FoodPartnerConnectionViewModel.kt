package com.techres.ccb.presentation.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.FoodPlatformRepository
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
    private val foodPlatformRepository: FoodPlatformRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(FoodPartnerConnectionUiState())
    val uiState: StateFlow<FoodPartnerConnectionUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())

    fun loadAccounts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val branchId = authRepository.getSelectedBranchId()
                if (branchId == null) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "Chưa chọn chi nhánh"
                        )
                    }
                    return@launch
                }

                // Fetch accounts from API
                val response = foodPlatformRepository.syncFoodPlatformConfig(branchId)

                if (response.status == 200 && response.data != null) {
                    val accounts = response.data.accounts.map { accountData ->
                        FoodPartnerAccount(
                            id = accountData.account.id,
                            platform = accountData.account.platform,
                            displayName = accountData.account.displayName,
                            username = accountData.account.username,
                            status = accountData.account.status,
                            lastError = accountData.account.lastError,
                            errorCount = accountData.account.errorCount ?: 0
                        )
                    }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            accounts = accounts,
                            lastSyncTime = dateFormat.format(Date()),
                            error = null
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = response.message ?: "Không thể tải danh sách tài khoản"
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Có lỗi xảy ra"
                    )
                }
            }
        }
    }

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

                // Reload accounts to reflect new status
                if (result.success) {
                    loadAccounts()
                }
            } catch (e: Exception) {
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
