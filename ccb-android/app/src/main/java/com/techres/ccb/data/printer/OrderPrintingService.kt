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

        // Convert order items sang PrintRoutingService.OrderItem
        val routingItems = orderItems
            .filter { !it.isComboParent } // Bỏ qua combo parent, chỉ in combo children
            .map { item ->
                val product = products.find { it.id == item.productId }
                PrintRoutingService.OrderItem(
                    productId = item.productId,
                    productName = item.productName,
                    productCode = item.productCode,
                    quantity = item.quantity,
                    note = item.note,
                    toppings = parseToppings(item.toppingsJson),
                    options = parseOptions(item),
                    kitchenIds = product?.getKitchenIdList() ?: inferKitchenFromProduct(product, activeKitchens)
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
                PrintRoutingService.OrderItem(
                    productId = item.productId,
                    productName = item.productName,
                    productCode = item.productCode,
                    quantity = item.quantity,
                    note = item.note,
                    toppings = parseToppings(item.toppingsJson),
                    options = parseOptions(item),
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

        PrintRoutingService.routeAndPrint(orderPrintData, activeKitchens, productKitchenMap)
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
     * Parse toppings từ JSON string
     */
    private fun parseToppings(toppingsJson: String?): List<PrintRoutingService.ToppingInfo> {
        if (toppingsJson.isNullOrBlank()) return emptyList()

        return try {
            // Simple parse: giả sử format là "[{\"name\":\"Trân châu\",\"price\":5000}]"
            val regex = """"name"\s*:\s*"([^"]+)"""".toRegex()
            regex.findAll(toppingsJson).map { match ->
                PrintRoutingService.ToppingInfo(
                    name = match.groupValues[1],
                    price = 0.0
                )
            }.toList()
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing toppings: ${e.message}")
            emptyList()
        }
    }

    /**
     * Parse options từ OrderItemEntity
     */
    private fun parseOptions(item: OrderItemEntity): Map<String, String> {
        val options = mutableMapOf<String, String>()

        // Parse từ variantsJson nếu có
        item.variantsJson?.let { json ->
            try {
                // Simple parse cho format {"Size":"L","Đường":"70%"}
                val regex = """"([^"]+)"\s*:\s*"([^"]+)"""".toRegex()
                regex.findAll(json).forEach { match ->
                    options[match.groupValues[1]] = match.groupValues[2]
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing variants: ${e.message}")
            }
        }

        return options
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
