package com.techres.ccb.presentation.screens.openshift

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.ShiftEntity
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

data class OpenShiftUiState(
    val branchName: String = "",
    val staffName: String = "Nhân viên",
    val currentDateTime: String = "",
    val initialCash: Long = 0,
    val initialCashText: String = "",
    val note: String = "",
    val isLoading: Boolean = false,
    val isShiftOpen: Boolean = false,
    val hasExistingShift: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class OpenShiftViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val shiftRepository: ShiftRepository
) : ViewModel() {

    companion object {
        private const val TAG = "OpenShiftViewModel"
    }

    private val _uiState = MutableStateFlow(OpenShiftUiState())
    val uiState: StateFlow<OpenShiftUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("HH:mm - dd/MM/yyyy", Locale.getDefault())

    init {
        loadBranchInfo()
        updateDateTime()
        checkExistingShift()
    }

    private fun loadBranchInfo() {
        val branchName = authRepository.getBranchName() ?: ""
        val staffName = authRepository.getCurrentStaffName() ?: "Nhân viên"
        _uiState.update { it.copy(branchName = branchName, staffName = staffName) }
    }

    private fun checkExistingShift() {
        viewModelScope.launch {
            val branchId = authRepository.getBranchId() ?: return@launch
            val existingShift = shiftRepository.getCurrentOpenShift(branchId)
            _uiState.update { it.copy(hasExistingShift = existingShift != null) }
        }
    }

    fun setBranchInfo(branchName: String) {
        _uiState.update { it.copy(branchName = branchName) }
    }

    private fun updateDateTime() {
        _uiState.update {
            it.copy(currentDateTime = dateFormat.format(Date()))
        }
    }

    fun updateInitialCash(text: String) {
        // Remove non-digit characters
        val cleanText = text.replace(Regex("[^0-9]"), "")
        val amount = cleanText.toLongOrNull() ?: 0

        _uiState.update {
            it.copy(
                initialCashText = cleanText,
                initialCash = amount
            )
        }
    }

    fun updateNote(note: String) {
        _uiState.update { it.copy(note = note) }
    }

    fun selectQuickAmount(amount: Long) {
        _uiState.update {
            it.copy(
                initialCash = amount,
                initialCashText = amount.toString()
            )
        }
    }

    fun openShift(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val branchId = authRepository.getBranchId()
                val staffId = authRepository.getCurrentStaffId()
                val staffName = authRepository.getCurrentStaffName()

                Log.d(TAG, "openShift - branchId: $branchId, staffId: $staffId, staffName: $staffName")

                if (branchId == null || staffId == null) {
                    Log.e(TAG, "openShift - Missing branchId or staffId")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "Thiếu thông tin chi nhánh hoặc nhân viên"
                        )
                    }
                    return@launch
                }

                // Check if there's already an open shift
                val existingShift = shiftRepository.getCurrentOpenShift(branchId)
                if (existingShift != null) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "Đã có ca đang mở. Vui lòng đóng ca trước khi mở ca mới."
                        )
                    }
                    return@launch
                }

                val now = Instant.now().toString()
                val shift = ShiftEntity(
                    id = UUID.randomUUID().toString(),
                    branchId = branchId,
                    staffId = staffId,
                    staffName = staffName ?: "Nhân viên",
                    status = "open",
                    openingAmount = _uiState.value.initialCash.toDouble(),
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
                    notes = _uiState.value.note.ifEmpty { null },
                    openedAt = now,
                    closedAt = null,
                    createdAt = now,
                    updatedAt = now,
                    syncStatus = "pending",
                    syncedAt = null,
                    retryCount = 0,
                    version = 1
                )

                Log.d(TAG, "openShift - Creating shift with id: ${shift.id}")
                shiftRepository.openShift(shift)
                Log.d(TAG, "openShift - Shift saved successfully!")

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isShiftOpen = true
                    )
                }

                onSuccess()
            } catch (e: Exception) {
                Log.e(TAG, "openShift - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Không thể mở ca: ${e.message}"
                    )
                }
            }
        }
    }
}
