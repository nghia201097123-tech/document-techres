package com.techres.ccb.presentation.screens.settings

import android.content.SharedPreferences
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.SyncRepository
import com.techres.ccb.data.repository.SyncStep
import com.techres.ccb.data.repository.SyncStepStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

/**
 * Represents progress of a single sync step in UI
 */
data class SyncStepUiState(
    val name: String,
    val status: SyncStepStatus = SyncStepStatus.PENDING,
    val count: Int = 0
)

data class SettingsUiState(
    val branchName: String = "",
    val deviceId: String = "",
    val lastSyncTime: String? = null,
    val isSyncing: Boolean = false,
    val syncError: String? = null,
    val syncProgress: Float = 0f,
    val syncComplete: Boolean = false,
    val syncSteps: Map<SyncStep, SyncStepUiState> = mapOf(
        SyncStep.FETCHING to SyncStepUiState("Tải dữ liệu"),
        SyncStep.CATEGORIES to SyncStepUiState("Danh mục"),
        SyncStep.PRODUCTS to SyncStepUiState("Sản phẩm"),
        SyncStep.PRODUCT_TOPPINGS to SyncStepUiState("Topping sản phẩm"),
        SyncStep.AREAS to SyncStepUiState("Khu vực"),
        SyncStep.TABLES to SyncStepUiState("Bàn"),
        SyncStep.STAFF to SyncStepUiState("Nhân viên"),
        SyncStep.KITCHENS to SyncStepUiState("Bếp"),
        SyncStep.SEASONAL_PRICES to SyncStepUiState("Giá thời vụ"),
        SyncStep.COUPONS to SyncStepUiState("Coupon"),
        SyncStep.PRODUCT_NOTES to SyncStepUiState("Ghi chú"),
        SyncStep.BILL_TEMPLATES to SyncStepUiState("Mẫu in bill")
    )
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val syncRepository: SyncRepository,
    private val sharedPreferences: SharedPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    companion object {
        private const val KEY_LAST_SYNC = "last_sync_time"
    }

    init {
        loadSettings()
    }

    private fun loadSettings() {
        val lastSyncTimestamp = sharedPreferences.getLong(KEY_LAST_SYNC, 0)
        val lastSyncTime = if (lastSyncTimestamp > 0) {
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).apply {
                timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
            }
            dateFormat.format(Date(lastSyncTimestamp))
        } else null

        _uiState.value = SettingsUiState(
            branchName = authRepository.getBranchName() ?: "",
            deviceId = authRepository.getDeviceId() ?: "",
            lastSyncTime = lastSyncTime
        )
    }

    fun syncNow() {
        viewModelScope.launch {
            // Reset sync steps to pending
            val initialSyncSteps = mapOf(
                SyncStep.FETCHING to SyncStepUiState("Tải dữ liệu"),
                SyncStep.CATEGORIES to SyncStepUiState("Danh mục"),
                SyncStep.PRODUCTS to SyncStepUiState("Sản phẩm"),
                SyncStep.PRODUCT_TOPPINGS to SyncStepUiState("Topping sản phẩm"),
                SyncStep.AREAS to SyncStepUiState("Khu vực"),
                SyncStep.TABLES to SyncStepUiState("Bàn"),
                SyncStep.STAFF to SyncStepUiState("Nhân viên"),
                SyncStep.KITCHENS to SyncStepUiState("Bếp"),
                SyncStep.SEASONAL_PRICES to SyncStepUiState("Giá thời vụ"),
                SyncStep.COUPONS to SyncStepUiState("Coupon"),
                SyncStep.PRODUCT_NOTES to SyncStepUiState("Ghi chú"),
                SyncStep.BILL_TEMPLATES to SyncStepUiState("Mẫu in bill")
            )

            _uiState.update {
                it.copy(
                    isSyncing = true,
                    syncError = null,
                    syncProgress = 0f,
                    syncComplete = false,
                    syncSteps = initialSyncSteps
                )
            }

            // Perform full sync with progress callback
            val result = syncRepository.performFullSyncWithProgress { progress ->
                // Update the specific sync step
                _uiState.update { currentState ->
                    val updatedSteps = currentState.syncSteps.toMutableMap()
                    val currentStep = updatedSteps[progress.step]
                    if (currentStep != null) {
                        updatedSteps[progress.step] = currentStep.copy(
                            status = progress.status,
                            count = progress.count
                        )
                    }

                    // Calculate overall progress based on completed steps
                    val completedSteps = updatedSteps.values.count { it.status == SyncStepStatus.COMPLETED }
                    val totalSteps = updatedSteps.size
                    val overallProgress = completedSteps.toFloat() / totalSteps

                    currentState.copy(
                        syncSteps = updatedSteps,
                        syncProgress = overallProgress
                    )
                }
            }

            result.fold(
                onSuccess = {
                    val now = System.currentTimeMillis()
                    sharedPreferences.edit().putLong(KEY_LAST_SYNC, now).apply()

                    val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).apply {
                        timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                    }
                    _uiState.update {
                        it.copy(
                            isSyncing = false,
                            syncProgress = 1f,
                            syncComplete = true,
                            lastSyncTime = dateFormat.format(Date(now))
                        )
                    }
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            isSyncing = false,
                            syncError = e.message ?: "Đồng bộ thất bại"
                        )
                    }
                }
            )
        }
    }

    /**
     * Reset sync state to allow re-syncing
     */
    fun resetSyncState() {
        val initialSyncSteps = mapOf(
            SyncStep.FETCHING to SyncStepUiState("Tải dữ liệu"),
            SyncStep.CATEGORIES to SyncStepUiState("Danh mục"),
            SyncStep.PRODUCTS to SyncStepUiState("Sản phẩm"),
            SyncStep.PRODUCT_TOPPINGS to SyncStepUiState("Topping sản phẩm"),
            SyncStep.AREAS to SyncStepUiState("Khu vực"),
            SyncStep.TABLES to SyncStepUiState("Bàn"),
            SyncStep.STAFF to SyncStepUiState("Nhân viên"),
            SyncStep.KITCHENS to SyncStepUiState("Bếp"),
            SyncStep.SEASONAL_PRICES to SyncStepUiState("Giá thời vụ"),
            SyncStep.COUPONS to SyncStepUiState("Coupon"),
            SyncStep.PRODUCT_NOTES to SyncStepUiState("Ghi chú"),
            SyncStep.BILL_TEMPLATES to SyncStepUiState("Mẫu in bill")
        )
        _uiState.update {
            it.copy(
                isSyncing = false,
                syncProgress = 0f,
                syncComplete = false,
                syncError = null,
                syncSteps = initialSyncSteps
            )
        }
    }
}
