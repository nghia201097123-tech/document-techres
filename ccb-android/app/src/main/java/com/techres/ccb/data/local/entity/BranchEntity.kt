package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "branches",
    indices = [
        Index(value = ["brand_id"]),
        Index(value = ["is_active"])
    ],
    foreignKeys = [
        ForeignKey(
            entity = BrandEntity::class,
            parentColumns = ["id"],
            childColumns = ["brand_id"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class BranchEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "brand_id")
    val brandId: String,

    @ColumnInfo(name = "brand_name")
    val brandName: String? = null,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "code")
    val code: String? = null,

    @ColumnInfo(name = "address")
    val address: String? = null,

    @ColumnInfo(name = "phone")
    val phone: String? = null,

    @ColumnInfo(name = "email")
    val email: String? = null,

    @ColumnInfo(name = "logo_url")
    val logoUrl: String? = null,

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
