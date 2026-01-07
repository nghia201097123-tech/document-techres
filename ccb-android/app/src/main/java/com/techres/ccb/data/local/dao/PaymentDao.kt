package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.techres.ccb.data.local.entity.PaymentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PaymentDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(payment: PaymentEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(payments: List<PaymentEntity>)

    @Update
    suspend fun update(payment: PaymentEntity)

    @Delete
    suspend fun delete(payment: PaymentEntity)

    @Query("SELECT * FROM payments WHERE id = :id")
    suspend fun getById(id: String): PaymentEntity?

    @Query("SELECT * FROM payments WHERE order_id = :orderId")
    suspend fun getByOrderId(orderId: String): List<PaymentEntity>

    @Query("SELECT * FROM payments WHERE order_id = :orderId")
    fun getByOrderIdFlow(orderId: String): Flow<List<PaymentEntity>>

    @Query("SELECT * FROM payments WHERE shift_id = :shiftId")
    suspend fun getByShiftId(shiftId: String): List<PaymentEntity>

    @Query("SELECT * FROM payments WHERE shift_id = :shiftId")
    fun getByShiftIdFlow(shiftId: String): Flow<List<PaymentEntity>>

    @Query("SELECT * FROM payments WHERE sync_status = :status")
    suspend fun getBySyncStatus(status: String): List<PaymentEntity>

    @Query("SELECT * FROM payments WHERE sync_status IN ('pending', 'failed') ORDER BY paid_at ASC")
    suspend fun getPendingSync(): List<PaymentEntity>

    @Query("SELECT SUM(amount) FROM payments WHERE shift_id = :shiftId AND payment_method = :method AND status = 'completed'")
    suspend fun getTotalByMethodForShift(shiftId: String, method: String): Double?

    @Query("SELECT SUM(amount) FROM payments WHERE shift_id = :shiftId AND status = 'completed'")
    suspend fun getTotalForShift(shiftId: String): Double?

    @Query("SELECT SUM(received_amount) FROM payments WHERE shift_id = :shiftId AND payment_method = 'cash' AND status = 'completed'")
    suspend fun getTotalCashReceivedForShift(shiftId: String): Double?

    @Query("SELECT SUM(change_amount) FROM payments WHERE shift_id = :shiftId AND payment_method = 'cash' AND status = 'completed'")
    suspend fun getTotalChangeForShift(shiftId: String): Double?

    @Query("UPDATE payments SET sync_status = :status, synced_at = :syncedAt, server_id = :serverId WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String, syncedAt: String?, serverId: String?)

    @Query("UPDATE payments SET sync_status = :status, sync_error = :error WHERE id = :id")
    suspend fun updateSyncError(id: String, status: String, error: String?)

    @Query("DELETE FROM payments WHERE order_id = :orderId")
    suspend fun deleteByOrderId(orderId: String)

    @Query("SELECT COUNT(*) FROM payments WHERE shift_id = :shiftId")
    suspend fun countByShiftId(shiftId: String): Int
}
