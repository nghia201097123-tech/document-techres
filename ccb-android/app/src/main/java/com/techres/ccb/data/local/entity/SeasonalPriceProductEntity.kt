package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index

@Entity(
    tableName = "seasonal_price_products",
    primaryKeys = ["seasonal_price_id", "product_id"],
    foreignKeys = [
        ForeignKey(
            entity = SeasonalPriceEntity::class,
            parentColumns = ["id"],
            childColumns = ["seasonal_price_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["seasonal_price_id"]),
        Index(value = ["product_id"])
    ]
)
data class SeasonalPriceProductEntity(
    @ColumnInfo(name = "seasonal_price_id")
    val seasonalPriceId: String,

    @ColumnInfo(name = "product_id")
    val productId: String
)
