package com.techres.ccb.presentation.screens.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SyncItem(
    val id: String,
    val name: String,
    val icon: String,
    val status: SyncStatus = SyncStatus.PENDING,
    val itemCount: Int = 0,
    val progress: Float = 0f
)

enum class SyncStatus {
    PENDING,
    SYNCING,
    COMPLETED,
    ERROR
}

data class SyncDataUiState(
    val branchName: String = "",
    val syncItems: List<SyncItem> = emptyList(),
    val overallProgress: Float = 0f,
    val currentSyncItem: String? = null,
    val isSyncing: Boolean = false,
    val isCompleted: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class SyncDataViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(SyncDataUiState())
    val uiState: StateFlow<SyncDataUiState> = _uiState.asStateFlow()

    init {
        initSyncItems()
    }

    fun setBranchName(name: String) {
        _uiState.update { it.copy(branchName = name) }
    }

    private fun initSyncItems() {
        val items = listOf(
            SyncItem("categories", "Danh mục", "category"),
            SyncItem("products", "Sản phẩm", "inventory"),
            SyncItem("toppings", "Topping", "add_circle"),
            SyncItem("tables", "Bàn", "table_bar"),
            SyncItem("customers", "Khách hàng", "people"),
            SyncItem("promotions", "Khuyến mãi", "local_offer"),
            SyncItem("settings", "Cấu hình", "settings")
        )
        _uiState.update { it.copy(syncItems = items) }
    }

    fun startSync(onComplete: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true, error = null) }

            val items = _uiState.value.syncItems.toMutableList()
            val totalItems = items.size

            for ((index, item) in items.withIndex()) {
                // Update current syncing item
                _uiState.update { it.copy(currentSyncItem = item.name) }

                // Set item to syncing
                items[index] = item.copy(status = SyncStatus.SYNCING)
                _uiState.update { it.copy(syncItems = items.toList()) }

                // Simulate sync progress
                for (progress in 1..10) {
                    delay(100) // Simulate network delay
                    items[index] = items[index].copy(progress = progress / 10f)
                    _uiState.update {
                        it.copy(
                            syncItems = items.toList(),
                            overallProgress = (index * 10 + progress) / (totalItems * 10f)
                        )
                    }
                }

                // Mark as completed with mock item count
                val itemCount = when (item.id) {
                    "categories" -> 12
                    "products" -> 156
                    "toppings" -> 24
                    "tables" -> 15
                    "customers" -> 1250
                    "promotions" -> 5
                    "settings" -> 1
                    else -> 0
                }

                items[index] = item.copy(
                    status = SyncStatus.COMPLETED,
                    progress = 1f,
                    itemCount = itemCount
                )
                _uiState.update { it.copy(syncItems = items.toList()) }
            }

            // Sync completed
            _uiState.update {
                it.copy(
                    isSyncing = false,
                    isCompleted = true,
                    overallProgress = 1f,
                    currentSyncItem = null
                )
            }

            delay(500) // Brief pause before navigation
            onComplete()
        }
    }

    fun retrySync(onComplete: () -> Unit) {
        _uiState.update {
            it.copy(
                isCompleted = false,
                overallProgress = 0f,
                syncItems = it.syncItems.map { item ->
                    item.copy(status = SyncStatus.PENDING, progress = 0f, itemCount = 0)
                }
            )
        }
        startSync(onComplete)
    }
}
