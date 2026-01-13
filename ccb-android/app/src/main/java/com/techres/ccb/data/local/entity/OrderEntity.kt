package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "orders",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["table_id"]),
        Index(value = ["shift_id"]),
        Index(value = ["status"]),
        Index(value = ["created_at"]),
        Index(value = ["sync_status"])
    ],
    foreignKeys = [
        ForeignKey(
            entity = TableEntity::class,
            parentColumns = ["id"],
            childColumns = ["table_id"],
            onDelete = ForeignKey.SET_NULL
        ),
        ForeignKey(
            entity = ShiftEntity::class,
            parentColumns = ["id"],
            childColumns = ["shift_id"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class OrderEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "table_id")
    val tableId: String? = null,

    @ColumnInfo(name = "table_name")
    val tableName: String? = null,

    @ColumnInfo(name = "shift_id")
    val shiftId: String? = null,

    @ColumnInfo(name = "staff_id")
    val staffId: String? = null,

    @ColumnInfo(name = "staff_name")
    val staffName: String? = null,

    @ColumnInfo(name = "customer_name")
    val customerName: String? = null,

    @ColumnInfo(name = "customer_phone")
    val customerPhone: String? = null,

    @ColumnInfo(name = "order_number")
    val orderNumber: String,

    @ColumnInfo(name = "status")
    val status: String = "pending", // pending, confirmed, preparing, ready, completed, cancelled

    @ColumnInfo(name = "order_type")
    val orderType: String = "dine_in", // dine_in, takeaway, delivery

    @ColumnInfo(name = "subtotal")
    val subtotal: Double = 0.0,

    @ColumnInfo(name = "discount_amount")
    val discountAmount: Double = 0.0,

    @ColumnInfo(name = "discount_type")
    val discountType: String? = null, // percent, fixed

    @ColumnInfo(name = "discount_value")
    val discountValue: Double = 0.0,

    @ColumnInfo(name = "discount_reason")
    val discountReason: String? = null,

    // Coupon information
    @ColumnInfo(name = "coupon_id")
    val couponId: String? = null,

    @ColumnInfo(name = "coupon_code")
    val couponCode: String? = null,

    // JSON string chứa danh sách coupon IDs (khi kết hợp nhiều coupon)
    @ColumnInfo(name = "coupon_ids")
    val couponIds: String? = null,

    // JSON string chứa chi tiết các coupon đã áp dụng
    @ColumnInfo(name = "applied_coupons_json")
    val appliedCouponsJson: String? = null,

    // Giảm giá cần phê duyệt
    @ColumnInfo(name = "discount_requires_approval")
    val discountRequiresApproval: Boolean = false,

    @ColumnInfo(name = "discount_approval_status")
    val discountApprovalStatus: String? = null, // pending, approved, rejected

    @ColumnInfo(name = "discount_approved_by")
    val discountApprovedBy: String? = null,

    @ColumnInfo(name = "discount_approved_at")
    val discountApprovedAt: String? = null,

    @ColumnInfo(name = "surcharge_amount")
    val surchargeAmount: Double = 0.0,

    @ColumnInfo(name = "vat_amount")
    val vatAmount: Double = 0.0,

    @ColumnInfo(name = "total_amount")
    val totalAmount: Double = 0.0,

    @ColumnInfo(name = "paid_amount")
    val paidAmount: Double = 0.0,

    @ColumnInfo(name = "change_amount")
    val changeAmount: Double = 0.0,

    @ColumnInfo(name = "payment_method")
    val paymentMethod: String? = null, // cash, card, transfer, momo, zalopay

    @ColumnInfo(name = "payment_status")
    val paymentStatus: String = "unpaid", // unpaid, partial, paid

    @ColumnInfo(name = "notes")
    val notes: String? = null,

    @ColumnInfo(name = "guest_count")
    val guestCount: Int = 1,

    @ColumnInfo(name = "is_printed")
    val isPrinted: Boolean = false,

    @ColumnInfo(name = "printed_at")
    val printedAt: String? = null,

    @ColumnInfo(name = "completed_at")
    val completedAt: String? = null,

    @ColumnInfo(name = "cancelled_at")
    val cancelledAt: String? = null,

    @ColumnInfo(name = "cancel_reason")
    val cancelReason: String? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    // Sync fields
    @ColumnInfo(name = "idempotency_key")
    val idempotencyKey: String, // UUID to prevent duplicate orders on server

    @ColumnInfo(name = "server_id")
    val serverId: String? = null, // ID from server after sync

    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "pending", // pending, syncing, synced, failed

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null,

    @ColumnInfo(name = "sync_error")
    val syncError: String? = null,

    @ColumnInfo(name = "retry_count")
    val retryCount: Int = 0,

    @ColumnInfo(name = "version")
    val version: Int = 1
)
