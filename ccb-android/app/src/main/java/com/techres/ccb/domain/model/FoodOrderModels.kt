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
    val merchantStatus: String? = null,       // Trạng thái từ platform: ORDER_IN_PREPARE, ORDER_EXECUTING, COMPLETED, CANCELLED...

    // Customer info
    val customerId: String? = null,           // ID khách hàng từ platform
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

    // Additional fee fields (Grab)
    val smallOrderFee: Long = 0,              // Phí đơn hàng nhỏ
    val itemDiscountAmount: Long = 0,         // Giảm giá món
    val promotionAmount: Long = 0,            // Giảm giá khuyến mãi

    // Driver info
    val driverId: String? = null,             // ID tài xế từ platform
    val driverName: String? = null,
    val driverPhone: String? = null,
    val driverAvatar: String? = null,         // URL avatar tài xế
    val driverLicensePlate: String? = null,   // Biển số xe tài xế
    val estimatedDeliveryTime: String? = null, // "15-20 phút"

    // Scheduled order (đơn đặt trước)
    val isScheduledOrder: Boolean = false,
    val scheduledDeliveryTime: String? = null,

    // Combined order (đơn ghép)
    val isCombinedOrder: Boolean = false,
    val parentOrderId: String? = null,

    // Order status message
    val orderContentMessage: String? = null,  // "Driver is nearby", etc.

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
    val discountAmount: Long = 0,             // Giảm giá cho món
    val note: String? = null,                 // "Ít đá, nhiều đường"
    val options: String? = null,              // "Size L, Thêm trân châu (+5.000đ)"
    val modifiers: List<ItemModifierGroup>? = null  // Chi tiết modifier groups
)

/**
 * Nhóm modifier (topping, size, etc.)
 */
data class ItemModifierGroup(
    val groupId: String? = null,
    val groupName: String,                    // "Size", "Topping"
    val modifiers: List<ItemModifier>
)

/**
 * Chi tiết modifier
 */
data class ItemModifier(
    val modifierId: String? = null,
    val modifierName: String,                 // "Size L", "Trân châu"
    val quantity: Int = 1,
    val price: Long = 0                       // Giá thêm
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
    )
}

/**
 * Trạng thái đơn hàng Food App - TechRes Simplified Flow
 * Đơn mới (NEW) -> Đã xác nhận (PREPARING) -> Hoàn tất (COMPLETED) / Huỷ (CANCELLED)
 */
enum class FoodOrderStatus(
    val displayName: String,
    val color: Long,
    val canAccept: Boolean = false,
    val canComplete: Boolean = false,
    val canCancel: Boolean = false
) {
    NEW(
        displayName = "Đơn mới",
        color = 0xFFFF9800,  // Orange
        canAccept = true,
        canCancel = true
    ),
    PREPARING(
        displayName = "Đã xác nhận",
        color = 0xFF2196F3,  // Blue
        canComplete = true,
        canCancel = true
    ),
    COMPLETED(
        displayName = "Hoàn tất",
        color = 0xFF4CAF50   // Green
    ),
    CANCELLED(
        displayName = "Đã huỷ",
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
