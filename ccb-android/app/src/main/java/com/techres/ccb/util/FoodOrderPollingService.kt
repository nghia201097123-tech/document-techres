package com.techres.ccb.util

import android.content.SharedPreferences
import android.util.Log
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.FoodPlatformRepository
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Background service for polling food orders from all connected platforms.
 * This service runs independently of any screen and starts when the app launches.
 * It announces new orders via TTS regardless of which screen the user is on.
 *
 * Known order IDs are persisted in SharedPreferences to avoid re-announcing
 * orders after app restart.
 */
@Singleton
class FoodOrderPollingService @Inject constructor(
    private val foodPlatformRepository: FoodPlatformRepository,
    private val authRepository: AuthRepository,
    private val orderAnnouncementManager: OrderAnnouncementManager,
    private val sharedPreferences: SharedPreferences
) {
    companion object {
        private const val TAG = "FoodOrderPollingService"
        private const val POLL_INTERVAL_MS = 15000L // 15 seconds
        private const val KEY_ANNOUNCED_ORDER_IDS = "announced_order_ids"
        private const val MAX_STORED_ORDER_IDS = 500 // Limit to prevent unbounded growth
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pollingJob: Job? = null

    // Track known order IDs to detect truly new orders (persisted in SharedPreferences)
    private val knownOrderIds = mutableSetOf<String>()

    init {
        // Load previously announced order IDs from SharedPreferences
        loadAnnouncedOrderIds()
    }

    /**
     * Load announced order IDs from SharedPreferences
     */
    private fun loadAnnouncedOrderIds() {
        val savedIds = sharedPreferences.getStringSet(KEY_ANNOUNCED_ORDER_IDS, emptySet()) ?: emptySet()
        knownOrderIds.addAll(savedIds)
        Log.d(TAG, "Loaded ${knownOrderIds.size} announced order IDs from storage")
    }

    /**
     * Save announced order IDs to SharedPreferences
     */
    private fun saveAnnouncedOrderIds() {
        // Keep only the most recent order IDs to prevent unbounded growth
        val idsToSave = if (knownOrderIds.size > MAX_STORED_ORDER_IDS) {
            knownOrderIds.toList().takeLast(MAX_STORED_ORDER_IDS).toSet()
        } else {
            knownOrderIds.toSet()
        }

        sharedPreferences.edit()
            .putStringSet(KEY_ANNOUNCED_ORDER_IDS, idsToSave)
            .apply()

        Log.d(TAG, "Saved ${idsToSave.size} announced order IDs to storage")
    }

    // Polling state
    private val _isPolling = MutableStateFlow(false)
    val isPolling: StateFlow<Boolean> = _isPolling.asStateFlow()

    // New orders count (for badge display on any screen)
    private val _newOrdersCount = MutableStateFlow(0)
    val newOrdersCount: StateFlow<Int> = _newOrdersCount.asStateFlow()

    /**
     * Start background polling. Safe to call multiple times.
     */
    fun startPolling() {
        if (pollingJob?.isActive == true) {
            Log.d(TAG, "Polling already active, skipping start")
            return
        }

        Log.d(TAG, "Starting food order polling service...")
        _isPolling.value = true

        pollingJob = serviceScope.launch {
            // Initial poll immediately
            pollOrders()

            // Then poll every POLL_INTERVAL_MS
            while (isActive) {
                delay(POLL_INTERVAL_MS)
                pollOrders()
            }
        }
    }

    /**
     * Stop background polling
     */
    fun stopPolling() {
        Log.d(TAG, "Stopping food order polling service...")
        pollingJob?.cancel()
        pollingJob = null
        _isPolling.value = false
    }

    /**
     * Force a refresh (poll immediately)
     */
    fun forceRefresh() {
        serviceScope.launch {
            pollOrders()
        }
    }

    /**
     * Poll orders from API and announce new ones
     */
    private suspend fun pollOrders() {
        val branchId = authRepository.getBranchId()
        if (branchId == null) {
            Log.d(TAG, "No branchId available, skipping poll")
            return
        }

        Log.d(TAG, "Polling orders for branchId: $branchId")

        try {
            val response = foodPlatformRepository.pollOrders(branchId.toString())

            if (response.status == 200 && response.data != null) {
                val orders = response.data.orders

                // Detect truly new orders (not seen before and not already announced)
                val newlyArrivedOrders = orders.filter { order ->
                    val orderId = order.id ?: order.externalOrderId
                    orderId !in knownOrderIds
                }

                // Update known order IDs and persist
                var hasNewIds = false
                orders.forEach { order ->
                    val orderId = order.id ?: order.externalOrderId
                    if (knownOrderIds.add(orderId)) {
                        hasNewIds = true
                    }
                }

                // Save to SharedPreferences if we added new IDs
                if (hasNewIds) {
                    saveAnnouncedOrderIds()
                }

                // Update new orders count
                _newOrdersCount.value = orders.count { it.status.uppercase() == "NEW" }

                // Announce new orders via TTS (only orders we haven't announced before)
                if (newlyArrivedOrders.isNotEmpty()) {
                    Log.d(TAG, "Found ${newlyArrivedOrders.size} new orders to announce...")

                    val ordersToAnnounce = newlyArrivedOrders.map { order ->
                        Pair(order.platform, order.orderCode)
                    }

                    // Use Main dispatcher for TTS (UI thread)
                    withContext(Dispatchers.Main) {
                        orderAnnouncementManager.announceNewOrders(ordersToAnnounce)
                    }
                }

                Log.d(TAG, "Poll complete: ${orders.size} orders, ${newlyArrivedOrders.size} newly announced")
            } else {
                Log.w(TAG, "Poll orders failed: ${response.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Poll orders error: ${e.message}", e)
        }
    }

    /**
     * Clear known orders (useful for testing or when user logs out)
     * Also clears the persisted data in SharedPreferences
     */
    fun clearKnownOrders() {
        knownOrderIds.clear()
        _newOrdersCount.value = 0
        sharedPreferences.edit()
            .remove(KEY_ANNOUNCED_ORDER_IDS)
            .apply()
        Log.d(TAG, "Cleared all announced order IDs")
    }

    /**
     * Cleanup when service is destroyed
     */
    fun destroy() {
        stopPolling()
        serviceScope.cancel()
        orderAnnouncementManager.shutdown()
    }
}
