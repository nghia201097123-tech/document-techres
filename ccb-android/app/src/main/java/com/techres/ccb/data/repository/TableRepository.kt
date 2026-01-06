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
        return areaDao.getAllAreas(branchId)
    }

    fun getActiveAreas(branchId: String): Flow<List<AreaEntity>> {
        return areaDao.getActiveAreas(branchId)
    }

    suspend fun syncAreas(branchId: String, areas: List<AreaEntity>) {
        areaDao.syncAreas(branchId, areas)
    }

    // Tables
    fun getAllTables(branchId: String): Flow<List<TableEntity>> {
        return tableDao.getAllTables(branchId)
    }

    fun getActiveTables(branchId: String): Flow<List<TableEntity>> {
        return tableDao.getActiveTables(branchId)
    }

    fun getTablesByArea(areaId: String): Flow<List<TableEntity>> {
        return tableDao.getTablesByArea(areaId)
    }

    suspend fun getTableById(id: String): TableEntity? {
        return tableDao.getTableById(id)
    }

    suspend fun syncTables(branchId: String, tables: List<TableEntity>) {
        tableDao.syncTables(branchId, tables)
    }

    suspend fun updateTableStatus(tableId: String, status: String) {
        tableDao.updateTableStatus(tableId, status)
    }
}
