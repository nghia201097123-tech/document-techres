package com.techres.ccb.presentation.screens.settings

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.BillPrinterConfigDao
import com.techres.ccb.data.local.dao.BillTemplateDao
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity
import com.techres.ccb.data.printer.HybridBillPrintService
import com.techres.ccb.data.printer.PrinterResult
import com.techres.ccb.data.repository.AuthRepository
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
import java.util.*
import javax.inject.Inject

data class BillPrinterConfigUiState(
    val printerConfigs: List<BillPrinterConfigEntity> = emptyList(),
    val templates: List<BillTemplateEntity> = emptyList(),
    val isLoading: Boolean = false,
    val selectedConfig: BillPrinterConfigEntity? = null,
    val showEditDialog: Boolean = false,
    val showTemplateSelector: Boolean = false,
    val showPaperWidthSelector: Boolean = false,
    val showFontSizeSelector: Boolean = false,
    val showLineSpacingSelector: Boolean = false,
    val showNumberOfCopiesSelector: Boolean = false,
    val showPrintSettingsDialog: Boolean = false,
    val showAllSettingsDialog: Boolean = false,
    val testingPrinterId: String? = null,
    val successMessage: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class BillPrinterConfigViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val billPrinterConfigDao: BillPrinterConfigDao,
    private val billTemplateDao: BillTemplateDao,
    private val sunmiPrinterAdapter: SunmiPrinterAdapter
) : ViewModel() {

    companion object {
        private const val TAG = "BillPrinterConfigVM"
        private const val SUNMI_PRINTER_ID = "sunmi_builtin_printer"
    }

    private val _uiState = MutableStateFlow(BillPrinterConfigUiState())
    val uiState: StateFlow<BillPrinterConfigUiState> = _uiState.asStateFlow()

    private var branchId: String = ""

    init {
        loadData()
        // Tự động phát hiện máy in Sunmi tích hợp
        autoDetectSunmiPrinter()
    }

    /**
     * Tự động phát hiện và thêm máy in Sunmi tích hợp nếu:
     * 1. Thiết bị là Sunmi POS
     * 2. Chưa có cấu hình máy in Sunmi trong database
     */
    private fun autoDetectSunmiPrinter() {
        if (!sunmiPrinterAdapter.isSunmiDevice()) {
            Log.d(TAG, "Not a Sunmi device, skipping auto-detect")
            return
        }

        viewModelScope.launch {
            try {
                val branchIdLocal = authRepository.getBranchId() ?: return@launch

                // Kiểm tra xem đã có máy in Sunmi chưa
                val existingConfigs = billPrinterConfigDao.getAllByBranch(branchIdLocal).first()
                val hasSunmiPrinter = existingConfigs.any {
                    it.connectionType == "sunmi" || it.id == SUNMI_PRINTER_ID
                }

                if (!hasSunmiPrinter) {
                    Log.d(TAG, "Sunmi device detected, auto-creating built-in printer config")
                    createSunmiPrinterConfig(branchIdLocal)
                } else {
                    Log.d(TAG, "Sunmi printer config already exists")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error auto-detecting Sunmi printer: ${e.message}", e)
            }
        }
    }

    /**
     * Tạo cấu hình máy in Sunmi tích hợp
     */
    private suspend fun createSunmiPrinterConfig(branchIdLocal: String) {
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

            val sunmiConfig = BillPrinterConfigEntity(
                id = "${SUNMI_PRINTER_ID}_$branchIdLocal",
                branchId = branchIdLocal,
                name = sunmiModel,
                description = "Máy in tích hợp (tự động phát hiện)",
                connectionType = "sunmi",
                printerIp = null,
                printerPort = 0,
                printerMac = null,
                printerUsbPath = null,
                paperWidth = paperWidth,
                autoPrintOnPayment = true,
                printPreview = false,
                numberOfCopies = 1,
                cutPaper = true,
                openCashDrawer = true,
                beepAfterPrint = true,
                retryCount = 3,
                retryDelayMs = 1000,
                connectionTimeoutMs = 5000,
                isDefault = true, // Đặt làm mặc định
                isActive = true,
                sortOrder = 0,
                createdAt = now,
                updatedAt = now,
                syncStatus = "local", // Đánh dấu là tạo local, chưa sync
                isConnected = true
            )

            billPrinterConfigDao.insert(sunmiConfig)
            Log.d(TAG, "Sunmi built-in printer config created: $sunmiModel, paper width: ${paperWidth}mm")
        }

        _uiState.update { it.copy(successMessage = "Đã phát hiện máy in ${sunmiPrinterAdapter.getSunmiModel()}") }
    }

    private fun loadData() {
        branchId = authRepository.getBranchId() ?: ""
        val brandId = authRepository.getBrandId() ?: ""
        if (branchId.isEmpty()) {
            _uiState.update { it.copy(isLoading = false, errorMessage = "Không tìm thấy chi nhánh") }
            return
        }

        _uiState.update { it.copy(isLoading = true) }

        // Load printer configs (Flow will keep collecting and updating UI)
        // Printer configs are at branch level
        viewModelScope.launch {
            try {
                billPrinterConfigDao.getAllByBranch(branchId).collect { configs ->
                    _uiState.update { it.copy(printerConfigs = configs, isLoading = false) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading data: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi tải dữ liệu: ${e.message}", isLoading = false) }
            }
        }

        // Also load templates (templates are at brand level, shared across branches)
        viewModelScope.launch {
            try {
                billTemplateDao.getAllByBrand(brandId).collect { templates ->
                    _uiState.update { it.copy(templates = templates) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading templates: ${e.message}", e)
            }
        }
    }

    fun showEditDialog(config: BillPrinterConfigEntity?) {
        _uiState.update { it.copy(selectedConfig = config, showEditDialog = true) }
    }

    fun hideEditDialog() {
        _uiState.update { it.copy(selectedConfig = null, showEditDialog = false) }
    }

    fun showTemplateSelector(config: BillPrinterConfigEntity) {
        _uiState.update { it.copy(selectedConfig = config, showTemplateSelector = true) }
    }

    fun hideTemplateSelector() {
        _uiState.update { it.copy(selectedConfig = null, showTemplateSelector = false) }
    }

    fun showPaperWidthSelector(config: BillPrinterConfigEntity) {
        _uiState.update { it.copy(selectedConfig = config, showPaperWidthSelector = true) }
    }

    fun hidePaperWidthSelector() {
        _uiState.update { it.copy(selectedConfig = null, showPaperWidthSelector = false) }
    }

    fun showFontSizeSelector(config: BillPrinterConfigEntity) {
        _uiState.update { it.copy(selectedConfig = config, showFontSizeSelector = true) }
    }

    fun hideFontSizeSelector() {
        _uiState.update { it.copy(selectedConfig = null, showFontSizeSelector = false) }
    }

    fun showLineSpacingSelector(config: BillPrinterConfigEntity) {
        _uiState.update { it.copy(selectedConfig = config, showLineSpacingSelector = true) }
    }

    fun hideLineSpacingSelector() {
        _uiState.update { it.copy(selectedConfig = null, showLineSpacingSelector = false) }
    }

    fun showNumberOfCopiesSelector(config: BillPrinterConfigEntity) {
        _uiState.update { it.copy(selectedConfig = config, showNumberOfCopiesSelector = true) }
    }

    fun hideNumberOfCopiesSelector() {
        _uiState.update { it.copy(selectedConfig = null, showNumberOfCopiesSelector = false) }
    }

    fun showPrintSettingsDialog(config: BillPrinterConfigEntity) {
        _uiState.update { it.copy(selectedConfig = config, showPrintSettingsDialog = true) }
    }

    fun hidePrintSettingsDialog() {
        _uiState.update { it.copy(selectedConfig = null, showPrintSettingsDialog = false) }
    }

    fun showAllSettingsDialog(config: BillPrinterConfigEntity) {
        _uiState.update { it.copy(selectedConfig = config, showAllSettingsDialog = true) }
    }

    fun hideAllSettingsDialog() {
        _uiState.update { it.copy(selectedConfig = null, showAllSettingsDialog = false) }
    }

    /**
     * Update all printer settings at once from the all-in-one settings dialog
     */
    fun updateAllSettings(
        configId: String,
        connectionType: String,
        printerIp: String?,
        printerPort: Int,
        paperWidth: Int,
        fontSize: String,
        lineSpacing: Float,
        numberOfCopies: Int,
        printPreview: Boolean,
        cutPaper: Boolean,
        openCashDrawer: Boolean,
        beepAfterPrint: Boolean
    ) {
        viewModelScope.launch {
            try {
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                withContext(Dispatchers.IO) {
                    val current = billPrinterConfigDao.getById(configId) ?: return@withContext
                    val updated = current.copy(
                        connectionType = connectionType,
                        printerIp = if (connectionType == "network") printerIp else null,
                        printerPort = if (connectionType == "network") printerPort else 0,
                        paperWidth = paperWidth,
                        fontSize = fontSize,
                        lineSpacing = lineSpacing,
                        numberOfCopies = numberOfCopies,
                        printPreview = printPreview,
                        cutPaper = cutPaper,
                        openCashDrawer = openCashDrawer,
                        beepAfterPrint = beepAfterPrint,
                        updatedAt = now
                    )
                    billPrinterConfigDao.update(updated)
                }
                _uiState.update { it.copy(
                    successMessage = "Đã lưu cài đặt máy in",
                    showAllSettingsDialog = false,
                    selectedConfig = null
                ) }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating all settings: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun updatePrinterAddress(configId: String, ip: String, port: Int) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.updatePrinterAddress(configId, ip, port)
                }
                _uiState.update { it.copy(successMessage = "Đã cập nhật địa chỉ máy in") }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating printer address: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun updateTemplate(configId: String, templateId: String?) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.updateTemplate(configId, templateId)
                }
                _uiState.update { it.copy(successMessage = "Đã cập nhật mẫu bill", showTemplateSelector = false) }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating template: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun updatePaperWidth(configId: String, paperWidth: Int) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.updatePaperWidth(configId, paperWidth)
                }
                _uiState.update { it.copy(successMessage = "Đã cập nhật khổ giấy: ${paperWidth}mm") }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating paper width: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun updateFontSize(configId: String, fontSize: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.updateFontSize(configId, fontSize)
                }
                val label = when (fontSize) {
                    "extra_small" -> "Rất nhỏ (0.7x)"
                    "small" -> "Nhỏ (0.85x)"
                    "large" -> "Lớn (1.2x)"
                    "extra_large" -> "Rất lớn (1.4x)"
                    else -> "Vừa (1.0x)"
                }
                _uiState.update { it.copy(successMessage = "Đã cập nhật cỡ chữ: $label", showFontSizeSelector = false) }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating font size: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun updateLineSpacing(configId: String, lineSpacing: Float) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.updateLineSpacing(configId, lineSpacing)
                }
                _uiState.update { it.copy(successMessage = "Đã cập nhật khoảng cách dòng: ${(lineSpacing * 100).toInt()}%", showLineSpacingSelector = false) }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating line spacing: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun updateNumberOfCopies(configId: String, numberOfCopies: Int) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.updateNumberOfCopies(configId, numberOfCopies)
                }
                _uiState.update { it.copy(successMessage = "Đã cập nhật số bản in: $numberOfCopies", showNumberOfCopiesSelector = false) }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating number of copies: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun toggleCutPaper(config: BillPrinterConfigEntity) {
        viewModelScope.launch {
            try {
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                val updated = config.copy(cutPaper = !config.cutPaper, updatedAt = now)
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.update(updated)
                }
                // Update selectedConfig in UI state to reflect the change
                _uiState.update { it.copy(
                    selectedConfig = updated,
                    successMessage = if (updated.cutPaper) "Đã bật cắt giấy tự động" else "Đã tắt cắt giấy tự động"
                ) }
            } catch (e: Exception) {
                Log.e(TAG, "Error toggling cut paper: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun toggleOpenCashDrawer(config: BillPrinterConfigEntity) {
        viewModelScope.launch {
            try {
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                val updated = config.copy(openCashDrawer = !config.openCashDrawer, updatedAt = now)
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.update(updated)
                }
                // Update selectedConfig in UI state to reflect the change
                _uiState.update { it.copy(
                    selectedConfig = updated,
                    successMessage = if (updated.openCashDrawer) "Đã bật mở két tiền" else "Đã tắt mở két tiền"
                ) }
            } catch (e: Exception) {
                Log.e(TAG, "Error toggling open cash drawer: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun toggleBeepAfterPrint(config: BillPrinterConfigEntity) {
        viewModelScope.launch {
            try {
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                val updated = config.copy(beepAfterPrint = !config.beepAfterPrint, updatedAt = now)
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.update(updated)
                }
                // Update selectedConfig in UI state to reflect the change
                _uiState.update { it.copy(
                    selectedConfig = updated,
                    successMessage = if (updated.beepAfterPrint) "Đã bật beep sau khi in" else "Đã tắt beep sau khi in"
                ) }
            } catch (e: Exception) {
                Log.e(TAG, "Error toggling beep after print: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun setDefault(configId: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.setAsDefault(branchId, configId)
                }
                _uiState.update { it.copy(successMessage = "Đã đặt làm máy in mặc định") }
            } catch (e: Exception) {
                Log.e(TAG, "Error setting default: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun testPrinterConnection(config: BillPrinterConfigEntity) {
        viewModelScope.launch {
            _uiState.update { it.copy(testingPrinterId = config.id) }
            try {
                val result = withContext(Dispatchers.IO) {
                    // Get template for test print (templates are at brand level)
                    val brandId = authRepository.getBrandId() ?: ""
                    val template = if (config.templateId != null) {
                        billTemplateDao.getById(config.templateId)
                    } else {
                        billTemplateDao.getDefaultByBrand(brandId)
                    }

                    if (template == null) {
                        PrinterResult.Error("Không tìm thấy mẫu bill")
                    } else {
                        // Create test bill data
                        val testBillData = com.techres.ccb.data.printer.BillData(
                            orderNumber = "TEST-${System.currentTimeMillis() % 10000}",
                            dailyOrderNumber = (System.currentTimeMillis() % 9999).toInt() + 1,
                            orderDate = Date(),
                            tableName = "Bàn Test",
                            staffName = "Nhân viên Test",
                            customerName = null,
                            items = listOf(
                                com.techres.ccb.data.printer.BillItem(
                                    code = "TEST01",
                                    name = "Món test 1",
                                    quantity = 2,
                                    unitPrice = 50000.0,
                                    totalPrice = 100000.0,
                                    note = null,
                                    toppings = emptyList()
                                ),
                                com.techres.ccb.data.printer.BillItem(
                                    code = "TEST02",
                                    name = "Món test 2",
                                    quantity = 1,
                                    unitPrice = 35000.0,
                                    totalPrice = 35000.0,
                                    note = "Ghi chú test",
                                    toppings = listOf(
                                        com.techres.ccb.data.printer.BillTopping("Topping A", 5000.0)
                                    )
                                )
                            ),
                            subtotal = 140000.0,
                            discountAmount = 0.0,
                            discountPercent = 0.0,
                            serviceFee = 0.0,
                            vatRate = 10.0,
                            vatAmount = 12727.27,
                            priceBeforeVat = 127272.73,
                            priceAfterVat = 140000.0,
                            totalAmount = 140000.0,
                            paymentMethod = "Tiền mặt",
                            receivedAmount = 150000.0,
                            changeAmount = 10000.0
                        )

                        HybridBillPrintService.printBill(config, template, testBillData)
                    }
                }

                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                when (result) {
                    is PrinterResult.Success -> {
                        withContext(Dispatchers.IO) {
                            billPrinterConfigDao.updateConnectionStatus(config.id, true)
                            billPrinterConfigDao.updateLastPrint(config.id, now)
                        }
                        _uiState.update { it.copy(successMessage = "Test in thành công!") }
                    }
                    is PrinterResult.Error -> {
                        withContext(Dispatchers.IO) {
                            billPrinterConfigDao.updateConnectionStatus(config.id, false)
                            billPrinterConfigDao.updateLastError(config.id, result.message)
                        }
                        _uiState.update { it.copy(errorMessage = "Lỗi: ${result.message}") }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error testing printer: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi kết nối: ${e.message}") }
            } finally {
                _uiState.update { it.copy(testingPrinterId = null) }
            }
        }
    }

    fun toggleAutoPrint(config: BillPrinterConfigEntity) {
        viewModelScope.launch {
            try {
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                val updated = config.copy(
                    autoPrintOnPayment = !config.autoPrintOnPayment,
                    updatedAt = now
                )
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.update(updated)
                }
                _uiState.update {
                    it.copy(successMessage = if (updated.autoPrintOnPayment) "Đã bật tự động in" else "Đã tắt tự động in")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error toggling auto print: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    /**
     * Toggle isActive status for a bill printer (enable/disable printing)
     */
    fun toggleActiveStatus(config: BillPrinterConfigEntity) {
        viewModelScope.launch {
            try {
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                val updated = config.copy(
                    isActive = !config.isActive,
                    updatedAt = now
                )
                withContext(Dispatchers.IO) {
                    billPrinterConfigDao.update(updated)
                }
                _uiState.update {
                    it.copy(successMessage = if (updated.isActive) "Đã bật máy in" else "Đã tắt máy in")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error toggling active status: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi: ${e.message}") }
            }
        }
    }

    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }

    fun clearErrorMessage() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
