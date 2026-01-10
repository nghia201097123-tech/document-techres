package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.OrderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {

    @Query("SELECT * FROM orders WHERE branch_id = :branchId ORDER BY created_at DESC")
    fun getAllByBranch(branchId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE branch_id = :branchId AND status NOT IN ('completed', 'cancelled') ORDER BY created_at DESC")
    fun getActiveOrdersByBranch(branchId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE branch_id = :branchId AND shift_id = :shiftId ORDER BY created_at DESC")
    fun getByShift(branchId: String, shiftId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE table_id = :tableId AND status NOT IN ('completed', 'cancelled') LIMIT 1")
    suspend fun getActiveOrderByTable(tableId: String): OrderEntity?

    @Query("SELECT * FROM orders WHERE id = :id")
    suspend fun getById(id: String): OrderEntity?

    @Query("SELECT * FROM orders WHERE sync_status = 'pending' OR sync_status = 'failed' ORDER BY created_at ASC")
    suspend fun getPendingSyncOrders(): List<OrderEntity>

    @Query("SELECT COUNT(*) FROM orders WHERE branch_id = :branchId AND shift_id = :shiftId AND status = 'completed'")
    suspend fun getCompletedOrderCountByShift(branchId: String, shiftId: String): Int

    @Query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE branch_id = :branchId AND shift_id = :shiftId AND status = 'completed'")
    suspend fun getTotalRevenueByShift(branchId: String, shiftId: String): Double

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(order: OrderEntity)

    @Update
    suspend fun update(order: OrderEntity)

    @Query("UPDATE orders SET status = :status, updated_at = :updatedAt, sync_status = 'pending' WHERE id = :orderId")
    suspend fun updateStatus(orderId: String, status: String, updatedAt: String)

    @Query("UPDATE orders SET payment_status = :paymentStatus, payment_method = :paymentMethod, paid_amount = :paidAmount, change_amount = :changeAmount, completed_at = :completedAt, updated_at = :updatedAt, sync_status = 'pending' WHERE id = :orderId")
    suspend fun updatePayment(
        orderId: String,
        paymentStatus: String,
        paymentMethod: String,
        paidAmount: Double,
        changeAmount: Double,
        completedAt: String,
        updatedAt: String
    )

    @Query("UPDATE orders SET sync_status = :syncStatus, synced_at = :syncedAt, retry_count = :retryCount WHERE id = :orderId")
    suspend fun updateSyncStatus(orderId: String, syncStatus: String, syncedAt: String?, retryCount: Int)

    @Delete
    suspend fun delete(order: OrderEntity)

    @Query("DELETE FROM orders WHERE id = :orderId")
    suspend fun deleteById(orderId: String)

    /**
     * Get order history with filters - completed and cancelled orders
     */
    @Query("""
        SELECT * FROM orders
        WHERE branch_id = :branchId
        AND status IN ('completed', 'cancelled')
        ORDER BY created_at DESC
    """)
    fun getOrderHistory(branchId: String): Flow<List<OrderEntity>>

    /**
     * Get order history filtered by status
     */
    @Query("""
        SELECT * FROM orders
        WHERE branch_id = :branchId
        AND status = :status
        ORDER BY created_at DESC
    """)
    fun getOrderHistoryByStatus(branchId: String, status: String): Flow<List<OrderEntity>>

    /**
     * Get order history filtered by date range
     */
    @Query("""
        SELECT * FROM orders
        WHERE branch_id = :branchId
        AND status IN ('completed', 'cancelled')
        AND created_at >= :startDate
        AND created_at <= :endDate
        ORDER BY created_at DESC
    """)
    fun getOrderHistoryByDateRange(
        branchId: String,
        startDate: String,
        endDate: String
    ): Flow<List<OrderEntity>>

    /**
     * Get order history filtered by both status and date range
     */
    @Query("""
        SELECT * FROM orders
        WHERE branch_id = :branchId
        AND status = :status
        AND created_at >= :startDate
        AND created_at <= :endDate
        ORDER BY created_at DESC
    """)
    fun getOrderHistoryFiltered(
        branchId: String,
        status: String,
        startDate: String,
        endDate: String
    ): Flow<List<OrderEntity>>
}
