package com.techres.ccb.data.repository

import com.techres.ccb.data.local.dao.KitchenDao
import com.techres.ccb.data.local.entity.KitchenEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class KitchenRepository @Inject constructor(
    private val kitchenDao: KitchenDao
) {
    fun getAllKitchens(branchId: String): Flow<List<KitchenEntity>> {
        return kitchenDao.getAllByBranch(branchId)
    }

    suspend fun getAllKitchensSync(branchId: String): List<KitchenEntity> {
        return kitchenDao.getAllByBranchSync(branchId)
    }

    suspend fun getKitchenById(id: String): KitchenEntity? {
        return kitchenDao.getById(id)
    }

    suspend fun syncKitchens(branchId: String, kitchens: List<KitchenEntity>) {
        kitchenDao.syncKitchens(branchId, kitchens)
    }

    suspend fun updatePrinterConfig(
        kitchenId: String,
        ip: String?,
        port: Int,
        name: String?,
        isConnected: Boolean
    ) {
        kitchenDao.updatePrinterConfig(kitchenId, ip, port, name, isConnected)
    }

    /**
     * Update full printer config including protocol, label size, paper width, print mode and printing configs
     */
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
        printMode: String,
        // Ticket printing config
        ticketCutAfterPrint: Boolean = true,
        ticketPrintItemsSeparately: Boolean = false,
        ticketCopies: Int = 1,
        ticketFontSize: String = "medium",
        // Label printing config
        labelPrintPrice: Boolean = false,
        labelPrintStoreName: Boolean = false,
        labelPrintOrderNumber: Boolean = true,
        labelPrintTableName: Boolean = true,
        labelPrintTime: Boolean = true,
        labelStoreName: String? = null,
        labelReverse: Boolean = false
    ) {
        kitchenDao.updateFullPrinterConfig(
            kitchenId, ip, port, name, isConnected,
            protocol, labelWidthMm, labelHeightMm, labelGapMm, printDensity,
            paperWidth, printMode,
            ticketCutAfterPrint, ticketPrintItemsSeparately, ticketCopies, ticketFontSize,
            labelPrintPrice, labelPrintStoreName, labelPrintOrderNumber,
            labelPrintTableName, labelPrintTime, labelStoreName, labelReverse
        )
    }

    suspend fun getKitchensCount(branchId: String): Int {
        return kitchenDao.getCount(branchId)
    }

    suspend fun clearByBranch(branchId: String) {
        kitchenDao.deleteAllByBranch(branchId)
    }

    /**
     * Insert debug/demo kitchen data for testing
     */
    suspend fun insertDebugKitchens(branchId: String) {
        val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())

        val debugKitchens = listOf(
            KitchenEntity(
                id = "kitchen-debug-1",
                branchId = branchId,
                name = "Bếp chính",
                description = "Bếp nấu món chính",
                kitchenType = "kitchen",
                sortOrder = 1,
                isActive = true,
                printMode = "TICKET",
                paperWidth = 80,
                printerProtocol = "ESCPOS",
                // Ticket config - đầy đủ thông tin
                ticketCutAfterPrint = true,
                ticketPrintItemsSeparately = false,
                ticketCopies = 1,
                ticketPrintOrderNumber = true,
                ticketPrintTableName = true,
                ticketPrintTime = true,
                ticketPrintStoreName = true,
                ticketStoreName = "NHÀ HÀNG DEMO",
                ticketPrintNotes = true,
                ticketFontSize = "medium",
                ticketPrintPrice = true, // In giá món trên phiếu
                // Label config
                labelPrintPrice = false,
                labelPrintStoreName = true,
                labelPrintOrderNumber = true,
                labelPrintTableName = true,
                labelPrintTime = true,
                labelReverse = false,
                createdAt = now,
                updatedAt = now
            ),
            KitchenEntity(
                id = "kitchen-debug-2",
                branchId = branchId,
                name = "Bếp nướng",
                description = "Bếp chế biến món nướng",
                kitchenType = "grill",
                sortOrder = 2,
                isActive = true,
                printMode = "BOTH",
                paperWidth = 80,
                printerProtocol = "ESCPOS",
                // Ticket config - in từng món riêng, cỡ chữ lớn
                ticketCutAfterPrint = true,
                ticketPrintItemsSeparately = true,
                ticketCopies = 2,
                ticketPrintOrderNumber = true,
                ticketPrintTableName = true,
                ticketPrintTime = true,
                ticketPrintStoreName = false,
                ticketStoreName = null,
                ticketPrintNotes = true,
                ticketFontSize = "large",
                ticketPrintPrice = true, // In giá món trên phiếu
                // Label config
                labelPrintPrice = true,
                labelPrintStoreName = true,
                labelPrintOrderNumber = true,
                labelPrintTableName = true,
                labelPrintTime = true,
                labelReverse = false,
                createdAt = now,
                updatedAt = now
            ),
            KitchenEntity(
                id = "kitchen-debug-3",
                branchId = branchId,
                name = "Quầy bar",
                description = "Pha chế đồ uống",
                kitchenType = "bar",
                sortOrder = 3,
                isActive = true,
                printMode = "LABEL",
                paperWidth = 58,
                printerProtocol = "TSPL",
                labelWidthMm = 50,
                labelHeightMm = 30,
                labelGapMm = 3,
                printDensity = 10,
                // Ticket config - cỡ chữ nhỏ
                ticketCutAfterPrint = true,
                ticketPrintItemsSeparately = false,
                ticketCopies = 1,
                ticketPrintOrderNumber = true,
                ticketPrintTableName = true,
                ticketPrintTime = false,
                ticketPrintStoreName = false,
                ticketStoreName = null,
                ticketPrintNotes = true,
                ticketFontSize = "small",
                ticketPrintPrice = false, // Quầy bar không in giá trên phiếu
                // Label config
                labelPrintPrice = true,
                labelPrintStoreName = true,
                labelPrintOrderNumber = true,
                labelPrintTableName = true,
                labelPrintTime = true,
                labelStoreName = "Quầy Bar",
                labelReverse = false,
                createdAt = now,
                updatedAt = now
            ),
            KitchenEntity(
                id = "kitchen-debug-4",
                branchId = branchId,
                name = "Quầy tráng miệng",
                description = "Món tráng miệng và bánh ngọt",
                kitchenType = "dessert",
                sortOrder = 4,
                isActive = true,
                printMode = "LABEL",
                paperWidth = 58,
                printerProtocol = "TSPL",
                labelWidthMm = 40,
                labelHeightMm = 30,
                labelGapMm = 3,
                printDensity = 8,
                // Ticket config - không hiển thị ghi chú
                ticketCutAfterPrint = true,
                ticketPrintItemsSeparately = false,
                ticketCopies = 1,
                ticketPrintOrderNumber = false,
                ticketPrintTableName = true,
                ticketPrintTime = true,
                ticketPrintStoreName = false,
                ticketStoreName = null,
                ticketPrintNotes = false,
                ticketFontSize = "medium",
                ticketPrintPrice = false, // Quầy tráng miệng không in giá trên phiếu
                // Label config
                labelPrintPrice = false,
                labelPrintStoreName = false,
                labelPrintOrderNumber = true,
                labelPrintTableName = true,
                labelPrintTime = true,
                labelReverse = true, // Demo đảo chiều tem
                createdAt = now,
                updatedAt = now
            )
        )

        kitchenDao.insertAll(debugKitchens)
    }
}
