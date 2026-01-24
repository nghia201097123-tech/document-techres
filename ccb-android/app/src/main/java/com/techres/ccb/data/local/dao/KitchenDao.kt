package com.techres.ccb.data.local.dao

import androidx.room.*
import com.techres.ccb.data.local.entity.KitchenEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface KitchenDao {

    @Query("SELECT * FROM kitchens WHERE branch_id = :branchId ORDER BY sort_order ASC")
    fun getAllByBranch(branchId: String): Flow<List<KitchenEntity>>

    @Query("SELECT * FROM kitchens WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getActiveByBranch(branchId: String): Flow<List<KitchenEntity>>

    @Query("SELECT * FROM kitchens WHERE branch_id = :branchId ORDER BY sort_order ASC")
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

    @Query("UPDATE kitchens SET is_active = :isActive WHERE id = :kitchenId")
    suspend fun updateActiveStatus(kitchenId: String, isActive: Boolean)

    @Query("UPDATE kitchens SET printer_ip = :ip, printer_port = :port, printer_name = :name, is_printer_connected = :isConnected WHERE id = :kitchenId")
    suspend fun updatePrinterConfig(kitchenId: String, ip: String?, port: Int, name: String?, isConnected: Boolean)

    @Query("""
        UPDATE kitchens SET
            connection_type = :connectionType,
            printer_ip = :printerIp,
            printer_port = :printerPort,
            printer_protocol = :printerProtocol,
            label_print_price = :labelPrintPrice,
            label_print_store_name = :labelPrintStoreName,
            label_print_order_number = :labelPrintOrderNumber,
            label_print_table_name = :labelPrintTableName,
            label_print_time = :labelPrintTime,
            label_store_name = :labelStoreName,
            label_reverse = :labelReverse,
            label_width_mm = :labelWidthMm,
            label_height_mm = :labelHeightMm,
            label_gap_mm = :labelGapMm,
            label_font_scale = :labelFontScale,
            label_max_toppings = :labelMaxToppings,
            label_line_spacing = :labelLineSpacing
        WHERE id = :kitchenId
    """)
    suspend fun updateLabelSettings(
        kitchenId: String,
        connectionType: String, // "network", "usb", "sunmi"
        printerIp: String?,
        printerPort: Int,
        printerProtocol: String,
        labelPrintPrice: Boolean,
        labelPrintStoreName: Boolean,
        labelPrintOrderNumber: Boolean,
        labelPrintTableName: Boolean,
        labelPrintTime: Boolean,
        labelStoreName: String?,
        labelReverse: Boolean,
        labelWidthMm: Int,
        labelHeightMm: Int,
        labelGapMm: Int,
        labelFontScale: Float,
        labelMaxToppings: Int,
        labelLineSpacing: Float
    )

    @Query("""
        UPDATE kitchens SET
            connection_type = :connectionType,
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
            print_mode = :printMode,
            ticket_cut_after_print = :ticketCutAfterPrint,
            ticket_print_items_separately = :ticketPrintItemsSeparately,
            ticket_copies = :ticketCopies,
            ticket_font_size = :ticketFontSize,
            ticket_line_spacing = :ticketLineSpacing,
            ticket_print_order_number = :ticketPrintOrderNumber,
            ticket_print_table_name = :ticketPrintTableName,
            ticket_print_time = :ticketPrintTime,
            ticket_print_notes = :ticketPrintNotes,
            ticket_print_price = :ticketPrintPrice,
            ticket_print_store_name = :ticketPrintStoreName,
            ticket_store_name = :ticketStoreName,
            label_print_price = :labelPrintPrice,
            label_print_store_name = :labelPrintStoreName,
            label_print_order_number = :labelPrintOrderNumber,
            label_print_table_name = :labelPrintTableName,
            label_print_time = :labelPrintTime,
            label_store_name = :labelStoreName,
            label_reverse = :labelReverse,
            label_font_scale = :labelFontScale,
            label_max_toppings = :labelMaxToppings,
            label_line_spacing = :labelLineSpacing
        WHERE id = :kitchenId
    """)
    suspend fun updateFullPrinterConfig(
        kitchenId: String,
        connectionType: String, // "network", "usb", "sunmi"
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
        printMode: String,
        // Ticket printing config
        ticketCutAfterPrint: Boolean,
        ticketPrintItemsSeparately: Boolean,
        ticketCopies: Int,
        ticketFontSize: String,
        ticketLineSpacing: Float,
        ticketPrintOrderNumber: Boolean,
        ticketPrintTableName: Boolean,
        ticketPrintTime: Boolean,
        ticketPrintNotes: Boolean,
        ticketPrintPrice: Boolean,
        ticketPrintStoreName: Boolean,
        ticketStoreName: String?,
        // Label printing config
        labelPrintPrice: Boolean,
        labelPrintStoreName: Boolean,
        labelPrintOrderNumber: Boolean,
        labelPrintTableName: Boolean,
        labelPrintTime: Boolean,
        labelStoreName: String?,
        labelReverse: Boolean,
        labelFontScale: Float,
        labelMaxToppings: Int,
        labelLineSpacing: Float
    )

    @Transaction
    suspend fun syncKitchens(branchId: String, kitchens: List<KitchenEntity>) {
        // Get existing printer configs before syncing
        val existingKitchens = getAllByBranchSync(branchId).associateBy { it.id }

        deleteAllByBranch(branchId)

        // Smart merge: preserve LOCAL device settings, use API for business settings
        val kitchensWithConfig = kitchens.map { kitchen ->
            val existing = existingKitchens[kitchen.id]
            if (existing != null) {
                kitchen.copy(
                    // LOCAL device settings - preserve from local (configured on device)
                    printerIp = existing.printerIp ?: kitchen.printerIp,
                    printerPort = if (existing.printerIp != null) existing.printerPort else kitchen.printerPort,
                    printerName = existing.printerName ?: kitchen.printerName,
                    isPrinterConnected = existing.isPrinterConnected
                    // BUSINESS settings - use API value (configured on dashboard)
                    // printMode, printerProtocol, paperWidth, label settings come from kitchen (API)
                )
            } else {
                kitchen
            }
        }

        insertAll(kitchensWithConfig)
    }
}
