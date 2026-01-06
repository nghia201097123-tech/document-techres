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

data class PinUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class PinViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PinUiState())
    val uiState: StateFlow<PinUiState> = _uiState.asStateFlow()

    fun getBranchName(): String = authRepository.getBranchName() ?: ""

    fun verifyPin(pinCode: String) {
        viewModelScope.launch {
            _uiState.value = PinUiState(isLoading = true)

            val result = authRepository.verifyPin(pinCode)
            result.fold(
                onSuccess = {
                    _uiState.value = PinUiState(isSuccess = true)
                },
                onFailure = { e ->
                    _uiState.value = PinUiState(error = e.message ?: "Mã PIN không đúng")
                }
            )
        }
    }

    fun logout() {
        authRepository.logout()
    }
}
