package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.KitchenEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface KitchenDao {

    @Query("SELECT * FROM kitchens WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getAllByBranch(branchId: String): Flow<List<KitchenEntity>>

    @Query("SELECT * FROM kitchens WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    suspend fun getAllByBranchSync(branchId: String): List<KitchenEntity>

    @Query("SELECT * FROM kitchens WHERE id = :id")
    suspend fun getById(id: String): KitchenEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(kitchen: KitchenEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(kitchens: List<KitchenEntity>)

    @Update
    suspend fun update(kitchen: KitchenEntity)

    @Delete
    suspend fun delete(kitchen: KitchenEntity)

    @Query("DELETE FROM kitchens WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("SELECT COUNT(*) FROM kitchens WHERE branch_id = :branchId AND is_active = 1")
    suspend fun getCount(branchId: String): Int

    @Query("UPDATE kitchens SET printer_ip = :ip, printer_port = :port, printer_name = :name, is_printer_connected = :isConnected WHERE id = :kitchenId")
    suspend fun updatePrinterConfig(kitchenId: String, ip: String?, port: Int, name: String?, isConnected: Boolean)

    @Query("""
        UPDATE kitchens SET
            printer_ip = :ip,
            printer_port = :port,
            printer_name = :name,
            is_printer_connected = :isConnected,
            printer_protocol = :protocol,
            label_width_mm = :labelWidthMm,
            label_height_mm = :labelHeightMm,
            label_gap_mm = :labelGapMm,
            print_density = :printDensity,
            paper_width = :paperWidth,
            print_mode = :printMode
        WHERE id = :kitchenId
    """)
    suspend fun updateFullPrinterConfig(
        kitchenId: String,
        ip: String?,
        port: Int,
        name: String?,
        isConnected: Boolean,
        protocol: String,
        labelWidthMm: Int,
        labelHeightMm: Int,
        labelGapMm: Int,
        printDensity: Int,
        paperWidth: Int,
        printMode: String
    )

    @Transaction
    suspend fun syncKitchens(branchId: String, kitchens: List<KitchenEntity>) {
        // Get existing printer configs before syncing
        val existingKitchens = getAllByBranchSync(branchId).associateBy { it.id }

        deleteAllByBranch(branchId)

        // Preserve all printer config from existing kitchens
        val kitchensWithPrinterConfig = kitchens.map { kitchen ->
            val existing = existingKitchens[kitchen.id]
            if (existing != null) {
                kitchen.copy(
                    printerIp = existing.printerIp,
                    printerPort = existing.printerPort,
                    printerName = existing.printerName,
                    isPrinterConnected = existing.isPrinterConnected,
                    printerProtocol = existing.printerProtocol,
                    labelWidthMm = existing.labelWidthMm,
                    labelHeightMm = existing.labelHeightMm,
                    labelGapMm = existing.labelGapMm,
                    printDensity = existing.printDensity,
                    paperWidth = existing.paperWidth,
                    printMode = existing.printMode
                )
            } else {
                kitchen
            }
        }

        insertAll(kitchensWithPrinterConfig)
    }
}
