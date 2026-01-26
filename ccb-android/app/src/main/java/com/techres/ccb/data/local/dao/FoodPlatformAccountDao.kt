package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.techres.ccb.data.local.entity.FoodPlatformAccountEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FoodPlatformAccountDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(account: FoodPlatformAccountEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(accounts: List<FoodPlatformAccountEntity>)

    @Update
    suspend fun update(account: FoodPlatformAccountEntity)

    @Query("SELECT * FROM food_platform_accounts WHERE id = :id")
    suspend fun getById(id: String): FoodPlatformAccountEntity?

    /**
     * Get all active food platform accounts for a branch
     */
    @Query("SELECT * FROM food_platform_accounts WHERE branch_id = :branchId AND is_active = 1 ORDER BY platform, display_name")
    fun getActiveAccounts(branchId: String): Flow<List<FoodPlatformAccountEntity>>

    /**
     * Get all active food platform accounts for a branch (suspend)
     */
    @Query("SELECT * FROM food_platform_accounts WHERE branch_id = :branchId AND is_active = 1 ORDER BY platform, display_name")
    suspend fun getActiveAccountsList(branchId: String): List<FoodPlatformAccountEntity>

    /**
     * Get all connected accounts for a branch
     */
    @Query("SELECT * FROM food_platform_accounts WHERE branch_id = :branchId AND status = 'CONNECTED' AND is_active = 1 ORDER BY platform, display_name")
    suspend fun getConnectedAccounts(branchId: String): List<FoodPlatformAccountEntity>

    /**
     * Get all disconnected accounts for a branch
     */
    @Query("SELECT * FROM food_platform_accounts WHERE branch_id = :branchId AND status = 'DISCONNECTED' AND is_active = 1 ORDER BY platform, display_name")
    suspend fun getDisconnectedAccounts(branchId: String): List<FoodPlatformAccountEntity>

    /**
     * Get all accounts for a branch
     */
    @Query("SELECT * FROM food_platform_accounts WHERE branch_id = :branchId ORDER BY platform, display_name")
    suspend fun getAllByBranch(branchId: String): List<FoodPlatformAccountEntity>

    /**
     * Get accounts by platform
     */
    @Query("SELECT * FROM food_platform_accounts WHERE branch_id = :branchId AND platform = :platform AND is_active = 1")
    suspend fun getByPlatform(branchId: String, platform: String): List<FoodPlatformAccountEntity>

    @Query("DELETE FROM food_platform_accounts WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("DELETE FROM food_platform_accounts")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM food_platform_accounts WHERE branch_id = :branchId AND is_active = 1")
    suspend fun countActive(branchId: String): Int

    @Query("SELECT COUNT(*) FROM food_platform_accounts WHERE branch_id = :branchId AND status = 'CONNECTED' AND is_active = 1")
    suspend fun countConnected(branchId: String): Int

    @Query("SELECT COUNT(*) FROM food_platform_accounts WHERE branch_id = :branchId AND status = 'DISCONNECTED' AND is_active = 1")
    suspend fun countDisconnected(branchId: String): Int

    /**
     * Get all accounts (for debug purposes)
     */
    @Query("SELECT * FROM food_platform_accounts ORDER BY platform, display_name")
    suspend fun getAllForDebug(): List<FoodPlatformAccountEntity>

    /**
     * Update account status after reconnect
     */
    @Query("UPDATE food_platform_accounts SET status = :status, last_error = :lastError, error_count = :errorCount WHERE id = :accountId")
    suspend fun updateStatus(accountId: String, status: String, lastError: String?, errorCount: Int)

    /**
     * Update account username after credentials update
     */
    @Query("UPDATE food_platform_accounts SET username = :username WHERE id = :accountId")
    suspend fun updateUsername(accountId: String, username: String)

    @Transaction
    suspend fun syncFoodPlatformAccounts(branchId: String, accounts: List<FoodPlatformAccountEntity>) {
        // Delete existing accounts for this branch and insert fresh data
        deleteAllByBranch(branchId)
        insertAll(accounts)
    }
}
