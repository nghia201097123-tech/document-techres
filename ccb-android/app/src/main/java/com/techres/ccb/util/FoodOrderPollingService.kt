package com.techres.ccb.util

import android.content.SharedPreferences
import android.util.Log
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.FoodPlatformRepository
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.Collections
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

    // Mutex to prevent concurrent polling
    private val pollMutex = Mutex()

    // Track known order IDs to detect truly new orders (persisted in SharedPreferences)
    // Use thread-safe set
    private val knownOrderIds: MutableSet<String> = Collections.synchronizedSet(mutableSetOf())

    init {
        // Load previously announced order IDs from SharedPreferences
        loadAnnouncedOrderIds()
    }

    /**
     * Load announced order IDs from SharedPreferences
     */
    private fun loadAnnouncedOrderIds() {
        val savedIds = sharedPreferences.getStringSet(KEY_ANNOUNCED_ORDER_IDS, emptySet()) ?: emptySet()
        synchronized(knownOrderIds) {
            knownOrderIds.addAll(savedIds)
        }
        Log.d(TAG, "Loaded ${knownOrderIds.size} announced order IDs from storage")
    }

    /**
     * Save announced order IDs to SharedPreferences
     * Uses commit() for immediate persistence to prevent data loss
     */
    private fun saveAnnouncedOrderIds() {
        // Take a snapshot of the set to avoid concurrent modification
        val currentIds: Set<String>
        synchronized(knownOrderIds) {
            currentIds = knownOrderIds.toSet()
        }

        // Keep only the most recent order IDs to prevent unbounded growth
        val idsToSave = if (currentIds.size > MAX_STORED_ORDER_IDS) {
            currentIds.toList().takeLast(MAX_STORED_ORDER_IDS).toSet()
        } else {
            currentIds
        }

        // Use commit() for immediate persistence (blocking but ensures data is saved)
        sharedPreferences.edit()
            .putStringSet(KEY_ANNOUNCED_ORDER_IDS, HashSet(idsToSave)) // Create new HashSet to avoid SharedPreferences quirk
            .commit()
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
        // Use mutex to prevent concurrent polling
        if (!pollMutex.tryLock()) {
            Log.d(TAG, "Poll already in progress, skipping")
            return
        }

        try {
            val branchId = authRepository.getBranchId()
            if (branchId == null) {
                Log.d(TAG, "No branchId available, skipping poll")
                return
            }

            Log.d(TAG, "Polling orders for branchId: $branchId")

            val response = foodPlatformRepository.pollOrders(branchId.toString())

            if (response.status == 200 && response.data != null) {
                val orders = response.data.orders

                // Collect orders to announce while adding to known set atomically
                val ordersToAnnounce = mutableListOf<Pair<String, String>>()

                orders.forEach { order ->
                    val orderId = order.id ?: order.externalOrderId
                    // add() returns true if the element was NOT already present
                    // This is atomic - first thread to add wins
                    if (knownOrderIds.add(orderId)) {
                        // This is a new order - add to announce list
                        ordersToAnnounce.add(Pair(order.platform, order.orderCode))
                        Log.d(TAG, "New order detected: $orderId (${order.platform} - ${order.orderCode})")
                    }
                }

                // Save to SharedPreferences immediately if we have new orders
                if (ordersToAnnounce.isNotEmpty()) {
                    saveAnnouncedOrderIds()
                    Log.d(TAG, "Saved ${knownOrderIds.size} order IDs to storage")
                }

                // Update new orders count
                _newOrdersCount.value = orders.count { it.status.uppercase() == "NEW" }

                // Announce new orders via TTS
                if (ordersToAnnounce.isNotEmpty()) {
                    Log.d(TAG, "Announcing ${ordersToAnnounce.size} new orders...")

                    // Use Main dispatcher for TTS (UI thread)
                    withContext(Dispatchers.Main) {
                        orderAnnouncementManager.announceNewOrders(ordersToAnnounce)
                    }
                }

                Log.d(TAG, "Poll complete: ${orders.size} orders, ${ordersToAnnounce.size} newly announced")
            } else {
                Log.w(TAG, "Poll orders failed: ${response.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Poll orders error: ${e.message}", e)
        } finally {
            pollMutex.unlock()
        }
    }

    /**
     * Clear known orders (useful for testing or when user logs out)
     * Also clears the persisted data in SharedPreferences
     */
    fun clearKnownOrders() {
        synchronized(knownOrderIds) {
            knownOrderIds.clear()
        }
        _newOrdersCount.value = 0
        sharedPreferences.edit()
            .remove(KEY_ANNOUNCED_ORDER_IDS)
            .commit()
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
