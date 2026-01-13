package com.techres.ccb.data.repository

import com.techres.ccb.data.local.dao.ShiftDao
import com.techres.ccb.data.local.entity.ShiftEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShiftRepository @Inject constructor(
    private val shiftDao: ShiftDao
) {
    fun getCurrentShift(branchId: String): Flow<ShiftEntity?> {
        return shiftDao.observeCurrentOpenShift(branchId)
    }

    suspend fun getCurrentOpenShift(branchId: String): ShiftEntity? {
        return shiftDao.getCurrentOpenShift(branchId)
    }

    fun getAllShiftsByBranch(branchId: String): Flow<List<ShiftEntity>> {
        return shiftDao.getAllByBranch(branchId)
    }

    suspend fun getShiftById(id: String): ShiftEntity? {
        return shiftDao.getById(id)
    }

    suspend fun getPendingSyncShifts(): List<ShiftEntity> {
        return shiftDao.getPendingSyncShifts()
    }

    suspend fun openShift(shift: ShiftEntity) {
        shiftDao.insert(shift)
    }

    suspend fun closeShift(
        shiftId: String,
        closingAmount: Double,
        expectedAmount: Double,
        differenceAmount: Double,
        totalOrders: Int,
        totalRevenue: Double,
        cashRevenue: Double,
        cardRevenue: Double,
        transferRevenue: Double,
        otherRevenue: Double,
        totalDiscount: Double,
        notes: String?,
        closedAt: String,
        updatedAt: String
    ) {
        shiftDao.closeShift(
            shiftId = shiftId,
            closingAmount = closingAmount,
            expectedAmount = expectedAmount,
            differenceAmount = differenceAmount,
            totalOrders = totalOrders,
            totalRevenue = totalRevenue,
            cashRevenue = cashRevenue,
            cardRevenue = cardRevenue,
            transferRevenue = transferRevenue,
            otherRevenue = otherRevenue,
            totalDiscount = totalDiscount,
            notes = notes,
            closedAt = closedAt,
            updatedAt = updatedAt
        )
    }

    suspend fun updateShift(shift: ShiftEntity) {
        shiftDao.update(shift)
    }

    suspend fun markShiftAsSynced(shiftId: String) {
        shiftDao.updateSyncStatus(shiftId, "synced", System.currentTimeMillis().toString(), 0)
    }

    /**
     * Add completed order revenue to shift statistics
     */
    suspend fun addOrderRevenue(
        shiftId: String,
        orderTotal: Double,
        discountAmount: Double,
        paymentMethod: String,
        updatedAt: String
    ) {
        shiftDao.addOrderRevenue(shiftId, orderTotal, discountAmount, paymentMethod, updatedAt)
    }

    /**
     * Increment cancelled order count
     */
    suspend fun incrementCancelledCount(shiftId: String, updatedAt: String) {
        shiftDao.incrementCancelledCount(shiftId, updatedAt)
    }
}
