package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.techres.ccb.data.local.entity.ProductToppingEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductToppingDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: ProductToppingEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entities: List<ProductToppingEntity>)

    /**
     * Lấy tất cả topping của một sản phẩm
     */
    @Query("""
        SELECT pt.* FROM product_toppings pt
        INNER JOIN products p ON pt.topping_id = p.id AND p.is_active = 1
        WHERE pt.product_id = :productId
        ORDER BY pt.group_name, pt.sort_order
    """)
    fun getToppingsForProduct(productId: String): Flow<List<ProductToppingEntity>>

    /**
     * Lấy tất cả topping của một sản phẩm (sync version)
     */
    @Query("""
        SELECT pt.* FROM product_toppings pt
        INNER JOIN products p ON pt.topping_id = p.id AND p.is_active = 1
        WHERE pt.product_id = :productId
        ORDER BY pt.group_name, pt.sort_order
    """)
    fun getToppingsForProductSync(productId: String): List<ProductToppingEntity>

    /**
     * Lấy tất cả topping của nhiều sản phẩm
     */
    @Query("""
        SELECT pt.* FROM product_toppings pt
        INNER JOIN products p ON pt.topping_id = p.id AND p.is_active = 1
        WHERE pt.product_id IN (:productIds)
        ORDER BY pt.product_id, pt.group_name, pt.sort_order
    """)
    fun getToppingsForProducts(productIds: List<String>): Flow<List<ProductToppingEntity>>

    /**
     * Lấy tất cả topping của nhiều sản phẩm (sync version)
     */
    @Query("""
        SELECT pt.* FROM product_toppings pt
        INNER JOIN products p ON pt.topping_id = p.id AND p.is_active = 1
        WHERE pt.product_id IN (:productIds)
        ORDER BY pt.product_id, pt.group_name, pt.sort_order
    """)
    fun getToppingsForProductsSync(productIds: List<String>): List<ProductToppingEntity>

    /**
     * Lấy tất cả quan hệ topping của chi nhánh
     */
    @Query("SELECT * FROM product_toppings WHERE branch_id = :branchId")
    fun getAllByBranch(branchId: String): Flow<List<ProductToppingEntity>>

    /**
     * Kiểm tra sản phẩm có topping không
     */
    @Query("SELECT COUNT(*) > 0 FROM product_toppings WHERE product_id = :productId")
    suspend fun hasTopping(productId: String): Boolean

    /**
     * Lấy danh sách productId có topping
     */
    @Query("SELECT DISTINCT product_id FROM product_toppings WHERE branch_id = :branchId")
    fun getProductIdsWithToppings(branchId: String): Flow<List<String>>

    /**
     * Lấy danh sách productId có topping (sync version)
     */
    @Query("SELECT DISTINCT product_id FROM product_toppings WHERE branch_id = :branchId")
    fun getProductIdsWithToppingsSync(branchId: String): List<String>

    /**
     * Xóa topping của một sản phẩm
     */
    @Query("DELETE FROM product_toppings WHERE product_id = :productId")
    suspend fun deleteByProduct(productId: String)

    /**
     * Xóa tất cả topping của chi nhánh
     */
    @Query("DELETE FROM product_toppings WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    /**
     * Đếm số topping của sản phẩm
     */
    @Query("SELECT COUNT(*) FROM product_toppings WHERE product_id = :productId")
    suspend fun countToppings(productId: String): Int
}
