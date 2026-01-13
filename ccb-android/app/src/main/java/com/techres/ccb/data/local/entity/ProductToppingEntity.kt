package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index

/**
 * Entity lưu quan hệ giữa sản phẩm cha và topping
 * Ví dụ: "Trà sữa truyền thống" có topping "Size S", "Size M"
 */
@Entity(
    tableName = "product_toppings",
    primaryKeys = ["product_id", "topping_id"],
    indices = [
        Index(value = ["product_id"]),
        Index(value = ["topping_id"]),
        Index(value = ["branch_id"]),
        Index(value = ["group_name"])
    ],
    foreignKeys = [
        ForeignKey(
            entity = ProductEntity::class,
            parentColumns = ["id"],
            childColumns = ["product_id"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = ProductEntity::class,
            parentColumns = ["id"],
            childColumns = ["topping_id"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class ProductToppingEntity(
    @ColumnInfo(name = "product_id")
    val productId: String,

    @ColumnInfo(name = "topping_id")
    val toppingId: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    // Nhóm topping: "SIZE", "ĐƯỜNG", "ĐÁ", "TOPPING"
    @ColumnInfo(name = "group_name")
    val groupName: String = "TOPPING",

    // Loại nhóm để xác định behavior
    @ColumnInfo(name = "group_type")
    val groupType: String = "topping", // size, sugar, ice, topping, other

    // Bắt buộc chọn?
    @ColumnInfo(name = "is_required")
    val isRequired: Boolean = false,

    // Có thể chọn nhiều? (ví dụ: nhiều topping)
    @ColumnInfo(name = "is_multiple")
    val isMultiple: Boolean = true,

    // Số tối thiểu cần chọn trong nhóm
    @ColumnInfo(name = "min_select")
    val minSelect: Int = 0,

    // Số tối đa được chọn trong nhóm
    @ColumnInfo(name = "max_select")
    val maxSelect: Int = 99,

    // Giá cộng thêm khi chọn topping này (có thể khác price trong ProductEntity)
    @ColumnInfo(name = "extra_price")
    val extraPrice: Double = 0.0,

    // Là lựa chọn mặc định?
    @ColumnInfo(name = "is_default")
    val isDefault: Boolean = false,

    // Thứ tự hiển thị trong nhóm
    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String
)
