package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.techres.ccb.data.local.entity.VoucherEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VoucherDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(voucher: VoucherEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(vouchers: List<VoucherEntity>)

    @Update
    suspend fun update(voucher: VoucherEntity)

    @Delete
    suspend fun delete(voucher: VoucherEntity)

    @Query("SELECT * FROM vouchers WHERE id = :id")
    suspend fun getById(id: String): VoucherEntity?

    @Query("SELECT * FROM vouchers WHERE code = :code")
    suspend fun getByCode(code: String): VoucherEntity?

    @Query("SELECT * FROM vouchers WHERE branch_id = :branchId AND is_active = 1 AND deleted_at IS NULL ORDER BY end_date ASC")
    fun getActiveVouchers(branchId: String): Flow<List<VoucherEntity>>

    @Query("""
        SELECT * FROM vouchers
        WHERE branch_id = :branchId
        AND is_active = 1
        AND deleted_at IS NULL
        AND start_date <= :currentTime
        AND end_date >= :currentTime
        ORDER BY end_date ASC
    """)
    fun getValidVouchers(branchId: String, currentTime: Long): Flow<List<VoucherEntity>>

    @Query("""
        SELECT * FROM vouchers
        WHERE code = :code
        AND branch_id = :branchId
        AND is_active = 1
        AND deleted_at IS NULL
        AND start_date <= :currentTime
        AND end_date >= :currentTime
    """)
    suspend fun getValidVoucherByCode(code: String, branchId: String, currentTime: Long): VoucherEntity?

    @Query("UPDATE vouchers SET local_usage_count = local_usage_count + 1 WHERE id = :id")
    suspend fun incrementLocalUsage(id: String)

    @Query("UPDATE vouchers SET local_usage_count = local_usage_count - 1 WHERE id = :id AND local_usage_count > 0")
    suspend fun decrementLocalUsage(id: String)

    @Query("UPDATE vouchers SET server_usage_count = :count, synced_at = :syncedAt WHERE id = :id")
    suspend fun updateServerUsageCount(id: String, count: Int, syncedAt: String)

    @Query("UPDATE vouchers SET is_active = 0, deleted_at = :deletedAt WHERE id = :id")
    suspend fun softDelete(id: String, deletedAt: Long)

    @Query("DELETE FROM vouchers WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("SELECT COUNT(*) FROM vouchers WHERE branch_id = :branchId AND is_active = 1")
    suspend fun countActive(branchId: String): Int
}
