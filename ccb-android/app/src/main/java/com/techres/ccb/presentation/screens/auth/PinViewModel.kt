package com.techres.ccb.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.StaffEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.BranchRepository
import com.techres.ccb.data.repository.StaffRepository
import com.techres.ccb.data.repository.SyncRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PinUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null,
    // Staff selection for quick login
    val staffList: List<StaffEntity> = emptyList(),
    val selectedStaff: StaffEntity? = null,
    val showStaffSelection: Boolean = true
)

@HiltViewModel
class PinViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val branchRepository: BranchRepository,
    private val syncRepository: SyncRepository,
    private val staffRepository: StaffRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PinUiState())
    val uiState: StateFlow<PinUiState> = _uiState.asStateFlow()

    init {
        loadStaffList()
    }

    fun getBranchName(): String = authRepository.getBranchName() ?: ""

    /**
     * Load staff list for quick selection
     */
    private fun loadStaffList() {
        viewModelScope.launch {
            val branchId = authRepository.getBranchId() ?: return@launch
            try {
                val staff = staffRepository.getActiveStaff(branchId).first()
                    .filter { it.isActive }
                    .sortedBy { it.name }
                _uiState.value = _uiState.value.copy(
                    staffList = staff,
                    showStaffSelection = staff.isNotEmpty()
                )
            } catch (e: Exception) {
                // If can't load staff, show PIN input directly
                _uiState.value = _uiState.value.copy(showStaffSelection = false)
            }
        }
    }

    /**
     * Select staff from list - then show PIN input
     */
    fun selectStaff(staff: StaffEntity) {
        _uiState.value = _uiState.value.copy(
            selectedStaff = staff,
            showStaffSelection = false,
            error = null
        )
    }

    /**
     * Go back to staff selection
     */
    fun backToStaffSelection() {
        _uiState.value = _uiState.value.copy(
            selectedStaff = null,
            showStaffSelection = true,
            error = null
        )
    }

    /**
     * Verify PIN for selected staff
     */
    fun verifyPin(pinCode: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val selectedStaff = _uiState.value.selectedStaff

            if (selectedStaff != null) {
                // Verify PIN against selected staff
                if (selectedStaff.pinCode == pinCode) {
                    // Save staff info
                    authRepository.saveStaffInfo(
                        staffId = selectedStaff.id,
                        staffName = selectedStaff.name,
                        staffCode = selectedStaff.code,
                        staffRole = selectedStaff.role
                    )
                    _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Ma PIN khong dung"
                    )
                }
            } else {
                // Legacy: verify PIN from any staff
                val result = authRepository.verifyPin(pinCode)
                result.fold(
                    onSuccess = {
                        _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
                    },
                    onFailure = { e ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = e.message ?: "Ma PIN khong dung"
                        )
                    }
                )
            }
        }
    }

    /**
     * Logout user and clear synced master data.
     * App-created data (shifts, orders) is preserved.
     */
    fun logout() {
        viewModelScope.launch {
            val branchId = authRepository.getBranchId()

            // Clear synced master data (keep shifts, orders)
            if (branchId != null) {
                syncRepository.clearMasterData(branchId)
            }

            // Clear branch selection
            branchRepository.clearSelectedBranch()

            // Clear auth data
            authRepository.logout()
        }
    }
}
