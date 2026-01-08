package com.techres.ccb.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.SyncRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val syncRepository: SyncRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun login(tenantId: String, username: String, password: String) {
        viewModelScope.launch {
            _uiState.value = LoginUiState(isLoading = true)

            val result = authRepository.login(tenantId, username, password)
            result.fold(
                onSuccess = {
                    // Perform initial sync after login
                    val syncResult = syncRepository.performFullSync()
                    syncResult.fold(
                        onSuccess = {
                            _uiState.value = LoginUiState(isSuccess = true)
                        },
                        onFailure = { e ->
                            // Login succeeded but sync failed - still allow to proceed
                            _uiState.value = LoginUiState(isSuccess = true)
                        }
                    )
                },
                onFailure = { e ->
                    _uiState.value = LoginUiState(error = e.message ?: "Đăng nhập thất bại")
                }
            )
        }
    }
}
