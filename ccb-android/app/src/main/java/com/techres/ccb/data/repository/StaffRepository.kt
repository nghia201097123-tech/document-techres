package com.techres.ccb.data.repository

import com.techres.ccb.data.local.dao.StaffDao
import com.techres.ccb.data.local.entity.StaffEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StaffRepository @Inject constructor(
    private val staffDao: StaffDao
) {
    fun getAllStaff(branchId: String): Flow<List<StaffEntity>> {
        return staffDao.getAllByBranch(branchId)
    }

    fun getActiveStaff(branchId: String): Flow<List<StaffEntity>> {
        return staffDao.getAllByBranch(branchId)
    }

    suspend fun getStaffById(id: String): StaffEntity? {
        return staffDao.getById(id)
    }

    suspend fun getStaffByPinCode(pinCode: String): StaffEntity? {
        return staffDao.getByPinCode(pinCode)
    }

    suspend fun getStaffByCode(code: String, branchId: String): StaffEntity? {
        return staffDao.getByCode(code, branchId)
    }

    suspend fun syncStaff(branchId: String, staffList: List<StaffEntity>) {
        staffDao.syncStaff(branchId, staffList)
    }

    suspend fun insertStaff(staff: StaffEntity) {
        staffDao.insert(staff)
    }

    suspend fun updateStaff(staff: StaffEntity) {
        staffDao.update(staff)
    }
}
