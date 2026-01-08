package com.techres.ccb.presentation.screens.openshift

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

data class OpenShiftUiState(
    val branchName: String = "",
    val staffName: String = "Nhân viên",
    val currentDateTime: String = "",
    val initialCash: Long = 0,
    val initialCashText: String = "",
    val note: String = "",
    val isLoading: Boolean = false,
    val isShiftOpen: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class OpenShiftViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(OpenShiftUiState())
    val uiState: StateFlow<OpenShiftUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("HH:mm - dd/MM/yyyy", Locale.getDefault())

    init {
        updateDateTime()
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
                // TODO: Call API to open shift
                delay(1000) // Simulate API call

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isShiftOpen = true
                    )
                }

                onSuccess()
            } catch (e: Exception) {
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
