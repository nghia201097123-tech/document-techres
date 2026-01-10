package com.techres.ccb.presentation.screens.closeshift

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.ShiftRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.Instant
import java.util.*
import javax.inject.Inject

data class ShiftSummary(
    val shiftId: String = "",
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
    val error: String? = null,
    val noShiftFound: Boolean = false
)

@HiltViewModel
class CloseShiftViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val shiftRepository: ShiftRepository
) : ViewModel() {

    companion object {
        private const val TAG = "CloseShiftViewModel"
    }

    private val _uiState = MutableStateFlow(CloseShiftUiState())
    val uiState: StateFlow<CloseShiftUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("HH:mm dd/MM/yyyy", Locale.getDefault())
    private val timeParser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())

    init {
        loadShiftSummary()
    }

    private fun loadShiftSummary() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val branchId = authRepository.getBranchId()
                val branchName = authRepository.getBranchName() ?: ""

                if (branchId == null) {
                    Log.e(TAG, "loadShiftSummary - No branch ID")
                    _uiState.update {
                        it.copy(isLoading = false, error = "Không tìm thấy thông tin chi nhánh")
                    }
                    return@launch
                }

                val currentShift = shiftRepository.getCurrentOpenShift(branchId)

                if (currentShift == null) {
                    Log.w(TAG, "loadShiftSummary - No open shift found")
                    _uiState.update {
                        it.copy(isLoading = false, noShiftFound = true)
                    }
                    return@launch
                }

                Log.d(TAG, "loadShiftSummary - Found shift: ${currentShift.id}")

                // Parse open time
                val openTime = try {
                    val date = timeParser.parse(currentShift.openedAt.substringBefore("."))
                    dateFormat.format(date!!)
                } catch (e: Exception) {
                    currentShift.openedAt
                }

                // Calculate expected cash = initial + cash revenue
                val expectedCash = currentShift.openingAmount.toLong() + currentShift.cashRevenue.toLong()

                val summary = ShiftSummary(
                    shiftId = currentShift.id,
                    openTime = openTime,
                    closeTime = dateFormat.format(Date()),
                    staffName = currentShift.staffName,
                    branchName = branchName,

                    initialCash = currentShift.openingAmount.toLong(),
                    cashSales = currentShift.cashRevenue.toLong(),
                    cashIn = 0, // TODO: implement cash in tracking
                    cashOut = 0, // TODO: implement cash out tracking
                    expectedCash = expectedCash,

                    totalOrders = currentShift.totalOrders,
                    completedOrders = currentShift.totalOrders - currentShift.totalCancelled,
                    cancelledOrders = currentShift.totalCancelled,

                    totalRevenue = currentShift.totalRevenue.toLong(),
                    cashRevenue = currentShift.cashRevenue.toLong(),
                    cardRevenue = currentShift.cardRevenue.toLong(),
                    transferRevenue = currentShift.transferRevenue.toLong(),
                    appRevenue = currentShift.otherRevenue.toLong()
                )

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        summary = summary,
                        actualCashText = expectedCash.toString()
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadShiftSummary - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(isLoading = false, error = "Lỗi tải thông tin ca: ${e.message}")
                }
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
                val shiftId = _uiState.value.summary.shiftId
                if (shiftId.isEmpty()) {
                    _uiState.update {
                        it.copy(isClosing = false, error = "Không tìm thấy ca làm việc")
                    }
                    return@launch
                }

                val now = Instant.now().toString()
                val state = _uiState.value
                val summary = state.summary

                Log.d(TAG, "closeShift - Closing shift: $shiftId")

                // Close the shift in database
                shiftRepository.closeShift(
                    shiftId = shiftId,
                    closingAmount = summary.actualCash.toDouble(),
                    expectedAmount = summary.expectedCash.toDouble(),
                    differenceAmount = summary.cashDifference.toDouble(),
                    totalOrders = summary.totalOrders,
                    totalRevenue = summary.totalRevenue.toDouble(),
                    cashRevenue = summary.cashRevenue.toDouble(),
                    cardRevenue = summary.cardRevenue.toDouble(),
                    transferRevenue = summary.transferRevenue.toDouble(),
                    otherRevenue = summary.appRevenue.toDouble(),
                    totalDiscount = 0.0, // TODO: track discounts
                    notes = state.note.ifEmpty { null },
                    closedAt = now,
                    updatedAt = now
                )

                Log.d(TAG, "closeShift - Shift closed successfully!")

                _uiState.update {
                    it.copy(
                        isClosing = false,
                        isClosed = true
                    )
                }

                onSuccess()
            } catch (e: Exception) {
                Log.e(TAG, "closeShift - Error: ${e.message}", e)
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
