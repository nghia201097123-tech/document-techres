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
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KitchenPrinterUiState(
    val kitchens: List<KitchenEntity> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val isDebugDataInserted: Boolean = false
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

                // NOTE: Không tự động thêm debug data khi không có bếp
                // Chỉ hiển thị dữ liệu đã đồng bộ từ web
                // Nếu muốn test có thể nhấn nút "Thêm dữ liệu debug" thủ công

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

    /**
     * Force insert debug kitchens (for testing)
     */
    fun insertDebugData() {
        viewModelScope.launch {
            try {
                val branchId = authRepository.getBranchId()
                if (!branchId.isNullOrEmpty()) {
                    // Clear existing and insert fresh debug data
                    kitchenRepository.clearByBranch(branchId)
                    kitchenRepository.insertDebugKitchens(branchId)
                    _uiState.update { it.copy(isDebugDataInserted = true) }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(errorMessage = e.message ?: "Lỗi thêm dữ liệu debug")
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

    /**
     * Update full printer config including protocol, label size, paper width, print mode and printing configs
     */
    fun updateFullPrinterConfig(
        kitchenId: String,
        ip: String?,
        port: Int,
        name: String?,
        isConnected: Boolean,
        protocol: String,
        labelWidthMm: Int,
        labelHeightMm: Int,
        labelGapMm: Int,
        printDensity: Int,
        paperWidth: Int,
        printMode: String,
        // Ticket printing config
        ticketCutAfterPrint: Boolean = true,
        ticketPrintItemsSeparately: Boolean = false,
        ticketCopies: Int = 1,
        ticketFontSize: String = "medium",
        ticketLineSpacing: Float = 0.4f,
        // Label printing config
        labelPrintPrice: Boolean = false,
        labelPrintStoreName: Boolean = false,
        labelPrintOrderNumber: Boolean = true,
        labelPrintTableName: Boolean = true,
        labelPrintTime: Boolean = true,
        labelStoreName: String? = null,
        labelReverse: Boolean = false,
        labelFontScale: Float = 1.0f,
        labelMaxToppings: Int = 0,
        labelLineSpacing: Float = 1.0f
    ) {
        viewModelScope.launch {
            try {
                kitchenRepository.updateFullPrinterConfig(
                    kitchenId = kitchenId,
                    ip = ip,
                    port = port,
                    name = name,
                    isConnected = isConnected,
                    protocol = protocol,
                    labelWidthMm = labelWidthMm,
                    labelHeightMm = labelHeightMm,
                    labelGapMm = labelGapMm,
                    printDensity = printDensity,
                    paperWidth = paperWidth,
                    printMode = printMode,
                    ticketCutAfterPrint = ticketCutAfterPrint,
                    ticketPrintItemsSeparately = ticketPrintItemsSeparately,
                    ticketCopies = ticketCopies,
                    ticketFontSize = ticketFontSize,
                    ticketLineSpacing = ticketLineSpacing,
                    labelPrintPrice = labelPrintPrice,
                    labelPrintStoreName = labelPrintStoreName,
                    labelPrintOrderNumber = labelPrintOrderNumber,
                    labelPrintTableName = labelPrintTableName,
                    labelPrintTime = labelPrintTime,
                    labelStoreName = labelStoreName,
                    labelReverse = labelReverse,
                    labelFontScale = labelFontScale,
                    labelMaxToppings = labelMaxToppings,
                    labelLineSpacing = labelLineSpacing
                )
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(errorMessage = e.message ?: "Lỗi cập nhật cấu hình máy in")
                }
            }
        }
    }

    /**
     * Toggle isActive status for a kitchen (enable/disable printing)
     */
    fun toggleActiveStatus(kitchenId: String, isActive: Boolean) {
        viewModelScope.launch {
            try {
                kitchenRepository.updateActiveStatus(kitchenId, isActive)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(errorMessage = e.message ?: "Lỗi cập nhật trạng thái")
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
