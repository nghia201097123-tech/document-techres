package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.OrderItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderItemDao {

    @Query("""
        SELECT oi.* FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.branch_id = :branchId
        ORDER BY oi.created_at DESC
    """)
    fun getAllByBranch(branchId: String): Flow<List<OrderItemEntity>>

    @Query("SELECT * FROM order_items WHERE order_id = :orderId ORDER BY created_at ASC")
    fun getByOrderId(orderId: String): Flow<List<OrderItemEntity>>

    @Query("SELECT * FROM order_items WHERE order_id = :orderId")
    suspend fun getByOrderIdSync(orderId: String): List<OrderItemEntity>

    @Query("SELECT * FROM order_items WHERE status IN ('pending', 'preparing') AND print_to_kitchen = 1 ORDER BY created_at ASC")
    fun getKitchenPendingItems(): Flow<List<OrderItemEntity>>

    @Query("SELECT * FROM order_items WHERE status IN ('pending', 'preparing') AND print_to_bar = 1 ORDER BY created_at ASC")
    fun getBarPendingItems(): Flow<List<OrderItemEntity>>

    @Query("SELECT * FROM order_items WHERE id = :id")
    suspend fun getById(id: String): OrderItemEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: OrderItemEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<OrderItemEntity>)

    @Update
    suspend fun update(item: OrderItemEntity)

    @Query("UPDATE order_items SET status = :status, updated_at = :updatedAt WHERE id = :itemId")
    suspend fun updateStatus(itemId: String, status: String, updatedAt: String)

    @Query("UPDATE order_items SET status = :status, updated_at = :updatedAt WHERE order_id = :orderId")
    suspend fun updateAllItemsStatus(orderId: String, status: String, updatedAt: String)

    @Query("UPDATE order_items SET quantity = :quantity, total_price = :totalPrice, updated_at = :updatedAt WHERE id = :itemId")
    suspend fun updateQuantity(itemId: String, quantity: Int, totalPrice: Double, updatedAt: String)

    @Query("UPDATE order_items SET is_printed = 1, printed_at = :printedAt WHERE id = :itemId")
    suspend fun markAsPrinted(itemId: String, printedAt: String)

    @Delete
    suspend fun delete(item: OrderItemEntity)

    @Query("DELETE FROM order_items WHERE id = :itemId")
    suspend fun deleteById(itemId: String)

    @Query("DELETE FROM order_items WHERE order_id = :orderId")
    suspend fun deleteByOrderId(orderId: String)

    /**
     * Get item counts for multiple orders in a single query
     * Returns a list of OrderItemCount with orderId and count
     */
    @Query("SELECT order_id AS orderId, COUNT(*) AS itemCount FROM order_items WHERE order_id IN (:orderIds) GROUP BY order_id")
    suspend fun getItemCountsByOrderIds(orderIds: List<String>): List<OrderItemCount>
}

/**
 * Data class for batch item count query result
 */
data class OrderItemCount(
    val orderId: String,
    val itemCount: Int
)
