package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.techres.ccb.data.local.entity.SurchargeEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SurchargeDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(surcharge: SurchargeEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(surcharges: List<SurchargeEntity>)

    @Update
    suspend fun update(surcharge: SurchargeEntity)

    @Query("SELECT * FROM surcharges WHERE id = :id")
    suspend fun getById(id: String): SurchargeEntity?

    @Query("SELECT * FROM surcharges WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getActiveSurcharges(branchId: String): Flow<List<SurchargeEntity>>

    @Query("SELECT * FROM surcharges WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    suspend fun getActiveSurchargesList(branchId: String): List<SurchargeEntity>

    @Query("SELECT * FROM surcharges WHERE branch_id = :branchId ORDER BY sort_order ASC")
    suspend fun getAllByBranch(branchId: String): List<SurchargeEntity>

    @Query("DELETE FROM surcharges WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("SELECT COUNT(*) FROM surcharges WHERE branch_id = :branchId AND is_active = 1")
    suspend fun countActive(branchId: String): Int

    @Transaction
    suspend fun syncSurcharges(branchId: String, surcharges: List<SurchargeEntity>) {
        deleteAllByBranch(branchId)
        insertAll(surcharges)
    }
}
