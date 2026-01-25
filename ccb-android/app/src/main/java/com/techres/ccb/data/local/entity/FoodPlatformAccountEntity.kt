package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Entity lưu trữ tài khoản liên kết nền tảng giao đồ ăn (GrabFood, ShopeeFood, BeFood...)
 * Được sync từ api-app-food qua sync/full endpoint
 */
@Entity(
    tableName = "food_platform_accounts",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["platform"]),
        Index(value = ["status"]),
        Index(value = ["is_active"])
    ]
)
data class FoodPlatformAccountEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "tenant_id")
    val tenantId: String? = null,

    // Platform: grabfood, shopeefood, befood
    @ColumnInfo(name = "platform")
    val platform: String,

    @ColumnInfo(name = "display_name")
    val displayName: String? = null,

    @ColumnInfo(name = "username")
    val username: String? = null,

    // Status: CONNECTED, DISCONNECTED
    @ColumnInfo(name = "status")
    val status: String,

    @ColumnInfo(name = "external_merchant_id")
    val externalMerchantId: String? = null,

    @ColumnInfo(name = "external_merchant_name")
    val externalMerchantName: String? = null,

    @ColumnInfo(name = "last_error")
    val lastError: String? = null,

    @ColumnInfo(name = "error_count")
    val errorCount: Int = 0,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    // Sync fields
    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "synced",

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null
) {
    /**
     * Check if account is connected
     */
    fun isConnected(): Boolean = status == "CONNECTED"

    /**
     * Get platform display name
     */
    fun getPlatformDisplayName(): String {
        return when (platform.lowercase()) {
            "grabfood", "grab" -> "GrabFood"
            "shopeefood", "shopee_food" -> "ShopeeFood"
            "befood" -> "BeFood"
            else -> platform
        }
    }
}
