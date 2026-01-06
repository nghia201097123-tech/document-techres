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
        return orderDao.getActiveOrders(branchId)
    }

    fun getOrdersByStatus(branchId: String, status: String): Flow<List<OrderEntity>> {
        return orderDao.getOrdersByStatus(branchId, status)
    }

    fun getOrdersByTable(tableId: String): Flow<List<OrderEntity>> {
        return orderDao.getOrdersByTable(tableId)
    }

    suspend fun getOrderById(id: String): OrderEntity? {
        return orderDao.getOrderById(id)
    }

    fun getOrderItems(orderId: String): Flow<List<OrderItemEntity>> {
        return orderItemDao.getOrderItems(orderId)
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
        orderDao.updateSyncStatus(orderId, "synced", System.currentTimeMillis().toString())
    }

    suspend fun getOrdersForShift(shiftId: String): List<OrderEntity> {
        return orderDao.getOrdersForShift(shiftId)
    }

    suspend fun getOrdersByDateRange(branchId: String, startDate: String, endDate: String): List<OrderEntity> {
        return orderDao.getOrdersByDateRange(branchId, startDate, endDate)
    }
}
