package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Tracks sync state for different entity types
 * Used to implement delta sync (only sync changed data)
 */
@Entity(tableName = "sync_metadata")
data class SyncMetadataEntity(
    @PrimaryKey
    @ColumnInfo(name = "entity_type")
    val entityType: String, // master_data, orders, payments, shifts, vouchers

    @ColumnInfo(name = "last_sync_at")
    val lastSyncAt: Long? = null, // Server timestamp from last successful sync

    @ColumnInfo(name = "server_version")
    val serverVersion: Int = 0, // Version number from server

    @ColumnInfo(name = "last_sync_status")
    val lastSyncStatus: String = "none", // none, success, failed

    @ColumnInfo(name = "last_sync_error")
    val lastSyncError: String? = null,

    @ColumnInfo(name = "total_records")
    val totalRecords: Int = 0,

    @ColumnInfo(name = "sync_direction")
    val syncDirection: String = "pull", // pull, push, both

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis()
) {
    companion object {
        // Entity types
        const val TYPE_MASTER_DATA = "master_data"
        const val TYPE_PRODUCTS = "products"
        const val TYPE_CATEGORIES = "categories"
        const val TYPE_STAFF = "staff"
        const val TYPE_VOUCHERS = "vouchers"
        const val TYPE_ORDERS = "orders"
        const val TYPE_PAYMENTS = "payments"
        const val TYPE_SHIFTS = "shifts"
        const val TYPE_SETTINGS = "settings"

        // Sync statuses
        const val STATUS_NONE = "none"
        const val STATUS_SUCCESS = "success"
        const val STATUS_FAILED = "failed"
        const val STATUS_IN_PROGRESS = "in_progress"

        // Sync directions
        const val DIRECTION_PULL = "pull"
        const val DIRECTION_PUSH = "push"
        const val DIRECTION_BOTH = "both"
    }
}
