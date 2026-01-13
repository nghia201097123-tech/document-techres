package com.techres.ccb.presentation.screens.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.BillTemplateDao
import com.techres.ccb.data.local.dao.ComboItemDao
import com.techres.ccb.data.local.dao.CouponDao
import com.techres.ccb.data.local.dao.ProductNoteDao
import com.techres.ccb.data.local.dao.ProductToppingDao
import com.techres.ccb.data.local.dao.SeasonalPriceDao
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.BranchRepository
import com.techres.ccb.data.repository.CategoryRepository
import com.techres.ccb.data.repository.ProductRepository
import com.techres.ccb.data.repository.StaffRepository
import com.techres.ccb.data.repository.SyncRepository
import com.techres.ccb.data.repository.SyncStep
import com.techres.ccb.data.repository.SyncStepProgress
import com.techres.ccb.data.repository.SyncStepStatus
import com.techres.ccb.data.repository.TableRepository
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
    val progress: Float = 0f,
    val errorMessage: String? = null
)

enum class SyncStatus {
    PENDING,
    SYNCING,
    COMPLETED,
    ERROR
}

data class SyncDataUiState(
    val branchId: String = "",
    val branchName: String = "",
    val syncItems: List<SyncItem> = emptyList(),
    val overallProgress: Float = 0f,
    val currentSyncItem: String? = null,
    val isSyncing: Boolean = false,
    val isCompleted: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class SyncDataViewModel @Inject constructor(
    private val syncRepository: SyncRepository,
    private val branchRepository: BranchRepository,
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository,
    private val tableRepository: TableRepository,
    private val staffRepository: StaffRepository,
    private val authRepository: AuthRepository,
    private val productToppingDao: ProductToppingDao,
    private val comboItemDao: ComboItemDao,
    private val seasonalPriceDao: SeasonalPriceDao,
    private val couponDao: CouponDao,
    private val productNoteDao: ProductNoteDao,
    private val billTemplateDao: BillTemplateDao
) : ViewModel() {

    private val _uiState = MutableStateFlow(SyncDataUiState())
    val uiState: StateFlow<SyncDataUiState> = _uiState.asStateFlow()

    init {
        initSyncItems()
        loadBranchInfo()
    }

    private fun loadBranchInfo() {
        val branchId = branchRepository.getSelectedBranchId() ?: ""
        val branchName = branchRepository.getSelectedBranchName() ?: ""
        _uiState.update { it.copy(branchId = branchId, branchName = branchName) }
    }

    fun setBranchName(name: String) {
        _uiState.update { it.copy(branchName = name) }
    }

    private fun initSyncItems() {
        val items = listOf(
            SyncItem("categories", "Danh mục", "category"),
            SyncItem("products", "Sản phẩm", "inventory"),
            SyncItem("product_toppings", "Topping sản phẩm", "add_circle"),
            SyncItem("combo_items", "Combo", "layers"),
            SyncItem("areas", "Khu vực", "place"),
            SyncItem("tables", "Bàn", "table_bar"),
            SyncItem("staff", "Nhân viên", "people"),
            SyncItem("seasonal_prices", "Giá thời vụ", "event"),
            SyncItem("coupons", "Coupon", "discount"),
            SyncItem("product_notes", "Ghi chú", "note"),
            SyncItem("bill_templates", "Mẫu in bill", "receipt"),
            SyncItem("settings", "Cấu hình", "settings")
        )
        _uiState.update { it.copy(syncItems = items) }
    }

    /**
     * Start full sync from cloud to local
     */
    fun startSync(onComplete: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true, error = null) }

            // Use full sync with progress callback
            val fullSyncResult = syncRepository.performFullSyncWithProgress { progress ->
                handleSyncProgress(progress)
            }

            fullSyncResult.fold(
                onSuccess = {
                    // Full sync succeeded - update UI with counts from local DB
                    updateSyncItemsFromLocalDb()

                    _uiState.update {
                        it.copy(
                            isSyncing = false,
                            isCompleted = true,
                            overallProgress = 1f,
                            currentSyncItem = null
                        )
                    }

                    delay(500)
                    onComplete()
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            isSyncing = false,
                            error = e.message ?: "Đồng bộ thất bại"
                        )
                    }
                }
            )
        }
    }

    /**
     * Handle sync progress from SyncRepository
     */
    private fun handleSyncProgress(progress: SyncStepProgress) {
        val itemId = when (progress.step) {
            SyncStep.FETCHING -> null
            SyncStep.CATEGORIES -> "categories"
            SyncStep.PRODUCTS -> "products"
            SyncStep.PRODUCT_TOPPINGS -> "product_toppings"
            SyncStep.COMBO_ITEMS -> "combo_items"
            SyncStep.AREAS -> "areas"
            SyncStep.TABLES -> "tables"
            SyncStep.STAFF -> "staff"
            SyncStep.KITCHENS -> "kitchens"
            SyncStep.SEASONAL_PRICES -> "seasonal_prices"
            SyncStep.COUPONS -> "coupons"
            SyncStep.PRODUCT_NOTES -> "product_notes"
            SyncStep.BILL_TEMPLATES -> "bill_templates"
        }

        if (itemId != null) {
            val items = _uiState.value.syncItems.toMutableList()
            val index = items.indexOfFirst { it.id == itemId }
            if (index >= 0) {
                val status = when (progress.status) {
                    SyncStepStatus.PENDING -> SyncStatus.PENDING
                    SyncStepStatus.IN_PROGRESS -> SyncStatus.SYNCING
                    SyncStepStatus.COMPLETED -> SyncStatus.COMPLETED
                    SyncStepStatus.ERROR -> SyncStatus.ERROR
                }
                items[index] = items[index].copy(
                    status = status,
                    itemCount = progress.count,
                    progress = if (status == SyncStatus.COMPLETED) 1f else 0.5f
                )

                val completedCount = items.count { it.status == SyncStatus.COMPLETED }
                val totalCount = items.size

                _uiState.update {
                    it.copy(
                        syncItems = items.toList(),
                        currentSyncItem = if (status == SyncStatus.SYNCING) items[index].name else it.currentSyncItem,
                        overallProgress = completedCount.toFloat() / totalCount
                    )
                }
            }
        }
    }

    /**
     * Perform individual sync for each data type with progress updates
     */
    private suspend fun performIndividualSync(onComplete: () -> Unit) {
        val items = _uiState.value.syncItems.toMutableList()
        val totalItems = items.size
        var hasError = false

        for ((index, item) in items.withIndex()) {
            // Update current syncing item
            _uiState.update { it.copy(currentSyncItem = item.name) }

            // Set item to syncing
            items[index] = item.copy(status = SyncStatus.SYNCING, progress = 0.5f)
            _uiState.update { it.copy(syncItems = items.toList()) }

            try {
                // Perform sync based on item type
                val result = when (item.id) {
                    "categories" -> syncCategories()
                    "products" -> syncProducts()
                    "product_toppings" -> syncProductToppings()
                    "combo_items" -> syncComboItems()
                    "areas" -> syncAreas()
                    "tables" -> syncTables()
                    "staff" -> syncStaff()
                    "seasonal_prices" -> syncSeasonalPrices()
                    "coupons" -> syncCoupons()
                    "product_notes" -> syncProductNotes()
                    "bill_templates" -> syncBillTemplates()
                    "settings" -> syncSettings()
                    else -> Result.success(0)
                }

                result.fold(
                    onSuccess = { count ->
                        items[index] = item.copy(
                            status = SyncStatus.COMPLETED,
                            progress = 1f,
                            itemCount = count
                        )
                    },
                    onFailure = { e ->
                        items[index] = item.copy(
                            status = SyncStatus.ERROR,
                            progress = 1f,
                            errorMessage = e.message
                        )
                        hasError = true
                    }
                )
            } catch (e: Exception) {
                items[index] = item.copy(
                    status = SyncStatus.ERROR,
                    progress = 1f,
                    errorMessage = e.message
                )
                hasError = true
            }

            // Update progress
            _uiState.update {
                it.copy(
                    syncItems = items.toList(),
                    overallProgress = (index + 1) / totalItems.toFloat()
                )
            }

            // Small delay between items
            delay(200)
        }

        // Sync completed
        _uiState.update {
            it.copy(
                isSyncing = false,
                isCompleted = true,
                overallProgress = 1f,
                currentSyncItem = null,
                error = if (hasError) "Một số mục đồng bộ thất bại" else null
            )
        }

        delay(500)
        onComplete()
    }

    private suspend fun syncCategories(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = categoryRepository.getCategoriesCount(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncProducts(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = productRepository.getProductsCount(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncProductToppings(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = productToppingDao.countByBranch(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncComboItems(): Result<Int> {
        return try {
            val count = comboItemDao.countAll()
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncAreas(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = tableRepository.getAreasCount(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncTables(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = tableRepository.getTablesCount(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncStaff(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = staffRepository.getStaffCount(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncSeasonalPrices(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = seasonalPriceDao.countActive(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncCoupons(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = couponDao.countActive(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncProductNotes(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = productNoteDao.countActive(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncBillTemplates(): Result<Int> {
        val branchId = _uiState.value.branchId
        return try {
            val count = billTemplateDao.getActiveCount(branchId)
            Result.success(count)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun syncSettings(): Result<Int> {
        // Settings sync is always successful with 1 item
        return Result.success(1)
    }

    /**
     * Update sync items with counts from local database
     */
    private suspend fun updateSyncItemsFromLocalDb() {
        val branchId = _uiState.value.branchId
        val items = _uiState.value.syncItems.toMutableList()

        for ((index, item) in items.withIndex()) {
            val count = when (item.id) {
                "categories" -> try { categoryRepository.getCategoriesCount(branchId) } catch (e: Exception) { 0 }
                "products" -> try { productRepository.getProductsCount(branchId) } catch (e: Exception) { 0 }
                "product_toppings" -> try { productToppingDao.countByBranch(branchId) } catch (e: Exception) { 0 }
                "combo_items" -> try { comboItemDao.countAll() } catch (e: Exception) { 0 }
                "areas" -> try { tableRepository.getAreasCount(branchId) } catch (e: Exception) { 0 }
                "tables" -> try { tableRepository.getTablesCount(branchId) } catch (e: Exception) { 0 }
                "staff" -> try { staffRepository.getStaffCount(branchId) } catch (e: Exception) { 0 }
                "seasonal_prices" -> try { seasonalPriceDao.countActive(branchId) } catch (e: Exception) { 0 }
                "coupons" -> try { couponDao.countActive(branchId) } catch (e: Exception) { 0 }
                "product_notes" -> try { productNoteDao.countActive(branchId) } catch (e: Exception) { 0 }
                "bill_templates" -> try { billTemplateDao.getActiveCount(branchId) } catch (e: Exception) { 0 }
                "settings" -> 1
                else -> 0
            }

            items[index] = item.copy(
                status = SyncStatus.COMPLETED,
                progress = 1f,
                itemCount = count
            )
        }

        _uiState.update { it.copy(syncItems = items.toList()) }
    }

    fun retrySync(onComplete: () -> Unit) {
        _uiState.update {
            it.copy(
                isCompleted = false,
                overallProgress = 0f,
                error = null,
                syncItems = it.syncItems.map { item ->
                    item.copy(status = SyncStatus.PENDING, progress = 0f, itemCount = 0, errorMessage = null)
                }
            )
        }
        startSync(onComplete)
    }
}
