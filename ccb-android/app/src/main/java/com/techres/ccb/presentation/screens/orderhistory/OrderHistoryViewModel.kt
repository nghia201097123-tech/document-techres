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
import com.techres.ccb.data.printer.BillSurchargeItem
import com.techres.ccb.data.printer.BillVariant
import com.techres.ccb.data.printer.HybridBillPrintService
import com.techres.ccb.data.printer.PrinterResult
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
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
    CUSTOM("Tùy chọn"),
    ALL("Tất cả")
}

enum class OrderTypeFilter(val displayName: String) {
    ALL("Tất cả"),
    DINE_IN("Tại chỗ"),
    TAKEAWAY("Mang đi")
}

enum class SyncStatusFilter(val displayName: String) {
    ALL("Tất cả"),
    SYNCED("Đã đồng bộ"),
    PENDING("Chờ đồng bộ"),
    FAILED("Lỗi")
}

enum class SortOption(val displayName: String) {
    TIME_DESC("Mới nhất"),
    TIME_ASC("Cũ nhất"),
    AMOUNT_DESC("Tiền cao nhất"),
    AMOUNT_ASC("Tiền thấp nhất")
}

data class OrderHistoryItem(
    val id: String,
    val orderNumber: String,
    val dailyOrderNumber: Int = 0,  // Mã đơn hàng theo ngày (#0001, #0002...)
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
    val surchargeAmount: Long = 0,    // Phụ thu
    val couponCode: String? = null,   // Mã coupon
    val paidAmount: Long = 0,         // Tiền thanh toán
    val guestCount: Int = 1,          // Số khách
    // Order type
    val orderType: String = "dine_in", // dine_in, takeaway, delivery
    // Sync status
    val syncStatus: String = "pending", // pending, syncing, synced, failed
    val syncError: String? = null
) {
    // Display number formatted as #0001
    val displayNumber: String
        get() = if (dailyOrderNumber > 0) {
            "#${dailyOrderNumber.toString().padStart(4, '0')}"
        } else {
            "#${orderNumber.takeLast(8)}"  // Fallback to last 8 chars of order number
        }
}

data class OrderHistoryUiState(
    val isLoading: Boolean = false,
    val orders: List<OrderHistoryItem> = emptyList(),
    val allOrders: List<OrderHistoryItem> = emptyList(),  // All orders before pagination
    val statusFilter: OrderHistoryFilter = OrderHistoryFilter.ALL,
    val dateFilter: DateFilter = DateFilter.TODAY,
    // Custom date range
    val customStartDate: LocalDate? = null,
    val customEndDate: LocalDate? = null,
    val showDatePicker: Boolean = false,
    val datePickerType: String = "start", // "start" or "end"
    // Additional filters
    val orderTypeFilter: OrderTypeFilter = OrderTypeFilter.ALL,
    val syncStatusFilter: SyncStatusFilter = SyncStatusFilter.ALL,
    // Sorting
    val sortOption: SortOption = SortOption.TIME_DESC,
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
                            dailyOrderNumber = entity.dailyOrderNumber,
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
                            surchargeAmount = entity.surchargeAmount.toLong(),
                            couponCode = entity.couponCode,
                            paidAmount = entity.paidAmount.toLong(),
                            guestCount = entity.guestCount,
                            // Order type
                            orderType = entity.orderType,
                            // Sync status
                            syncStatus = entity.syncStatus,
                            syncError = entity.syncError
                        )
                    }

                    // Apply additional filters (order type, sync status)
                    val orderTypeFilter = _uiState.value.orderTypeFilter
                    val syncStatusFilter = _uiState.value.syncStatusFilter

                    val filteredItems = historyItems.filter { item ->
                        val matchesOrderType = when (orderTypeFilter) {
                            OrderTypeFilter.ALL -> true
                            OrderTypeFilter.DINE_IN -> item.orderType == "dine_in"
                            OrderTypeFilter.TAKEAWAY -> item.orderType == "takeaway"
                        }
                        val matchesSyncStatus = when (syncStatusFilter) {
                            SyncStatusFilter.ALL -> true
                            SyncStatusFilter.SYNCED -> item.syncStatus == "synced"
                            SyncStatusFilter.PENDING -> item.syncStatus == "pending"
                            SyncStatusFilter.FAILED -> item.syncStatus == "failed"
                        }
                        matchesOrderType && matchesSyncStatus
                    }

                    // Apply sorting
                    val sortOption = _uiState.value.sortOption
                    val sortedItems = when (sortOption) {
                        SortOption.TIME_DESC -> filteredItems.sortedByDescending { it.createdAt }
                        SortOption.TIME_ASC -> filteredItems.sortedBy { it.createdAt }
                        SortOption.AMOUNT_DESC -> filteredItems.sortedByDescending { it.totalAmount }
                        SortOption.AMOUNT_ASC -> filteredItems.sortedBy { it.totalAmount }
                    }

                    val completedCount = sortedItems.count { it.status == "completed" }
                    val cancelledCount = sortedItems.count { it.status == "cancelled" }
                    val totalRevenue = sortedItems
                        .filter { it.status == "completed" }
                        .sumOf { it.totalAmount }

                    // Calculate pagination
                    val pageSize = _uiState.value.pageSize
                    val totalPages = if (sortedItems.isEmpty()) 1 else (sortedItems.size + pageSize - 1) / pageSize
                    val currentPage = minOf(_uiState.value.currentPage, totalPages)
                    val startIndex = (currentPage - 1) * pageSize
                    val endIndex = minOf(startIndex + pageSize, sortedItems.size)
                    val pagedOrders = if (sortedItems.isNotEmpty()) sortedItems.subList(startIndex, endIndex) else emptyList()

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            orders = pagedOrders,
                            allOrders = sortedItems,
                            totalCount = sortedItems.size,
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
        if (filter == DateFilter.CUSTOM) {
            // Initialize custom dates if not set
            val today = LocalDate.now()
            _uiState.update {
                it.copy(
                    dateFilter = filter,
                    customStartDate = it.customStartDate ?: today,
                    customEndDate = it.customEndDate ?: today
                )
            }
        } else {
            _uiState.update { it.copy(dateFilter = filter) }
        }
        startOrdersObserver()
    }

    fun setOrderTypeFilter(filter: OrderTypeFilter) {
        _uiState.update { it.copy(orderTypeFilter = filter, currentPage = 1) }
        startOrdersObserver()
    }

    fun setSyncStatusFilter(filter: SyncStatusFilter) {
        _uiState.update { it.copy(syncStatusFilter = filter, currentPage = 1) }
        startOrdersObserver()
    }

    fun setSortOption(option: SortOption) {
        _uiState.update { it.copy(sortOption = option, currentPage = 1) }
        startOrdersObserver()
    }

    fun showDatePicker(type: String) {
        _uiState.update { it.copy(showDatePicker = true, datePickerType = type) }
    }

    fun hideDatePicker() {
        _uiState.update { it.copy(showDatePicker = false) }
    }

    fun setCustomStartDate(date: LocalDate) {
        _uiState.update { it.copy(customStartDate = date, showDatePicker = false) }
        if (_uiState.value.dateFilter == DateFilter.CUSTOM) {
            startOrdersObserver()
        }
    }

    fun setCustomEndDate(date: LocalDate) {
        _uiState.update { it.copy(customEndDate = date, showDatePicker = false) }
        if (_uiState.value.dateFilter == DateFilter.CUSTOM) {
            startOrdersObserver()
        }
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
            // Format trong notes: "+ ToppingName (+100000)" hoặc "Size: L (+10000)"
            val variants = if (!item.notes.isNullOrBlank()) {
                val parts = item.notes.split(" | ")
                val variantsPart = parts.firstOrNull() ?: ""
                variantsPart.split(",").map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("Ghi chú:") }.map { variant ->
                    // Parse price from format "(+price)" at the end
                    val priceStart = variant.lastIndexOf("(+")
                    val priceEnd = variant.lastIndexOf(")")
                    val price = if (priceStart > 0 && priceEnd > priceStart) {
                        variant.substring(priceStart + 2, priceEnd).toDoubleOrNull() ?: 0.0
                    } else {
                        0.0
                    }
                    // Get name without price suffix
                    val name = if (priceStart > 0) {
                        variant.substring(0, priceStart).trim()
                    } else {
                        variant
                    }
                    BillVariant(name, price)
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

        // Parse surcharge items from JSON
        val surchargeItems: List<BillSurchargeItem> = try {
            if (!order.surchargesJson.isNullOrEmpty()) {
                val type = object : TypeToken<List<Map<String, Any>>>() {}.type
                val surchargesList: List<Map<String, Any>> = Gson().fromJson(order.surchargesJson, type)
                surchargesList.map { map ->
                    BillSurchargeItem(
                        id = map["id"] as? String ?: "",
                        name = map["name"] as? String ?: "Phụ thu",
                        amount = (map["amount"] as? Double) ?: 0.0,
                        quantity = (map["quantity"] as? Double)?.toInt() ?: 1,
                        vatRate = (map["vatRate"] as? Double) ?: 0.0
                    )
                }
            } else emptyList()
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing surcharges JSON: ${e.message}")
            emptyList()
        }

        return BillData(
            orderNumber = order.orderNumber,
            orderDate = orderDate,
            tableName = order.tableName,
            pagerNumber = order.pagerNumber,
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
            surchargeAmount = order.surchargeAmount,
            surchargeItems = surchargeItems,
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
            // Ghi chú tổng bill
            orderNote = order.notes,
            checkInTime = checkInTime,
            checkOutTime = checkOutTime,
            // Đánh dấu đây là bill in lại (tránh gian lận nhân viên)
            isReprint = true,
            reprintTime = Date(),
            reprintReason = "In lại từ lịch sử đơn hàng"
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

        val (startLocalDate, endLocalDate) = when (dateFilter) {
            DateFilter.TODAY -> {
                today to today
            }
            DateFilter.YESTERDAY -> {
                val yesterday = today.minusDays(1)
                yesterday to yesterday
            }
            DateFilter.THIS_WEEK -> {
                val startOfWeek = today.minusDays(today.dayOfWeek.value.toLong() - 1)
                startOfWeek to today
            }
            DateFilter.THIS_MONTH -> {
                val startOfMonth = today.withDayOfMonth(1)
                startOfMonth to today
            }
            DateFilter.CUSTOM -> {
                val customStart = _uiState.value.customStartDate ?: today
                val customEnd = _uiState.value.customEndDate ?: today
                customStart to customEnd
            }
            else -> return null to null
        }

        // Format as simple date string for LIKE comparison: "2025-01-17"
        // This ensures timezone issues don't affect the query
        val startDate = startLocalDate.toString() // "2025-01-17"
        val endDate = endLocalDate.plusDays(1).toString() // "2025-01-18" (exclusive)

        Log.d(TAG, "getDateRange - filter: $dateFilter, startDate: $startDate, endDate: $endDate")

        return startDate to endDate
    }

    private fun parseTimestamp(isoTime: String): Long {
        return try {
            Instant.parse(isoTime).toEpochMilli()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }
}
