package com.techres.ccb.presentation.screens.foodorder

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.mock.FoodOrderMockData
import com.techres.ccb.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FoodOrderUiState(
    // Orders
    val orders: List<FoodAppOrder> = emptyList(),
    val selectedOrder: FoodAppOrder? = null,

    // Filters
    val selectedFilter: FoodOrderFilter = FoodOrderFilter.ALL,
    val selectedPlatform: FoodPlatform? = null,  // null = all platforms

    // Counts
    val newOrdersCount: Int = 0,
    val processingOrdersCount: Int = 0,

    // UI State
    val isLoading: Boolean = false,
    val showOrderDetail: Boolean = false,

    // Messages
    val successMessage: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class FoodOrderViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(FoodOrderUiState())
    val uiState: StateFlow<FoodOrderUiState> = _uiState.asStateFlow()

    // Mutable list to simulate state changes
    private val _ordersList = FoodOrderMockData.foodOrders.toMutableList()

    init {
        loadOrders()
    }

    private fun loadOrders() {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    orders = getFilteredOrders(),
                    newOrdersCount = _ordersList.count { it.status == FoodOrderStatus.NEW },
                    processingOrdersCount = _ordersList.count {
                        it.status in listOf(
                            FoodOrderStatus.ACCEPTED,
                            FoodOrderStatus.PREPARING,
                            FoodOrderStatus.READY,
                            FoodOrderStatus.DELIVERING
                        )
                    },
                    isLoading = false
                )
            }
        }
    }

    private fun getFilteredOrders(): List<FoodAppOrder> {
        val state = _uiState.value
        var filtered = when (state.selectedFilter) {
            FoodOrderFilter.ALL -> _ordersList.toList()
            FoodOrderFilter.NEW -> _ordersList.filter { it.status == FoodOrderStatus.NEW }
            FoodOrderFilter.PROCESSING -> _ordersList.filter {
                it.status in listOf(
                    FoodOrderStatus.ACCEPTED,
                    FoodOrderStatus.PREPARING,
                    FoodOrderStatus.READY,
                    FoodOrderStatus.DELIVERING
                )
            }
            FoodOrderFilter.COMPLETED -> _ordersList.filter { it.status == FoodOrderStatus.COMPLETED }
            FoodOrderFilter.CANCELLED -> _ordersList.filter { it.status == FoodOrderStatus.CANCELLED }
        }

        // Filter by platform if selected
        if (state.selectedPlatform != null) {
            filtered = filtered.filter { it.platform == state.selectedPlatform }
        }

        // Sort by created time (newest first for new orders, oldest first for processing)
        return if (state.selectedFilter == FoodOrderFilter.NEW) {
            filtered.sortedByDescending { it.createdAt }
        } else {
            filtered.sortedByDescending { it.createdAt }
        }
    }

    // ===== FILTER ACTIONS =====

    fun setFilter(filter: FoodOrderFilter) {
        _uiState.update { state ->
            state.copy(selectedFilter = filter)
        }
        loadOrders()
    }

    fun setPlatformFilter(platform: FoodPlatform?) {
        _uiState.update { state ->
            state.copy(selectedPlatform = platform)
        }
        loadOrders()
    }

    // ===== ORDER DETAIL =====

    fun selectOrder(order: FoodAppOrder) {
        _uiState.update { state ->
            state.copy(
                selectedOrder = order,
                showOrderDetail = true
            )
        }
    }

    fun hideOrderDetail() {
        _uiState.update { state ->
            state.copy(
                selectedOrder = null,
                showOrderDetail = false
            )
        }
    }

    // ===== ORDER STATUS ACTIONS =====

    fun acceptOrder(orderId: String) {
        updateOrderStatus(orderId, FoodOrderStatus.ACCEPTED)
        showSuccess("Đã nhận đơn hàng")
    }

    fun startPreparing(orderId: String) {
        updateOrderStatus(orderId, FoodOrderStatus.PREPARING)
        showSuccess("Bắt đầu chuẩn bị đơn hàng")
    }

    fun markAsReady(orderId: String) {
        updateOrderStatus(orderId, FoodOrderStatus.READY)
        showSuccess("Đơn hàng đã sẵn sàng giao")
    }

    fun completeOrder(orderId: String) {
        updateOrderStatus(orderId, FoodOrderStatus.COMPLETED)
        showSuccess("Đơn hàng hoàn thành")
    }

    fun cancelOrder(orderId: String) {
        updateOrderStatus(orderId, FoodOrderStatus.CANCELLED)
        showSuccess("Đã hủy đơn hàng")
    }

    private fun updateOrderStatus(orderId: String, newStatus: FoodOrderStatus) {
        val index = _ordersList.indexOfFirst { it.id == orderId }
        if (index >= 0) {
            val order = _ordersList[index]
            val updatedOrder = order.copy(
                status = newStatus,
                acceptedAt = if (newStatus == FoodOrderStatus.ACCEPTED) System.currentTimeMillis() else order.acceptedAt,
                preparedAt = if (newStatus == FoodOrderStatus.READY) System.currentTimeMillis() else order.preparedAt,
                completedAt = if (newStatus == FoodOrderStatus.COMPLETED) System.currentTimeMillis() else order.completedAt
            )
            _ordersList[index] = updatedOrder

            // Update selected order if it's the same
            if (_uiState.value.selectedOrder?.id == orderId) {
                _uiState.update { state ->
                    state.copy(selectedOrder = updatedOrder)
                }
            }
        }
        loadOrders()
    }

    // ===== MESSAGES =====

    private fun showSuccess(message: String) {
        _uiState.update { state ->
            state.copy(successMessage = message)
        }
    }

    fun clearSuccessMessage() {
        _uiState.update { state ->
            state.copy(successMessage = null)
        }
    }

    fun clearErrorMessage() {
        _uiState.update { state ->
            state.copy(errorMessage = null)
        }
    }

    // ===== REFRESH =====

    fun refresh() {
        _uiState.update { state ->
            state.copy(isLoading = true)
        }
        loadOrders()
    }
}
