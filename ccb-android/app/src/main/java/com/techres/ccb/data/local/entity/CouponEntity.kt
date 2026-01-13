package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "coupons",
    indices = [
        Index(value = ["code"]),
        Index(value = ["branch_id"]),
        Index(value = ["is_active"]),
        Index(value = ["start_date"]),
        Index(value = ["end_date"])
    ]
)
data class CouponEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "code")
    val code: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "description")
    val description: String? = null,

    @ColumnInfo(name = "coupon_type")
    val couponType: String, // percentage, fixed

    // Áp dụng cho: bill (hóa đơn), item (món), category (danh mục)
    @ColumnInfo(name = "apply_to")
    val applyTo: String = "bill",

    // Cách kích hoạt: manual (nhập mã), auto (tự động)
    @ColumnInfo(name = "activation_type")
    val activationType: String = "manual",

    @ColumnInfo(name = "discount_value")
    val discountValue: Double,

    @ColumnInfo(name = "max_discount")
    val maxDiscount: Double? = null,

    @ColumnInfo(name = "min_order_amount")
    val minOrderAmount: Double = 0.0,

    // Số lượng tối thiểu của món để áp dụng
    @ColumnInfo(name = "min_quantity")
    val minQuantity: Int = 1,

    // Danh sách product IDs (JSON string)
    @ColumnInfo(name = "product_ids")
    val productIds: String? = null,

    // Danh sách category IDs (JSON string)
    @ColumnInfo(name = "category_ids")
    val categoryIds: String? = null,

    // Có thể kết hợp với coupon khác
    @ColumnInfo(name = "is_combinable")
    val isCombinable: Boolean = false,

    // Độ ưu tiên (số nhỏ = ưu tiên cao)
    @ColumnInfo(name = "priority")
    val priority: Int = 100,

    @ColumnInfo(name = "usage_limit")
    val usageLimit: Int? = null,

    @ColumnInfo(name = "usage_count")
    val usageCount: Int = 0,

    @ColumnInfo(name = "daily_limit")
    val dailyLimit: Int? = null,

    @ColumnInfo(name = "daily_usage_count")
    val dailyUsageCount: Int = 0,

    @ColumnInfo(name = "requires_approval")
    val requiresApproval: Boolean = false,

    @ColumnInfo(name = "approval_threshold")
    val approvalThreshold: Double? = null,

    @ColumnInfo(name = "start_date")
    val startDate: String? = null,

    @ColumnInfo(name = "end_date")
    val endDate: String? = null,

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
