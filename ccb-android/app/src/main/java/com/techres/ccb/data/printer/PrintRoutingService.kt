package com.techres.ccb.data.printer

import android.util.Log
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.KitchenPrintMode
import kotlinx.coroutines.*
import java.util.*

/**
 * Print Routing Service - Điều phối in đơn hàng đến nhiều bếp
 *
 * Flow:
 * 1. Nhận đơn hàng với danh sách items
 * 2. Group items theo bếp (dựa trên product-kitchen mapping)
 * 3. Với mỗi bếp: in TICKET và/hoặc LABEL tùy theo printMode
 * 4. In song song đến tất cả bếp
 *
 * Hỗ trợ: 1 món có thể in đến NHIỀU bếp
 */
object PrintRoutingService {
    private const val TAG = "PrintRoutingService"

    /**
     * Data class cho item trong đơn hàng
     */
    data class OrderItem(
        val productId: String,
        val productName: String,
        val productCode: String? = null,
        val quantity: Int,
        val note: String? = null,
        val toppings: List<ToppingInfo> = emptyList(),
        val options: Map<String, String> = emptyMap(), // Size, Đường, Đá...
        val kitchenIds: List<String> = emptyList() // Danh sách bếp cần in (1 món có thể in nhiều bếp)
    )

    data class ToppingInfo(
        val name: String,
        val price: Double = 0.0
    )

    /**
     * Data class cho đơn hàng
     */
    data class OrderPrintData(
        val orderNumber: String,
        val tableName: String?,
        val staffName: String?,
        val orderTime: Date = Date(),
        val items: List<OrderItem>,
        val note: String? = null,
        val isUrgent: Boolean = false,
        val ticketType: String = "NEW" // NEW, MODIFIED, CANCELLED
    )

    /**
     * Kết quả in cho từng bếp
     */
    data class KitchenPrintResult(
        val kitchenId: String,
        val kitchenName: String,
        val ticketResult: PrinterResult?,
        val labelResult: PrinterResult?,
        val itemCount: Int
    )

    /**
     * Kết quả tổng hợp
     */
    data class RoutingResult(
        val success: Boolean,
        val message: String,
        val kitchenResults: List<KitchenPrintResult>,
        val totalKitchens: Int,
        val successfulKitchens: Int
    )

    /**
     * Route và in đơn hàng đến các bếp
     *
     * @param order Thông tin đơn hàng
     * @param kitchens Danh sách tất cả bếp (đã lọc active)
     * @param productKitchenMap Map<ProductId, List<KitchenId>> - mapping món -> bếp
     * @param skipLabels Bỏ qua in tem (dùng cho in lại phiếu bếp mà không in tem)
     */
    suspend fun routeAndPrint(
        order: OrderPrintData,
        kitchens: List<KitchenEntity>,
        productKitchenMap: Map<String, List<String>>,
        skipLabels: Boolean = false
    ): RoutingResult = withContext(Dispatchers.IO) {

        Log.d(TAG, "Routing order #${order.orderNumber} with ${order.items.size} items")

        // 1. Group items theo kitchen
        val kitchenItemsMap = groupItemsByKitchen(order.items, productKitchenMap)

        if (kitchenItemsMap.isEmpty()) {
            return@withContext RoutingResult(
                success = false,
                message = "Không có món nào được gán bếp",
                kitchenResults = emptyList(),
                totalKitchens = 0,
                successfulKitchens = 0
            )
        }

        Log.d(TAG, "Grouped into ${kitchenItemsMap.size} kitchens")

        // 2. Find FIRST kitchen that can print labels (to print labels only once)
        // Labels are for customer identification, not kitchen coordination
        // So we only need to print labels once, not for each kitchen
        // If skipLabels = true, don't print labels at all (for reprint kitchen tickets only)
        val labelPrintKitchenId = if (skipLabels) {
            null
        } else {
            kitchenItemsMap.keys.firstOrNull { kitchenId ->
                val kitchen = kitchens.find { it.id == kitchenId }
                kitchen != null && kitchen.isActive && kitchen.shouldPrintLabel()
            }
        }

        Log.d(TAG, "Label print kitchen: ${labelPrintKitchenId ?: "NONE"} (skipLabels=$skipLabels)")

        // 3. In song song đến các bếp
        val results = kitchenItemsMap.map { (kitchenId, items) ->
            async {
                val kitchen = kitchens.find { it.id == kitchenId }
                if (kitchen == null || !kitchen.isActive) {
                    return@async KitchenPrintResult(
                        kitchenId = kitchenId,
                        kitchenName = "Unknown",
                        ticketResult = PrinterResult.Error("Bếp không tồn tại hoặc không hoạt động"),
                        labelResult = null,
                        itemCount = items.size
                    )
                }

                // Only print labels for the designated label kitchen
                // Other kitchens only print tickets
                val shouldPrintLabels = kitchenId == labelPrintKitchenId
                printToKitchen(kitchen, order, items, printLabelsOverride = shouldPrintLabels)
            }
        }.awaitAll()

        // 4. Tổng hợp kết quả
        val successfulKitchens = results.count { result ->
            (result.ticketResult as? PrinterResult.Success) != null ||
            (result.labelResult as? PrinterResult.Success) != null
        }

        val message = buildResultMessage(results)

        RoutingResult(
            success = successfulKitchens > 0,
            message = message,
            kitchenResults = results,
            totalKitchens = results.size,
            successfulKitchens = successfulKitchens
        )
    }

    /**
     * Group items theo kitchen
     * Lưu ý: 1 item có thể xuất hiện ở nhiều kitchen
     */
    private fun groupItemsByKitchen(
        items: List<OrderItem>,
        productKitchenMap: Map<String, List<String>>
    ): Map<String, List<OrderItem>> {
        val result = mutableMapOf<String, MutableList<OrderItem>>()

        items.forEach { item ->
            // Lấy danh sách bếp từ item hoặc từ mapping
            val kitchenIds = item.kitchenIds.ifEmpty {
                productKitchenMap[item.productId] ?: emptyList()
            }

            // Thêm item vào từng bếp (distinct để tránh trùng lặp nếu kitchenIds có duplicate)
            kitchenIds.distinct().forEach { kitchenId ->
                result.getOrPut(kitchenId) { mutableListOf() }.add(item)
            }
        }

        return result
    }

    /**
     * In đến 1 bếp cụ thể (cả ticket và/hoặc label)
     *
     * @param kitchen Bếp cần in
     * @param order Thông tin order
     * @param items Danh sách items
     * @param printLabelsOverride Override label printing decision:
     *        - true: print labels (if kitchen supports it)
     *        - false: skip labels even if kitchen supports it
     *        - Used to ensure labels are printed only once across all kitchens
     */
    private suspend fun printToKitchen(
        kitchen: KitchenEntity,
        order: OrderPrintData,
        items: List<OrderItem>,
        printLabelsOverride: Boolean = true
    ): KitchenPrintResult {
        Log.d(TAG, "=== printToKitchen START ===")
        Log.d(TAG, "Kitchen: ${kitchen.name} (${kitchen.id})")
        Log.d(TAG, "  printMode: '${kitchen.printMode}'")
        Log.d(TAG, "  shouldPrintTicket(): ${kitchen.shouldPrintTicket()}")
        Log.d(TAG, "  shouldPrintLabel(): ${kitchen.shouldPrintLabel()}")
        Log.d(TAG, "  printLabelsOverride: $printLabelsOverride")
        Log.d(TAG, "  printerIp: ${kitchen.printerIp}:${kitchen.printerPort}")
        Log.d(TAG, "  printerProtocol: ${kitchen.printerProtocol}")
        Log.d(TAG, "  items count: ${items.size}")

        var ticketResult: PrinterResult? = null
        var labelResult: PrinterResult? = null

        // In TICKET nếu cần
        if (kitchen.shouldPrintTicket()) {
            Log.d(TAG, ">>> Printing TICKET...")
            ticketResult = printTicketToKitchen(kitchen, order, items)
            Log.d(TAG, "<<< Ticket result: ${ticketResult is PrinterResult.Success}")
        } else {
            Log.d(TAG, ">>> Skipping TICKET (shouldPrintTicket=false)")
        }

        // In LABEL nếu cần VÀ được phép (printLabelsOverride)
        // Labels are printed only once per order (not per kitchen) to avoid duplicates
        val shouldPrintLabels = kitchen.shouldPrintLabel() && printLabelsOverride
        if (shouldPrintLabels) {
            Log.d(TAG, ">>> Printing LABELS (this is the designated label kitchen)...")
            labelResult = printLabelsToKitchen(kitchen, order, items)
            Log.d(TAG, "<<< Label result: ${labelResult is PrinterResult.Success}")
        } else {
            if (!kitchen.shouldPrintLabel()) {
                Log.d(TAG, ">>> Skipping LABELS (kitchen doesn't support label printing)")
            } else {
                Log.d(TAG, ">>> Skipping LABELS (not the designated label kitchen)")
            }
        }

        return KitchenPrintResult(
            kitchenId = kitchen.id,
            kitchenName = kitchen.name,
            ticketResult = ticketResult,
            labelResult = labelResult,
            itemCount = items.size
        )
    }

    /**
     * In phiếu bếp (ticket)
     */
    private suspend fun printTicketToKitchen(
        kitchen: KitchenEntity,
        order: OrderPrintData,
        items: List<OrderItem>
    ): PrinterResult {
        val ticketData = KitchenTicketPrintService.KitchenTicketData(
            kitchenName = kitchen.name,
            orderNumber = order.orderNumber,
            tableName = order.tableName,
            orderTime = order.orderTime,
            staffName = order.staffName,
            items = items.map { item ->
                KitchenTicketPrintService.KitchenItem(
                    name = item.productName,
                    quantity = item.quantity,
                    note = item.note,
                    toppings = item.toppings.map { it.name },
                    options = item.options
                )
            },
            note = order.note,
            isUrgent = order.isUrgent,
            ticketType = order.ticketType
        )

        return KitchenTicketPrintService.printTicket(kitchen, ticketData)
    }

    /**
     * In tem (labels) - mỗi item với quantity > 1 sẽ in nhiều tem
     */
    private suspend fun printLabelsToKitchen(
        kitchen: KitchenEntity,
        order: OrderPrintData,
        items: List<OrderItem>
    ): PrinterResult {
        val labelDataList = items.map { item ->
            LabelPrintService.LabelData(
                itemName = item.productName,
                itemCode = item.productCode,
                quantity = item.quantity,
                size = item.options["Size"] ?: item.options["size"],
                sugar = item.options["Đường"] ?: item.options["sugar"],
                ice = item.options["Đá"] ?: item.options["ice"],
                toppings = item.toppings.map { it.name },
                note = item.note,
                tableName = order.tableName,
                orderNumber = order.orderNumber,
                orderTime = order.orderTime,
                staffName = order.staffName
            )
        }

        return LabelPrintService.printMultipleLabels(kitchen, labelDataList)
    }

    /**
     * Tạo message tổng hợp
     */
    private fun buildResultMessage(results: List<KitchenPrintResult>): String {
        val successKitchens = mutableListOf<String>()
        val failedKitchens = mutableListOf<String>()

        results.forEach { result ->
            val ticketOk = result.ticketResult is PrinterResult.Success
            val labelOk = result.labelResult is PrinterResult.Success

            if (ticketOk || labelOk) {
                successKitchens.add(result.kitchenName)
            } else if (result.ticketResult != null || result.labelResult != null) {
                failedKitchens.add(result.kitchenName)
            }
        }

        return buildString {
            if (successKitchens.isNotEmpty()) {
                append("Đã in: ${successKitchens.joinToString(", ")}")
            }
            if (failedKitchens.isNotEmpty()) {
                if (isNotEmpty()) append(". ")
                append("Lỗi: ${failedKitchens.joinToString(", ")}")
            }
        }
    }

    /**
     * In lại đơn hàng (khi sửa đơn)
     */
    suspend fun reprintOrder(
        order: OrderPrintData,
        kitchens: List<KitchenEntity>,
        productKitchenMap: Map<String, List<String>>
    ): RoutingResult {
        val modifiedOrder = order.copy(ticketType = "MODIFIED")
        return routeAndPrint(modifiedOrder, kitchens, productKitchenMap)
    }

    /**
     * In hủy đơn
     */
    suspend fun printCancelledOrder(
        order: OrderPrintData,
        kitchens: List<KitchenEntity>,
        productKitchenMap: Map<String, List<String>>
    ): RoutingResult {
        val cancelledOrder = order.copy(ticketType = "CANCELLED")
        return routeAndPrint(cancelledOrder, kitchens, productKitchenMap)
    }
}
