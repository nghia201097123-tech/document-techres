package com.techres.ccb.presentation.screens.settings

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.KitchenPrintMode
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.KitchenRepository
import com.techres.ccb.printer.adapter.SunmiPrinterAdapter
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

data class KitchenPrinterUiState(
    val kitchens: List<KitchenEntity> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val isDebugDataInserted: Boolean = false
)

@HiltViewModel
class KitchenPrinterViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val kitchenRepository: KitchenRepository,
    private val sunmiPrinterAdapter: SunmiPrinterAdapter
) : ViewModel() {

    companion object {
        private const val TAG = "KitchenPrinterVM"
        private const val SUNMI_KITCHEN_ID = "sunmi_builtin_kitchen"
        const val SUNMI_PRINTER_IP = "sunmi" // Convention: printerIp = "sunmi" means use built-in Sunmi printer
    }

    private val _uiState = MutableStateFlow(KitchenPrinterUiState())
    val uiState: StateFlow<KitchenPrinterUiState> = _uiState.asStateFlow()

    init {
        loadKitchens()
        // Tự động phát hiện máy in Sunmi tích hợp
        autoDetectSunmiPrinter()
    }

    /**
     * Tự động phát hiện và thêm bếp với máy in Sunmi tích hợp nếu:
     * 1. Thiết bị là Sunmi POS
     * 2. Chưa có bếp sử dụng máy in Sunmi trong database
     */
    private fun autoDetectSunmiPrinter() {
        if (!sunmiPrinterAdapter.isSunmiDevice()) {
            Log.d(TAG, "Not a Sunmi device, skipping auto-detect")
            return
        }

        viewModelScope.launch {
            try {
                val branchId = authRepository.getBranchId() ?: return@launch

                // Kiểm tra xem đã có bếp dùng máy in Sunmi chưa
                val existingKitchens = kitchenRepository.getAllKitchens(branchId).first()
                val hasSunmiKitchen = existingKitchens.any {
                    it.printerIp == SUNMI_PRINTER_IP || it.id.contains(SUNMI_KITCHEN_ID)
                }

                if (!hasSunmiKitchen) {
                    Log.d(TAG, "Sunmi device detected, auto-creating built-in printer kitchen")
                    createSunmiKitchen(branchId)
                } else {
                    Log.d(TAG, "Sunmi kitchen already exists")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error auto-detecting Sunmi printer: ${e.message}", e)
            }
        }
    }

    /**
     * Tạo bếp với máy in Sunmi tích hợp
     */
    private suspend fun createSunmiKitchen(branchId: String) {
        withContext(Dispatchers.IO) {
            val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
            val sunmiModel = sunmiPrinterAdapter.getSunmiModel()

            // Lấy độ rộng giấy từ máy Sunmi (nếu có thể)
            val paperWidth = try {
                sunmiPrinterAdapter.connect()
                val width = sunmiPrinterAdapter.getPaperWidth()
                sunmiPrinterAdapter.disconnect()
                width
            } catch (e: Exception) {
                58 // Default 58mm
            }

            val sunmiKitchen = KitchenEntity(
                id = "${SUNMI_KITCHEN_ID}_$branchId",
                branchId = branchId,
                name = "Máy in Sunmi ($sunmiModel)",
                description = "Máy in tích hợp (tự động phát hiện)",
                kitchenType = "bar", // Default to bar type
                sortOrder = 0, // Top priority
                isActive = true,
                printMode = KitchenPrintMode.TICKET.name,
                paperWidth = paperWidth,
                printerIp = SUNMI_PRINTER_IP, // Special IP to indicate Sunmi printer
                printerPort = 0,
                printerName = sunmiModel,
                isPrinterConnected = true,
                ticketCutAfterPrint = true,
                ticketCopies = 1,
                createdAt = now,
                updatedAt = now,
                syncStatus = "local" // Đánh dấu là tạo local, chưa sync
            )

            kitchenRepository.insert(sunmiKitchen)
            Log.d(TAG, "Sunmi built-in printer kitchen created: $sunmiModel, paper width: ${paperWidth}mm")
        }

        _uiState.update { it.copy(successMessage = "Đã phát hiện máy in ${sunmiPrinterAdapter.getSunmiModel()}") }
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
                    // Chỉ hiển thị bếp in phiếu (TICKET hoặc BOTH), không hiển thị bếp chỉ in tem (LABEL)
                    val ticketKitchens = kitchens.filter { kitchen ->
                        kitchen.printMode == KitchenPrintMode.TICKET.name ||
                        kitchen.printMode == KitchenPrintMode.BOTH.name
                    }

                    // Sắp xếp: Sunmi printer (tự động phát hiện) luôn ở trên đầu
                    val sortedKitchens = ticketKitchens.sortedWith(
                        compareBy<KitchenEntity> {
                            // Sunmi printer lên đầu (printerIp = "sunmi")
                            if (it.printerIp == SUNMI_PRINTER_IP) 0 else 1
                        }.thenBy {
                            // Sau đó theo sortOrder
                            it.sortOrder
                        }.thenBy {
                            // Cuối cùng theo tên
                            it.name
                        }
                    )

                    _uiState.update {
                        it.copy(
                            kitchens = sortedKitchens,
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
        ticketPrintOrderNumber: Boolean = true,
        ticketPrintTableName: Boolean = true,
        ticketPrintTime: Boolean = true,
        ticketPrintNotes: Boolean = true,
        ticketPrintPrice: Boolean = false,
        ticketPrintStoreName: Boolean = false,
        ticketStoreName: String? = null,
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
                    ticketPrintOrderNumber = ticketPrintOrderNumber,
                    ticketPrintTableName = ticketPrintTableName,
                    ticketPrintTime = ticketPrintTime,
                    ticketPrintNotes = ticketPrintNotes,
                    ticketPrintPrice = ticketPrintPrice,
                    ticketPrintStoreName = ticketPrintStoreName,
                    ticketStoreName = ticketStoreName,
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

    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }
}
