package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BillPrinterConfigDao {

    // Get ALL printers (for UI - show both enabled and disabled)
    @Query("SELECT * FROM bill_printer_configs WHERE branch_id = :branchId ORDER BY sort_order ASC")
    fun getAllByBranch(branchId: String): Flow<List<BillPrinterConfigEntity>>

    @Query("SELECT * FROM bill_printer_configs WHERE branch_id = :branchId ORDER BY sort_order ASC")
    suspend fun getAllByBranchSync(branchId: String): List<BillPrinterConfigEntity>

    // Get only ACTIVE printers (for printing)
    @Query("SELECT * FROM bill_printer_configs WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getActiveByBranch(branchId: String): Flow<List<BillPrinterConfigEntity>>

    @Query("SELECT * FROM bill_printer_configs WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    suspend fun getActiveByBranchSync(branchId: String): List<BillPrinterConfigEntity>

    @Query("SELECT * FROM bill_printer_configs WHERE id = :id")
    suspend fun getById(id: String): BillPrinterConfigEntity?

    @Query("SELECT * FROM bill_printer_configs WHERE id = :id")
    fun getByIdFlow(id: String): Flow<BillPrinterConfigEntity?>

    // Get ACTIVE default printer (cho việc in thực tế)
    @Query("SELECT * FROM bill_printer_configs WHERE branch_id = :branchId AND is_default = 1 AND is_active = 1 LIMIT 1")
    suspend fun getDefaultByBranch(branchId: String): BillPrinterConfigEntity?

    @Query("SELECT * FROM bill_printer_configs WHERE branch_id = :branchId AND is_default = 1 AND is_active = 1 LIMIT 1")
    fun getDefaultByBranchFlow(branchId: String): Flow<BillPrinterConfigEntity?>

    // Fallback: Get first ACTIVE printer if no active default (sorted by sort_order)
    @Query("SELECT * FROM bill_printer_configs WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC LIMIT 1")
    suspend fun getFirstActiveByBranch(branchId: String): BillPrinterConfigEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(config: BillPrinterConfigEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(configs: List<BillPrinterConfigEntity>)

    @Update
    suspend fun update(config: BillPrinterConfigEntity)

    @Delete
    suspend fun delete(config: BillPrinterConfigEntity)

    @Query("DELETE FROM bill_printer_configs WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM bill_printer_configs WHERE branch_id = :branchId")
    suspend fun deleteByBranch(branchId: String)

    @Query("UPDATE bill_printer_configs SET is_default = 0 WHERE branch_id = :branchId")
    suspend fun clearDefaultByBranch(branchId: String)

    @Query("UPDATE bill_printer_configs SET is_default = 1 WHERE id = :id")
    suspend fun setDefault(id: String)

    @Transaction
    suspend fun setAsDefault(branchId: String, configId: String) {
        clearDefaultByBranch(branchId)
        setDefault(configId)
    }

    // Update connection status
    @Query("UPDATE bill_printer_configs SET is_connected = :isConnected WHERE id = :id")
    suspend fun updateConnectionStatus(id: String, isConnected: Boolean)

    // Update last print info
    @Query("UPDATE bill_printer_configs SET last_print_at = :lastPrintAt, last_error = NULL WHERE id = :id")
    suspend fun updateLastPrint(id: String, lastPrintAt: String)

    // Update last error
    @Query("UPDATE bill_printer_configs SET last_error = :error WHERE id = :id")
    suspend fun updateLastError(id: String, error: String)

    // Update printer IP and port (local config)
    @Query("UPDATE bill_printer_configs SET printer_ip = :ip, printer_port = :port WHERE id = :id")
    suspend fun updatePrinterAddress(id: String, ip: String, port: Int)

    // Update template
    @Query("UPDATE bill_printer_configs SET template_id = :templateId WHERE id = :id")
    suspend fun updateTemplate(id: String, templateId: String?)

    // Update paper width
    @Query("UPDATE bill_printer_configs SET paper_width = :paperWidth WHERE id = :id")
    suspend fun updatePaperWidth(id: String, paperWidth: Int)

    // Update font size
    @Query("UPDATE bill_printer_configs SET font_size = :fontSize WHERE id = :id")
    suspend fun updateFontSize(id: String, fontSize: String)

    // Update line spacing
    @Query("UPDATE bill_printer_configs SET line_spacing = :lineSpacing WHERE id = :id")
    suspend fun updateLineSpacing(id: String, lineSpacing: Float)

    // Update number of copies
    @Query("UPDATE bill_printer_configs SET number_of_copies = :numberOfCopies WHERE id = :id")
    suspend fun updateNumberOfCopies(id: String, numberOfCopies: Int)

    @Query("SELECT COUNT(*) FROM bill_printer_configs WHERE branch_id = :branchId")
    suspend fun getCount(branchId: String): Int

    @Query("SELECT COUNT(*) FROM bill_printer_configs WHERE branch_id = :branchId AND is_active = 1")
    suspend fun getActiveCount(branchId: String): Int
}
