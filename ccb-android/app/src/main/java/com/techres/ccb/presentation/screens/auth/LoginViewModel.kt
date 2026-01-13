package com.techres.ccb.presentation.screens.auth

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.BranchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val tenantId: String = "CTSG",
    val username: String = "tr000001",
    val password: String = "abc123",
    val isLoading: Boolean = false,
    val isSyncingBranches: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null,
    val syncedBrandsCount: Int = 0,
    val syncedBranchesCount: Int = 0
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val branchRepository: BranchRepository
) : ViewModel() {

    companion object {
        private const val TAG = "LoginViewModel"
    }

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun updateTenantId(value: String) {
        _uiState.value = _uiState.value.copy(tenantId = value, error = null)
    }

    fun updateUsername(value: String) {
        _uiState.value = _uiState.value.copy(username = value, error = null)
    }

    fun updatePassword(value: String) {
        _uiState.value = _uiState.value.copy(password = value, error = null)
    }

    fun login() {
        val state = _uiState.value

        // Validate inputs
        if (state.tenantId.isBlank()) {
            _uiState.value = state.copy(error = "Vui lòng nhập mã doanh nghiệp")
            return
        }
        if (state.username.isBlank()) {
            _uiState.value = state.copy(error = "Vui lòng nhập tên đăng nhập")
            return
        }
        if (state.password.isBlank()) {
            _uiState.value = state.copy(error = "Vui lòng nhập mật khẩu")
            return
        }

        viewModelScope.launch {
            _uiState.value = state.copy(isLoading = true, error = null)

            val result = authRepository.login(
                tenantId = state.tenantId.trim(),
                username = state.username.trim(),
                password = state.password
            )

            result.fold(
                onSuccess = {
                    // Login success -> Sync branches based on staff permissions
                    Log.d(TAG, "Login success, syncing staff branch permissions...")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isSyncingBranches = true
                    )

                    // Sync brands/branches that staff has permission to
                    syncStaffBranchPermissions()
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Đăng nhập thất bại"
                    )
                }
            )
        }
    }

    /**
     * Sync brands and branches based on staff permissions
     * Called after successful login
     */
    private fun syncStaffBranchPermissions() {
        viewModelScope.launch {
            Log.d(TAG, "syncStaffBranchPermissions starting...")

            val syncResult = branchRepository.syncStaffBranchPermissions()

            syncResult.fold(
                onSuccess = { result ->
                    Log.d(TAG, "Sync success: ${result.brandsCount} brands, ${result.branchesCount} branches")
                    _uiState.value = _uiState.value.copy(
                        isSyncingBranches = false,
                        isSuccess = true,
                        syncedBrandsCount = result.brandsCount,
                        syncedBranchesCount = result.branchesCount
                    )
                },
                onFailure = { e ->
                    Log.e(TAG, "Sync failed: ${e.message}", e)
                    // Still allow navigation but show warning
                    _uiState.value = _uiState.value.copy(
                        isSyncingBranches = false,
                        isSuccess = true, // Still allow to proceed
                        error = "Đồng bộ chi nhánh thất bại: ${e.message}"
                    )
                }
            )
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    /**
     * Legacy login method for compatibility
     */
    fun login(tenantId: String, username: String, password: String) {
        _uiState.value = _uiState.value.copy(
            tenantId = tenantId,
            username = username,
            password = password
        )
        login()
    }
}
