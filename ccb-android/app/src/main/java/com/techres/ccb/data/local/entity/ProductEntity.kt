package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "products",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["category_id"]),
        Index(value = ["is_active"]),
        Index(value = ["code"])
    ],
    foreignKeys = [
        ForeignKey(
            entity = CategoryEntity::class,
            parentColumns = ["id"],
            childColumns = ["category_id"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class ProductEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "category_id")
    val categoryId: String? = null,

    @ColumnInfo(name = "code")
    val code: String,

    @ColumnInfo(name = "name")
    val name: String,

    // Tên không dấu - dùng để tìm kiếm
    @ColumnInfo(name = "search_name")
    val searchName: String? = null,

    // Tên viết tắt để tìm kiếm nhanh (VD: "ccdc" cho "Cơm chiên dương châu")
    @ColumnInfo(name = "abbreviation")
    val abbreviation: String? = null,

    @ColumnInfo(name = "description")
    val description: String? = null,

    @ColumnInfo(name = "image_url")
    val imageUrl: String? = null,

    @ColumnInfo(name = "price")
    val price: Double,

    @ColumnInfo(name = "cost_price")
    val costPrice: Double = 0.0,

    @ColumnInfo(name = "vat_rate")
    val vatRate: Double = 10.0,

    @ColumnInfo(name = "unit")
    val unit: String? = null,

    @ColumnInfo(name = "type")
    val type: String = "food", // food, drink, other, topping, combo

    @ColumnInfo(name = "is_available")
    val isAvailable: Boolean = true,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "preparation_time")
    val preparationTime: Int = 0, // minutes

    @ColumnInfo(name = "print_to_kitchen")
    val printToKitchen: Boolean = true,

    @ColumnInfo(name = "print_to_bar")
    val printToBar: Boolean = false,

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
