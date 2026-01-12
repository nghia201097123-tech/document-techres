package com.techres.ccb.presentation.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.KitchenRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KitchenPrinterUiState(
    val kitchens: List<KitchenEntity> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null
)

@HiltViewModel
class KitchenPrinterViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val kitchenRepository: KitchenRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(KitchenPrinterUiState())
    val uiState: StateFlow<KitchenPrinterUiState> = _uiState.asStateFlow()

    init {
        loadKitchens()
    }

    private fun loadKitchens() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val branchId = authRepository.getBranchId()
                if (branchId.isNullOrEmpty()) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = "Không tìm thấy chi nhánh"
                        )
                    }
                    return@launch
                }

                kitchenRepository.getAllKitchens(branchId).collect { kitchens ->
                    _uiState.update {
                        it.copy(
                            kitchens = kitchens,
                            isLoading = false,
                            errorMessage = null
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = e.message ?: "Lỗi tải dữ liệu"
                    )
                }
            }
        }
    }

    fun updatePrinterConfig(
        kitchenId: String,
        ip: String?,
        port: Int,
        name: String?,
        isConnected: Boolean
    ) {
        viewModelScope.launch {
            try {
                kitchenRepository.updatePrinterConfig(kitchenId, ip, port, name, isConnected)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(errorMessage = e.message ?: "Lỗi cập nhật cấu hình máy in")
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
