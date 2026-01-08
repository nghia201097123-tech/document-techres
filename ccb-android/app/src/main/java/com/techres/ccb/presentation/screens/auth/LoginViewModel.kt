package com.techres.ccb.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val tenantId: String = "",
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

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
                    // Login success -> Navigate to Branch Selection
                    // Sync will happen after branch selection and shift open
                    _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
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
