package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.BrandEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BrandDao {

    @Query("SELECT * FROM brands WHERE is_active = 1 ORDER BY sort_order ASC, name ASC")
    fun getAllActive(): Flow<List<BrandEntity>>

    @Query("SELECT * FROM brands ORDER BY sort_order ASC, name ASC")
    fun getAll(): Flow<List<BrandEntity>>

    @Query("SELECT * FROM brands WHERE id = :id")
    suspend fun getById(id: String): BrandEntity?

    @Query("SELECT * FROM brands WHERE company_id = :companyId AND is_active = 1 ORDER BY sort_order ASC")
    fun getByCompany(companyId: String): Flow<List<BrandEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(brand: BrandEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(brands: List<BrandEntity>)

    @Update
    suspend fun update(brand: BrandEntity)

    @Delete
    suspend fun delete(brand: BrandEntity)

    @Query("DELETE FROM brands")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM brands WHERE is_active = 1")
    suspend fun getCount(): Int

    @Transaction
    suspend fun syncBrands(brands: List<BrandEntity>) {
        deleteAll()
        insertAll(brands)
    }
}
