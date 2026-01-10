package com.techres.ccb.presentation.screens.orderhistory

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
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
    val staffName: String?
)

data class OrderHistoryUiState(
    val isLoading: Boolean = false,
    val orders: List<OrderHistoryItem> = emptyList(),
    val statusFilter: OrderHistoryFilter = OrderHistoryFilter.ALL,
    val dateFilter: DateFilter = DateFilter.TODAY,
    val totalCount: Int = 0,
    val completedCount: Int = 0,
    val cancelledCount: Int = 0,
    val totalRevenue: Long = 0,
    val selectedOrder: OrderEntity? = null,
    val selectedOrderItems: List<OrderItemEntity> = emptyList(),
    val showOrderDetail: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class OrderHistoryViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val orderRepository: OrderRepository
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
                            staffName = entity.staffName
                        )
                    }

                    val completedCount = historyItems.count { it.status == "completed" }
                    val cancelledCount = historyItems.count { it.status == "cancelled" }
                    val totalRevenue = historyItems
                        .filter { it.status == "completed" }
                        .sumOf { it.totalAmount }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            orders = historyItems,
                            totalCount = historyItems.size,
                            completedCount = completedCount,
                            cancelledCount = cancelledCount,
                            totalRevenue = totalRevenue,
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
                showOrderDetail = false
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
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
