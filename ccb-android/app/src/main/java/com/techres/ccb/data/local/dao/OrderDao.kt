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

    @Query("SELECT * FROM orders WHERE status NOT IN ('completed', 'cancelled') AND table_id IS NOT NULL ORDER BY created_at DESC")
    suspend fun getAllActiveOrdersWithTable(): List<OrderEntity>

    /**
     * Get active orders that have table_name set (even if table_id is NULL)
     * This is used to restore table relationships after sync when table_id was lost
     */
    @Query("SELECT * FROM orders WHERE status NOT IN ('completed', 'cancelled') AND table_name IS NOT NULL ORDER BY created_at DESC")
    suspend fun getAllActiveOrdersWithTableName(): List<OrderEntity>

    @Query("SELECT * FROM orders WHERE branch_id = :branchId AND shift_id = :shiftId ORDER BY created_at DESC")
    fun getByShift(branchId: String, shiftId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE table_id = :tableId AND status NOT IN ('completed', 'cancelled') LIMIT 1")
    suspend fun getActiveOrderByTable(tableId: String): OrderEntity?

    /**
     * Get active order by table name (fallback when table_id is NULL)
     */
    @Query("SELECT * FROM orders WHERE table_name = :tableName AND status NOT IN ('completed', 'cancelled') LIMIT 1")
    suspend fun getActiveOrderByTableName(tableName: String): OrderEntity?

    @Query("SELECT * FROM orders WHERE id = :id")
    suspend fun getById(id: String): OrderEntity?

    @Query("SELECT * FROM orders WHERE id IN (:ids)")
    suspend fun getByIds(ids: List<String>): List<OrderEntity>

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

    @Query("UPDATE orders SET cancelled_at = :cancelledAt, cancel_reason = :cancelReason, updated_at = :updatedAt, sync_status = 'pending' WHERE id = :orderId")
    suspend fun updateCancelReason(orderId: String, cancelledAt: String, cancelReason: String, updatedAt: String)

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

    @Query("UPDATE orders SET table_id = :tableId, table_name = :tableName, updated_at = :updatedAt WHERE id = :orderId")
    suspend fun updateTableId(orderId: String, tableId: String?, tableName: String?, updatedAt: String)

    @Query("UPDATE orders SET notes = :notes, updated_at = :updatedAt, sync_status = 'pending' WHERE id = :orderId")
    suspend fun updateNotes(orderId: String, notes: String?, updatedAt: String)

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
     * Uses SUBSTR to compare only the date part (YYYY-MM-DD) for timezone safety
     */
    @Query("""
        SELECT * FROM orders
        WHERE branch_id = :branchId
        AND status IN ('completed', 'cancelled')
        AND SUBSTR(created_at, 1, 10) >= :startDate
        AND SUBSTR(created_at, 1, 10) < :endDate
        ORDER BY created_at DESC
    """)
    fun getOrderHistoryByDateRange(
        branchId: String,
        startDate: String,
        endDate: String
    ): Flow<List<OrderEntity>>

    /**
     * Get order history filtered by both status and date range
     * Uses SUBSTR to compare only the date part (YYYY-MM-DD) for timezone safety
     */
    @Query("""
        SELECT * FROM orders
        WHERE branch_id = :branchId
        AND status = :status
        AND SUBSTR(created_at, 1, 10) >= :startDate
        AND SUBSTR(created_at, 1, 10) < :endDate
        ORDER BY created_at DESC
    """)
    fun getOrderHistoryFiltered(
        branchId: String,
        status: String,
        startDate: String,
        endDate: String
    ): Flow<List<OrderEntity>>

    /**
     * Get max pager number for today (reset mỗi ngày)
     * Returns the highest pager_number used today for the branch
     */
    @Query("""
        SELECT COALESCE(MAX(pager_number), 0) FROM orders
        WHERE branch_id = :branchId
        AND SUBSTR(created_at, 1, 10) = :today
    """)
    suspend fun getMaxPagerNumberForToday(branchId: String, today: String): Int

    /**
     * Get list of pager numbers in use by active orders today
     * Used to show which pagers are already taken
     */
    @Query("""
        SELECT pager_number FROM orders
        WHERE branch_id = :branchId
        AND SUBSTR(created_at, 1, 10) = :today
        AND status NOT IN ('completed', 'cancelled')
        AND pager_number IS NOT NULL
    """)
    suspend fun getUsedPagerNumbersToday(branchId: String, today: String): List<Int>

    /**
     * Get max daily order number for today
     * Used to generate next sequential order number (001, 002, ...)
     */
    @Query("""
        SELECT COALESCE(MAX(daily_order_number), 0) FROM orders
        WHERE branch_id = :branchId
        AND SUBSTR(created_at, 1, 10) = :today
    """)
    suspend fun getMaxDailyOrderNumberForToday(branchId: String, today: String): Int
}
