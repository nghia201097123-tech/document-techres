package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Stores sync conflicts for audit and manual resolution
 */
@Entity(
    tableName = "sync_conflicts",
    indices = [
        Index(value = ["entity_type"]),
        Index(value = ["status"]),
        Index(value = ["created_at"])
    ]
)
data class SyncConflictEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0,

    @ColumnInfo(name = "entity_type")
    val entityType: String, // ORDER, PAYMENT, SHIFT, PRODUCT

    @ColumnInfo(name = "entity_id")
    val entityId: String,

    @ColumnInfo(name = "local_data")
    val localData: String, // JSON serialized local data

    @ColumnInfo(name = "server_data")
    val serverData: String, // JSON serialized server data

    @ColumnInfo(name = "local_version")
    val localVersion: Int,

    @ColumnInfo(name = "server_version")
    val serverVersion: Int,

    @ColumnInfo(name = "local_updated_at")
    val localUpdatedAt: Long,

    @ColumnInfo(name = "server_updated_at")
    val serverUpdatedAt: Long,

    @ColumnInfo(name = "conflict_type")
    val conflictType: String, // VERSION_MISMATCH, DATA_DELETED, CONCURRENT_UPDATE

    @ColumnInfo(name = "resolution_strategy")
    val resolutionStrategy: String, // LOCAL_WINS, SERVER_WINS, MERGE, MANUAL

    @ColumnInfo(name = "resolved_data")
    val resolvedData: String? = null, // JSON serialized resolved data

    @ColumnInfo(name = "status")
    val status: String = "pending", // pending, resolved, ignored

    @ColumnInfo(name = "resolved_by")
    val resolvedBy: String? = null, // auto, manual, staff_id

    @ColumnInfo(name = "resolution_notes")
    val resolutionNotes: String? = null,

    @ColumnInfo(name = "device_id")
    val deviceId: String,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "resolved_at")
    val resolvedAt: Long? = null
) {
    companion object {
        // Conflict types
        const val TYPE_VERSION_MISMATCH = "VERSION_MISMATCH"
        const val TYPE_DATA_DELETED = "DATA_DELETED"
        const val TYPE_CONCURRENT_UPDATE = "CONCURRENT_UPDATE"

        // Resolution strategies
        const val STRATEGY_LOCAL_WINS = "LOCAL_WINS"
        const val STRATEGY_SERVER_WINS = "SERVER_WINS"
        const val STRATEGY_MERGE = "MERGE"
        const val STRATEGY_MANUAL = "MANUAL"

        // Statuses
        const val STATUS_PENDING = "pending"
        const val STATUS_RESOLVED = "resolved"
        const val STATUS_IGNORED = "ignored"
    }
}
