package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.techres.ccb.data.local.entity.SeasonalPriceProductEntity

@Dao
interface SeasonalPriceProductDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(seasonalPriceProduct: SeasonalPriceProductEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(seasonalPriceProducts: List<SeasonalPriceProductEntity>)

    @Query("SELECT * FROM seasonal_price_products WHERE seasonal_price_id = :seasonalPriceId")
    suspend fun getBySeasonalPriceId(seasonalPriceId: String): List<SeasonalPriceProductEntity>

    @Query("SELECT * FROM seasonal_price_products WHERE product_id = :productId")
    suspend fun getByProductId(productId: String): List<SeasonalPriceProductEntity>

    @Query("DELETE FROM seasonal_price_products WHERE seasonal_price_id = :seasonalPriceId")
    suspend fun deleteBySeasonalPriceId(seasonalPriceId: String)

    @Query("DELETE FROM seasonal_price_products WHERE seasonal_price_id IN (SELECT id FROM seasonal_prices WHERE branch_id = :branchId)")
    suspend fun deleteAllByBranch(branchId: String)

    @Transaction
    suspend fun syncSeasonalPriceProducts(branchId: String, products: List<SeasonalPriceProductEntity>) {
        deleteAllByBranch(branchId)
        insertAll(products)
    }
}
