package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Entity lưu các món con trong combo
 * Ví dụ: Combo "Cơm gà + Trà sữa" gồm có: "Cơm gà" x1, "Trà sữa" x1
 */
@Entity(
    tableName = "combo_items",
    indices = [
        Index(value = ["combo_id"]),
        Index(value = ["product_id"]),
        Index(value = ["combo_id", "product_id"], unique = true)
    ],
    foreignKeys = [
        ForeignKey(
            entity = ProductEntity::class,
            parentColumns = ["id"],
            childColumns = ["combo_id"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = ProductEntity::class,
            parentColumns = ["id"],
            childColumns = ["product_id"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class ComboItemEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    // ID của sản phẩm combo (sản phẩm cha)
    @ColumnInfo(name = "combo_id")
    val comboId: String,

    // ID của sản phẩm con trong combo
    @ColumnInfo(name = "product_id")
    val productId: String,

    // Tên sản phẩm con (để hiển thị không cần join)
    @ColumnInfo(name = "product_name")
    val productName: String,

    // Mã sản phẩm con
    @ColumnInfo(name = "product_code")
    val productCode: String? = null,

    // Số lượng sản phẩm con trong combo
    @ColumnInfo(name = "quantity")
    val quantity: Int = 1,

    // Thứ tự hiển thị
    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String
)
