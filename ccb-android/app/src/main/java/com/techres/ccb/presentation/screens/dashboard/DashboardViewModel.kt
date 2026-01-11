package com.techres.ccb.presentation.screens.dashboard

import android.content.SharedPreferences
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.OrderRepository
import com.techres.ccb.data.repository.ShiftRepository
import com.techres.ccb.data.repository.TableRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PosOrder(
    val id: String,
    val tableName: String?,
    val customerName: String?,
    val itemCount: Int,
    val totalAmount: Long,
    val status: PosOrderStatus,
    val createdAt: Long,
    val orderNumber: Int,
    val isPrinted: Boolean = false
)

enum class PosOrderStatus(val displayName: String, val color: Long) {
    DRAFT("Đang order", 0xFFFF9800),
    CONFIRMED("Đã in", 0xFF2196F3),
    COMPLETED("Hoàn tất", 0xFF4CAF50)
}

data class DashboardUiState(
    val isLoading: Boolean = false,
    val branchName: String = "",
    val staffName: String = "",

    // POS Orders (tại quầy)
    val posOrders: List<PosOrder> = emptyList(),
    val draftPosCount: Int = 0,
    val confirmedPosCount: Int = 0,

    // Food App Orders - Not implemented yet (requires API)
    val foodAppOrderCount: Int = 0,

    // Total stats
    val totalActiveOrders: Int = 0,
    val todayRevenue: Long = 0,
    val todayOrderCount: Int = 0,

    // Grid settings
    val gridColumns: Int = 8,

    // Error
    val error: String? = null
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val orderRepository: OrderRepository,
    private val shiftRepository: ShiftRepository,
    private val tableRepository: TableRepository,
    private val sharedPreferences: SharedPreferences
) : ViewModel() {

    companion object {
        private const val TAG = "DashboardViewModel"
        private const val KEY_DASHBOARD_GRID_COLUMNS = "dashboard_grid_columns"
        private const val DEFAULT_GRID_COLUMNS = 8
    }

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    private var branchId: String = ""
    private var ordersObserverJob: Job? = null

    init {
        loadGridColumnsPreference()
        loadData()
    }

    private fun loadGridColumnsPreference() {
        val savedColumns = sharedPreferences.getInt(KEY_DASHBOARD_GRID_COLUMNS, DEFAULT_GRID_COLUMNS)
        Log.d(TAG, "loadGridColumnsPreference - Loaded columns from SharedPreferences: $savedColumns")
        _uiState.update { it.copy(gridColumns = savedColumns) }
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                branchId = authRepository.getBranchId() ?: ""
                val branchName = authRepository.getBranchName() ?: ""
                val staffName = authRepository.getCurrentStaffName() ?: "Nhân viên"

                if (branchId.isEmpty()) {
                    _uiState.update {
                        it.copy(isLoading = false, error = "Không tìm thấy chi nhánh")
                    }
                    return@launch
                }

                Log.d(TAG, "loadData - branchId: $branchId")

                _uiState.update {
                    it.copy(
                        branchName = branchName,
                        staffName = staffName
                    )
                }

                // Start observing orders continuously
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

    /**
     * Observe orders continuously from database
     */
    private fun startOrdersObserver() {
        // Cancel any existing observer
        ordersObserverJob?.cancel()

        ordersObserverJob = viewModelScope.launch {
            try {
                // Get current shift
                val currentShift = shiftRepository.getCurrentOpenShift(branchId)

                // Observe orders flow - will emit whenever orders change
                val ordersFlow = if (currentShift != null) {
                    orderRepository.getOrdersByShift(branchId, currentShift.id)
                } else {
                    orderRepository.getActiveOrders(branchId)
                }

                ordersFlow.collectLatest { orderEntities ->
                    Log.d(TAG, "Orders updated: ${orderEntities.size} orders")

                    val posOrders = orderEntities
                        .filter { it.status != "completed" && it.status != "cancelled" }
                        .map { entity ->
                            // Get item count for this order
                            val itemCount = orderRepository.getOrderItemsSync(entity.id).size
                            PosOrder(
                                id = entity.id,
                                tableName = entity.tableName,
                                customerName = entity.customerName,
                                itemCount = itemCount,
                                totalAmount = entity.totalAmount.toLong(),
                                status = mapOrderStatus(entity.status),
                                createdAt = parseTimestamp(entity.createdAt),
                                orderNumber = parseOrderNumber(entity.orderNumber),
                                isPrinted = entity.isPrinted
                            )
                        }

                    // Calculate stats
                    val draftPosCount = posOrders.count { it.status == PosOrderStatus.DRAFT }
                    val confirmedPosCount = posOrders.count { it.status == PosOrderStatus.CONFIRMED }
                    val todayRevenue = currentShift?.totalRevenue?.toLong() ?: 0L
                    val todayOrderCount = currentShift?.totalOrders ?: orderEntities.size

                    Log.d(TAG, "loadData - Loaded ${posOrders.size} active orders")

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            posOrders = posOrders,
                            draftPosCount = draftPosCount,
                            confirmedPosCount = confirmedPosCount,
                            foodAppOrderCount = 0, // Not implemented
                            totalActiveOrders = posOrders.size,
                            todayRevenue = todayRevenue,
                            todayOrderCount = todayOrderCount,
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

    fun refresh() {
        loadData()
    }

    fun setGridColumns(columns: Int) {
        if (columns in listOf(4, 6, 8)) {
            Log.d(TAG, "setGridColumns - Setting columns to: $columns")
            _uiState.update { it.copy(gridColumns = columns) }
            // Use commit() instead of apply() to ensure synchronous save
            val saved = sharedPreferences.edit().putInt(KEY_DASHBOARD_GRID_COLUMNS, columns).commit()
            Log.d(TAG, "setGridColumns - Saved to SharedPreferences: $saved")
        }
    }

    fun confirmPosOrder(orderId: String) {
        viewModelScope.launch {
            try {
                val now = java.time.Instant.now().toString()
                orderRepository.updateOrderStatus(orderId, "confirmed", now)

                _uiState.update { state ->
                    state.copy(
                        posOrders = state.posOrders.map { order ->
                            if (order.id == orderId && order.status == PosOrderStatus.DRAFT) {
                                order.copy(status = PosOrderStatus.CONFIRMED, isPrinted = true)
                            } else order
                        }
                    )
                }
                recalculateCounts()
            } catch (e: Exception) {
                Log.e(TAG, "confirmPosOrder - Error: ${e.message}", e)
            }
        }
    }

    /**
     * Complete order with full data sync
     * Đồng bộ: Order -> Order Items -> Table -> Shift Statistics
     */
    fun completePosOrder(orderId: String, paymentMethod: String = "cash") {
        viewModelScope.launch {
            try {
                val now = java.time.Instant.now().toString()
                val orderEntity = orderRepository.getOrderById(orderId) ?: return@launch

                // 1. Update order status to completed
                orderRepository.updateOrderStatus(orderId, "completed", now)

                // 2. Update all order items status to completed
                orderRepository.updateAllItemsStatus(orderId, "completed", now)

                // 3. Update table status to available
                orderEntity.tableId?.let { tableId ->
                    tableRepository.updateTableStatus(tableId, "available", null, now)
                }

                // 4. Update shift statistics
                orderEntity.shiftId?.let { shiftId ->
                    shiftRepository.addOrderRevenue(
                        shiftId = shiftId,
                        orderTotal = orderEntity.totalAmount,
                        discountAmount = orderEntity.discountAmount,
                        paymentMethod = paymentMethod,
                        updatedAt = now
                    )
                }

                _uiState.update { state ->
                    val completedOrder = state.posOrders.find { it.id == orderId }
                    state.copy(
                        posOrders = state.posOrders.filter { it.id != orderId },
                        todayRevenue = state.todayRevenue + (completedOrder?.totalAmount ?: 0),
                        todayOrderCount = state.todayOrderCount + 1
                    )
                }
                recalculateCounts()

                Log.d(TAG, "completePosOrder - Completed with full sync: $orderId")
            } catch (e: Exception) {
                Log.e(TAG, "completePosOrder - Error: ${e.message}", e)
            }
        }
    }

    fun updatePosOrderStatus(orderId: String, newStatus: PosOrderStatus) {
        viewModelScope.launch {
            try {
                val statusString = when (newStatus) {
                    PosOrderStatus.DRAFT -> "draft"
                    PosOrderStatus.CONFIRMED -> "confirmed"
                    PosOrderStatus.COMPLETED -> "completed"
                }
                val now = java.time.Instant.now().toString()
                orderRepository.updateOrderStatus(orderId, statusString, now)

                _uiState.update { state ->
                    val updatedOrders = if (newStatus == PosOrderStatus.COMPLETED) {
                        state.posOrders.filter { it.id != orderId }
                    } else {
                        state.posOrders.map { order ->
                            if (order.id == orderId) order.copy(status = newStatus) else order
                        }
                    }
                    state.copy(posOrders = updatedOrders)
                }
                recalculateCounts()
            } catch (e: Exception) {
                Log.e(TAG, "updatePosOrderStatus - Error: ${e.message}", e)
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Cancel order with full data sync
     * Đồng bộ: Order -> Order Items -> Table -> Shift Statistics
     */
    fun cancelPosOrder(orderId: String, reason: String = "") {
        viewModelScope.launch {
            try {
                val now = java.time.Instant.now().toString()
                val orderEntity = orderRepository.getOrderById(orderId) ?: return@launch

                // 1. Update order status to cancelled
                orderRepository.updateOrderStatus(orderId, "cancelled", now)

                // 2. Update all order items status to cancelled
                orderRepository.updateAllItemsStatus(orderId, "cancelled", now)

                // 3. Update table status to available
                orderEntity.tableId?.let { tableId ->
                    tableRepository.updateTableStatus(tableId, "available", null, now)
                }

                // 4. Update shift cancelled count
                orderEntity.shiftId?.let { shiftId ->
                    shiftRepository.incrementCancelledCount(shiftId, now)
                }

                _uiState.update { state ->
                    state.copy(
                        posOrders = state.posOrders.filter { it.id != orderId }
                    )
                }
                recalculateCounts()

                Log.d(TAG, "cancelPosOrder - Cancelled with full sync: $orderId")
            } catch (e: Exception) {
                Log.e(TAG, "cancelPosOrder - Error: ${e.message}", e)
            }
        }
    }

    /**
     * Get order items for a specific order
     */
    suspend fun getOrderItems(orderId: String): List<OrderItemEntity> {
        return try {
            orderRepository.getOrderItemsSync(orderId)
        } catch (e: Exception) {
            Log.e(TAG, "getOrderItems - Error: ${e.message}", e)
            emptyList()
        }
    }

    private fun recalculateCounts() {
        _uiState.update { state ->
            state.copy(
                draftPosCount = state.posOrders.count { it.status == PosOrderStatus.DRAFT },
                confirmedPosCount = state.posOrders.count { it.status == PosOrderStatus.CONFIRMED },
                totalActiveOrders = state.posOrders.size
            )
        }
    }

    private fun mapOrderStatus(status: String): PosOrderStatus {
        return when (status.lowercase()) {
            "draft", "pending" -> PosOrderStatus.DRAFT
            "confirmed", "preparing", "ready" -> PosOrderStatus.CONFIRMED
            "completed", "paid" -> PosOrderStatus.COMPLETED
            else -> PosOrderStatus.DRAFT
        }
    }

    private fun parseTimestamp(isoTime: String): Long {
        return try {
            java.time.Instant.parse(isoTime).toEpochMilli()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }

    private fun parseOrderNumber(orderNumber: String): Int {
        return try {
            orderNumber.replace(Regex("[^0-9]"), "").takeLast(4).toIntOrNull() ?: 0
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Get count of active orders (pending, confirmed status)
     */
    fun getActiveOrdersCount(): Int {
        return _uiState.value.totalActiveOrders
    }

    /**
     * Cancel all active orders before logout
     * Returns number of orders cancelled
     */
    suspend fun cancelAllActiveOrders(): Int {
        return try {
            val activeOrders = _uiState.value.posOrders
            var cancelledCount = 0
            val now = java.time.Instant.now().toString()

            activeOrders.forEach { posOrder ->
                try {
                    val order = orderRepository.getOrderById(posOrder.id)
                    if (order != null && order.status in listOf("pending", "confirmed", "draft")) {
                        val cancelledOrder = order.copy(
                            status = "cancelled",
                            cancelledAt = now,
                            cancelReason = "Hủy do đăng xuất",
                            updatedAt = now
                        )
                        orderRepository.updateOrder(cancelledOrder)

                        // Reset table status
                        order.tableId?.let { tableId ->
                            tableRepository.updateTableStatus(tableId, "available", null, now)
                        }
                        cancelledCount++
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "cancelAllActiveOrders - Error cancelling order ${posOrder.id}: ${e.message}")
                }
            }

            Log.d(TAG, "cancelAllActiveOrders - Cancelled $cancelledCount orders")
            cancelledCount
        } catch (e: Exception) {
            Log.e(TAG, "cancelAllActiveOrders - Error: ${e.message}", e)
            0
        }
    }

    /**
     * Full logout - Clear all database and preferences
     * @param cancelActiveOrders if true, cancel all active orders before logout
     * Returns true when logout is complete
     */
    suspend fun performFullLogout(cancelActiveOrders: Boolean = false): Boolean {
        return try {
            Log.d(TAG, "performFullLogout - Starting full logout...")

            // Cancel any active observers
            ordersObserverJob?.cancel()

            // Cancel active orders if requested
            if (cancelActiveOrders) {
                val cancelledCount = cancelAllActiveOrders()
                Log.d(TAG, "performFullLogout - Cancelled $cancelledCount active orders")
            }

            // Clear master data tables and preferences (preserves order history)
            authRepository.fullLogout()

            Log.d(TAG, "performFullLogout - Logout complete, master data cleared")
            true
        } catch (e: Exception) {
            Log.e(TAG, "performFullLogout - Error: ${e.message}", e)
            false
        }
    }
}
