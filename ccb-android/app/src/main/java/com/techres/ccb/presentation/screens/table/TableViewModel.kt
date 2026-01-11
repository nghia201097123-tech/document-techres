package com.techres.ccb.presentation.screens.table

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
    val isLoading: Boolean = false,
    val errorMessage: String? = null,

    // Statistics
    val totalTables: Int = 0,
    val availableTables: Int = 0,
    val occupiedTables: Int = 0
)

@HiltViewModel
class TableViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val tableRepository: TableRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {

    companion object {
        private const val TAG = "TableViewModel"
    }

    private val _uiState = MutableStateFlow(TableUiState())
    val uiState: StateFlow<TableUiState> = _uiState.asStateFlow()

    private var branchId: String = ""

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                branchId = authRepository.getBranchId() ?: ""
                Log.d(TAG, "loadData - branchId: $branchId")

                if (branchId.isEmpty()) {
                    _uiState.update { it.copy(isLoading = false, errorMessage = "Không tìm thấy chi nhánh") }
                    return@launch
                }

                withContext(Dispatchers.IO) {
                    // Load areas and tables in parallel
                    val areasDeferred = async { tableRepository.getAllAreas(branchId).first() }
                    val tablesDeferred = async { tableRepository.getAllTables(branchId).first() }

                    val areas = areasDeferred.await()
                    val tables = tablesDeferred.await()

                    Log.d(TAG, "loadData - Loaded ${areas.size} areas, ${tables.size} tables")

                    // Load order info for occupied tables
                    val tableOrderIds = tables
                        .filter { !it.currentOrderId.isNullOrEmpty() }
                        .mapNotNull { it.currentOrderId }

                    val ordersMap = if (tableOrderIds.isNotEmpty()) {
                        val orders = orderRepository.getOrdersByIds(tableOrderIds)
                        orders.associateBy { it.id }
                    } else {
                        emptyMap()
                    }

                    // Build table with order info
                    val tablesWithInfo = tables.map { table ->
                        val order = table.currentOrderId?.let { ordersMap[it] }
                        val orderItems = if (order != null) {
                            orderRepository.getOrderItemsSync(order.id)
                        } else {
                            emptyList()
                        }

                        val occupiedMinutes = if (order != null) {
                            try {
                                val createdAt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                                    .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                                    .parse(order.createdAt)?.time ?: 0L
                                ((System.currentTimeMillis() - createdAt) / 60000).toInt()
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
                            orderItemCount = orderItems.size,
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

                    _uiState.update { state ->
                        state.copy(
                            areas = areasWithTables,
                            tablesWithoutArea = tablesWithoutArea,
                            totalTables = totalTables,
                            availableTables = availableTables,
                            occupiedTables = occupiedTables,
                            isLoading = false,
                            errorMessage = null
                        )
                    }

                    Log.d(TAG, "loadData - Complete: ${areasWithTables.size} areas with tables")
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadData - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = "Lỗi tải dữ liệu: ${e.message}")
                }
            }
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
