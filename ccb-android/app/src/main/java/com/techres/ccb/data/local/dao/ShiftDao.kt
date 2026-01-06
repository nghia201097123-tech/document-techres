package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.ShiftEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ShiftDao {

    @Query("SELECT * FROM shifts WHERE branch_id = :branchId ORDER BY opened_at DESC")
    fun getAllByBranch(branchId: String): Flow<List<ShiftEntity>>

    @Query("SELECT * FROM shifts WHERE branch_id = :branchId AND status = 'open' LIMIT 1")
    suspend fun getCurrentOpenShift(branchId: String): ShiftEntity?

    @Query("SELECT * FROM shifts WHERE branch_id = :branchId AND status = 'open' LIMIT 1")
    fun observeCurrentOpenShift(branchId: String): Flow<ShiftEntity?>

    @Query("SELECT * FROM shifts WHERE id = :id")
    suspend fun getById(id: String): ShiftEntity?

    @Query("SELECT * FROM shifts WHERE sync_status = 'pending' OR sync_status = 'failed' ORDER BY opened_at ASC")
    suspend fun getPendingSyncShifts(): List<ShiftEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(shift: ShiftEntity)

    @Update
    suspend fun update(shift: ShiftEntity)

    @Query("""
        UPDATE shifts SET
            status = 'closed',
            closing_amount = :closingAmount,
            expected_amount = :expectedAmount,
            difference_amount = :differenceAmount,
            total_orders = :totalOrders,
            total_revenue = :totalRevenue,
            cash_revenue = :cashRevenue,
            card_revenue = :cardRevenue,
            transfer_revenue = :transferRevenue,
            other_revenue = :otherRevenue,
            total_discount = :totalDiscount,
            notes = :notes,
            closed_at = :closedAt,
            updated_at = :updatedAt,
            sync_status = 'pending'
        WHERE id = :shiftId
    """)
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
    )

    @Query("UPDATE shifts SET sync_status = :syncStatus, synced_at = :syncedAt, retry_count = :retryCount WHERE id = :shiftId")
    suspend fun updateSyncStatus(shiftId: String, syncStatus: String, syncedAt: String?, retryCount: Int)

    @Delete
    suspend fun delete(shift: ShiftEntity)
}
