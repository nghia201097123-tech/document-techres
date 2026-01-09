package com.techres.ccb.presentation.screens.initialsync

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.BranchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class InitialSyncStatus {
    IDLE,
    SYNCING,
    COMPLETED,
    ERROR
}

data class InitialSyncUiState(
    val status: InitialSyncStatus = InitialSyncStatus.IDLE,
    val progress: Float = 0f,
    val brandsCount: Int = 0,
    val branchesCount: Int = 0,
    val brandsSynced: Boolean = false,
    val branchesSynced: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class InitialSyncViewModel @Inject constructor(
    private val branchRepository: BranchRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(InitialSyncUiState())
    val uiState: StateFlow<InitialSyncUiState> = _uiState.asStateFlow()

    companion object {
        private const val TAG = "InitialSyncVM"
    }

    /**
     * Start syncing brands and branches from API
     */
    fun startSync() {
        if (_uiState.value.status == InitialSyncStatus.SYNCING) {
            return // Already syncing
        }

        viewModelScope.launch {
            Log.d(TAG, "startSync - Starting initial sync...")

            _uiState.update {
                it.copy(
                    status = InitialSyncStatus.SYNCING,
                    progress = 0f,
                    error = null
                )
            }

            try {
                // Update progress - syncing brands
                _uiState.update { it.copy(progress = 0.2f) }

                // Call API to sync brands and branches
                val result = branchRepository.syncStaffBranchPermissions()

                result.fold(
                    onSuccess = { syncResult ->
                        Log.d(TAG, "startSync - Success: ${syncResult.brandsCount} brands, ${syncResult.branchesCount} branches")

                        // Update brands synced
                        _uiState.update {
                            it.copy(
                                progress = 0.5f,
                                brandsCount = syncResult.brandsCount,
                                brandsSynced = true
                            )
                        }

                        // Small delay for visual feedback
                        kotlinx.coroutines.delay(300)

                        // Update branches synced
                        _uiState.update {
                            it.copy(
                                progress = 1f,
                                branchesCount = syncResult.branchesCount,
                                branchesSynced = true,
                                status = InitialSyncStatus.COMPLETED
                            )
                        }
                    },
                    onFailure = { error ->
                        Log.e(TAG, "startSync - Error: ${error.message}", error)
                        _uiState.update {
                            it.copy(
                                status = InitialSyncStatus.ERROR,
                                error = error.message ?: "Lỗi đồng bộ dữ liệu"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "startSync - Exception: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        status = InitialSyncStatus.ERROR,
                        error = e.message ?: "Lỗi đồng bộ dữ liệu"
                    )
                }
            }
        }
    }

    /**
     * Retry sync after error
     */
    fun retry() {
        _uiState.update {
            InitialSyncUiState() // Reset state
        }
        startSync()
    }
}
