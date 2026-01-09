package com.techres.ccb.presentation.screens.branch

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.BrandEntity
import com.techres.ccb.data.local.entity.BranchEntity
import com.techres.ccb.data.repository.BranchRepository
import com.techres.ccb.data.repository.SyncRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// UI models
data class Brand(
    val id: String,
    val name: String,
    val logo: String? = null,
    val branches: List<Branch> = emptyList()
)

data class Branch(
    val id: String,
    val name: String,
    val address: String,
    val brandId: String
)

// Sync state enum
enum class SyncState {
    NOT_STARTED,
    SYNCING,
    COMPLETED,
    ERROR
}

data class BranchSelectionUiState(
    val isLoading: Boolean = false,
    val isSyncing: Boolean = false,
    val syncState: SyncState = SyncState.NOT_STARTED,
    val syncProgress: Float = 0f,
    val brands: List<Brand> = emptyList(),
    val selectedBrand: Brand? = null,
    val selectedBranch: Branch? = null,
    val error: String? = null,
    val syncedBrandsCount: Int = 0,
    val syncedBranchesCount: Int = 0,
    // Branch data sync state
    val isSyncingBranchData: Boolean = false,
    val branchDataSyncState: SyncState = SyncState.NOT_STARTED,
    val branchDataSyncProgress: Float = 0f,
    val branchDataSyncComplete: Boolean = false
)

@HiltViewModel
class BranchSelectionViewModel @Inject constructor(
    private val branchRepository: BranchRepository,
    private val syncRepository: SyncRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BranchSelectionUiState())
    val uiState: StateFlow<BranchSelectionUiState> = _uiState.asStateFlow()

    // Keep original entities for saving
    private var brandEntityMap: Map<String, BrandEntity> = emptyMap()
    private var branchEntityMap: Map<String, BranchEntity> = emptyMap()

    init {
        loadBrandsFromLocal()
    }

    /**
     * Load brands and branches from LOCAL database
     */
    fun loadBrandsFromLocal() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Get brands from local DB
                val brandEntities = branchRepository.getAllBrandsLocal().first()

                if (brandEntities.isEmpty()) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            brands = emptyList(),
                            error = "Chưa có dữ liệu. Vui lòng đồng bộ dữ liệu trước."
                        )
                    }
                    return@launch
                }

                // Store original entities
                brandEntityMap = brandEntities.associateBy { it.id }

                // Get all branches and group by brand
                val allBranches = branchRepository.getAllBranchesLocal().first()
                branchEntityMap = allBranches.associateBy { it.id }
                val branchesByBrand = allBranches.groupBy { it.brandId }

                // Map to UI models
                val brands = brandEntities.map { brandEntity ->
                    val branches = branchesByBrand[brandEntity.id]?.map { branchEntity ->
                        Branch(
                            id = branchEntity.id,
                            name = branchEntity.name,
                            address = branchEntity.address ?: "",
                            brandId = branchEntity.brandId
                        )
                    } ?: emptyList()

                    Brand(
                        id = brandEntity.id,
                        name = brandEntity.name,
                        logo = brandEntity.logo,
                        branches = branches
                    )
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        brands = brands,
                        error = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Lỗi khi tải dữ liệu"
                    )
                }
            }
        }
    }

    /**
     * Reload brands - for retry button
     */
    fun loadBrands() {
        loadBrandsFromLocal()
    }

    fun selectBrand(brand: Brand) {
        _uiState.update {
            it.copy(
                selectedBrand = brand,
                selectedBranch = null, // Reset branch selection
                error = null
            )
        }
    }

    fun selectBranch(branch: Branch) {
        _uiState.update { it.copy(selectedBranch = branch, error = null) }
    }

    fun canProceed(): Boolean {
        return _uiState.value.selectedBranch != null
    }

    /**
     * Save selected branch and return true if successful
     */
    fun confirmSelection(): Boolean {
        val selectedBrand = _uiState.value.selectedBrand ?: return false
        val selectedBranch = _uiState.value.selectedBranch ?: return false

        val brandEntity = brandEntityMap[selectedBrand.id]
        val branchEntity = branchEntityMap[selectedBranch.id]

        if (brandEntity != null && branchEntity != null) {
            branchRepository.saveSelectedBranch(brandEntity, branchEntity)
            return true
        }

        return false
    }

    /**
     * Save selected branch and sync all branch data (categories, products, areas, tables, staff)
     */
    fun confirmSelectionAndSync() {
        val selectedBrand = _uiState.value.selectedBrand ?: return
        val selectedBranch = _uiState.value.selectedBranch ?: return

        val brandEntity = brandEntityMap[selectedBrand.id]
        val branchEntity = branchEntityMap[selectedBranch.id]

        if (brandEntity == null || branchEntity == null) {
            _uiState.update { it.copy(error = "Không tìm thấy thông tin chi nhánh") }
            return
        }

        viewModelScope.launch {
            Log.d(TAG, "confirmSelectionAndSync - Starting...")
            _uiState.update {
                it.copy(
                    isSyncingBranchData = true,
                    branchDataSyncState = SyncState.SYNCING,
                    branchDataSyncProgress = 0f,
                    error = null
                )
            }

            try {
                // Save selected branch first
                branchRepository.saveSelectedBranch(brandEntity, branchEntity)
                Log.d(TAG, "confirmSelectionAndSync - Branch saved: ${branchEntity.name}")
                _uiState.update { it.copy(branchDataSyncProgress = 0.2f) }

                // Perform full sync for branch data
                val result = syncRepository.performFullSync()
                _uiState.update { it.copy(branchDataSyncProgress = 0.9f) }

                result.fold(
                    onSuccess = {
                        Log.d(TAG, "confirmSelectionAndSync - Sync completed successfully")
                        _uiState.update {
                            it.copy(
                                isSyncingBranchData = false,
                                branchDataSyncState = SyncState.COMPLETED,
                                branchDataSyncProgress = 1f,
                                branchDataSyncComplete = true,
                                error = null
                            )
                        }
                    },
                    onFailure = { error ->
                        Log.e(TAG, "confirmSelectionAndSync - Sync failed: ${error.message}", error)
                        _uiState.update {
                            it.copy(
                                isSyncingBranchData = false,
                                branchDataSyncState = SyncState.ERROR,
                                branchDataSyncProgress = 0f,
                                error = error.message ?: "Lỗi đồng bộ dữ liệu chi nhánh"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "confirmSelectionAndSync - Exception: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isSyncingBranchData = false,
                        branchDataSyncState = SyncState.ERROR,
                        branchDataSyncProgress = 0f,
                        error = e.message ?: "Lỗi đồng bộ dữ liệu chi nhánh"
                    )
                }
            }
        }
    }

    /**
     * Reset branch data sync state
     */
    fun resetBranchDataSyncState() {
        _uiState.update {
            it.copy(
                branchDataSyncState = SyncState.NOT_STARTED,
                branchDataSyncProgress = 0f,
                branchDataSyncComplete = false,
                error = null
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Sync brands and branches from API based on staff permissions
     */
    fun syncBranchPermissions() {
        viewModelScope.launch {
            Log.d(TAG, "syncBranchPermissions - Starting sync...")
            _uiState.update {
                it.copy(
                    isSyncing = true,
                    syncState = SyncState.SYNCING,
                    syncProgress = 0f,
                    error = null
                )
            }

            try {
                // Simulate progress for better UX
                _uiState.update { it.copy(syncProgress = 0.2f) }

                val result = branchRepository.syncStaffBranchPermissions()
                Log.d(TAG, "syncBranchPermissions - Result: $result")

                _uiState.update { it.copy(syncProgress = 0.8f) }

                result.fold(
                    onSuccess = { syncResult ->
                        Log.d(TAG, "syncBranchPermissions - Success: ${syncResult.brandsCount} brands, ${syncResult.branchesCount} branches")
                        _uiState.update {
                            it.copy(
                                isSyncing = false,
                                syncState = SyncState.COMPLETED,
                                syncProgress = 1f,
                                syncedBrandsCount = syncResult.brandsCount,
                                syncedBranchesCount = syncResult.branchesCount,
                                error = null
                            )
                        }
                        // Reload data from local DB
                        loadBrandsFromLocal()
                    },
                    onFailure = { error ->
                        Log.e(TAG, "syncBranchPermissions - Error: ${error.message}", error)
                        _uiState.update {
                            it.copy(
                                isSyncing = false,
                                syncState = SyncState.ERROR,
                                syncProgress = 0f,
                                error = error.message ?: "Lỗi đồng bộ dữ liệu"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(TAG, "syncBranchPermissions - Exception: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        syncState = SyncState.ERROR,
                        syncProgress = 0f,
                        error = e.message ?: "Lỗi đồng bộ dữ liệu"
                    )
                }
            }
        }
    }

    /**
     * Reset sync state to allow re-syncing
     */
    fun resetSyncState() {
        _uiState.update {
            it.copy(
                syncState = SyncState.NOT_STARTED,
                syncProgress = 0f,
                error = null
            )
        }
    }

    companion object {
        private const val TAG = "BranchSelectionVM"
    }
}
