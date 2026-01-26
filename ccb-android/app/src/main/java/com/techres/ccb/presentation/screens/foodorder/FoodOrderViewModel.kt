package com.techres.ccb.presentation.screens.foodorder

import android.content.SharedPreferences
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.remote.dto.PollOrderDto
import com.techres.ccb.data.remote.dto.PollOrderItemDto
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.FoodPlatformRepository
import com.techres.ccb.domain.model.*
import com.techres.ccb.util.OrderAnnouncementManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FoodOrderUiState(
    // Orders
    val orders: List<FoodAppOrder> = emptyList(),
    val selectedOrder: FoodAppOrder? = null,

    // Filters
    val selectedFilter: FoodOrderFilter = FoodOrderFilter.ALL,
    val selectedPlatform: FoodPlatform? = null,

    // Counts
    val newOrdersCount: Int = 0,
    val processingOrdersCount: Int = 0,

    // UI State
    val isLoading: Boolean = false,
    val showOrderDetail: Boolean = false,
    val isPolling: Boolean = false,

    // Grid settings
    val gridColumns: Int = 3,

    // Messages
    val successMessage: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class FoodOrderViewModel @Inject constructor(
    private val foodPlatformRepository: FoodPlatformRepository,
    private val authRepository: AuthRepository,
    private val orderAnnouncementManager: OrderAnnouncementManager,
    private val sharedPreferences: SharedPreferences
) : ViewModel() {

    companion object {
        private const val TAG = "FoodOrderViewModel"
        private const val POLL_INTERVAL_MS = 15000L // 15 seconds
        private const val KEY_FOOD_ORDER_GRID_COLUMNS = "food_order_grid_columns"
        private const val DEFAULT_GRID_COLUMNS = 3
    }

    private val _uiState = MutableStateFlow(FoodOrderUiState())
    val uiState: StateFlow<FoodOrderUiState> = _uiState.asStateFlow()

    // All orders from API
    private val _ordersList = mutableListOf<FoodAppOrder>()

    // Track known order IDs to detect truly new orders
    private val knownOrderIds = mutableSetOf<String>()

    // Polling job
    private var pollingJob: Job? = null

    init {
        // Load grid columns preference
        loadGridColumnsPreference()
        // Start polling when ViewModel is created
        startPolling()
    }

    private fun loadGridColumnsPreference() {
        val savedColumns = sharedPreferences.getInt(KEY_FOOD_ORDER_GRID_COLUMNS, DEFAULT_GRID_COLUMNS)
        Log.d(TAG, "loadGridColumnsPreference - Loaded columns: $savedColumns")
        _uiState.update { it.copy(gridColumns = savedColumns) }
    }

    fun setGridColumns(columns: Int) {
        if (columns in 1..6) {
            Log.d(TAG, "setGridColumns - Setting columns to: $columns")
            _uiState.update { it.copy(gridColumns = columns) }
            sharedPreferences.edit().putInt(KEY_FOOD_ORDER_GRID_COLUMNS, columns).commit()
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
        orderAnnouncementManager.stop()
    }

    /**
     * Start auto-polling orders every 5 seconds
     */
    fun startPolling() {
        if (pollingJob?.isActive == true) {
            Log.d(TAG, "Polling already active")
            return
        }

        Log.d(TAG, "Starting order polling...")
        _uiState.update { it.copy(isPolling = true) }

        pollingJob = viewModelScope.launch {
            while (isActive) {
                pollOrders()
                delay(POLL_INTERVAL_MS)
            }
        }
    }

    /**
     * Stop auto-polling
     */
    fun stopPolling() {
        Log.d(TAG, "Stopping order polling...")
        pollingJob?.cancel()
        pollingJob = null
        _uiState.update { it.copy(isPolling = false) }
    }

    /**
     * Poll orders from API
     */
    private suspend fun pollOrders() {
        val branchId = authRepository.getBranchId()
        if (branchId == null) {
            Log.w(TAG, "No branchId available, skipping poll")
            return
        }

        Log.d(TAG, "Polling orders for branchId: $branchId")

        try {
            val response = foodPlatformRepository.pollOrders(branchId.toString())

            if (response.status == 200 && response.data != null) {
                val fetchedOrders = response.data.orders.mapNotNull { dto ->
                    mapDtoToFoodAppOrder(dto)
                }

                // Detect truly new orders (not seen before)
                val newlyArrivedOrders = fetchedOrders.filter { order ->
                    order.id !in knownOrderIds
                }

                // Update known order IDs
                knownOrderIds.addAll(fetchedOrders.map { it.id })

                // Announce new orders via TTS
                if (newlyArrivedOrders.isNotEmpty()) {
                    Log.d(TAG, "Announcing ${newlyArrivedOrders.size} new orders")
                    val ordersToAnnounce = newlyArrivedOrders.map { order ->
                        Pair(order.platform.name, order.orderCode)
                    }
                    orderAnnouncementManager.announceNewOrders(ordersToAnnounce)
                }

                // Update orders list
                _ordersList.clear()
                _ordersList.addAll(fetchedOrders)

                Log.d(TAG, "Received ${fetchedOrders.size} orders, ${newlyArrivedOrders.size} newly arrived")

                // Update UI state
                // TechRes simplified flow: NEW -> PREPARING -> COMPLETED/CANCELLED
                _uiState.update { state ->
                    state.copy(
                        orders = getFilteredOrders(),
                        newOrdersCount = _ordersList.count { it.status == FoodOrderStatus.NEW },
                        processingOrdersCount = _ordersList.count {
                            it.status == FoodOrderStatus.PREPARING
                        },
                        isLoading = false,
                        errorMessage = null
                    )
                }

                // Show snackbar notification for new orders
                if (newlyArrivedOrders.isNotEmpty()) {
                    showSuccess("Có ${newlyArrivedOrders.size} đơn hàng mới!")
                }
            } else {
                Log.e(TAG, "Poll orders failed: ${response.message}")
                // Don't update error message on every failed poll, just log it
            }
        } catch (e: Exception) {
            Log.e(TAG, "Poll orders error: ${e.message}", e)
        }
    }

    /**
     * Map DTO to domain model
     */
    private fun mapDtoToFoodAppOrder(dto: PollOrderDto): FoodAppOrder? {
        return try {
            FoodAppOrder(
                id = dto.id ?: dto.externalOrderId,
                orderCode = dto.orderCode,
                platform = mapPlatformString(dto.platform),
                status = mapStatusString(dto.status),
                // Customer info
                customerId = dto.customerId,
                customerName = dto.customerName ?: "Khách hàng",
                customerPhone = dto.customerPhone ?: "",
                customerAddress = dto.customerAddress,
                customerNote = dto.customerNote,
                // Items
                items = dto.items?.map { mapItemDto(it) } ?: emptyList(),
                subtotal = (dto.subtotal ?: 0.0).toLong(),
                deliveryFee = (dto.deliveryFee ?: 0.0).toLong(),
                platformFee = (dto.platformFee ?: 0.0).toLong(),
                discount = (dto.discount ?: 0.0).toLong(),
                totalAmount = dto.totalAmount.toLong(),
                // Driver info
                driverId = dto.driverId,
                driverName = dto.driverName,
                driverPhone = dto.driverPhone,
                driverAvatar = dto.driverAvatar,
                estimatedDeliveryTime = dto.estimatedDeliveryTime,
                // Order status message
                orderContentMessage = dto.orderContentMessage,
                // Timestamps
                createdAt = parseTimestamp(dto.platformCreatedAt ?: dto.createdAt) ?: System.currentTimeMillis(),
                acceptedAt = parseTimestamp(dto.acceptedAt),
                preparedAt = parseTimestamp(dto.preparedAt),
                completedAt = parseTimestamp(dto.completedAt),
                // Extra
                isPaid = dto.isPaid ?: true,
                paymentMethod = dto.paymentMethod
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error mapping order ${dto.orderCode}: ${e.message}")
            null
        }
    }

    private fun mapItemDto(dto: PollOrderItemDto): FoodOrderItem {
        return FoodOrderItem(
            productName = dto.productName,
            quantity = dto.quantity,
            unitPrice = (dto.unitPrice ?: 0.0).toLong(),
            totalPrice = (dto.totalPrice ?: 0.0).toLong(),
            note = dto.note,
            options = dto.options
        )
    }

    private fun mapPlatformString(platform: String): FoodPlatform {
        return when (platform.uppercase()) {
            "GRAB", "GRABFOOD", "GRAB_FOOD" -> FoodPlatform.GRAB_FOOD
            "SHOPEE", "SHOPEEFOOD", "SHOPEE_FOOD" -> FoodPlatform.SHOPEE_FOOD
            "BE", "BEFOOD", "BE_FOOD" -> FoodPlatform.BE_FOOD
            "GO", "GOFOOD", "GO_FOOD" -> FoodPlatform.GO_FOOD
            "WEB", "WEB_ORDER" -> FoodPlatform.WEB_ORDER
            "PHONE", "PHONE_ORDER" -> FoodPlatform.PHONE_ORDER
            else -> FoodPlatform.GRAB_FOOD
        }
    }

    /**
     * Map status string from API to FoodOrderStatus - TechRes simplified flow
     * Đơn mới (NEW) -> Đã xác nhận (PREPARING) -> Hoàn tất (COMPLETED) / Huỷ (CANCELLED)
     */
    private fun mapStatusString(status: String): FoodOrderStatus {
        return when (status.uppercase()) {
            "NEW" -> FoodOrderStatus.NEW
            "PREPARING" -> FoodOrderStatus.PREPARING
            "COMPLETED" -> FoodOrderStatus.COMPLETED
            "CANCELLED" -> FoodOrderStatus.CANCELLED
            else -> FoodOrderStatus.NEW
        }
    }

    private fun parseTimestamp(dateString: String?): Long? {
        if (dateString == null) return null
        return try {
            // ISO 8601 format: 2024-01-26T10:30:00.000Z
            java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
                .parse(dateString.replace("Z", "").substringBefore("."))?.time
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }

    private fun getFilteredOrders(): List<FoodAppOrder> {
        val state = _uiState.value
        // TechRes simplified flow: NEW -> PREPARING -> COMPLETED/CANCELLED
        var filtered = when (state.selectedFilter) {
            FoodOrderFilter.ALL -> _ordersList.toList()
            FoodOrderFilter.NEW -> _ordersList.filter { it.status == FoodOrderStatus.NEW }
            FoodOrderFilter.PROCESSING -> _ordersList.filter {
                it.status == FoodOrderStatus.PREPARING
            }
            FoodOrderFilter.COMPLETED -> _ordersList.filter { it.status == FoodOrderStatus.COMPLETED }
            FoodOrderFilter.CANCELLED -> _ordersList.filter { it.status == FoodOrderStatus.CANCELLED }
        }

        // Filter by platform if selected
        if (state.selectedPlatform != null) {
            filtered = filtered.filter { it.platform == state.selectedPlatform }
        }

        return filtered.sortedByDescending { it.createdAt }
    }

    // ===== FILTER ACTIONS =====

    fun setFilter(filter: FoodOrderFilter) {
        _uiState.update { state ->
            state.copy(selectedFilter = filter)
        }
        updateFilteredOrders()
    }

    fun setPlatformFilter(platform: FoodPlatform?) {
        _uiState.update { state ->
            state.copy(selectedPlatform = platform)
        }
        updateFilteredOrders()
    }

    private fun updateFilteredOrders() {
        _uiState.update { state ->
            state.copy(orders = getFilteredOrders())
        }
    }

    // ===== ORDER DETAIL =====

    fun selectOrder(order: FoodAppOrder) {
        _uiState.update { state ->
            state.copy(
                selectedOrder = order,
                showOrderDetail = true
            )
        }
    }

    fun hideOrderDetail() {
        _uiState.update { state ->
            state.copy(
                selectedOrder = null,
                showOrderDetail = false
            )
        }
    }

    // ===== ORDER STATUS ACTIONS =====
    // TechRes simplified flow: NEW -> PREPARING -> COMPLETED/CANCELLED

    /**
     * Accept/Confirm order - moves from NEW to PREPARING
     */
    fun acceptOrder(orderId: String) {
        updateOrderStatus(orderId, FoodOrderStatus.PREPARING)
        showSuccess("Đã xác nhận đơn hàng")
    }

    /**
     * Complete order - moves from PREPARING to COMPLETED
     */
    fun completeOrder(orderId: String) {
        updateOrderStatus(orderId, FoodOrderStatus.COMPLETED)
        showSuccess("Đơn hàng hoàn tất")
    }

    /**
     * Cancel order - moves to CANCELLED
     */
    fun cancelOrder(orderId: String) {
        updateOrderStatus(orderId, FoodOrderStatus.CANCELLED)
        showSuccess("Đã huỷ đơn hàng")
    }

    private fun updateOrderStatus(orderId: String, newStatus: FoodOrderStatus) {
        val index = _ordersList.indexOfFirst { it.id == orderId }
        if (index >= 0) {
            val order = _ordersList[index]
            val updatedOrder = order.copy(
                status = newStatus,
                acceptedAt = if (newStatus == FoodOrderStatus.PREPARING) System.currentTimeMillis() else order.acceptedAt,
                preparedAt = order.preparedAt,
                completedAt = if (newStatus == FoodOrderStatus.COMPLETED) System.currentTimeMillis() else order.completedAt
            )
            _ordersList[index] = updatedOrder

            // Update selected order if it's the same
            if (_uiState.value.selectedOrder?.id == orderId) {
                _uiState.update { state ->
                    state.copy(selectedOrder = updatedOrder)
                }
            }
        }
        updateFilteredOrders()
    }

    // ===== MESSAGES =====

    private fun showSuccess(message: String) {
        _uiState.update { state ->
            state.copy(successMessage = message)
        }
    }

    fun clearSuccessMessage() {
        _uiState.update { state ->
            state.copy(successMessage = null)
        }
    }

    fun clearErrorMessage() {
        _uiState.update { state ->
            state.copy(errorMessage = null)
        }
    }

    // ===== REFRESH =====

    fun refresh() {
        _uiState.update { state ->
            state.copy(isLoading = true)
        }
        viewModelScope.launch {
            pollOrders()
        }
    }
}
