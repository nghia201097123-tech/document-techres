package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.BranchEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BranchDao {

    @Query("SELECT * FROM branches WHERE is_active = 1 ORDER BY sort_order ASC, name ASC")
    fun getAllActive(): Flow<List<BranchEntity>>

    @Query("SELECT * FROM branches ORDER BY sort_order ASC, name ASC")
    fun getAll(): Flow<List<BranchEntity>>

    @Query("SELECT * FROM branches WHERE id = :id")
    suspend fun getById(id: String): BranchEntity?

    @Query("SELECT * FROM branches WHERE brand_id = :brandId AND is_active = 1 ORDER BY sort_order ASC, name ASC")
    fun getByBrand(brandId: String): Flow<List<BranchEntity>>

    @Query("SELECT * FROM branches WHERE brand_id = :brandId AND is_active = 1 ORDER BY sort_order ASC, name ASC")
    suspend fun getByBrandSync(brandId: String): List<BranchEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(branch: BranchEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(branches: List<BranchEntity>)

    @Update
    suspend fun update(branch: BranchEntity)

    @Delete
    suspend fun delete(branch: BranchEntity)

    @Query("DELETE FROM branches")
    suspend fun deleteAll()

    @Query("DELETE FROM branches WHERE brand_id = :brandId")
    suspend fun deleteByBrand(brandId: String)

    @Query("SELECT COUNT(*) FROM branches WHERE is_active = 1")
    suspend fun getCount(): Int

    @Query("SELECT COUNT(*) FROM branches WHERE brand_id = :brandId AND is_active = 1")
    suspend fun getCountByBrand(brandId: String): Int

    @Transaction
    suspend fun syncBranches(branches: List<BranchEntity>) {
        deleteAll()
        insertAll(branches)
    }

    @Transaction
    suspend fun syncBranchesByBrand(brandId: String, branches: List<BranchEntity>) {
        deleteByBrand(brandId)
        insertAll(branches)
    }
}
