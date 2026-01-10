package com.techres.ccb.data.repository

import com.techres.ccb.data.local.dao.OrderDao
import com.techres.ccb.data.local.dao.OrderItemDao
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepository @Inject constructor(
    private val orderDao: OrderDao,
    private val orderItemDao: OrderItemDao
) {
    fun getActiveOrders(branchId: String): Flow<List<OrderEntity>> {
        return orderDao.getActiveOrdersByBranch(branchId)
    }

    fun getAllOrdersByBranch(branchId: String): Flow<List<OrderEntity>> {
        return orderDao.getAllByBranch(branchId)
    }

    fun getOrdersByShift(branchId: String, shiftId: String): Flow<List<OrderEntity>> {
        return orderDao.getByShift(branchId, shiftId)
    }

    suspend fun getActiveOrderByTable(tableId: String): OrderEntity? {
        return orderDao.getActiveOrderByTable(tableId)
    }

    /**
     * Get active order by table name (fallback when table_id is NULL)
     */
    suspend fun getActiveOrderByTableName(tableName: String): OrderEntity? {
        return orderDao.getActiveOrderByTableName(tableName)
    }

    suspend fun getOrderById(id: String): OrderEntity? {
        return orderDao.getById(id)
    }

    fun getOrderItems(orderId: String): Flow<List<OrderItemEntity>> {
        return orderItemDao.getByOrderId(orderId)
    }

    suspend fun getOrderItemsSync(orderId: String): List<OrderItemEntity> {
        return orderItemDao.getByOrderIdSync(orderId)
    }

    suspend fun getPendingSyncOrders(): List<OrderEntity> {
        return orderDao.getPendingSyncOrders()
    }

    suspend fun createOrder(order: OrderEntity, items: List<OrderItemEntity>) {
        orderDao.insert(order)
        orderItemDao.insertAll(items)
    }

    suspend fun updateOrder(order: OrderEntity) {
        orderDao.update(order)
    }

    suspend fun updateOrderStatus(orderId: String, status: String, updatedAt: String) {
        orderDao.updateStatus(orderId, status, updatedAt)
    }

    /**
     * Update table relationship for an order
     * Used to restore table_id when it was lost during sync
     */
    suspend fun updateTableId(orderId: String, tableId: String?, tableName: String?, updatedAt: String) {
        orderDao.updateTableId(orderId, tableId, tableName, updatedAt)
    }

    /**
     * Update all items status for an order (when order completes/cancels)
     */
    suspend fun updateAllItemsStatus(orderId: String, status: String, updatedAt: String) {
        orderItemDao.updateAllItemsStatus(orderId, status, updatedAt)
    }

    suspend fun addOrderItem(item: OrderItemEntity) {
        orderItemDao.insert(item)
    }

    suspend fun updateOrderItem(item: OrderItemEntity) {
        orderItemDao.update(item)
    }

    suspend fun deleteOrderItem(item: OrderItemEntity) {
        orderItemDao.delete(item)
    }

    suspend fun markOrderAsSynced(orderId: String) {
        orderDao.updateSyncStatus(orderId, "synced", System.currentTimeMillis().toString(), 0)
    }

    suspend fun getCompletedOrderCountByShift(branchId: String, shiftId: String): Int {
        return orderDao.getCompletedOrderCountByShift(branchId, shiftId)
    }

    suspend fun getTotalRevenueByShift(branchId: String, shiftId: String): Double {
        return orderDao.getTotalRevenueByShift(branchId, shiftId)
    }

    /**
     * Get order history (completed and cancelled orders)
     */
    fun getOrderHistory(branchId: String): Flow<List<OrderEntity>> {
        return orderDao.getOrderHistory(branchId)
    }

    /**
     * Get order history filtered by status
     */
    fun getOrderHistoryByStatus(branchId: String, status: String): Flow<List<OrderEntity>> {
        return orderDao.getOrderHistoryByStatus(branchId, status)
    }

    /**
     * Get order history filtered by date range
     */
    fun getOrderHistoryByDateRange(
        branchId: String,
        startDate: String,
        endDate: String
    ): Flow<List<OrderEntity>> {
        return orderDao.getOrderHistoryByDateRange(branchId, startDate, endDate)
    }

    /**
     * Get order history with both status and date filters
     */
    fun getOrderHistoryFiltered(
        branchId: String,
        status: String,
        startDate: String,
        endDate: String
    ): Flow<List<OrderEntity>> {
        return orderDao.getOrderHistoryFiltered(branchId, status, startDate, endDate)
    }
}
