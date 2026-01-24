package com.techres.ccb.presentation.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.KitchenPrintMode
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.KitchenRepository
import com.techres.ccb.printer.adapter.SunmiPrinterAdapter
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LabelPrinterUiState(
    val labelPrinters: List<KitchenEntity> = emptyList(),
    val isLoading: Boolean = true,
    val isSunmiDevice: Boolean = false, // True nếu thiết bị là Sunmi (có máy in tích hợp)
    val errorMessage: String? = null
)

@HiltViewModel
class LabelPrinterConfigViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val kitchenRepository: KitchenRepository,
    private val sunmiPrinterAdapter: SunmiPrinterAdapter
) : ViewModel() {

    private val _uiState = MutableStateFlow(LabelPrinterUiState())
    val uiState: StateFlow<LabelPrinterUiState> = _uiState.asStateFlow()

    init {
        loadLabelPrinters()
    }

    private fun loadLabelPrinters() {
        viewModelScope.launch {
            // Kiểm tra xem thiết bị có phải Sunmi không để hiển thị tùy chọn kết nối phù hợp
            val isSunmi = sunmiPrinterAdapter.isSunmiDevice()
            _uiState.update { it.copy(isLoading = true, isSunmiDevice = isSunmi) }

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
                    // Chỉ hiển thị bếp in tem (LABEL hoặc BOTH)
                    val labelPrinters = kitchens.filter { kitchen ->
                        kitchen.printMode == KitchenPrintMode.LABEL.name ||
                        kitchen.printMode == KitchenPrintMode.BOTH.name
                    }
                    _uiState.update {
                        it.copy(
                            labelPrinters = labelPrinters,
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
                    ticketCutAfterPrint = true,
                    ticketPrintItemsSeparately = false,
                    ticketCopies = 1,
                    ticketFontSize = "medium",
                    ticketLineSpacing = 0.4f,
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

    /**
     * Update label printer settings
     */
    fun updateLabelPrinterSettings(printer: KitchenEntity) {
        viewModelScope.launch {
            try {
                kitchenRepository.updateLabelSettings(
                    kitchenId = printer.id,
                    connectionType = printer.connectionType,
                    printerIp = printer.printerIp,
                    printerPort = printer.printerPort,
                    printerProtocol = printer.printerProtocol,
                    labelPrintPrice = printer.labelPrintPrice,
                    labelPrintStoreName = printer.labelPrintStoreName,
                    labelPrintOrderNumber = printer.labelPrintOrderNumber,
                    labelPrintTableName = printer.labelPrintTableName,
                    labelPrintTime = printer.labelPrintTime,
                    labelStoreName = printer.labelStoreName,
                    labelReverse = printer.labelReverse,
                    labelWidthMm = printer.labelWidthMm,
                    labelHeightMm = printer.labelHeightMm,
                    labelGapMm = printer.labelGapMm,
                    labelFontScale = printer.labelFontScale,
                    labelMaxToppings = printer.labelMaxToppings,
                    labelLineSpacing = printer.labelLineSpacing
                )
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(errorMessage = e.message ?: "Lỗi cập nhật cài đặt tem")
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
