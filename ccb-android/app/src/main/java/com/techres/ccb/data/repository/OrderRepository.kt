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
}
