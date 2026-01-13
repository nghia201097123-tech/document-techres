package com.techres.ccb.presentation.screens.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.Instant
import javax.inject.Inject

data class OrderUiState(
    val order: OrderEntity? = null,
    val orderItems: List<OrderItemEntity> = emptyList(),
    val isLoading: Boolean = false
)

@HiltViewModel
class OrderViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderUiState())
    val uiState: StateFlow<OrderUiState> = _uiState.asStateFlow()

    private var currentOrderId: String? = null

    fun loadOrder(orderId: String) {
        currentOrderId = orderId

        viewModelScope.launch {
            val order = orderRepository.getOrderById(orderId)
            _uiState.value = _uiState.value.copy(order = order)
        }

        viewModelScope.launch {
            orderRepository.getOrderItems(orderId).collect { items ->
                _uiState.value = _uiState.value.copy(orderItems = items)
            }
        }
    }

    fun updateItemQuantity(item: OrderItemEntity, newQuantity: Int) {
        if (newQuantity <= 0) {
            deleteItem(item)
            return
        }

        viewModelScope.launch {
            val updatedItem = item.copy(
                quantity = newQuantity,
                totalPrice = item.unitPrice * newQuantity,
                updatedAt = Instant.now().toString()
            )
            orderRepository.updateOrderItem(updatedItem)
            updateOrderTotal()
        }
    }

    fun deleteItem(item: OrderItemEntity) {
        viewModelScope.launch {
            orderRepository.deleteOrderItem(item)
            updateOrderTotal()
        }
    }

    private suspend fun updateOrderTotal() {
        val orderId = currentOrderId ?: return
        val order = orderRepository.getOrderById(orderId) ?: return
        val items = orderRepository.getOrderItems(orderId).first()

        val subtotal = items.sumOf { it.totalPrice }
        val total = subtotal - order.discountAmount

        orderRepository.updateOrder(
            order.copy(
                subtotal = subtotal,
                totalAmount = if (total > 0) total else 0.0,
                updatedAt = Instant.now().toString()
            )
        )

        // Refresh order state
        _uiState.value = _uiState.value.copy(
            order = orderRepository.getOrderById(orderId)
        )
    }
}
