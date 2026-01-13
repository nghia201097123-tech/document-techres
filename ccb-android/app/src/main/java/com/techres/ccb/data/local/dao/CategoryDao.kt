package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.CategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {

    @Query("SELECT * FROM categories WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getAllByBranch(branchId: String): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM categories WHERE id = :id")
    suspend fun getById(id: String): CategoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(category: CategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<CategoryEntity>)

    @Update
    suspend fun update(category: CategoryEntity)

    @Delete
    suspend fun delete(category: CategoryEntity)

    @Query("DELETE FROM categories WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("UPDATE categories SET is_active = 0 WHERE id = :id")
    suspend fun softDelete(id: String)

    @Query("SELECT COUNT(*) FROM categories WHERE branch_id = :branchId AND is_active = 1")
    suspend fun getCount(branchId: String): Int

    @Transaction
    suspend fun syncCategories(branchId: String, categories: List<CategoryEntity>) {
        deleteAllByBranch(branchId)
        insertAll(categories)
    }
}
