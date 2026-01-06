package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.AreaEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AreaDao {

    @Query("SELECT * FROM areas WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getAllByBranch(branchId: String): Flow<List<AreaEntity>>

    @Query("SELECT * FROM areas WHERE id = :id")
    suspend fun getById(id: String): AreaEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(area: AreaEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(areas: List<AreaEntity>)

    @Update
    suspend fun update(area: AreaEntity)

    @Delete
    suspend fun delete(area: AreaEntity)

    @Query("DELETE FROM areas WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Transaction
    suspend fun syncAreas(branchId: String, areas: List<AreaEntity>) {
        deleteAllByBranch(branchId)
        insertAll(areas)
    }
}
