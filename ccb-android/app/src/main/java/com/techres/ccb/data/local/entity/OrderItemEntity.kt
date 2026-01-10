package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "order_items",
    indices = [
        Index(value = ["order_id"]),
        Index(value = ["product_id"]),
        Index(value = ["status"])
    ],
    foreignKeys = [
        ForeignKey(
            entity = OrderEntity::class,
            parentColumns = ["id"],
            childColumns = ["order_id"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = ProductEntity::class,
            parentColumns = ["id"],
            childColumns = ["product_id"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class OrderItemEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "order_id")
    val orderId: String,

    @ColumnInfo(name = "product_id")
    val productId: String? = null,

    @ColumnInfo(name = "product_code")
    val productCode: String,

    @ColumnInfo(name = "product_name")
    val productName: String,

    @ColumnInfo(name = "product_image_url")
    val productImageUrl: String? = null,

    @ColumnInfo(name = "category_name")
    val categoryName: String? = null,

    @ColumnInfo(name = "quantity")
    val quantity: Int = 1,

    @ColumnInfo(name = "unit_price")
    val unitPrice: Double,

    @ColumnInfo(name = "discount_amount")
    val discountAmount: Double = 0.0,

    @ColumnInfo(name = "total_price")
    val totalPrice: Double,

    @ColumnInfo(name = "vat_rate")
    val vatRate: Double = 10.0,

    @ColumnInfo(name = "vat_amount")
    val vatAmount: Double = 0.0,

    @ColumnInfo(name = "notes")
    val notes: String? = null,

    @ColumnInfo(name = "status")
    val status: String = "pending", // pending, preparing, ready, served, cancelled

    @ColumnInfo(name = "print_to_kitchen")
    val printToKitchen: Boolean = true,

    @ColumnInfo(name = "print_to_bar")
    val printToBar: Boolean = false,

    @ColumnInfo(name = "is_printed")
    val isPrinted: Boolean = false,

    @ColumnInfo(name = "printed_at")
    val printedAt: String? = null,

    @ColumnInfo(name = "preparing_at")
    val preparingAt: String? = null,

    @ColumnInfo(name = "ready_at")
    val readyAt: String? = null,

    @ColumnInfo(name = "served_at")
    val servedAt: String? = null,

    @ColumnInfo(name = "cancelled_at")
    val cancelledAt: String? = null,

    @ColumnInfo(name = "cancel_reason")
    val cancelReason: String? = null,

    // Combo fields - for tracking combo items sent to kitchen
    @ColumnInfo(name = "is_combo_parent")
    val isComboParent: Boolean = false,  // True if this item is a combo product

    @ColumnInfo(name = "is_combo_child")
    val isComboChild: Boolean = false,   // True if this is a child item of a combo

    @ColumnInfo(name = "combo_parent_id")
    val comboParentId: String? = null,   // ID of parent combo product (for child items)

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    @ColumnInfo(name = "version")
    val version: Int = 1
)
