package com.techres.ccb.presentation.screens.shift

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.ShiftEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.OrderRepository
import com.techres.ccb.data.repository.ShiftRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID
import javax.inject.Inject

data class ShiftUiState(
    val currentShift: ShiftEntity? = null,
    val totalOrders: Int = 0,
    val totalRevenue: Double = 0.0,
    val cashRevenue: Double = 0.0,
    val transferRevenue: Double = 0.0,
    val cardRevenue: Double = 0.0,
    val isLoading: Boolean = false
)

@HiltViewModel
class ShiftViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val shiftRepository: ShiftRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ShiftUiState())
    val uiState: StateFlow<ShiftUiState> = _uiState.asStateFlow()

    init {
        loadCurrentShift()
    }

    private fun loadCurrentShift() {
        val branchId = authRepository.getBranchId() ?: return

        viewModelScope.launch {
            shiftRepository.getCurrentShift(branchId).collect { shift ->
                _uiState.value = _uiState.value.copy(currentShift = shift)

                if (shift != null) {
                    loadShiftSummary(branchId, shift.id)
                }
            }
        }
    }

    private suspend fun loadShiftSummary(branchId: String, shiftId: String) {
        val orders = orderRepository.getOrdersByShift(branchId, shiftId).first()
        val completedOrders = orders.filter { it.status == "completed" }

        val totalRevenue = completedOrders.sumOf { it.totalAmount }
        val cashRevenue = completedOrders.filter { it.paymentMethod == "cash" }.sumOf { it.totalAmount }
        val transferRevenue = completedOrders.filter { it.paymentMethod == "transfer" }.sumOf { it.totalAmount }
        val cardRevenue = completedOrders.filter { it.paymentMethod == "card" }.sumOf { it.totalAmount }

        _uiState.value = _uiState.value.copy(
            totalOrders = completedOrders.size,
            totalRevenue = totalRevenue,
            cashRevenue = cashRevenue,
            transferRevenue = transferRevenue,
            cardRevenue = cardRevenue
        )
    }

    fun openShift(openingAmount: Double) {
        val branchId = authRepository.getBranchId() ?: return
        val staffId = authRepository.getCurrentStaffId() ?: return
        val staffName = authRepository.getCurrentStaffName() ?: ""
        val now = Instant.now().toString()

        viewModelScope.launch {
            val shift = ShiftEntity(
                id = UUID.randomUUID().toString(),
                branchId = branchId,
                staffId = staffId,
                staffName = staffName,
                status = "open",
                openingAmount = openingAmount,
                closingAmount = 0.0,
                expectedAmount = 0.0,
                differenceAmount = 0.0,
                totalOrders = 0,
                totalRevenue = 0.0,
                cashRevenue = 0.0,
                cardRevenue = 0.0,
                transferRevenue = 0.0,
                otherRevenue = 0.0,
                totalDiscount = 0.0,
                totalRefund = 0.0,
                totalCancelled = 0,
                notes = null,
                openedAt = now,
                closedAt = null,
                createdAt = now,
                updatedAt = now,
                syncStatus = "pending",
                syncedAt = null,
                retryCount = 0,
                version = 1
            )
            shiftRepository.openShift(shift)
        }
    }

    fun closeShift(closingAmount: Double, notes: String? = null) {
        val currentShift = _uiState.value.currentShift ?: return
        val now = Instant.now().toString()

        viewModelScope.launch {
            val expectedAmount = currentShift.openingAmount + _uiState.value.cashRevenue
            val differenceAmount = closingAmount - expectedAmount

            shiftRepository.closeShift(
                shiftId = currentShift.id,
                closingAmount = closingAmount,
                expectedAmount = expectedAmount,
                differenceAmount = differenceAmount,
                totalOrders = _uiState.value.totalOrders,
                totalRevenue = _uiState.value.totalRevenue,
                cashRevenue = _uiState.value.cashRevenue,
                cardRevenue = _uiState.value.cardRevenue,
                transferRevenue = _uiState.value.transferRevenue,
                otherRevenue = 0.0,
                totalDiscount = 0.0,
                notes = notes,
                closedAt = now,
                updatedAt = now
            )
        }
    }
}
