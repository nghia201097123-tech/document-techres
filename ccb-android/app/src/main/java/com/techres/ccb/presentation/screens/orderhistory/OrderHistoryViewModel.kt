package com.techres.ccb.presentation.screens.orderhistory

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.BillTemplateDao
import com.techres.ccb.data.local.dao.BillPrinterConfigDao
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.printer.BillData
import com.techres.ccb.data.printer.BillItem
import com.techres.ccb.data.printer.BillVariant
import com.techres.ccb.data.printer.HybridBillPrintService
import com.techres.ccb.data.printer.PrinterResult
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Date
import java.util.Locale
import java.time.format.DateTimeFormatter
import javax.inject.Inject

enum class OrderHistoryFilter(val displayName: String) {
    ALL("Tất cả"),
    COMPLETED("Hoàn tất"),
    CANCELLED("Đã hủy")
}

enum class DateFilter(val displayName: String) {
    TODAY("Hôm nay"),
    YESTERDAY("Hôm qua"),
    THIS_WEEK("Tuần này"),
    THIS_MONTH("Tháng này"),
    ALL("Tất cả")
}

data class OrderHistoryItem(
    val id: String,
    val orderNumber: String,
    val tableName: String?,
    val customerName: String?,
    val itemCount: Int,
    val totalAmount: Long,
    val status: String,
    val paymentMethod: String?,
    val createdAt: Long,
    val completedAt: Long?,
    val cancelledAt: Long?,
    val cancelReason: String?,
    val staffName: String?,
    // Thêm cho hiển thị bảng chi tiết
    val subtotal: Long = 0,           // Tạm tính
    val vatAmount: Long = 0,          // VAT
    val discountAmount: Long = 0,     // Giảm giá
    val couponCode: String? = null,   // Mã coupon
    val paidAmount: Long = 0,         // Tiền thanh toán
    val guestCount: Int = 1,          // Số khách
    // Sync status
    val syncStatus: String = "pending", // pending, syncing, synced, failed
    val syncError: String? = null
)

data class OrderHistoryUiState(
    val isLoading: Boolean = false,
    val orders: List<OrderHistoryItem> = emptyList(),
    val allOrders: List<OrderHistoryItem> = emptyList(),  // All orders before pagination
    val statusFilter: OrderHistoryFilter = OrderHistoryFilter.ALL,
    val dateFilter: DateFilter = DateFilter.TODAY,
    val totalCount: Int = 0,
    val completedCount: Int = 0,
    val cancelledCount: Int = 0,
    val totalRevenue: Long = 0,
    val selectedOrder: OrderEntity? = null,
    val selectedOrderItems: List<OrderItemEntity> = emptyList(),
    val showOrderDetail: Boolean = false,
    val error: String? = null,
    // Pagination
    val currentPage: Int = 1,
    val pageSize: Int = 10,
    val totalPages: Int = 1,
    // Printing
    val isPrinting: Boolean = false,
    val printMessage: String? = null,
    // Syncing
    val isSyncing: Boolean = false,
    val syncMessage: String? = null,
    // Cancelling
    val isCancelling: Boolean = false,
    val cancelMessage: String? = null
)

@HiltViewModel
class OrderHistoryViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val orderRepository: OrderRepository,
    private val printerConfigDao: BillPrinterConfigDao,
    private val billTemplateDao: BillTemplateDao
) : ViewModel() {

    companion object {
        private const val TAG = "OrderHistoryViewModel"
    }

    private val _uiState = MutableStateFlow(OrderHistoryUiState())
    val uiState: StateFlow<OrderHistoryUiState> = _uiState.asStateFlow()

    private var branchId: String = ""
    private var ordersObserverJob: Job? = null

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                branchId = authRepository.getBranchId() ?: ""

                if (branchId.isEmpty()) {
                    _uiState.update {
                        it.copy(isLoading = false, error = "Không tìm thấy chi nhánh")
                    }
                    return@launch
                }

                Log.d(TAG, "loadData - branchId: $branchId")

                startOrdersObserver()

            } catch (e: Exception) {
                Log.e(TAG, "loadData - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Lỗi tải dữ liệu: ${e.message}"
                    )
                }
            }
        }
    }

    private fun startOrdersObserver() {
        ordersObserverJob?.cancel()

        ordersObserverJob = viewModelScope.launch {
            try {
                val (startDate, endDate) = getDateRange(_uiState.value.dateFilter)
                val statusFilter = _uiState.value.statusFilter

                val ordersFlow = when {
                    statusFilter == OrderHistoryFilter.ALL && startDate != null && endDate != null -> {
                        orderRepository.getOrderHistoryByDateRange(branchId, startDate, endDate)
                    }
                    statusFilter != OrderHistoryFilter.ALL && startDate != null && endDate != null -> {
                        val status = when (statusFilter) {
                            OrderHistoryFilter.COMPLETED -> "completed"
                            OrderHistoryFilter.CANCELLED -> "cancelled"
                            else -> "completed"
                        }
                        orderRepository.getOrderHistoryFiltered(branchId, status, startDate, endDate)
                    }
                    statusFilter != OrderHistoryFilter.ALL -> {
                        val status = when (statusFilter) {
                            OrderHistoryFilter.COMPLETED -> "completed"
                            OrderHistoryFilter.CANCELLED -> "cancelled"
                            else -> "completed"
                        }
                        orderRepository.getOrderHistoryByStatus(branchId, status)
                    }
                    else -> {
                        orderRepository.getOrderHistory(branchId)
                    }
                }

                ordersFlow.collectLatest { orderEntities ->
                    Log.d(TAG, "Orders history updated: ${orderEntities.size} orders")

                    val historyItems = orderEntities.map { entity ->
                        val itemCount = orderRepository.getOrderItemsSync(entity.id).size
                        OrderHistoryItem(
                            id = entity.id,
                            orderNumber = entity.orderNumber,
                            tableName = entity.tableName,
                            customerName = entity.customerName,
                            itemCount = itemCount,
                            totalAmount = entity.totalAmount.toLong(),
                            status = entity.status,
                            paymentMethod = entity.paymentMethod,
                            createdAt = parseTimestamp(entity.createdAt),
                            completedAt = entity.completedAt?.let { parseTimestamp(it) },
                            cancelledAt = entity.cancelledAt?.let { parseTimestamp(it) },
                            cancelReason = entity.cancelReason,
                            staffName = entity.staffName,
                            // Thêm thông tin chi tiết
                            subtotal = entity.subtotal.toLong(),
                            vatAmount = entity.vatAmount.toLong(),
                            discountAmount = entity.discountAmount.toLong(),
                            couponCode = entity.couponCode,
                            paidAmount = entity.paidAmount.toLong(),
                            guestCount = entity.guestCount,
                            // Sync status
                            syncStatus = entity.syncStatus,
                            syncError = entity.syncError
                        )
                    }

                    val completedCount = historyItems.count { it.status == "completed" }
                    val cancelledCount = historyItems.count { it.status == "cancelled" }
                    val totalRevenue = historyItems
                        .filter { it.status == "completed" }
                        .sumOf { it.totalAmount }

                    // Calculate pagination
                    val pageSize = _uiState.value.pageSize
                    val totalPages = if (historyItems.isEmpty()) 1 else (historyItems.size + pageSize - 1) / pageSize
                    val currentPage = minOf(_uiState.value.currentPage, totalPages)
                    val startIndex = (currentPage - 1) * pageSize
                    val endIndex = minOf(startIndex + pageSize, historyItems.size)
                    val pagedOrders = if (historyItems.isNotEmpty()) historyItems.subList(startIndex, endIndex) else emptyList()

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            orders = pagedOrders,
                            allOrders = historyItems,
                            totalCount = historyItems.size,
                            completedCount = completedCount,
                            cancelledCount = cancelledCount,
                            totalRevenue = totalRevenue,
                            currentPage = currentPage,
                            totalPages = totalPages,
                            error = null
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "startOrdersObserver - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Lỗi tải dữ liệu: ${e.message}"
                    )
                }
            }
        }
    }

    fun setStatusFilter(filter: OrderHistoryFilter) {
        _uiState.update { it.copy(statusFilter = filter) }
        startOrdersObserver()
    }

    fun setDateFilter(filter: DateFilter) {
        _uiState.update { it.copy(dateFilter = filter) }
        startOrdersObserver()
    }

    fun showOrderDetail(orderId: String) {
        viewModelScope.launch {
            try {
                val order = orderRepository.getOrderById(orderId)
                val items = orderRepository.getOrderItemsSync(orderId)

                _uiState.update {
                    it.copy(
                        selectedOrder = order,
                        selectedOrderItems = items,
                        showOrderDetail = true
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "showOrderDetail - Error: ${e.message}", e)
            }
        }
    }

    fun hideOrderDetail() {
        _uiState.update {
            it.copy(
                selectedOrder = null,
                selectedOrderItems = emptyList(),
                showOrderDetail = false,
                printMessage = null
            )
        }
    }

    fun clearPrintMessage() {
        _uiState.update { it.copy(printMessage = null) }
    }

    fun reprintBill() {
        val order = _uiState.value.selectedOrder ?: return
        val orderItems = _uiState.value.selectedOrderItems

        viewModelScope.launch {
            _uiState.update { it.copy(isPrinting = true, printMessage = null) }

            try {
                withContext(Dispatchers.IO) {
                    // Get current branch ID
                    val branchId = authRepository.getBranchId()
                    if (branchId.isNullOrEmpty()) {
                        _uiState.update {
                            it.copy(isPrinting = false, printMessage = "Không tìm thấy chi nhánh")
                        }
                        return@withContext
                    }

                    // Get printer config - try default first, then any active printer
                    var printerConfig = printerConfigDao.getDefaultByBranch(branchId)
                    if (printerConfig == null) {
                        // Fallback to first active printer
                        val activePrinters = printerConfigDao.getAllByBranchSync(branchId)
                        printerConfig = activePrinters.firstOrNull()
                    }
                    if (printerConfig == null) {
                        _uiState.update {
                            it.copy(isPrinting = false, printMessage = "Không tìm thấy máy in")
                        }
                        return@withContext
                    }

                    // Get bill template
                    var template = if (printerConfig.templateId != null) {
                        billTemplateDao.getById(printerConfig.templateId)
                    } else {
                        billTemplateDao.getDefaultByBranch(branchId)
                    }
                    if (template == null || !template.isActive) {
                        val activeTemplates = billTemplateDao.getAllByBranchSync(branchId)
                        template = activeTemplates.firstOrNull()
                    }

                    if (template == null) {
                        _uiState.update {
                            it.copy(isPrinting = false, printMessage = "Không tìm thấy mẫu in")
                        }
                        return@withContext
                    }

                    // Build BillData from order
                    val billData = buildBillDataFromOrder(order, orderItems)

                    // Print
                    val result = HybridBillPrintService.printBill(printerConfig, template, billData)
                    val message = when (result) {
                        is PrinterResult.Success -> "In lại bill thành công!"
                        is PrinterResult.Error -> "Lỗi in: ${result.message}"
                    }
                    _uiState.update { it.copy(isPrinting = false, printMessage = message) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "reprintBill - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(isPrinting = false, printMessage = "Lỗi: ${e.message}")
                }
            }
        }
    }

    private fun buildBillDataFromOrder(order: OrderEntity, orderItems: List<OrderItemEntity>): BillData {
        val orderDate = try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(order.createdAt) ?: Date()
        } catch (e: Exception) {
            Date()
        }

        val checkInTime = orderDate
        val checkOutTime = order.completedAt?.let {
            try { SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(it) } catch (e: Exception) { null }
        }

        val billItems = orderItems.filter { !it.isComboChild }.map { item ->
            // Parse variants
            val variants = if (!item.notes.isNullOrBlank()) {
                val parts = item.notes.split(" | ")
                val variantsPart = parts.firstOrNull() ?: ""
                variantsPart.split(",").map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("Ghi chú:") }.map { variant ->
                    val colonIndex = variant.lastIndexOf(":")
                    if (colonIndex > 0) {
                        BillVariant(variant.substring(0, colonIndex), variant.substring(colonIndex + 1).toDoubleOrNull() ?: 0.0)
                    } else {
                        BillVariant(variant, 0.0)
                    }
                }
            } else emptyList()

            val userNote = if (!item.notes.isNullOrBlank()) {
                val parts = item.notes.split(" | ")
                parts.getOrNull(1)
            } else null

            BillItem(
                code = item.productCode,
                name = item.productName,
                quantity = item.quantity,
                unitPrice = item.unitPrice,
                originalPrice = if (item.originalPrice > 0) item.originalPrice else item.unitPrice,
                discountAmount = item.discountAmount,
                discountPercent = 0.0,
                discountType = "fixed",
                totalPrice = item.totalPrice,
                note = userNote,
                variants = variants,
                toppings = emptyList(),
                vatRate = item.vatRate
            )
        }

        val subtotal = order.subtotal
        val totalItemDiscount = billItems.sumOf { it.discountAmount }
        val billDiscount = (order.discountAmount - totalItemDiscount).coerceAtLeast(0.0)
        val vatRate = 8.0
        val priceAfterDiscount = subtotal - order.discountAmount
        val priceBeforeVat = priceAfterDiscount / (1 + vatRate / 100)
        val vatAmount = priceAfterDiscount - priceBeforeVat

        return BillData(
            orderNumber = order.orderNumber,
            orderDate = orderDate,
            tableName = order.tableName,
            staffName = order.staffName,
            customerName = order.customerName,
            items = billItems,
            subtotal = subtotal,
            itemDiscountAmount = totalItemDiscount,
            billDiscountAmount = billDiscount,
            billDiscountPercent = 0.0,
            couponDiscountAmount = 0.0,
            couponCode = order.couponCode,
            voucherDiscountAmount = 0.0,
            voucherCode = null,
            totalDiscountAmount = order.discountAmount,
            totalItemDiscount = totalItemDiscount,
            discountAmount = billDiscount,
            discountPercent = 0.0,
            serviceFee = 0.0,
            serviceFeePercent = 0.0,
            vatRate = vatRate,
            vatAmount = vatAmount,
            priceBeforeVat = priceBeforeVat,
            priceAfterVat = priceAfterDiscount,
            totalAmount = order.totalAmount,
            paymentMethod = order.paymentMethod ?: "Tiền mặt",
            receivedAmount = order.paidAmount,
            changeAmount = order.changeAmount,
            checkInTime = checkInTime,
            checkOutTime = checkOutTime
        )
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearSyncMessage() {
        _uiState.update { it.copy(syncMessage = null) }
    }

    /**
     * Sync order to cloud
     * TODO: Implement actual cloud sync logic when ready
     */
    fun syncOrder() {
        val order = _uiState.value.selectedOrder ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true, syncMessage = null) }

            try {
                // TODO: Implement actual sync logic here
                // For now, just simulate a sync delay and show placeholder message
                kotlinx.coroutines.delay(1500)

                // Placeholder: Update sync status locally (in real implementation, this would be done after successful API call)
                // orderRepository.updateOrderSyncStatus(order.id, "synced")

                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        syncMessage = "Tính năng đồng bộ đang được phát triển. Vui lòng thử lại sau!"
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "syncOrder - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        syncMessage = "Lỗi đồng bộ: ${e.message}"
                    )
                }
            }
        }
    }

    fun clearCancelMessage() {
        _uiState.update { it.copy(cancelMessage = null) }
    }

    /**
     * Cancel a completed order
     */
    fun cancelOrder(reason: String) {
        val order = _uiState.value.selectedOrder ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isCancelling = true, cancelMessage = null) }

            try {
                withContext(Dispatchers.IO) {
                    val now = java.time.Instant.now().toString()

                    // Update order status to cancelled
                    val cancelledOrder = order.copy(
                        status = "cancelled",
                        cancelReason = reason,
                        cancelledAt = now,
                        updatedAt = now,
                        syncStatus = "pending" // Mark for re-sync
                    )

                    orderRepository.updateOrder(cancelledOrder)

                    Log.d(TAG, "cancelOrder - Order ${order.orderNumber} cancelled with reason: $reason")
                }

                _uiState.update {
                    it.copy(
                        isCancelling = false,
                        cancelMessage = "Huỷ đơn hàng thành công!",
                        showOrderDetail = false, // Close dialog after cancel
                        selectedOrder = null
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "cancelOrder - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isCancelling = false,
                        cancelMessage = "Lỗi huỷ đơn: ${e.message}"
                    )
                }
            }
        }
    }

    fun setPage(page: Int) {
        val state = _uiState.value
        val newPage = page.coerceIn(1, state.totalPages)
        if (newPage != state.currentPage) {
            val startIndex = (newPage - 1) * state.pageSize
            val endIndex = minOf(startIndex + state.pageSize, state.allOrders.size)
            val pagedOrders = if (state.allOrders.isNotEmpty()) state.allOrders.subList(startIndex, endIndex) else emptyList()
            _uiState.update { it.copy(currentPage = newPage, orders = pagedOrders) }
        }
    }

    fun nextPage() {
        setPage(_uiState.value.currentPage + 1)
    }

    fun previousPage() {
        setPage(_uiState.value.currentPage - 1)
    }

    fun setPageSize(size: Int) {
        val state = _uiState.value
        val newSize = size.coerceIn(5, 50)
        if (newSize != state.pageSize) {
            val totalPages = if (state.allOrders.isEmpty()) 1 else (state.allOrders.size + newSize - 1) / newSize
            val currentPage = 1  // Reset to first page when changing page size
            val startIndex = 0
            val endIndex = minOf(newSize, state.allOrders.size)
            val pagedOrders = if (state.allOrders.isNotEmpty()) state.allOrders.subList(startIndex, endIndex) else emptyList()
            _uiState.update {
                it.copy(
                    pageSize = newSize,
                    currentPage = currentPage,
                    totalPages = totalPages,
                    orders = pagedOrders
                )
            }
        }
    }

    private fun getDateRange(dateFilter: DateFilter): Pair<String?, String?> {
        if (dateFilter == DateFilter.ALL) {
            return null to null
        }

        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val formatter = DateTimeFormatter.ISO_INSTANT

        val (startDate, endDate) = when (dateFilter) {
            DateFilter.TODAY -> {
                val start = today.atStartOfDay(zone).toInstant()
                val end = today.plusDays(1).atStartOfDay(zone).toInstant()
                start to end
            }
            DateFilter.YESTERDAY -> {
                val yesterday = today.minusDays(1)
                val start = yesterday.atStartOfDay(zone).toInstant()
                val end = today.atStartOfDay(zone).toInstant()
                start to end
            }
            DateFilter.THIS_WEEK -> {
                val startOfWeek = today.minusDays(today.dayOfWeek.value.toLong() - 1)
                val start = startOfWeek.atStartOfDay(zone).toInstant()
                val end = today.plusDays(1).atStartOfDay(zone).toInstant()
                start to end
            }
            DateFilter.THIS_MONTH -> {
                val startOfMonth = today.withDayOfMonth(1)
                val start = startOfMonth.atStartOfDay(zone).toInstant()
                val end = today.plusDays(1).atStartOfDay(zone).toInstant()
                start to end
            }
            else -> return null to null
        }

        return formatter.format(startDate) to formatter.format(endDate)
    }

    private fun parseTimestamp(isoTime: String): Long {
        return try {
            Instant.parse(isoTime).toEpochMilli()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }
}
