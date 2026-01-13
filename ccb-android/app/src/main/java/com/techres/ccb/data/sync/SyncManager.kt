package com.techres.ccb.data.sync

import com.google.gson.Gson
import com.techres.ccb.data.local.dao.*
import com.techres.ccb.data.local.entity.*
import com.techres.ccb.data.remote.api.SyncApi
import com.techres.ccb.data.remote.dto.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Sync Manager - Orchestrates all sync operations
 * Handles both PULL (Cloud → Local) and PUSH (Local → Cloud)
 */
@Singleton
class SyncManager @Inject constructor(
    private val syncApi: SyncApi,
    private val networkMonitor: NetworkMonitor,
    private val syncQueueDao: SyncQueueDao,
    private val syncMetadataDao: SyncMetadataDao,
    private val syncConflictDao: SyncConflictDao,
    private val categoryDao: CategoryDao,
    private val productDao: ProductDao,
    private val staffDao: StaffDao,
    private val voucherDao: VoucherDao,
    private val orderDao: OrderDao,
    private val orderItemDao: OrderItemDao,
    private val paymentDao: PaymentDao,
    private val shiftDao: ShiftDao,
    private val gson: Gson
) {
    companion object {
        private const val TAG = "SyncManager"
        private const val BATCH_SIZE = 50

        // Retry delays in milliseconds
        private val BACKOFF_DELAYS = listOf(2000L, 4000L, 8000L, 16000L, 32000L)
    }

    // ==================== PULL Operations ====================

    /**
     * Pull master data from server (delta or full sync)
     */
    suspend fun pullMasterData(
        branchId: String,
        deviceId: String,
        forceFull: Boolean = false
    ): SyncResult = withContext(Dispatchers.IO) {
        if (!networkMonitor.isCurrentlyOnline()) {
            return@withContext SyncResult.NetworkError("No internet connection")
        }

        try {
            // Get last sync metadata
            val metadata = syncMetadataDao.get(SyncMetadataEntity.TYPE_MASTER_DATA)
            val lastSyncAt = if (forceFull) null else metadata?.lastSyncAt
            val serverVersion = if (forceFull) null else metadata?.serverVersion

            // Mark sync in progress
            syncMetadataDao.insert(
                SyncMetadataEntity(
                    entityType = SyncMetadataEntity.TYPE_MASTER_DATA,
                    lastSyncAt = lastSyncAt,
                    serverVersion = serverVersion ?: 0,
                    lastSyncStatus = SyncMetadataEntity.STATUS_IN_PROGRESS
                )
            )

            val response = if (lastSyncAt != null) {
                // Delta sync
                Timber.d("$TAG: Performing delta sync since $lastSyncAt")
                syncApi.pullMasterDataDelta(branchId, lastSyncAt, serverVersion)
            } else {
                // Full sync
                Timber.d("$TAG: Performing full sync")
                syncApi.pullMasterDataFull(branchId, deviceId, 1, 100)
            }

            if (!response.isSuccessful) {
                val error = "Server error: ${response.code()}"
                syncMetadataDao.updateSyncFailed(SyncMetadataEntity.TYPE_MASTER_DATA, error)
                return@withContext SyncResult.ServerError(error)
            }

            val body = response.body()
            if (body == null || !body.success) {
                val error = body?.message ?: "Empty response"
                syncMetadataDao.updateSyncFailed(SyncMetadataEntity.TYPE_MASTER_DATA, error)
                return@withContext SyncResult.ServerError(error)
            }

            // Apply changes to local database
            applyPullChanges(branchId, body)

            // Update sync metadata
            val meta = body.meta
            if (meta != null) {
                syncMetadataDao.updateSyncSuccess(
                    entityType = SyncMetadataEntity.TYPE_MASTER_DATA,
                    lastSyncAt = meta.serverTimestamp,
                    serverVersion = meta.serverVersion,
                    totalRecords = meta.totalChanges
                )
            }

            Timber.d("$TAG: Pull sync completed successfully")
            return@withContext SyncResult.Success

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Pull sync failed")
            syncMetadataDao.updateSyncFailed(
                SyncMetadataEntity.TYPE_MASTER_DATA,
                e.message ?: "Unknown error"
            )
            return@withContext SyncResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Apply pulled changes to local database
     */
    private suspend fun applyPullChanges(branchId: String, response: PullSyncResponse) {
        val data = response.data ?: return

        // Process categories
        data.categories?.forEach { item ->
            val entity = item.data.toEntity(branchId)
            if (item.action == "DELETE") {
                categoryDao.softDelete(entity.id)
            } else {
                categoryDao.insert(entity)
            }
        }

        // Process products
        data.products?.forEach { item ->
            val entity = item.data.toEntity(branchId)
            // Debug log for searchName and abbreviation
            Timber.d("$TAG: Syncing product: ${entity.name}, searchName=${entity.searchName}, abbreviation=${entity.abbreviation}")
            if (item.action == "DELETE") {
                productDao.softDelete(entity.id)
            } else {
                productDao.insert(entity)
            }
        }

        // Process staff
        data.staff?.forEach { item ->
            val entity = item.data.toEntity(branchId)
            if (item.action == "DELETE") {
                staffDao.softDelete(entity.id)
            } else {
                staffDao.insert(entity)
            }
        }

        // Process vouchers
        data.vouchers?.forEach { item ->
            val entity = item.data.toEntity(branchId)
            if (item.action == "DELETE") {
                voucherDao.softDelete(entity.id, System.currentTimeMillis())
            } else {
                voucherDao.insert(entity)
            }
        }

        // Process deleted IDs
        data.deletedIds?.let { deleted ->
            deleted.categoryIds?.forEach { categoryDao.softDelete(it) }
            deleted.productIds?.forEach { productDao.softDelete(it) }
            deleted.staffIds?.forEach { staffDao.softDelete(it) }
            deleted.voucherIds?.forEach { voucherDao.softDelete(it, System.currentTimeMillis()) }
        }
    }

    // ==================== PUSH Operations ====================

    /**
     * Process pending items in sync queue
     */
    suspend fun processSyncQueue(deviceId: String): SyncResult = withContext(Dispatchers.IO) {
        if (!networkMonitor.isCurrentlyOnline()) {
            return@withContext SyncResult.NetworkError("No internet connection")
        }

        try {
            val pendingItems = syncQueueDao.getPendingItems(
                currentTime = System.currentTimeMillis(),
                limit = BATCH_SIZE
            )

            if (pendingItems.isEmpty()) {
                Timber.d("$TAG: No pending items to sync")
                return@withContext SyncResult.Success
            }

            Timber.d("$TAG: Processing ${pendingItems.size} pending items")

            var successCount = 0
            var failCount = 0

            for (item in pendingItems) {
                // Check dependency
                if (item.dependsOnId != null) {
                    val dependency = syncQueueDao.getById(item.dependsOnId)
                    if (dependency?.status != SyncQueueEntity.STATUS_COMPLETED) {
                        Timber.d("$TAG: Skipping item ${item.id}, waiting for dependency ${item.dependsOnId}")
                        continue
                    }
                }

                // Update status to processing
                syncQueueDao.updateStatus(item.id, SyncQueueEntity.STATUS_PROCESSING)

                val result = processQueueItem(item, deviceId)

                if (result is SyncResult.Success) {
                    syncQueueDao.markCompleted(item.id)
                    successCount++
                } else {
                    // Calculate next retry time with exponential backoff
                    val attempt = item.attempts + 1
                    val delayIndex = minOf(attempt - 1, BACKOFF_DELAYS.size - 1)
                    val nextRetryAt = System.currentTimeMillis() + BACKOFF_DELAYS[delayIndex]

                    val errorMessage = when (result) {
                        is SyncResult.Error -> result.message
                        is SyncResult.ServerError -> result.message
                        is SyncResult.NetworkError -> result.message
                        else -> "Unknown error"
                    }

                    if (attempt >= item.maxAttempts) {
                        // Move to dead letter queue
                        syncQueueDao.moveToDeadLetter(item.id)
                        Timber.w("$TAG: Item ${item.id} moved to dead letter after $attempt attempts")
                    } else {
                        syncQueueDao.updateError(
                            id = item.id,
                            status = SyncQueueEntity.STATUS_FAILED,
                            error = errorMessage,
                            nextRetryAt = nextRetryAt
                        )
                    }
                    failCount++
                }
            }

            Timber.d("$TAG: Sync queue processed - Success: $successCount, Failed: $failCount")
            return@withContext SyncResult.Success

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error processing sync queue")
            return@withContext SyncResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Process a single queue item
     */
    private suspend fun processQueueItem(item: SyncQueueEntity, deviceId: String): SyncResult {
        return when (item.entityType) {
            SyncQueueEntity.TYPE_ORDER_BUNDLE -> pushOrder(item, deviceId)
            SyncQueueEntity.TYPE_SHIFT -> pushShift(item, deviceId)
            else -> SyncResult.Error("Unknown entity type: ${item.entityType}")
        }
    }

    /**
     * Push an order bundle to server
     */
    private suspend fun pushOrder(item: SyncQueueEntity, deviceId: String): SyncResult {
        try {
            val order = orderDao.getById(item.entityId)
                ?: return SyncResult.Error("Order not found: ${item.entityId}")

            val orderItems = orderItemDao.getByOrderIdSync(order.id)
            val payments = paymentDao.getByOrderId(order.id)

            val payload = OrderSyncPayload(
                order = order.toPushDto(),
                items = orderItems.map { it.toPushDto() },
                payments = payments.map { it.toPushDto() }
            )

            val response = syncApi.pushOrder(
                deviceId = deviceId,
                idempotencyKey = order.idempotencyKey,
                payload = payload
            )

            return handlePushResponse(response, item.entityId, "ORDER")

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error pushing order ${item.entityId}")
            return SyncResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Push a shift to server
     */
    private suspend fun pushShift(item: SyncQueueEntity, deviceId: String): SyncResult {
        try {
            val payload = gson.fromJson(item.payload, ShiftSyncPayload::class.java)

            val response = syncApi.pushShift(
                deviceId = deviceId,
                idempotencyKey = payload.idempotencyKey,
                payload = payload
            )

            return handlePushResponse(response, item.entityId, "SHIFT")

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error pushing shift ${item.entityId}")
            return SyncResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Handle push response from server
     */
    private suspend fun handlePushResponse(
        response: retrofit2.Response<PushSyncResponse>,
        entityId: String,
        entityType: String
    ): SyncResult {
        return when (response.code()) {
            200, 201 -> {
                val body = response.body()
                if (body?.success == true) {
                    // Update local entity with server ID
                    when (entityType) {
                        "ORDER" -> {
                            orderDao.updateSyncStatus(
                                orderId = entityId,
                                syncStatus = "synced",
                                syncedAt = body.syncedAt,
                                retryCount = 0
                            )
                        }
                        "SHIFT" -> {
                            shiftDao.updateSyncStatus(
                                shiftId = entityId,
                                syncStatus = "synced",
                                syncedAt = body.syncedAt,
                                retryCount = 0
                            )
                        }
                    }
                    SyncResult.Success
                } else {
                    SyncResult.ServerError(body?.error ?: "Unknown server error")
                }
            }
            409 -> {
                // Conflict - handle idempotency or version conflict
                val body = response.body()
                if (body?.serverId != null) {
                    // Idempotency conflict - order already exists
                    when (entityType) {
                        "ORDER" -> orderDao.updateSyncStatus(entityId, "synced", body.syncedAt, 0)
                        "SHIFT" -> shiftDao.updateSyncStatus(entityId, "synced", body.syncedAt, 0)
                    }
                    Timber.d("$TAG: Idempotency conflict resolved for $entityType $entityId")
                    SyncResult.Success
                } else {
                    // Version conflict - needs resolution
                    handleConflict(entityId, entityType, body)
                    SyncResult.Conflict("Version conflict")
                }
            }
            400 -> SyncResult.ServerError("Bad request: ${response.message()}")
            401 -> SyncResult.AuthError("Unauthorized")
            in 500..599 -> SyncResult.ServerError("Server error: ${response.code()}")
            else -> SyncResult.Error("Unexpected response: ${response.code()}")
        }
    }

    /**
     * Handle conflict by storing for later resolution
     */
    private suspend fun handleConflict(
        entityId: String,
        entityType: String,
        response: PushSyncResponse?
    ) {
        val conflictData = response?.conflictData ?: return

        val localData = when (entityType) {
            "ORDER" -> gson.toJson(orderDao.getById(entityId))
            "SHIFT" -> gson.toJson(shiftDao.getById(entityId))
            else -> return
        }

        syncConflictDao.insert(
            SyncConflictEntity(
                entityType = entityType,
                entityId = entityId,
                localData = localData,
                serverData = conflictData.serverData,
                localVersion = 0, // Will be filled from local entity
                serverVersion = conflictData.serverVersion,
                localUpdatedAt = System.currentTimeMillis(),
                serverUpdatedAt = 0, // Will be parsed from serverUpdatedAt
                conflictType = SyncConflictEntity.TYPE_VERSION_MISMATCH,
                resolutionStrategy = when (entityType) {
                    "ORDER" -> SyncConflictEntity.STRATEGY_SERVER_WINS
                    "SHIFT" -> SyncConflictEntity.STRATEGY_MERGE
                    else -> SyncConflictEntity.STRATEGY_MANUAL
                },
                deviceId = "" // Will be set from device config
            )
        )
    }

    // ==================== Queue Management ====================

    /**
     * Add an order to sync queue
     */
    suspend fun queueOrderForSync(
        orderId: String,
        shiftQueueId: Long? = null
    ): Long = withContext(Dispatchers.IO) {
        val order = orderDao.getById(orderId)
            ?: throw IllegalArgumentException("Order not found: $orderId")

        val orderItems = orderItemDao.getByOrderIdSync(orderId)
        val payments = paymentDao.getByOrderId(orderId)

        val payload = OrderSyncPayload(
            order = order.toPushDto(),
            items = orderItems.map { it.toPushDto() },
            payments = payments.map { it.toPushDto() }
        )

        return@withContext syncQueueDao.insert(
            SyncQueueEntity(
                entityType = SyncQueueEntity.TYPE_ORDER_BUNDLE,
                entityId = orderId,
                action = SyncQueueEntity.ACTION_CREATE,
                payload = gson.toJson(payload),
                priority = SyncQueueEntity.PRIORITY_HIGH,
                dependsOnId = shiftQueueId,
                idempotencyKey = order.idempotencyKey
            )
        )
    }

    /**
     * Add a shift to sync queue
     */
    suspend fun queueShiftForSync(shiftId: String, payload: ShiftSyncPayload): Long =
        withContext(Dispatchers.IO) {
            return@withContext syncQueueDao.insert(
                SyncQueueEntity(
                    entityType = SyncQueueEntity.TYPE_SHIFT,
                    entityId = shiftId,
                    action = SyncQueueEntity.ACTION_CREATE,
                    payload = gson.toJson(payload),
                    priority = SyncQueueEntity.PRIORITY_CRITICAL,
                    idempotencyKey = payload.idempotencyKey
                )
            )
        }

    /**
     * Get pending sync count
     */
    fun getPendingSyncCount(): Flow<Int> = syncQueueDao.getPendingCountFlow()

    /**
     * Get dead letter count
     */
    fun getDeadLetterCount(): Flow<Int> = syncQueueDao.getDeadLetterCount()

    /**
     * Clean up old completed items
     */
    suspend fun cleanupOldSyncItems(olderThanDays: Int = 7) = withContext(Dispatchers.IO) {
        val cutoffTime = System.currentTimeMillis() - (olderThanDays * 24 * 60 * 60 * 1000L)
        syncQueueDao.deleteOldCompleted(cutoffTime)
        syncConflictDao.deleteOldResolved(cutoffTime)
    }
}

// ==================== Extension Functions ====================

private fun CategoryDto.toEntity(branchId: String) = CategoryEntity(
    id = id,
    branchId = branchId,
    name = name,
    description = description,
    imageUrl = imageUrl,
    sortOrder = sortOrder,
    isActive = isActive,
    createdAt = createdAt,
    updatedAt = updatedAt
)

private fun ProductDto.toEntity(branchId: String) = ProductEntity(
    id = id,
    branchId = branchId,
    categoryId = categoryId,
    code = code,
    name = name,
    searchName = searchName,
    abbreviation = abbreviation,
    description = description,
    imageUrl = imageUrl,
    price = price,
    costPrice = costPrice,
    vatRate = vatRate,
    unit = unit,
    type = type,
    isAvailable = isAvailable,
    isActive = isActive,
    sortOrder = sortOrder,
    preparationTime = preparationTime,
    printToKitchen = printToKitchen,
    printToBar = printToBar,
    createdAt = createdAt,
    updatedAt = updatedAt
)

private fun StaffDto.toEntity(branchId: String) = StaffEntity(
    id = id,
    branchId = branchId,
    code = code,
    name = name,
    phone = phone,
    email = email,
    avatarUrl = avatarUrl,
    pinCode = pinCode,
    role = role,
    permissions = permissions,
    isActive = isActive,
    createdAt = createdAt,
    updatedAt = updatedAt
)

private fun VoucherDto.toEntity(branchId: String) = VoucherEntity(
    id = id,
    branchId = branchId,
    code = code,
    name = name,
    description = description,
    discountType = discountType,
    discountValue = discountValue,
    minOrderAmount = minOrderAmount,
    maxDiscountAmount = maxDiscountAmount,
    maxUsageCount = maxUsageCount,
    maxUsagePerCustomer = maxUsagePerCustomer,
    serverUsageCount = currentUsageCount,
    startDate = startDate,
    endDate = endDate,
    isActive = isActive,
    appliesTo = appliesTo,
    createdAt = createdAt,
    updatedAt = updatedAt
)

private fun OrderEntity.toPushDto() = OrderPushDto(
    localId = id,
    idempotencyKey = idempotencyKey,
    orderNumber = orderNumber,
    branchId = branchId,
    shiftId = shiftId,
    staffId = staffId,
    staffName = staffName,
    tableId = tableId,
    tableName = tableName,
    customerName = customerName,
    customerPhone = customerPhone,
    status = status,
    orderType = orderType,
    subtotal = subtotal,
    discountAmount = discountAmount,
    surchargeAmount = surchargeAmount,
    vatAmount = vatAmount,
    totalAmount = totalAmount,
    paidAmount = paidAmount,
    paymentStatus = paymentStatus,
    notes = notes,
    guestCount = guestCount,
    completedAt = completedAt,
    createdAt = createdAt,
    version = version
)

private fun OrderItemEntity.toPushDto() = OrderItemPushDto(
    localId = id,
    productId = productId,
    productCode = productCode,
    productName = productName,
    quantity = quantity,
    unitPrice = unitPrice,
    originalPrice = unitPrice, // Using unitPrice as originalPrice for now
    discountAmount = discountAmount,
    totalPrice = totalPrice,
    vatRate = vatRate,
    notes = notes,
    status = status,
    priceVersion = 1, // Default version
    createdAt = createdAt
)

private fun PaymentEntity.toPushDto() = PaymentPushDto(
    localId = id,
    idempotencyKey = idempotencyKey,
    amount = amount,
    paymentMethod = paymentMethod,
    paymentMethodName = paymentMethodName,
    receivedAmount = receivedAmount,
    changeAmount = changeAmount,
    referenceCode = referenceCode,
    status = status,
    paidAt = paidAt
)

// ==================== Sync Result ====================

sealed class SyncResult {
    object Success : SyncResult()
    data class Error(val message: String) : SyncResult()
    data class ServerError(val message: String) : SyncResult()
    data class NetworkError(val message: String) : SyncResult()
    data class AuthError(val message: String) : SyncResult()
    data class Conflict(val message: String) : SyncResult()
}
