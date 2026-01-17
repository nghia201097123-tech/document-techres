package com.techres.ccb.presentation.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID
import javax.inject.Inject

data class HomeUiState(
    val branchName: String = "",
    val staffName: String = "",
    val activeOrders: List<OrderEntity> = emptyList(),
    val ordersWithItemNotes: Set<String> = emptySet(), // Order IDs that have items with notes
    val isLoading: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        val branchId = authRepository.getBranchId() ?: return

        _uiState.value = _uiState.value.copy(
            branchName = authRepository.getBranchName() ?: "",
            staffName = authRepository.getCurrentStaffName() ?: ""
        )

        viewModelScope.launch {
            orderRepository.getActiveOrders(branchId).collect { orders ->
                // Fetch order IDs that have items with notes
                val orderIds = orders.map { it.id }
                val ordersWithItemNotes = orderRepository.getOrderIdsWithItemNotes(orderIds)

                _uiState.value = _uiState.value.copy(
                    activeOrders = orders,
                    ordersWithItemNotes = ordersWithItemNotes
                )
            }
        }
    }

    fun createNewOrder(orderId: String) {
        val branchId = authRepository.getBranchId() ?: return
        val staffId = authRepository.getCurrentStaffId() ?: return
        val now = Instant.now().toString()

        viewModelScope.launch {
            val order = OrderEntity(
                id = orderId,
                branchId = branchId,
                orderNumber = generateOrderNumber(),
                tableId = null,
                tableName = null,
                shiftId = null,
                staffId = staffId,
                staffName = authRepository.getCurrentStaffName(),
                customerName = null,
                customerPhone = null,
                status = "pending",
                orderType = "dine_in",
                subtotal = 0.0,
                discountAmount = 0.0,
                discountType = null,
                discountValue = 0.0,
                discountReason = null,
                surchargeAmount = 0.0,
                vatAmount = 0.0,
                totalAmount = 0.0,
                paidAmount = 0.0,
                changeAmount = 0.0,
                paymentMethod = null,
                paymentStatus = "unpaid",
                notes = null,
                guestCount = 1,
                isPrinted = false,
                printedAt = null,
                completedAt = null,
                cancelledAt = null,
                cancelReason = null,
                createdAt = now,
                updatedAt = now,
                idempotencyKey = UUID.randomUUID().toString(),
                serverId = null,
                syncStatus = "pending",
                syncedAt = null,
                syncError = null,
                retryCount = 0,
                version = 1
            )
            orderRepository.createOrder(order, emptyList())
        }
    }

    private fun generateOrderNumber(): String {
        val timestamp = System.currentTimeMillis()
        return "ORD${timestamp.toString().takeLast(8)}"
    }
}
