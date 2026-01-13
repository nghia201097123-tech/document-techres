package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "tables",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["area_id"]),
        Index(value = ["status"])
    ],
    foreignKeys = [
        ForeignKey(
            entity = AreaEntity::class,
            parentColumns = ["id"],
            childColumns = ["area_id"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class TableEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "area_id")
    val areaId: String? = null,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "capacity")
    val capacity: Int = 4,

    @ColumnInfo(name = "status")
    val status: String = "available", // available, occupied, reserved, cleaning

    @ColumnInfo(name = "current_order_id")
    val currentOrderId: String? = null,

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    // Sync fields
    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "synced",

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null,

    @ColumnInfo(name = "version")
    val version: Int = 1
)
