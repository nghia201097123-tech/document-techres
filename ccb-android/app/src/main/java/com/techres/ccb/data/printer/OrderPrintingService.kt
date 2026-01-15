package com.techres.ccb.data.printer

import android.util.Log
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.local.entity.ProductEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

/**
 * Order Printing Service - Xử lý in bếp/tem khi đặt order
 *
 * Tích hợp với PrintRoutingService để in đến các bếp tương ứng
 * dựa trên product-kitchen mapping
 */
object OrderPrintingService {
    private const val TAG = "OrderPrintingService"

    /**
     * In đơn hàng đến các bếp tương ứng
     *
     * @param order Thông tin order
     * @param orderItems Danh sách items trong order
     * @param kitchens Danh sách tất cả bếp (đã filter active và có printer)
     * @param products Danh sách products để lấy kitchen mapping
     * @return Kết quả in
     */
    suspend fun printOrderToKitchens(
        order: OrderEntity,
        orderItems: List<OrderItemEntity>,
        kitchens: List<KitchenEntity>,
        products: List<ProductEntity>
    ): PrintRoutingService.RoutingResult = withContext(Dispatchers.IO) {
        Log.d(TAG, "printOrderToKitchens - Order #${order.orderNumber}, items: ${orderItems.size}, kitchens: ${kitchens.size}")

        // Filter chỉ những kitchen có printer đã cấu hình
        val activeKitchens = kitchens.filter { kitchen ->
            kitchen.isActive && !kitchen.printerIp.isNullOrBlank()
        }

        if (activeKitchens.isEmpty()) {
            Log.w(TAG, "No active kitchens with printers configured")
            return@withContext PrintRoutingService.RoutingResult(
                success = false,
                message = "Không có bếp nào được cấu hình máy in",
                kitchenResults = emptyList(),
                totalKitchens = 0,
                successfulKitchens = 0
            )
        }

        // Build product-kitchen mapping từ products
        val productKitchenMap = buildProductKitchenMap(products, activeKitchens)

        // Log active kitchens and their printMode
        Log.d(TAG, "=== Active Kitchens ===")
        activeKitchens.forEach { k ->
            Log.d(TAG, "  ${k.name}: printMode='${k.printMode}', ip=${k.printerIp}:${k.printerPort}")
        }

        // Convert order items sang PrintRoutingService.OrderItem
        val routingItems = orderItems
            .filter { !it.isComboParent } // Bỏ qua combo parent, chỉ in combo children
            .map { item ->
                val product = products.find { it.id == item.productId }
                val kitchenIds = product?.getKitchenIdList() ?: inferKitchenFromProduct(product, activeKitchens)
                Log.d(TAG, "Item: ${item.productName} -> kitchenIds: $kitchenIds (from product.kitchenIds='${product?.kitchenIds}')")
                val (options, toppings, note) = parseNotesField(item.notes)
                PrintRoutingService.OrderItem(
                    productId = item.productId ?: "",
                    productName = item.productName,
                    productCode = item.productCode,
                    quantity = item.quantity,
                    note = note,
                    toppings = toppings,
                    options = options,
                    kitchenIds = kitchenIds
                )
            }

        if (routingItems.isEmpty()) {
            Log.w(TAG, "No items to print")
            return@withContext PrintRoutingService.RoutingResult(
                success = false,
                message = "Không có món nào để in",
                kitchenResults = emptyList(),
                totalKitchens = 0,
                successfulKitchens = 0
            )
        }

        // Build OrderPrintData
        val orderPrintData = PrintRoutingService.OrderPrintData(
            orderNumber = order.orderNumber,
            tableName = order.tableName,
            staffName = order.staffName,
            orderTime = parseOrderTime(order.createdAt),
            items = routingItems,
            note = null,
            isUrgent = false,
            ticketType = "NEW"
        )

        // Call PrintRoutingService
        PrintRoutingService.routeAndPrint(orderPrintData, activeKitchens, productKitchenMap)
    }

    /**
     * In lại đơn hàng (khi sửa đơn)
     */
    suspend fun reprintOrderToKitchens(
        order: OrderEntity,
        orderItems: List<OrderItemEntity>,
        kitchens: List<KitchenEntity>,
        products: List<ProductEntity>
    ): PrintRoutingService.RoutingResult = withContext(Dispatchers.IO) {
        Log.d(TAG, "reprintOrderToKitchens - Order #${order.orderNumber}")

        val activeKitchens = kitchens.filter { kitchen ->
            kitchen.isActive && !kitchen.printerIp.isNullOrBlank()
        }

        if (activeKitchens.isEmpty()) {
            return@withContext PrintRoutingService.RoutingResult(
                success = false,
                message = "Không có bếp nào được cấu hình máy in",
                kitchenResults = emptyList(),
                totalKitchens = 0,
                successfulKitchens = 0
            )
        }

        val productKitchenMap = buildProductKitchenMap(products, activeKitchens)

        val routingItems = orderItems
            .filter { !it.isComboParent }
            .map { item ->
                val product = products.find { it.id == item.productId }
                val (options, toppings, note) = parseNotesField(item.notes)
                PrintRoutingService.OrderItem(
                    productId = item.productId ?: "",
                    productName = item.productName,
                    productCode = item.productCode,
                    quantity = item.quantity,
                    note = note,
                    toppings = toppings,
                    options = options,
                    kitchenIds = product?.getKitchenIdList() ?: inferKitchenFromProduct(product, activeKitchens)
                )
            }

        val orderPrintData = PrintRoutingService.OrderPrintData(
            orderNumber = order.orderNumber,
            tableName = order.tableName,
            staffName = order.staffName,
            orderTime = parseOrderTime(order.createdAt),
            items = routingItems,
            note = null,
            isUrgent = false,
            ticketType = "MODIFIED"
        )

        // skipLabels = true: Chỉ in phiếu bếp, không in tem
        PrintRoutingService.routeAndPrint(orderPrintData, activeKitchens, productKitchenMap, skipLabels = true)
    }

    /**
     * Build product-kitchen mapping
     * Nếu product có kitchenIds -> sử dụng
     * Nếu không -> infer từ product type (drink -> bar, food -> kitchen)
     */
    private fun buildProductKitchenMap(
        products: List<ProductEntity>,
        kitchens: List<KitchenEntity>
    ): Map<String, List<String>> {
        val map = mutableMapOf<String, List<String>>()

        products.forEach { product ->
            val kitchenIds = product.getKitchenIdList()
            if (kitchenIds.isNotEmpty()) {
                map[product.id] = kitchenIds
            } else {
                // Infer từ product type và flags
                val inferredKitchens = inferKitchenFromProduct(product, kitchens)
                if (inferredKitchens.isNotEmpty()) {
                    map[product.id] = inferredKitchens
                }
            }
        }

        return map
    }

    /**
     * Infer kitchen từ product type và flags
     * - drink -> bar kitchen
     * - food -> cooking kitchen
     * - Fallback: printToKitchen/printToBar flags
     */
    private fun inferKitchenFromProduct(
        product: ProductEntity?,
        kitchens: List<KitchenEntity>
    ): List<String> {
        if (product == null) return emptyList()

        val result = mutableListOf<String>()

        when (product.type.lowercase()) {
            "drink" -> {
                // Tìm bar kitchen
                kitchens.find { it.kitchenType?.lowercase() == "bar" }?.let {
                    result.add(it.id)
                }
            }
            "food" -> {
                // Tìm cooking kitchen
                kitchens.find { it.kitchenType?.lowercase() == "cooking" }?.let {
                    result.add(it.id)
                }
            }
        }

        // Fallback: sử dụng flags
        if (result.isEmpty()) {
            if (product.printToBar) {
                kitchens.find { it.kitchenType?.lowercase() == "bar" }?.let {
                    result.add(it.id)
                }
            }
            if (product.printToKitchen) {
                kitchens.find { it.kitchenType?.lowercase() in listOf("cooking", "grill", null) }?.let {
                    result.add(it.id)
                }
            }
        }

        // Final fallback: gửi đến kitchen đầu tiên
        if (result.isEmpty() && kitchens.isNotEmpty()) {
            result.add(kitchens.first().id)
        }

        return result.distinct()
    }

    /**
     * Parse notes field từ OrderItemEntity
     * New format: "Size: L (+10000), Đường: NHIỀU, + Trân châu (+10000), Ghi chú: Ít đá"
     * Old format (backward compat): "Size L:10000, NHIỀU"
     * Returns: Triple(options, toppings, note)
     */
    private fun parseNotesField(notes: String?): Triple<Map<String, String>, List<PrintRoutingService.ToppingInfo>, String?> {
        if (notes.isNullOrBlank()) {
            return Triple(emptyMap(), emptyList(), null)
        }

        val options = mutableMapOf<String, String>()
        val toppings = mutableListOf<PrintRoutingService.ToppingInfo>()
        var note: String? = null

        // Common sugar/ice option names for backward compatibility
        val sugarOptions = setOf("nhiều", "bình thường", "ít", "không", "30%", "50%", "70%", "100%", "0%")
        val iceOptions = setOf("đá bình thường", "ít đá", "không đá", "full đá", "đá riêng")

        try {
            // Check for pipe separator (user note section)
            val mainPart: String
            val userNotePart: String?
            if (notes.contains(" | ")) {
                val parts = notes.split(" | ", limit = 2)
                mainPart = parts[0]
                userNotePart = if (parts.size > 1 && parts[1].startsWith("Ghi chú:")) {
                    parts[1].removePrefix("Ghi chú:").trim()
                } else if (parts.size > 1) {
                    parts[1].trim()
                } else null
            } else {
                mainPart = notes
                userNotePart = null
            }

            // Split by comma and process each part
            mainPart.split(",").map { it.trim() }.forEach { part ->
                when {
                    // Toppings start with "+"
                    part.startsWith("+") -> {
                        // Format: "+ Trân châu (+10000)" or "+ Trân châu"
                        var toppingText = part.removePrefix("+").trim()
                        var toppingPrice = 0.0

                        // Extract price if present: "(+10000)"
                        val priceMatch = Regex("\\s*\\(\\+?(\\d+)\\)$").find(toppingText)
                        if (priceMatch != null) {
                            toppingPrice = priceMatch.groupValues[1].toDoubleOrNull() ?: 0.0
                            toppingText = toppingText.replace(priceMatch.value, "").trim()
                        }

                        if (toppingText.isNotBlank()) {
                            toppings.add(PrintRoutingService.ToppingInfo(name = toppingText, price = toppingPrice))
                        }
                    }
                    // Options with format "Key: Value" or "Key: Value (+price)"
                    part.contains(":") -> {
                        val colonIndex = part.indexOf(":")
                        val key = part.substring(0, colonIndex).trim()
                        var value = part.substring(colonIndex + 1).trim()

                        // Remove price suffix like "(+10000)" from value
                        val priceMatch = Regex("\\s*\\(\\+?(\\d+)\\)$").find(value)
                        if (priceMatch != null) {
                            value = value.replace(priceMatch.value, "").trim()
                        }

                        when (key.lowercase()) {
                            "ghi chú", "note", "ghi chu" -> note = value
                            else -> options[key] = value
                        }
                    }
                    // Plain text - try to detect type for backward compatibility
                    part.isNotBlank() && !part.startsWith("[") -> {
                        val partLower = part.lowercase()

                        // Check if it's a size option (old format: "Size L:10000")
                        val sizeMatch = Regex("^(Size\\s*)(\\w+):(\\d+)$", RegexOption.IGNORE_CASE).find(part)
                        if (sizeMatch != null) {
                            options["Size"] = sizeMatch.groupValues[2]
                        }
                        // Check if it's a common sugar option
                        else if (sugarOptions.any { partLower.contains(it) }) {
                            options["Đường"] = part
                        }
                        // Check if it's a common ice option
                        else if (iceOptions.any { partLower.contains(it) }) {
                            options["Đá"] = part
                        }
                        // Otherwise treat as note
                        else {
                            if (note == null) {
                                note = part
                            } else {
                                note = "$note, $part"
                            }
                        }
                    }
                }
            }

            // Add user note from pipe separator
            if (!userNotePart.isNullOrBlank()) {
                note = if (note.isNullOrBlank()) userNotePart else "$note | $userNotePart"
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing notes: ${e.message}")
        }

        return Triple(options, toppings, note)
    }

    /**
     * Parse order time từ string
     */
    private fun parseOrderTime(timeStr: String): Date {
        return try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(timeStr) ?: Date()
        } catch (e: Exception) {
            try {
                SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).parse(timeStr) ?: Date()
            } catch (e2: Exception) {
                Date()
            }
        }
    }
}
