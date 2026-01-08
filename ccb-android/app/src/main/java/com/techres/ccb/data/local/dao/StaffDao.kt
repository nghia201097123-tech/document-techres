package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.StaffEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface StaffDao {

    @Query("SELECT * FROM staff WHERE branch_id = :branchId AND is_active = 1 ORDER BY name ASC")
    fun getAllByBranch(branchId: String): Flow<List<StaffEntity>>

    @Query("SELECT * FROM staff WHERE id = :id")
    suspend fun getById(id: String): StaffEntity?

    @Query("SELECT * FROM staff WHERE pin_code = :pinCode AND is_active = 1 LIMIT 1")
    suspend fun getByPinCode(pinCode: String): StaffEntity?

    @Query("SELECT * FROM staff WHERE code = :code AND branch_id = :branchId AND is_active = 1 LIMIT 1")
    suspend fun getByCode(code: String, branchId: String): StaffEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(staff: StaffEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(staffList: List<StaffEntity>)

    @Update
    suspend fun update(staff: StaffEntity)

    @Delete
    suspend fun delete(staff: StaffEntity)

    @Query("DELETE FROM staff WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("UPDATE staff SET is_active = 0 WHERE id = :id")
    suspend fun softDelete(id: String)

    @Query("SELECT COUNT(*) FROM staff WHERE branch_id = :branchId AND is_active = 1")
    suspend fun getCount(branchId: String): Int

    @Transaction
    suspend fun syncStaff(branchId: String, staffList: List<StaffEntity>) {
        deleteAllByBranch(branchId)
        insertAll(staffList)
    }
}
