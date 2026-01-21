package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.techres.ccb.data.local.entity.BankAccountEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BankAccountDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(bankAccount: BankAccountEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(bankAccounts: List<BankAccountEntity>)

    @Update
    suspend fun update(bankAccount: BankAccountEntity)

    @Query("SELECT * FROM bank_accounts WHERE id = :id")
    suspend fun getById(id: String): BankAccountEntity?

    /**
     * Get all active bank accounts for a branch
     */
    @Query("SELECT * FROM bank_accounts WHERE branch_id = :branchId AND is_active = 1 ORDER BY is_primary DESC")
    fun getActiveBankAccounts(branchId: String): Flow<List<BankAccountEntity>>

    /**
     * Get all active bank accounts for a branch (suspend)
     */
    @Query("SELECT * FROM bank_accounts WHERE branch_id = :branchId AND is_active = 1 ORDER BY is_primary DESC")
    suspend fun getActiveBankAccountsList(branchId: String): List<BankAccountEntity>

    /**
     * Get the primary bank account for a branch
     * Falls back to first active account if no primary is set
     */
    @Query("SELECT * FROM bank_accounts WHERE branch_id = :branchId AND is_active = 1 ORDER BY is_primary DESC LIMIT 1")
    suspend fun getPrimaryBankAccount(branchId: String): BankAccountEntity?

    /**
     * Get all bank accounts for a branch
     */
    @Query("SELECT * FROM bank_accounts WHERE branch_id = :branchId ORDER BY is_primary DESC")
    suspend fun getAllByBranch(branchId: String): List<BankAccountEntity>

    @Query("DELETE FROM bank_accounts WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("SELECT COUNT(*) FROM bank_accounts WHERE branch_id = :branchId AND is_active = 1")
    suspend fun countActive(branchId: String): Int

    @Transaction
    suspend fun syncBankAccounts(branchId: String, bankAccounts: List<BankAccountEntity>) {
        deleteAllByBranch(branchId)
        insertAll(bankAccounts)
    }
}
