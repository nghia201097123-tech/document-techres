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
import javax.inject.Inject

data class HomeUiState(
    val branchName: String = "",
    val staffName: String = "",
    val activeOrders: List<OrderEntity> = emptyList(),
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
                _uiState.value = _uiState.value.copy(activeOrders = orders)
            }
        }
    }

    fun createNewOrder(orderId: String) {
        val branchId = authRepository.getBranchId() ?: return
        val staffId = authRepository.getCurrentStaffId() ?: return

        viewModelScope.launch {
            val order = OrderEntity(
                id = orderId,
                branchId = branchId,
                orderNumber = generateOrderNumber(),
                tableId = null,
                tableName = null,
                staffId = staffId,
                staffName = authRepository.getCurrentStaffName() ?: "",
                status = "pending",
                subtotal = 0.0,
                discountAmount = 0.0,
                discountPercent = 0.0,
                totalAmount = 0.0,
                paymentMethod = null,
                paidAmount = 0.0,
                changeAmount = 0.0,
                note = null,
                shiftId = null,
                createdAt = Instant.now().toString(),
                updatedAt = Instant.now().toString(),
                syncStatus = "pending",
                syncedAt = null
            )
            orderRepository.createOrder(order, emptyList())
        }
    }

    private fun generateOrderNumber(): String {
        val timestamp = System.currentTimeMillis()
        return "ORD${timestamp.toString().takeLast(8)}"
    }
}
