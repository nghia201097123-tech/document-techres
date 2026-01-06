package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.TableEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TableDao {

    @Query("SELECT * FROM tables WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getAllByBranch(branchId: String): Flow<List<TableEntity>>

    @Query("SELECT * FROM tables WHERE branch_id = :branchId AND area_id = :areaId AND is_active = 1 ORDER BY sort_order ASC")
    fun getByAreaAndBranch(branchId: String, areaId: String): Flow<List<TableEntity>>

    @Query("SELECT * FROM tables WHERE branch_id = :branchId AND status = :status AND is_active = 1")
    fun getByStatus(branchId: String, status: String): Flow<List<TableEntity>>

    @Query("SELECT * FROM tables WHERE id = :id")
    suspend fun getById(id: String): TableEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(table: TableEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tables: List<TableEntity>)

    @Update
    suspend fun update(table: TableEntity)

    @Query("UPDATE tables SET status = :status, current_order_id = :orderId, updated_at = :updatedAt WHERE id = :tableId")
    suspend fun updateStatus(tableId: String, status: String, orderId: String?, updatedAt: String)

    @Delete
    suspend fun delete(table: TableEntity)

    @Query("DELETE FROM tables WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Transaction
    suspend fun syncTables(branchId: String, tables: List<TableEntity>) {
        deleteAllByBranch(branchId)
        insertAll(tables)
    }
}
