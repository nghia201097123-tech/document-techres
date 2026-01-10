package com.techres.ccb.presentation.screens.dashboard

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.OrderRepository
import com.techres.ccb.data.repository.ShiftRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
    private val shiftRepository: ShiftRepository
) : ViewModel() {

    companion object {
        private const val TAG = "DashboardViewModel"
    }

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    private var branchId: String = ""

    init {
        loadData()
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

                // Get current shift
                val currentShift = shiftRepository.getCurrentOpenShift(branchId)

                // Load orders from database
                val orderEntities = if (currentShift != null) {
                    orderRepository.getOrdersByShift(branchId, currentShift.id).first()
                } else {
                    orderRepository.getActiveOrders(branchId).first()
                }

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
                        branchName = branchName,
                        staffName = staffName,
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

    fun refresh() {
        loadData()
    }

    fun setGridColumns(columns: Int) {
        if (columns in listOf(4, 6, 8)) {
            _uiState.update { it.copy(gridColumns = columns) }
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

    fun completePosOrder(orderId: String) {
        viewModelScope.launch {
            try {
                val now = java.time.Instant.now().toString()
                orderRepository.updateOrderStatus(orderId, "completed", now)

                _uiState.update { state ->
                    val completedOrder = state.posOrders.find { it.id == orderId }
                    state.copy(
                        posOrders = state.posOrders.filter { it.id != orderId },
                        todayRevenue = state.todayRevenue + (completedOrder?.totalAmount ?: 0),
                        todayOrderCount = state.todayOrderCount + 1
                    )
                }
                recalculateCounts()
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
}
