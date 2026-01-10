package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index

@Entity(
    tableName = "product_note_assignments",
    primaryKeys = ["product_id", "note_id"],
    indices = [
        Index(value = ["note_id"]),
        Index(value = ["product_id"])
    ],
    foreignKeys = [
        ForeignKey(
            entity = ProductNoteEntity::class,
            parentColumns = ["id"],
            childColumns = ["note_id"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class ProductNoteAssignmentEntity(
    @ColumnInfo(name = "product_id")
    val productId: String,

    @ColumnInfo(name = "note_id")
    val noteId: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0
)
