package com.techres.ccb.presentation.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.mock.FoodOrderMockData
import com.techres.ccb.domain.model.FoodAppOrder
import com.techres.ccb.domain.model.FoodOrderStatus
import com.techres.ccb.domain.model.FoodPlatform
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// Mock data for POS orders (orders at counter)
data class PosOrder(
    val id: String,
    val tableName: String?,       // null = mang đi (takeaway)
    val customerName: String?,
    val itemCount: Int,
    val totalAmount: Long,
    val status: PosOrderStatus,
    val createdAt: Long,
    val orderNumber: Int,         // Số thứ tự đơn trong ngày
    val isPrinted: Boolean = false  // Đã in bill chưa
)

// Quy trình: Order → Xác nhận (in bill, in món) → Hoàn tất
enum class PosOrderStatus(val displayName: String, val color: Long) {
    DRAFT("Đang order", 0xFFFF9800),        // Đang chọn món
    CONFIRMED("Đã in", 0xFF2196F3),         // Đã xác nhận, đã in bill
    COMPLETED("Hoàn tất", 0xFF4CAF50)       // Đã hoàn tất đơn
}

data class DashboardUiState(
    val isLoading: Boolean = false,
    val branchName: String = "Chi nhánh TechRes",
    val staffName: String = "Nhân viên",

    // POS Orders (tại quầy)
    val posOrders: List<PosOrder> = emptyList(),
    val draftPosCount: Int = 0,        // Đang order
    val confirmedPosCount: Int = 0,    // Chờ thanh toán

    // Food App Orders
    val foodAppOrders: List<FoodAppOrder> = emptyList(),
    val newFoodOrderCount: Int = 0,
    val processingFoodOrderCount: Int = 0,

    // Total stats
    val totalActiveOrders: Int = 0,
    val todayRevenue: Long = 0,
    val todayOrderCount: Int = 0,

    // Grid settings
    val gridColumns: Int = 8  // 4, 6, or 8
)

@HiltViewModel
class DashboardViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Load mock POS orders
            val posOrders = getMockPosOrders()

            // Load mock Food App orders (only active ones)
            val foodOrders = FoodOrderMockData.foodOrders.filter { order ->
                order.status in listOf(
                    FoodOrderStatus.NEW,
                    FoodOrderStatus.ACCEPTED,
                    FoodOrderStatus.PREPARING,
                    FoodOrderStatus.READY,
                    FoodOrderStatus.DELIVERING
                )
            }

            _uiState.update { state ->
                state.copy(
                    isLoading = false,
                    posOrders = posOrders,
                    draftPosCount = posOrders.count { it.status == PosOrderStatus.DRAFT },
                    confirmedPosCount = posOrders.count { it.status == PosOrderStatus.CONFIRMED },
                    foodAppOrders = foodOrders,
                    newFoodOrderCount = foodOrders.count { it.status == FoodOrderStatus.NEW },
                    processingFoodOrderCount = foodOrders.count {
                        it.status in listOf(FoodOrderStatus.ACCEPTED, FoodOrderStatus.PREPARING)
                    },
                    totalActiveOrders = posOrders.size + foodOrders.size,
                    todayRevenue = 2_450_000,  // Mock data
                    todayOrderCount = 15       // Mock data
                )
            }
        }
    }

    fun refresh() {
        loadData()
    }

    // Change grid columns (4, 6, or 8)
    fun setGridColumns(columns: Int) {
        if (columns in listOf(4, 6, 8)) {
            _uiState.update { it.copy(gridColumns = columns) }
        }
    }

    // Accept food order
    fun acceptFoodOrder(orderId: String) {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    foodAppOrders = state.foodAppOrders.map { order ->
                        if (order.id == orderId && order.status == FoodOrderStatus.NEW) {
                            order.copy(
                                status = FoodOrderStatus.ACCEPTED,
                                acceptedAt = System.currentTimeMillis()
                            )
                        } else order
                    }
                )
            }
            recalculateCounts()
        }
    }

    // Start preparing food order
    fun startPreparingFoodOrder(orderId: String) {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    foodAppOrders = state.foodAppOrders.map { order ->
                        if (order.id == orderId && order.status == FoodOrderStatus.ACCEPTED) {
                            order.copy(status = FoodOrderStatus.PREPARING)
                        } else order
                    }
                )
            }
            recalculateCounts()
        }
    }

    // Mark food order as ready
    fun markFoodOrderReady(orderId: String) {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    foodAppOrders = state.foodAppOrders.map { order ->
                        if (order.id == orderId && order.status == FoodOrderStatus.PREPARING) {
                            order.copy(
                                status = FoodOrderStatus.READY,
                                preparedAt = System.currentTimeMillis()
                            )
                        } else order
                    }
                )
            }
            recalculateCounts()
        }
    }

    // Complete food order
    fun completeFoodOrder(orderId: String) {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    foodAppOrders = state.foodAppOrders.filter { it.id != orderId }
                )
            }
            recalculateCounts()
        }
    }

    // Xác nhận đơn POS (in bill, in món)
    fun confirmPosOrder(orderId: String) {
        viewModelScope.launch {
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
            // TODO: Gọi API in bill và in món cho bếp
        }
    }

    // Hoàn tất đơn POS
    fun completePosOrder(orderId: String) {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    posOrders = state.posOrders.filter { it.id != orderId },
                    todayRevenue = state.todayRevenue + (state.posOrders.find { it.id == orderId }?.totalAmount ?: 0),
                    todayOrderCount = state.todayOrderCount + 1
                )
            }
            recalculateCounts()
            // TODO: Gọi API hoàn tất đơn
        }
    }

    // Update POS order status (legacy - có thể dùng cho các trường hợp khác)
    fun updatePosOrderStatus(orderId: String, newStatus: PosOrderStatus) {
        viewModelScope.launch {
            _uiState.update { state ->
                val updatedOrders = if (newStatus == PosOrderStatus.PAID) {
                    state.posOrders.filter { it.id != orderId }
                } else {
                    state.posOrders.map { order ->
                        if (order.id == orderId) order.copy(status = newStatus) else order
                    }
                }
                state.copy(posOrders = updatedOrders)
            }
            recalculateCounts()
        }
    }

    private fun recalculateCounts() {
        _uiState.update { state ->
            state.copy(
                draftPosCount = state.posOrders.count { it.status == PosOrderStatus.DRAFT },
                confirmedPosCount = state.posOrders.count { it.status == PosOrderStatus.CONFIRMED },
                newFoodOrderCount = state.foodAppOrders.count { it.status == FoodOrderStatus.NEW },
                processingFoodOrderCount = state.foodAppOrders.count {
                    it.status in listOf(FoodOrderStatus.ACCEPTED, FoodOrderStatus.PREPARING)
                },
                totalActiveOrders = state.posOrders.size + state.foodAppOrders.size
            )
        }
    }

    private fun getMockPosOrders(): List<PosOrder> {
        val now = System.currentTimeMillis()
        return listOf(
            // Đơn đang order (chưa xác nhận)
            PosOrder(
                id = "pos_001",
                tableName = "Bàn 5",
                customerName = null,
                itemCount = 3,
                totalAmount = 125_000,
                status = PosOrderStatus.DRAFT,
                createdAt = now - 5 * 60 * 1000,
                orderNumber = 12
            ),
            PosOrder(
                id = "pos_002",
                tableName = "Bàn 2",
                customerName = "Anh Minh",
                itemCount = 5,
                totalAmount = 285_000,
                status = PosOrderStatus.DRAFT,
                createdAt = now - 2 * 60 * 1000,
                orderNumber = 13
            ),
            // Đơn đã xác nhận (chờ thanh toán)
            PosOrder(
                id = "pos_003",
                tableName = null,  // Mang đi
                customerName = "Chị Hương",
                itemCount = 2,
                totalAmount = 89_000,
                status = PosOrderStatus.CONFIRMED,
                createdAt = now - 20 * 60 * 1000,
                orderNumber = 11,
                isPrinted = true
            ),
            PosOrder(
                id = "pos_004",
                tableName = "Bàn 8",
                customerName = null,
                itemCount = 4,
                totalAmount = 175_000,
                status = PosOrderStatus.CONFIRMED,
                createdAt = now - 15 * 60 * 1000,
                orderNumber = 10,
                isPrinted = true
            ),
            PosOrder(
                id = "pos_005",
                tableName = "Bàn 1",
                customerName = "Anh Tuấn",
                itemCount = 6,
                totalAmount = 320_000,
                status = PosOrderStatus.DRAFT,
                createdAt = now - 1 * 60 * 1000,
                orderNumber = 14
            )
        )
    }
}
