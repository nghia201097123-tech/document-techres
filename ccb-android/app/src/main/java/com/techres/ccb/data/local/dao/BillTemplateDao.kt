package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.BillTemplateEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BillTemplateDao {

    /**
     * Bill templates are at BRAND level, shared across all branches of a brand
     */
    @Query("SELECT * FROM bill_templates WHERE brand_id = :brandId AND is_active = 1 ORDER BY sort_order ASC")
    fun getAllByBrand(brandId: String): Flow<List<BillTemplateEntity>>

    @Query("SELECT * FROM bill_templates WHERE brand_id = :brandId AND is_active = 1 ORDER BY sort_order ASC")
    suspend fun getAllByBrandSync(brandId: String): List<BillTemplateEntity>

    @Query("SELECT * FROM bill_templates WHERE id = :id")
    suspend fun getById(id: String): BillTemplateEntity?

    @Query("SELECT * FROM bill_templates WHERE id = :id")
    fun getByIdFlow(id: String): Flow<BillTemplateEntity?>

    @Query("SELECT * FROM bill_templates WHERE brand_id = :brandId AND is_default = 1 LIMIT 1")
    suspend fun getDefaultByBrand(brandId: String): BillTemplateEntity?

    @Query("SELECT * FROM bill_templates WHERE brand_id = :brandId AND is_default = 1 LIMIT 1")
    fun getDefaultByBrandFlow(brandId: String): Flow<BillTemplateEntity?>

    @Query("SELECT * FROM bill_templates WHERE brand_id = :brandId AND template_type = :templateType AND is_active = 1 ORDER BY sort_order ASC")
    suspend fun getByTemplateType(brandId: String, templateType: String): List<BillTemplateEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(template: BillTemplateEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(templates: List<BillTemplateEntity>)

    @Update
    suspend fun update(template: BillTemplateEntity)

    @Delete
    suspend fun delete(template: BillTemplateEntity)

    @Query("DELETE FROM bill_templates WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM bill_templates WHERE brand_id = :brandId")
    suspend fun deleteByBrand(brandId: String)

    @Query("UPDATE bill_templates SET is_default = 0 WHERE brand_id = :brandId")
    suspend fun clearDefaultByBrand(brandId: String)

    @Query("UPDATE bill_templates SET is_default = 1 WHERE id = :id")
    suspend fun setDefault(id: String)

    @Transaction
    suspend fun setAsDefault(brandId: String, templateId: String) {
        clearDefaultByBrand(brandId)
        setDefault(templateId)
    }

    @Query("SELECT COUNT(*) FROM bill_templates WHERE brand_id = :brandId")
    suspend fun getCount(brandId: String): Int

    @Query("SELECT COUNT(*) FROM bill_templates WHERE brand_id = :brandId AND is_active = 1")
    suspend fun getActiveCount(brandId: String): Int
}
