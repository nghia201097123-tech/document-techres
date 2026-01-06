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
        return shiftDao.getCurrentShift(branchId)
    }

    suspend fun getShiftById(id: String): ShiftEntity? {
        return shiftDao.getShiftById(id)
    }

    suspend fun getShiftsByDateRange(branchId: String, startDate: String, endDate: String): List<ShiftEntity> {
        return shiftDao.getShiftsByDateRange(branchId, startDate, endDate)
    }

    suspend fun getPendingSyncShifts(): List<ShiftEntity> {
        return shiftDao.getPendingSyncShifts()
    }

    suspend fun openShift(shift: ShiftEntity) {
        shiftDao.insert(shift)
    }

    suspend fun closeShift(shift: ShiftEntity) {
        shiftDao.update(shift)
    }

    suspend fun updateShift(shift: ShiftEntity) {
        shiftDao.update(shift)
    }

    suspend fun markShiftAsSynced(shiftId: String) {
        shiftDao.updateSyncStatus(shiftId, "synced", System.currentTimeMillis().toString())
    }
}
