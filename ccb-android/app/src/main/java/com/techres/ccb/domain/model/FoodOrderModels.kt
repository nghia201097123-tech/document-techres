package com.techres.ccb.domain.model

import java.util.UUID

/**
 * Đơn hàng từ các App Food (Grab, ShopeeFood, BeFood, Web Order...)
 * Đây là đơn hàng được đặt từ bên ngoài, không phải order tại quầy
 */
data class FoodAppOrder(
    val id: String = UUID.randomUUID().toString(),
    val orderCode: String,                    // Mã đơn từ platform: #GR12345, #SF98765
    val platform: FoodPlatform,               // Grab, ShopeeFood, BeFood, WebOrder
    val status: FoodOrderStatus,

    // Customer info
    val customerName: String,
    val customerPhone: String,
    val customerAddress: String?,             // Địa chỉ giao hàng
    val customerNote: String?,                // Ghi chú của khách

    // Order details
    val items: List<FoodOrderItem>,
    val subtotal: Long,
    val deliveryFee: Long = 0,
    val platformFee: Long = 0,                // Phí platform
    val discount: Long = 0,
    val totalAmount: Long,

    // Delivery info
    val driverName: String? = null,
    val driverPhone: String? = null,
    val estimatedDeliveryTime: String? = null, // "15-20 phút"

    // Timestamps
    val createdAt: Long = System.currentTimeMillis(),
    val acceptedAt: Long? = null,
    val preparedAt: Long? = null,
    val completedAt: Long? = null,

    // Extra
    val isPaid: Boolean = true,               // Đa phần đơn app đã thanh toán trước
    val paymentMethod: String? = null         // "Ví GrabPay", "COD", "ShopeePay"
)

data class FoodOrderItem(
    val id: String = UUID.randomUUID().toString(),
    val productName: String,
    val quantity: Int,
    val unitPrice: Long,
    val totalPrice: Long,
    val note: String? = null,                 // "Ít đá, nhiều đường"
    val options: String? = null               // "Size L, Thêm trân châu"
)

/**
 * Platform nguồn đơn hàng
 */
enum class FoodPlatform(
    val displayName: String,
    val shortName: String,
    val color: Long,         // Color hex value
    val icon: String
) {
    GRAB_FOOD(
        displayName = "GrabFood",
        shortName = "Grab",
        color = 0xFF00B14F,  // Green
        icon = "🟢"
    ),
    SHOPEE_FOOD(
        displayName = "ShopeeFood",
        shortName = "Shopee",
        color = 0xFFEE4D2D,  // Orange
        icon = "🟠"
    ),
    BE_FOOD(
        displayName = "BeFood",
        shortName = "Be",
        color = 0xFFFFD500,  // Yellow
        icon = "🟡"
    ),
    GO_FOOD(
        displayName = "GoFood",
        shortName = "GoJek",
        color = 0xFF00AA13,  // Green
        icon = "🟢"
    ),
    WEB_ORDER(
        displayName = "Web Order",
        shortName = "Web",
        color = 0xFF2196F3,  // Blue
        icon = "🔵"
    ),
    PHONE_ORDER(
        displayName = "Đặt qua điện thoại",
        shortName = "Phone",
        color = 0xFF9C27B0,  // Purple
        icon = "🟣"
    )
}

/**
 * Trạng thái đơn hàng Food App
 */
enum class FoodOrderStatus(
    val displayName: String,
    val color: Long,
    val canAccept: Boolean = false,
    val canPrepare: Boolean = false,
    val canReady: Boolean = false,
    val canComplete: Boolean = false,
    val canCancel: Boolean = false
) {
    NEW(
        displayName = "Đơn mới",
        color = 0xFFFF9800,  // Orange
        canAccept = true,
        canCancel = true
    ),
    ACCEPTED(
        displayName = "Đã nhận",
        color = 0xFF2196F3,  // Blue
        canPrepare = true,
        canCancel = true
    ),
    PREPARING(
        displayName = "Đang làm",
        color = 0xFF9C27B0,  // Purple
        canReady = true
    ),
    READY(
        displayName = "Sẵn sàng",
        color = 0xFF4CAF50,  // Green
        canComplete = true
    ),
    DELIVERING(
        displayName = "Đang giao",
        color = 0xFF00BCD4,  // Cyan
        canComplete = true
    ),
    COMPLETED(
        displayName = "Hoàn thành",
        color = 0xFF8BC34A   // Light Green
    ),
    CANCELLED(
        displayName = "Đã hủy",
        color = 0xFFF44336   // Red
    )
}

/**
 * Filter options for food orders
 */
enum class FoodOrderFilter(val displayName: String) {
    ALL("Tất cả"),
    NEW("Đơn mới"),
    PROCESSING("Đang xử lý"),
    COMPLETED("Hoàn thành"),
    CANCELLED("Đã hủy")
}
