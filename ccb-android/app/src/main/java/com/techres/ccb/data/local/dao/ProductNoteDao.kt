package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.techres.ccb.data.local.entity.ProductNoteEntity
import com.techres.ccb.data.local.entity.ProductNoteAssignmentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductNoteDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(note: ProductNoteEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(notes: List<ProductNoteEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAssignment(assignment: ProductNoteAssignmentEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllAssignments(assignments: List<ProductNoteAssignmentEntity>)

    @Query("SELECT * FROM product_notes WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getActiveNotes(branchId: String): Flow<List<ProductNoteEntity>>

    @Query("SELECT * FROM product_notes WHERE branch_id = :branchId ORDER BY sort_order ASC")
    fun getAllNotes(branchId: String): Flow<List<ProductNoteEntity>>

    @Query("SELECT * FROM product_notes WHERE id = :noteId")
    suspend fun getNoteById(noteId: String): ProductNoteEntity?

    @Query("SELECT COUNT(*) FROM product_notes WHERE branch_id = :branchId AND is_active = 1")
    suspend fun countActive(branchId: String): Int

    @Query("SELECT COUNT(*) FROM product_notes WHERE branch_id = :branchId")
    suspend fun countByBranch(branchId: String): Int

    // Get notes for a specific product
    @Query("""
        SELECT pn.* FROM product_notes pn
        INNER JOIN product_note_assignments pna ON pn.id = pna.note_id
        WHERE pna.product_id = :productId AND pn.is_active = 1
        ORDER BY pna.sort_order ASC
    """)
    fun getNotesForProduct(productId: String): Flow<List<ProductNoteEntity>>

    @Query("""
        SELECT pn.* FROM product_notes pn
        INNER JOIN product_note_assignments pna ON pn.id = pna.note_id
        WHERE pna.product_id = :productId AND pn.is_active = 1
        ORDER BY pna.sort_order ASC
    """)
    suspend fun getNotesForProductSync(productId: String): List<ProductNoteEntity>

    // Get all assignments for a branch
    @Query("SELECT * FROM product_note_assignments WHERE branch_id = :branchId")
    suspend fun getAllAssignments(branchId: String): List<ProductNoteAssignmentEntity>

    @Query("DELETE FROM product_notes WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("DELETE FROM product_note_assignments WHERE branch_id = :branchId")
    suspend fun deleteAllAssignmentsByBranch(branchId: String)

    @Transaction
    suspend fun syncProductNotes(branchId: String, notes: List<ProductNoteEntity>) {
        deleteAllByBranch(branchId)
        if (notes.isNotEmpty()) {
            insertAll(notes)
        }
    }

    @Transaction
    suspend fun syncProductNoteAssignments(branchId: String, assignments: List<ProductNoteAssignmentEntity>) {
        deleteAllAssignmentsByBranch(branchId)
        if (assignments.isNotEmpty()) {
            insertAllAssignments(assignments)
        }
    }
}
