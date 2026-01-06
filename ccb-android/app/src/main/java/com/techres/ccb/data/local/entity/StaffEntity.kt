package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "staff",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["pin_code"], unique = true),
        Index(value = ["is_active"])
    ]
)
data class StaffEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "code")
    val code: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "phone")
    val phone: String? = null,

    @ColumnInfo(name = "email")
    val email: String? = null,

    @ColumnInfo(name = "avatar_url")
    val avatarUrl: String? = null,

    @ColumnInfo(name = "pin_code")
    val pinCode: String, // 4-6 digit PIN for POS login

    @ColumnInfo(name = "role")
    val role: String = "cashier", // cashier, waiter, kitchen, bar, manager, admin

    @ColumnInfo(name = "permissions")
    val permissions: String? = null, // JSON array of permissions

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
