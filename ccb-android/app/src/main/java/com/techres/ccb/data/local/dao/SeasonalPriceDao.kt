package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.techres.ccb.data.local.entity.SeasonalPriceEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SeasonalPriceDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(seasonalPrice: SeasonalPriceEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(seasonalPrices: List<SeasonalPriceEntity>)

    @Query("SELECT * FROM seasonal_prices WHERE id = :id")
    suspend fun getById(id: String): SeasonalPriceEntity?

    @Query("SELECT * FROM seasonal_prices WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getActiveSeasonalPrices(branchId: String): Flow<List<SeasonalPriceEntity>>

    @Query("""
        SELECT * FROM seasonal_prices
        WHERE branch_id = :branchId
        AND is_active = 1
        AND start_date <= :currentDate
        AND end_date >= :currentDate
        ORDER BY sort_order ASC
    """)
    suspend fun getValidSeasonalPrices(branchId: String, currentDate: String): List<SeasonalPriceEntity>

    @Query("DELETE FROM seasonal_prices WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("SELECT COUNT(*) FROM seasonal_prices WHERE branch_id = :branchId AND is_active = 1")
    suspend fun countActive(branchId: String): Int

    @Transaction
    suspend fun syncSeasonalPrices(branchId: String, seasonalPrices: List<SeasonalPriceEntity>) {
        deleteAllByBranch(branchId)
        insertAll(seasonalPrices)
    }
}
