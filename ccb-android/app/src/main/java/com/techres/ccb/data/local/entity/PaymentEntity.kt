package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "payments",
    indices = [
        Index(value = ["order_id"]),
        Index(value = ["shift_id"]),
        Index(value = ["payment_method"]),
        Index(value = ["sync_status"])
    ],
    foreignKeys = [
        ForeignKey(
            entity = OrderEntity::class,
            parentColumns = ["id"],
            childColumns = ["order_id"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class PaymentEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "order_id")
    val orderId: String,

    @ColumnInfo(name = "shift_id")
    val shiftId: String? = null,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "amount")
    val amount: Double,

    @ColumnInfo(name = "payment_method")
    val paymentMethod: String, // cash, bank_transfer, credit_card, e_wallet, qr_code

    @ColumnInfo(name = "payment_method_name")
    val paymentMethodName: String,

    // For cash payments
    @ColumnInfo(name = "received_amount")
    val receivedAmount: Double? = null,

    @ColumnInfo(name = "change_amount")
    val changeAmount: Double? = null,

    // For bank/card payments
    @ColumnInfo(name = "reference_code")
    val referenceCode: String? = null,

    @ColumnInfo(name = "bank_account_id")
    val bankAccountId: String? = null,

    @ColumnInfo(name = "bank_name")
    val bankName: String? = null,

    @ColumnInfo(name = "status")
    val status: String = "completed", // pending, completed, failed, refunded

    @ColumnInfo(name = "paid_at")
    val paidAt: String,

    @ColumnInfo(name = "notes")
    val notes: String? = null,

    // Sync fields
    @ColumnInfo(name = "idempotency_key")
    val idempotencyKey: String,

    @ColumnInfo(name = "server_id")
    val serverId: String? = null,

    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "pending", // pending, syncing, synced, failed

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null,

    @ColumnInfo(name = "sync_error")
    val syncError: String? = null,

    @ColumnInfo(name = "version")
    val version: Int = 1
)
