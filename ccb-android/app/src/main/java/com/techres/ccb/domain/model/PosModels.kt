package com.techres.ccb.domain.model

import java.util.UUID

// ===== CATEGORY =====
data class Category(
    val id: String,
    val name: String,
    val icon: String? = null,
    val productType: String = "food", // food, drink, other, combo
    val order: Int = 0,
    val isActive: Boolean = true
)

// ===== PRODUCT =====
data class Product(
    val id: String,
    val code: String,
    val name: String,
    val searchName: String? = null,  // Tên không dấu để tìm kiếm
    val abbreviation: String? = null, // Tên viết tắt (VD: "ccdc" cho "Cơm chiên dương châu")
    val categoryId: String,
    val price: Long,
    val vatRate: Double = 8.0,  // VAT rate của sản phẩm (%)
    val imageUrl: String? = null,
    val description: String? = null,
    val isActive: Boolean = true,
    val soldCount: Int = 0,
    val hasVariants: Boolean = false,
    val variants: List<ProductVariantGroup> = emptyList()
)

data class ProductVariantGroup(
    val id: String,
    val name: String,           // "SIZE", "ĐƯỜNG", "ĐÁ", "TOPPING"
    val type: VariantType,
    val isRequired: Boolean = false,
    val isMultiple: Boolean = false,  // Có thể chọn nhiều (topping)
    val minSelect: Int = 0,           // Số tối thiểu cần chọn
    val maxSelect: Int = 99,          // Số tối đa được chọn
    val options: List<ProductVariantOption>
)

data class ProductVariantOption(
    val id: String,
    val name: String,           // "S", "M", "L", "Trân châu"
    val price: Long = 0,        // Giá cộng thêm
    val isDefault: Boolean = false,
    val vatRate: Double = 0.0   // VAT rate của topping (%)
)

enum class VariantType {
    SIZE,
    SUGAR,
    ICE,
    TOPPING,
    OTHER
}

// ===== CART =====
data class CartItem(
    val id: String = UUID.randomUUID().toString(),
    val product: Product,
    var quantity: Int = 1,
    val selectedVariants: List<SelectedVariant> = emptyList(),
    val note: String? = null,
    val comboItems: List<ComboChildItem> = emptyList()  // Các món con trong combo
) {
    val unitPrice: Long
        get() = product.price + selectedVariants.sumOf { it.price * it.quantity }

    val totalPrice: Long
        get() = unitPrice * quantity

    val variantText: String
        get() = selectedVariants.joinToString(", ") { it.name }

    val isCombo: Boolean
        get() = comboItems.isNotEmpty()
}

data class SelectedVariant(
    val groupId: String,
    val groupName: String,
    val optionId: String,
    val name: String,
    val price: Long,
    val vatRate: Double = 0.0,   // VAT rate của topping (%)
    val quantity: Int = 1        // Số lượng topping (VD: 2 bánh flan)
)

// ===== COMBO CHILD ITEM =====
data class ComboChildItem(
    val productId: String,
    val productName: String,
    val productCode: String?,
    val quantity: Int = 1
)

// ===== ORDER =====
data class Order(
    val id: String = UUID.randomUUID().toString(),
    val orderNumber: String,
    val orderType: OrderType = OrderType.DINE_IN,
    val tableId: String? = null,
    val tableName: String? = null,
    val customerId: String? = null,
    val customerName: String? = null,
    val customerPhone: String? = null,
    val staffId: String,
    val staffName: String,
    val items: List<CartItem>,
    val subtotal: Long,
    val discountAmount: Long = 0,
    val discountReason: String? = null,
    val taxRate: Double = 0.0,
    val taxAmount: Long = 0,
    val totalAmount: Long,
    val payments: List<Payment> = emptyList(),
    val status: OrderStatus = OrderStatus.DRAFT,
    val note: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val completedAt: Long? = null
)

enum class OrderType(val displayName: String, val dbValue: String) {
    DINE_IN("Tại bàn", "dine_in"),
    TAKE_AWAY("Mang về", "takeaway"),
    DELIVERY("Giao hàng", "delivery")
}

enum class OrderStatus(val displayName: String) {
    DRAFT("Nháp"),
    PENDING("Chờ xử lý"),
    PROCESSING("Đang chế biến"),
    READY("Sẵn sàng"),
    COMPLETED("Hoàn thành"),
    CANCELLED("Đã hủy")
}

// ===== PAYMENT =====
data class Payment(
    val id: String = UUID.randomUUID().toString(),
    val method: PaymentMethod,
    val amount: Long,
    val receivedAmount: Long? = null,  // Tiền khách đưa
    val changeAmount: Long? = null,     // Tiền thừa
    val reference: String? = null,      // Mã giao dịch
    val status: PaymentStatus = PaymentStatus.COMPLETED,
    val paidAt: Long = System.currentTimeMillis()
)

enum class PaymentMethod(val displayName: String, val icon: String) {
    CASH("Tiền mặt", "💵"),
    BANK_TRANSFER("Chuyển khoản", "🏦"),
    CARD("Thẻ ATM/Visa", "💳"),
    MOMO("Ví MoMo", "📱"),
    ZALOPAY("ZaloPay", "📱"),
    VNPAY("VNPay QR", "📱")
}

enum class PaymentStatus {
    PENDING,
    COMPLETED,
    FAILED,
    REFUNDED
}

// ===== TABLE =====
data class Table(
    val id: String,
    val name: String,
    val areaId: String,
    val areaName: String,
    val capacity: Int = 4,
    val status: TableStatus = TableStatus.AVAILABLE,
    val currentOrderId: String? = null,
    val currentOrderAmount: Long? = null,
    val occupiedMinutes: Int? = null
)

enum class TableStatus(val displayName: String) {
    AVAILABLE("Trống"),
    OCCUPIED("Có khách"),
    RESERVED("Đã đặt"),
    CLEANING("Đang dọn")
}

// ===== CUSTOMER =====
data class Customer(
    val id: String,
    val name: String,
    val phone: String,
    val email: String? = null,
    val memberLevel: String? = null,
    val points: Int = 0,
    val totalSpent: Long = 0
)
