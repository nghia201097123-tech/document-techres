package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "brands",
    indices = [
        Index(value = ["company_id"]),
        Index(value = ["is_active"])
    ]
)
data class BrandEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "code")
    val code: String? = null,

    @ColumnInfo(name = "logo")
    val logo: String? = null,

    @ColumnInfo(name = "company_id")
    val companyId: String? = null,

    @ColumnInfo(name = "company_name")
    val companyName: String? = null,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "created_at")
    val createdAt: String? = null,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String? = null,

    // Sync fields
    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "synced",

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null
)
