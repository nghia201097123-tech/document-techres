package com.techres.ccb.presentation.screens.closeshift

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class ShiftSummary(
    val openTime: String = "",
    val closeTime: String = "",
    val staffName: String = "",
    val branchName: String = "",

    // Cash
    val initialCash: Long = 0,
    val cashSales: Long = 0,
    val cashIn: Long = 0,
    val cashOut: Long = 0,
    val expectedCash: Long = 0,
    val actualCash: Long = 0,
    val cashDifference: Long = 0,

    // Orders
    val totalOrders: Int = 0,
    val completedOrders: Int = 0,
    val cancelledOrders: Int = 0,

    // Revenue
    val totalRevenue: Long = 0,
    val cashRevenue: Long = 0,
    val cardRevenue: Long = 0,
    val transferRevenue: Long = 0,
    val appRevenue: Long = 0
)

data class CloseShiftUiState(
    val summary: ShiftSummary = ShiftSummary(),
    val actualCashText: String = "",
    val note: String = "",
    val isLoading: Boolean = false,
    val isClosing: Boolean = false,
    val isClosed: Boolean = false,
    val showConfirmDialog: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class CloseShiftViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(CloseShiftUiState())
    val uiState: StateFlow<CloseShiftUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())

    init {
        loadShiftSummary()
    }

    private fun loadShiftSummary() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Mock data - replace with actual API call
            val summary = ShiftSummary(
                openTime = "08:00 ${dateFormat.format(Date()).split(" ")[1]}",
                closeTime = dateFormat.format(Date()),
                staffName = "Nhân viên A",
                branchName = "Chi nhánh Quận 1",

                initialCash = 2_000_000,
                cashSales = 3_450_000,
                cashIn = 500_000,
                cashOut = 200_000,
                expectedCash = 5_750_000,

                totalOrders = 45,
                completedOrders = 42,
                cancelledOrders = 3,

                totalRevenue = 8_650_000,
                cashRevenue = 3_450_000,
                cardRevenue = 2_200_000,
                transferRevenue = 1_500_000,
                appRevenue = 1_500_000
            )

            _uiState.update {
                it.copy(
                    isLoading = false,
                    summary = summary,
                    actualCashText = summary.expectedCash.toString()
                )
            }
        }
    }

    fun updateActualCash(text: String) {
        val cleanText = text.replace(Regex("[^0-9]"), "")
        val amount = cleanText.toLongOrNull() ?: 0

        _uiState.update { state ->
            state.copy(
                actualCashText = cleanText,
                summary = state.summary.copy(
                    actualCash = amount,
                    cashDifference = amount - state.summary.expectedCash
                )
            )
        }
    }

    fun updateNote(note: String) {
        _uiState.update { it.copy(note = note) }
    }

    fun showConfirmDialog() {
        _uiState.update { it.copy(showConfirmDialog = true) }
    }

    fun hideConfirmDialog() {
        _uiState.update { it.copy(showConfirmDialog = false) }
    }

    fun closeShift(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isClosing = true, showConfirmDialog = false) }

            try {
                // TODO: Call API to close shift
                delay(1500) // Simulate API call

                _uiState.update {
                    it.copy(
                        isClosing = false,
                        isClosed = true
                    )
                }

                delay(500)
                onSuccess()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isClosing = false,
                        error = "Không thể chốt ca: ${e.message}"
                    )
                }
            }
        }
    }
}
