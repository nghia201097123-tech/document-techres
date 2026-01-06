package com.techres.ccb.presentation.screens.settings

import android.content.SharedPreferences
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.SyncRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class SettingsUiState(
    val branchName: String = "",
    val deviceId: String = "",
    val lastSyncTime: String? = null,
    val isSyncing: Boolean = false,
    val syncError: String? = null
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
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
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
            _uiState.value = _uiState.value.copy(isSyncing = true, syncError = null)

            val result = syncRepository.performFullSync()
            result.fold(
                onSuccess = {
                    val now = System.currentTimeMillis()
                    sharedPreferences.edit().putLong(KEY_LAST_SYNC, now).apply()

                    val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
                    _uiState.value = _uiState.value.copy(
                        isSyncing = false,
                        lastSyncTime = dateFormat.format(Date(now))
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isSyncing = false,
                        syncError = e.message ?: "Đồng bộ thất bại"
                    )
                }
            )
        }
    }
}
