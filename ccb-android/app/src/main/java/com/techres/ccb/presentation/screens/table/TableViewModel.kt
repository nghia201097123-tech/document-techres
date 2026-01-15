package com.techres.ccb.presentation.screens.table

import android.content.SharedPreferences
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.AreaEntity
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.TableEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.OrderRepository
import com.techres.ccb.data.repository.TableRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Table with order info for display
 */
data class TableWithOrderInfo(
    val id: String,
    val name: String,
    val areaId: String?,
    val capacity: Int,
    val status: String,
    val currentOrderId: String?,
    val orderNumber: String? = null,
    val orderItemCount: Int = 0,
    val orderTotal: Long = 0,
    val occupiedMinutes: Int = 0
)

/**
 * Area with its tables
 */
data class AreaWithTables(
    val area: AreaEntity,
    val tables: List<TableWithOrderInfo>,
    val isExpanded: Boolean = true
)

data class TableUiState(
    val areas: List<AreaWithTables> = emptyList(),
    val tablesWithoutArea: List<TableWithOrderInfo> = emptyList(),
    // Start with loading=false if we have cached data
    val isLoading: Boolean = true,
    val errorMessage: String? = null,

    // Statistics
    val totalTables: Int = 0,
    val availableTables: Int = 0,
    val occupiedTables: Int = 0,

    // Grid columns preference
    val gridColumns: Int = 4
)

@HiltViewModel
class TableViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val tableRepository: TableRepository,
    private val orderRepository: OrderRepository,
    private val sharedPreferences: SharedPreferences
) : ViewModel() {

    companion object {
        private const val TAG = "TableViewModel"
        private const val KEY_TABLE_GRID_COLUMNS = "table_grid_columns"
        private const val DEFAULT_GRID_COLUMNS = 4

        // Global cache that survives ViewModel recreation for instant load
        @Volatile
        private var cachedState: TableUiState? = null
        private var cacheTimestamp: Long = 0L
        private const val CACHE_VALIDITY_MS = 30_000L // 30 seconds cache validity

        // Also cache grid columns to avoid SharedPreferences read
        @Volatile
        private var cachedGridColumns: Int? = null

        /**
         * Invalidate cache - gọi khi table status thay đổi từ bên ngoài (VD: đặt món, thanh toán)
         * Giúp TableScreen refresh ngay lập tức thay vì đợi cache hết hạn
         */
        fun invalidateCache() {
            cachedState = null
            cacheTimestamp = 0L
            Log.d(TAG, "Cache invalidated")
        }
    }

    // Check cache validity synchronously in the initializer
    private val isCacheValid = cachedState != null &&
        System.currentTimeMillis() - cacheTimestamp < CACHE_VALIDITY_MS

    // Initialize with cached state IMMEDIATELY for instant display - no async here
    private val _uiState = MutableStateFlow(
        if (isCacheValid) {
            // Use cached state directly with isLoading = false for instant display
            cachedState!!.copy(isLoading = false)
        } else {
            // No cache - show loading state but with cached grid columns if available
            TableUiState(
                isLoading = true,
                gridColumns = cachedGridColumns ?: DEFAULT_GRID_COLUMNS
            )
        }
    )
    val uiState: StateFlow<TableUiState> = _uiState.asStateFlow()

    private var branchId: String = ""

    // Cache flag to avoid reloading
    private var isDataLoaded = isCacheValid

    // NO init block - data will be loaded lazily via initializeData()

    /**
     * Initialize data - called from LaunchedEffect in Screen for smooth navigation
     * This allows the screen to render immediately before data is loaded
     */
    fun initializeData() {
        // Check if static cache was invalidated (e.g., by placing an order)
        // If cache is null, we need to refresh even if isDataLoaded is true
        val cacheWasInvalidated = cachedState == null

        // If cache is valid and wasn't invalidated, no need to do anything
        if (isDataLoaded && !cacheWasInvalidated) {
            Log.d(TAG, "initializeData - Using cached data, skipping load")
            return
        }

        // If cache was invalidated, force refresh
        if (cacheWasInvalidated) {
            Log.d(TAG, "initializeData - Cache was invalidated, forcing refresh")
            isDataLoaded = false
        }

        viewModelScope.launch {
            // Load grid columns preference async if not cached
            if (cachedGridColumns == null) {
                val savedColumns = withContext(Dispatchers.IO) {
                    sharedPreferences.getInt(KEY_TABLE_GRID_COLUMNS, DEFAULT_GRID_COLUMNS)
                }
                cachedGridColumns = savedColumns
                Log.d(TAG, "initializeData - Loaded columns from SharedPreferences: $savedColumns")
                _uiState.update { it.copy(gridColumns = savedColumns) }
            }

            // Then load table data
            loadDataInternal()
        }
    }

    fun setGridColumns(columns: Int) {
        Log.d(TAG, "setGridColumns - Setting columns to: $columns")
        cachedGridColumns = columns // Update memory cache
        _uiState.update { it.copy(gridColumns = columns) }
        // Use commit() instead of apply() to ensure synchronous save
        val saved = sharedPreferences.edit().putInt(KEY_TABLE_GRID_COLUMNS, columns).commit()
        Log.d(TAG, "setGridColumns - Saved to SharedPreferences: $saved")

        // Also update the global cached state if it exists
        cachedState?.let {
            cachedState = it.copy(gridColumns = columns)
        }
    }

    /**
     * Internal method to load table data
     */
    private suspend fun loadDataInternal() {
        // Only show loading if this is the first load
        if (!isDataLoaded) {
            _uiState.update { it.copy(isLoading = true) }
        }

        try {
            branchId = authRepository.getBranchId() ?: ""
            Log.d(TAG, "loadDataInternal - branchId: $branchId")

            if (branchId.isEmpty()) {
                _uiState.update { it.copy(isLoading = false, errorMessage = "Không tìm thấy chi nhánh") }
                return
            }

            withContext(Dispatchers.IO) {
                // Load areas and tables in parallel
                val areasDeferred = async { tableRepository.getAllAreas(branchId).first() }
                val tablesDeferred = async { tableRepository.getAllTables(branchId).first() }

                val areas = areasDeferred.await()
                val tables = tablesDeferred.await()

                Log.d(TAG, "loadDataInternal - Loaded ${areas.size} areas, ${tables.size} tables")

                // Load order info for occupied tables
                val tableOrderIds = tables
                    .filter { !it.currentOrderId.isNullOrEmpty() }
                    .mapNotNull { it.currentOrderId }

                // Load orders and item counts in parallel (optimized - single batch query)
                val ordersDeferred = async {
                    if (tableOrderIds.isNotEmpty()) {
                        orderRepository.getOrdersByIds(tableOrderIds).associateBy { it.id }
                    } else {
                        emptyMap()
                    }
                }
                val itemCountsDeferred = async {
                    orderRepository.getItemCountsByOrderIds(tableOrderIds)
                }

                val ordersMap = ordersDeferred.await()
                val itemCountsMap = itemCountsDeferred.await()

                // Pre-calculate date formatter once
                val dateFormatter = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                    .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                val currentTime = System.currentTimeMillis()

                // Build table with order info (optimized - no N+1 queries)
                val tablesWithInfo = tables.map { table ->
                    val order = table.currentOrderId?.let { ordersMap[it] }
                    val itemCount = table.currentOrderId?.let { itemCountsMap[it] } ?: 0

                    val occupiedMinutes = if (order != null) {
                        try {
                            val createdAt = dateFormatter.parse(order.createdAt)?.time ?: 0L
                            ((currentTime - createdAt) / 60000).toInt()
                        } catch (e: Exception) {
                            0
                        }
                    } else {
                        0
                    }

                    TableWithOrderInfo(
                        id = table.id,
                        name = table.name,
                        areaId = table.areaId,
                        capacity = table.capacity,
                        status = table.status,
                        currentOrderId = table.currentOrderId,
                        orderNumber = order?.orderNumber,
                        orderItemCount = itemCount,
                        orderTotal = order?.totalAmount?.toLong() ?: 0,
                        occupiedMinutes = occupiedMinutes
                    )
                }

                // Group tables by area
                val currentExpandedState = _uiState.value.areas.associate { it.area.id to it.isExpanded }

                val areasWithTables = areas.map { area ->
                    AreaWithTables(
                        area = area,
                        tables = tablesWithInfo.filter { it.areaId == area.id }.sortedBy { it.name },
                        isExpanded = currentExpandedState[area.id] ?: true
                    )
                }.filter { it.tables.isNotEmpty() }.sortedBy { it.area.sortOrder }

                val tablesWithoutArea = tablesWithInfo.filter { it.areaId.isNullOrEmpty() }.sortedBy { it.name }

                // Calculate statistics
                val totalTables = tables.size
                val availableTables = tables.count { it.status == "available" }
                val occupiedTables = tables.count { it.status == "occupied" || it.status == "reserved" }

                val newState = _uiState.value.copy(
                    areas = areasWithTables,
                    tablesWithoutArea = tablesWithoutArea,
                    totalTables = totalTables,
                    availableTables = availableTables,
                    occupiedTables = occupiedTables,
                    isLoading = false,
                    errorMessage = null
                )
                _uiState.value = newState

                // Save to global cache for instant load on next navigation
                cachedState = newState
                cacheTimestamp = System.currentTimeMillis()

                // Mark data as loaded for caching
                isDataLoaded = true

                Log.d(TAG, "loadDataInternal - Complete: ${areasWithTables.size} areas with tables, cached for instant load")
            }
        } catch (e: Exception) {
            Log.e(TAG, "loadDataInternal - Error: ${e.message}", e)
            _uiState.update {
                it.copy(isLoading = false, errorMessage = "Lỗi tải dữ liệu: ${e.message}")
            }
        }
    }

    /**
     * Force refresh data (for manual refresh button)
     */
    fun refreshData() {
        isDataLoaded = false
        viewModelScope.launch {
            loadDataInternal()
        }
    }

    fun toggleAreaExpanded(areaId: String) {
        _uiState.update { state ->
            state.copy(
                areas = state.areas.map { area ->
                    if (area.area.id == areaId) {
                        area.copy(isExpanded = !area.isExpanded)
                    } else {
                        area
                    }
                }
            )
        }
    }

    fun clearErrorMessage() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
