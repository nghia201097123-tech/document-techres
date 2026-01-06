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
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID
import javax.inject.Inject

data class ShiftUiState(
    val currentShift: ShiftEntity? = null,
    val totalOrders: Int = 0,
    val totalRevenue: Double = 0.0,
    val cashRevenue: Double = 0.0,
    val bankRevenue: Double = 0.0,
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
                    loadShiftSummary(shift.id)
                }
            }
        }
    }

    private suspend fun loadShiftSummary(shiftId: String) {
        val orders = orderRepository.getOrdersForShift(shiftId)
        val completedOrders = orders.filter { it.status == "completed" }

        val totalRevenue = completedOrders.sumOf { it.totalAmount }
        val cashRevenue = completedOrders.filter { it.paymentMethod == "cash" }.sumOf { it.totalAmount }
        val bankRevenue = completedOrders.filter { it.paymentMethod == "bank_transfer" }.sumOf { it.totalAmount }
        val cardRevenue = completedOrders.filter { it.paymentMethod == "card" }.sumOf { it.totalAmount }

        _uiState.value = _uiState.value.copy(
            totalOrders = completedOrders.size,
            totalRevenue = totalRevenue,
            cashRevenue = cashRevenue,
            bankRevenue = bankRevenue,
            cardRevenue = cardRevenue
        )
    }

    fun openShift(openingAmount: Double) {
        val branchId = authRepository.getBranchId() ?: return
        val staffId = authRepository.getCurrentStaffId() ?: return
        val staffName = authRepository.getCurrentStaffName() ?: ""

        viewModelScope.launch {
            val shift = ShiftEntity(
                id = UUID.randomUUID().toString(),
                branchId = branchId,
                staffId = staffId,
                staffName = staffName,
                startTime = Instant.now().toString(),
                endTime = null,
                openingAmount = openingAmount,
                closingAmount = null,
                expectedAmount = null,
                actualAmount = null,
                difference = null,
                totalOrders = 0,
                totalRevenue = 0.0,
                cashRevenue = 0.0,
                bankRevenue = 0.0,
                cardRevenue = 0.0,
                status = "open",
                note = null,
                syncStatus = "pending",
                syncedAt = null
            )
            shiftRepository.openShift(shift)
        }
    }

    fun closeShift(closingAmount: Double) {
        val currentShift = _uiState.value.currentShift ?: return

        viewModelScope.launch {
            val expectedAmount = currentShift.openingAmount + _uiState.value.cashRevenue
            val difference = closingAmount - expectedAmount

            val closedShift = currentShift.copy(
                endTime = Instant.now().toString(),
                closingAmount = closingAmount,
                expectedAmount = expectedAmount,
                actualAmount = closingAmount,
                difference = difference,
                totalOrders = _uiState.value.totalOrders,
                totalRevenue = _uiState.value.totalRevenue,
                cashRevenue = _uiState.value.cashRevenue,
                bankRevenue = _uiState.value.bankRevenue,
                cardRevenue = _uiState.value.cardRevenue,
                status = "closed",
                syncStatus = "pending"
            )
            shiftRepository.closeShift(closedShift)
        }
    }
}
