package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {

    @Query("SELECT * FROM products WHERE branch_id = :branchId AND is_active = 1 AND is_available = 1 ORDER BY sort_order ASC")
    fun getAllAvailableByBranch(branchId: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE branch_id = :branchId AND category_id = :categoryId AND is_active = 1 AND is_available = 1 ORDER BY sort_order ASC")
    fun getByCategoryAndBranch(branchId: String, categoryId: String): Flow<List<ProductEntity>>

    @Query("""
        SELECT * FROM products
        WHERE branch_id = :branchId AND is_active = 1 AND is_available = 1
        AND (
            name LIKE '%' || :query || '%'
            OR code LIKE '%' || :query || '%'
            OR search_name LIKE '%' || :query || '%'
            OR abbreviation LIKE '%' || :query || '%'
        )
        ORDER BY sort_order ASC
    """)
    fun searchProducts(branchId: String, query: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getById(id: String): ProductEntity?

    @Query("SELECT * FROM products WHERE code = :code AND branch_id = :branchId")
    suspend fun getByCode(code: String, branchId: String): ProductEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(product: ProductEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Update
    suspend fun update(product: ProductEntity)

    @Delete
    suspend fun delete(product: ProductEntity)

    @Query("DELETE FROM products WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("UPDATE products SET is_active = 0 WHERE id = :id")
    suspend fun softDelete(id: String)

    @Query("SELECT COUNT(*) FROM products WHERE branch_id = :branchId AND is_active = 1 AND is_available = 1")
    suspend fun getCount(branchId: String): Int

    @Transaction
    suspend fun syncProducts(branchId: String, products: List<ProductEntity>) {
        deleteAllByBranch(branchId)
        insertAll(products)
    }
}
