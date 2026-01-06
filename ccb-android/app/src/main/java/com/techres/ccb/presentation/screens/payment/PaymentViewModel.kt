package com.techres.ccb.presentation.screens.payment

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.Instant
import javax.inject.Inject

data class PaymentUiState(
    val order: OrderEntity? = null,
    val itemCount: Int = 0,
    val selectedPaymentMethod: String = "cash",
    val receivedAmount: Double = 0.0,
    val changeAmount: Double = 0.0,
    val canProcessPayment: Boolean = false,
    val isProcessing: Boolean = false,
    val isPaymentComplete: Boolean = false
)

@HiltViewModel
class PaymentViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState: StateFlow<PaymentUiState> = _uiState.asStateFlow()

    private var currentOrderId: String? = null

    fun loadOrder(orderId: String) {
        currentOrderId = orderId

        viewModelScope.launch {
            val order = orderRepository.getOrderById(orderId)
            val items = orderRepository.getOrderItems(orderId).first()

            _uiState.value = _uiState.value.copy(
                order = order,
                itemCount = items.sumOf { it.quantity },
                canProcessPayment = order != null && order.totalAmount > 0
            )
        }
    }

    fun selectPaymentMethod(method: String) {
        _uiState.value = _uiState.value.copy(
            selectedPaymentMethod = method,
            canProcessPayment = if (method == "cash") {
                _uiState.value.receivedAmount >= (_uiState.value.order?.totalAmount ?: 0.0)
            } else {
                true
            }
        )
    }

    fun setReceivedAmount(amount: Double) {
        val total = _uiState.value.order?.totalAmount ?: 0.0
        val change = if (amount >= total) amount - total else 0.0

        _uiState.value = _uiState.value.copy(
            receivedAmount = amount,
            changeAmount = change,
            canProcessPayment = amount >= total
        )
    }

    fun processPayment() {
        val orderId = currentOrderId ?: return
        val order = _uiState.value.order ?: return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isProcessing = true)

            try {
                val paidAmount = if (_uiState.value.selectedPaymentMethod == "cash") {
                    _uiState.value.receivedAmount
                } else {
                    order.totalAmount
                }

                val updatedOrder = order.copy(
                    status = "completed",
                    paymentMethod = _uiState.value.selectedPaymentMethod,
                    paidAmount = paidAmount,
                    changeAmount = _uiState.value.changeAmount,
                    updatedAt = Instant.now().toString(),
                    syncStatus = "pending"
                )

                orderRepository.updateOrder(updatedOrder)

                _uiState.value = _uiState.value.copy(
                    isProcessing = false,
                    isPaymentComplete = true
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isProcessing = false)
            }
        }
    }
}
