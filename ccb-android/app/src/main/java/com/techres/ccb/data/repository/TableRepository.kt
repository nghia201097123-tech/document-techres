package com.techres.ccb.data.repository

import com.techres.ccb.data.local.dao.AreaDao
import com.techres.ccb.data.local.dao.TableDao
import com.techres.ccb.data.local.entity.AreaEntity
import com.techres.ccb.data.local.entity.TableEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TableRepository @Inject constructor(
    private val areaDao: AreaDao,
    private val tableDao: TableDao
) {
    // Areas
    fun getAllAreas(branchId: String): Flow<List<AreaEntity>> {
        return areaDao.getAllByBranch(branchId)
    }

    fun getActiveAreas(branchId: String): Flow<List<AreaEntity>> {
        return areaDao.getAllByBranch(branchId)
    }

    suspend fun getAreaById(id: String): AreaEntity? {
        return areaDao.getById(id)
    }

    suspend fun syncAreas(branchId: String, areas: List<AreaEntity>) {
        areaDao.syncAreas(branchId, areas)
    }

    // Tables
    fun getAllTables(branchId: String): Flow<List<TableEntity>> {
        return tableDao.getAllByBranch(branchId)
    }

    fun getActiveTables(branchId: String): Flow<List<TableEntity>> {
        return tableDao.getAllByBranch(branchId)
    }

    fun getTablesByArea(branchId: String, areaId: String): Flow<List<TableEntity>> {
        return tableDao.getByAreaAndBranch(branchId, areaId)
    }

    fun getTablesByStatus(branchId: String, status: String): Flow<List<TableEntity>> {
        return tableDao.getByStatus(branchId, status)
    }

    suspend fun getTableById(id: String): TableEntity? {
        return tableDao.getById(id)
    }

    suspend fun syncTables(branchId: String, tables: List<TableEntity>) {
        tableDao.syncTables(branchId, tables)
    }

    suspend fun updateTableStatus(tableId: String, status: String, orderId: String?, updatedAt: String) {
        tableDao.updateStatus(tableId, status, orderId, updatedAt)
    }

    suspend fun getAreasCount(branchId: String): Int {
        return areaDao.getCount(branchId)
    }

    suspend fun getTablesCount(branchId: String): Int {
        return tableDao.getCount(branchId)
    }
}
