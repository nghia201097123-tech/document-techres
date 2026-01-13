package com.techres.ccb.presentation.screens.settings

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.BillPrinterConfigDao
import com.techres.ccb.data.local.dao.BillTemplateDao
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity
import com.techres.ccb.data.printer.BillPrintService
import com.techres.ccb.data.printer.PrinterResult
import com.techres.ccb.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
    val testingPrinterId: String? = null,
    val successMessage: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class BillPrinterConfigViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val billPrinterConfigDao: BillPrinterConfigDao,
    private val billTemplateDao: BillTemplateDao
) : ViewModel() {

    companion object {
        private const val TAG = "BillPrinterConfigVM"
    }

    private val _uiState = MutableStateFlow(BillPrinterConfigUiState())
    val uiState: StateFlow<BillPrinterConfigUiState> = _uiState.asStateFlow()

    private var branchId: String = ""

    init {
        loadData()
    }

    private fun loadData() {
        branchId = authRepository.getBranchId() ?: ""
        if (branchId.isEmpty()) {
            _uiState.update { it.copy(isLoading = false, errorMessage = "Không tìm thấy chi nhánh") }
            return
        }

        _uiState.update { it.copy(isLoading = true) }

        // Load printer configs (Flow will keep collecting and updating UI)
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

        // Also load templates
        viewModelScope.launch {
            try {
                billTemplateDao.getAllByBranch(branchId).collect { templates ->
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
                    // Get template for test print
                    val template = if (config.templateId != null) {
                        billTemplateDao.getById(config.templateId)
                    } else {
                        billTemplateDao.getDefaultByBranch(branchId)
                    }

                    if (template == null) {
                        PrinterResult.Error("Không tìm thấy mẫu bill")
                    } else {
                        // Create test bill data
                        val testBillData = com.techres.ccb.data.printer.BillData(
                            orderNumber = "TEST-${System.currentTimeMillis() % 10000}",
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

                        BillPrintService.printBill(config, template, testBillData)
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

    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }

    fun clearErrorMessage() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
