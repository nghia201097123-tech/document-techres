package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.BillTemplateEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BillTemplateDao {

    @Query("SELECT * FROM bill_templates WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getAllByBranch(branchId: String): Flow<List<BillTemplateEntity>>

    @Query("SELECT * FROM bill_templates WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    suspend fun getAllByBranchSync(branchId: String): List<BillTemplateEntity>

    @Query("SELECT * FROM bill_templates WHERE id = :id")
    suspend fun getById(id: String): BillTemplateEntity?

    @Query("SELECT * FROM bill_templates WHERE id = :id")
    fun getByIdFlow(id: String): Flow<BillTemplateEntity?>

    @Query("SELECT * FROM bill_templates WHERE branch_id = :branchId AND is_default = 1 LIMIT 1")
    suspend fun getDefaultByBranch(branchId: String): BillTemplateEntity?

    @Query("SELECT * FROM bill_templates WHERE branch_id = :branchId AND is_default = 1 LIMIT 1")
    fun getDefaultByBranchFlow(branchId: String): Flow<BillTemplateEntity?>

    @Query("SELECT * FROM bill_templates WHERE branch_id = :branchId AND template_type = :templateType AND is_active = 1 ORDER BY sort_order ASC")
    suspend fun getByTemplateType(branchId: String, templateType: String): List<BillTemplateEntity>

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

    @Query("DELETE FROM bill_templates WHERE branch_id = :branchId")
    suspend fun deleteByBranch(branchId: String)

    @Query("UPDATE bill_templates SET is_default = 0 WHERE branch_id = :branchId")
    suspend fun clearDefaultByBranch(branchId: String)

    @Query("UPDATE bill_templates SET is_default = 1 WHERE id = :id")
    suspend fun setDefault(id: String)

    @Transaction
    suspend fun setAsDefault(branchId: String, templateId: String) {
        clearDefaultByBranch(branchId)
        setDefault(templateId)
    }

    @Query("SELECT COUNT(*) FROM bill_templates WHERE branch_id = :branchId")
    suspend fun getCount(branchId: String): Int

    @Query("SELECT COUNT(*) FROM bill_templates WHERE branch_id = :branchId AND is_active = 1")
    suspend fun getActiveCount(branchId: String): Int
}
