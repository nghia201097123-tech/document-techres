package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Sync Queue Entity for managing offline data synchronization
 *
 * Priority levels:
 * - 20: SHIFT (highest, must sync before orders)
 * - 10: ORDER_BUNDLE (order + items + payment)
 * - 5: VOUCHER_USAGE
 * - 1: LOW_PRIORITY
 */
@Entity(
    tableName = "sync_queue",
    indices = [
        Index(value = ["status"]),
        Index(value = ["entity_type"]),
        Index(value = ["priority", "created_at"]),
        Index(value = ["depends_on_id"])
    ]
)
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0,

    @ColumnInfo(name = "entity_type")
    val entityType: String, // SHIFT, ORDER_BUNDLE, PAYMENT, VOUCHER_USAGE

    @ColumnInfo(name = "entity_id")
    val entityId: String,

    @ColumnInfo(name = "action")
    val action: String, // CREATE, UPDATE, DELETE

    @ColumnInfo(name = "payload")
    val payload: String, // JSON serialized data

    @ColumnInfo(name = "priority")
    val priority: Int = 10, // Higher = more important

    @ColumnInfo(name = "status")
    val status: String = "pending", // pending, processing, completed, failed, dead_letter

    @ColumnInfo(name = "depends_on_id")
    val dependsOnId: Long? = null, // ID of sync_queue item this depends on

    @ColumnInfo(name = "attempts")
    val attempts: Int = 0,

    @ColumnInfo(name = "max_attempts")
    val maxAttempts: Int = 10,

    @ColumnInfo(name = "last_error")
    val lastError: String? = null,

    @ColumnInfo(name = "next_retry_at")
    val nextRetryAt: Long? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "completed_at")
    val completedAt: Long? = null,

    @ColumnInfo(name = "idempotency_key")
    val idempotencyKey: String
) {
    companion object {
        // Entity types
        const val TYPE_SHIFT = "SHIFT"
        const val TYPE_ORDER_BUNDLE = "ORDER_BUNDLE"
        const val TYPE_PAYMENT = "PAYMENT"
        const val TYPE_VOUCHER_USAGE = "VOUCHER_USAGE"

        // Actions
        const val ACTION_CREATE = "CREATE"
        const val ACTION_UPDATE = "UPDATE"
        const val ACTION_DELETE = "DELETE"

        // Statuses
        const val STATUS_PENDING = "pending"
        const val STATUS_PROCESSING = "processing"
        const val STATUS_COMPLETED = "completed"
        const val STATUS_FAILED = "failed"
        const val STATUS_DEAD_LETTER = "dead_letter"

        // Priorities
        const val PRIORITY_CRITICAL = 20  // Shift
        const val PRIORITY_HIGH = 10      // Orders
        const val PRIORITY_MEDIUM = 5     // Voucher usage
        const val PRIORITY_LOW = 1        // Settings changes
    }
}
