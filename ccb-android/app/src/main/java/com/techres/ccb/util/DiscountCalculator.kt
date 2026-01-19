package com.techres.ccb.util

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.techres.ccb.data.local.entity.CouponEntity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Kết quả tính giảm giá cho một món
 */
data class ItemDiscountResult(
    val productId: String,
    val productName: String,
    val originalPrice: Double,         // Giá gốc (chưa giảm)
    val discountAmount: Double,        // Số tiền giảm
    val priceAfterDiscount: Double,    // Giá sau giảm (trước VAT)
    val vatRate: Double,               // Thuế suất VAT (%)
    val vatAmount: Double,             // Tiền VAT (tính trên giá sau giảm)
    val finalPrice: Double,            // Giá cuối cùng (sau giảm + VAT)
    val couponId: String?,             // Coupon áp dụng (nếu có)
    val couponCode: String?,           // Mã coupon
    val quantity: Int = 1
)

/**
 * Kết quả tính giảm giá cho toàn bill
 */
data class BillDiscountResult(
    val items: List<ItemDiscountResult>,          // Chi tiết từng món
    val subtotal: Double,                          // Tổng tiền hàng (chưa giảm, chưa VAT)
    val totalDiscount: Double,                     // Tổng tiền giảm
    val priceBeforeVat: Double,                    // Giá trước VAT (sau giảm)
    val totalVat: Double,                          // Tổng tiền VAT
    val grandTotal: Double,                        // Tổng cộng (sau giảm + VAT)
    val appliedCoupons: List<AppliedCouponInfo>,   // Danh sách coupon đã áp dụng
    val requiresApproval: Boolean = false,         // Cần phê duyệt?
    val approvalReason: String? = null             // Lý do cần phê duyệt
)

/**
 * Thông tin coupon đã áp dụng
 */
data class AppliedCouponInfo(
    val couponId: String,
    val code: String,
    val name: String,
    val discountType: String,  // percentage, fixed
    val discountValue: Double,
    val discountAmount: Double, // Số tiền thực tế được giảm
    val applyTo: String         // bill, item, category
)

/**
 * Item trong order để tính giảm giá
 */
data class OrderItemForDiscount(
    val productId: String,
    val productName: String,
    val categoryId: String?,
    val unitPrice: Double,
    val quantity: Int,
    val vatRate: Double  // VAT rate của sản phẩm (%)
)

/**
 * DiscountCalculator - Tính giảm giá tuân thủ luật thuế Việt Nam
 *
 * Theo Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC về hóa đơn điện tử:
 * - GIÁ BÁN ĐÃ BAO GỒM VAT (theo thông lệ F&B Việt Nam)
 * - Giảm giá được trừ trực tiếp vào giá bán
 * - VAT được tách ra từ giá đã bao gồm VAT: VAT = Giá - (Giá ÷ 1.08)
 *
 * Hiện tại VAT F&B được giảm còn 8% (Nghị định 174/2025)
 */
object DiscountCalculator {

    private val gson = Gson()
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    /**
     * Tính giảm giá cho toàn bộ order
     *
     * @param items Danh sách món trong order
     * @param coupons Danh sách coupon có thể áp dụng
     * @param manualCouponCode Mã coupon nhập thủ công (nếu có)
     * @param orderAmount Tổng tiền order (để kiểm tra minOrderAmount)
     * @return Kết quả tính giảm giá
     */
    fun calculateOrderDiscount(
        items: List<OrderItemForDiscount>,
        coupons: List<CouponEntity>,
        manualCouponCode: String? = null,
        orderAmount: Double? = null
    ): BillDiscountResult {
        val now = Date()
        val appliedCoupons = mutableListOf<AppliedCouponInfo>()
        var requiresApproval = false
        var approvalReason: String? = null

        // Tính subtotal
        val subtotal = items.sumOf { it.unitPrice * it.quantity }
        val effectiveOrderAmount = orderAmount ?: subtotal

        // Lọc coupon hợp lệ
        val validCoupons = coupons.filter { coupon ->
            isValidCoupon(coupon, now, effectiveOrderAmount)
        }

        // Tìm coupon thủ công (nếu có)
        val manualCoupon = if (manualCouponCode != null) {
            validCoupons.find {
                it.code.equals(manualCouponCode, ignoreCase = true) &&
                it.activationType == "manual"
            }
        } else null

        // Tìm coupon tự động
        val autoCoupons = validCoupons.filter {
            it.activationType == "auto"
        }.sortedBy { it.priority }

        // Áp dụng giảm giá theo thứ tự ưu tiên
        val couponsToApply = mutableListOf<CouponEntity>()

        // Thêm coupon thủ công trước
        if (manualCoupon != null) {
            couponsToApply.add(manualCoupon)
        }

        // Thêm coupon tự động
        for (autoCoupon in autoCoupons) {
            // Nếu không combinable, chỉ áp dụng nếu chưa có coupon nào
            if (!autoCoupon.isCombinable && couponsToApply.isNotEmpty()) {
                continue
            }
            // Nếu đã có coupon không combinable, không thêm coupon này
            if (couponsToApply.any { !it.isCombinable }) {
                continue
            }
            couponsToApply.add(autoCoupon)
        }

        // Tính giảm giá cho từng món
        val itemResults = items.map { item ->
            var itemDiscount = 0.0
            var appliedCouponId: String? = null
            var appliedCouponCode: String? = null

            for (coupon in couponsToApply) {
                val couponDiscount = calculateItemDiscount(item, coupon)
                if (couponDiscount > 0) {
                    itemDiscount += couponDiscount
                    appliedCouponId = coupon.id
                    appliedCouponCode = coupon.code
                }
            }

            // Áp dụng công thức thuế Việt Nam (giá đã bao gồm VAT)
            // VAT = Giá - (Giá ÷ (1 + vatRate/100))
            // Làm tròn xuống (toLong) để đồng nhất với OrderHistoryScreen
            val originalTotal = item.unitPrice * item.quantity
            val priceAfterDiscount = (originalTotal - itemDiscount).coerceAtLeast(0.0)
            val priceBeforeVatItem = (priceAfterDiscount / (1 + item.vatRate / 100.0)).toLong().toDouble()
            val vatAmount = priceAfterDiscount - priceBeforeVatItem
            val finalPrice = priceAfterDiscount // Giá cuối = giá sau giảm (đã bao gồm VAT)

            ItemDiscountResult(
                productId = item.productId,
                productName = item.productName,
                originalPrice = originalTotal,
                discountAmount = itemDiscount,
                priceAfterDiscount = priceAfterDiscount,
                vatRate = item.vatRate,
                vatAmount = vatAmount,
                finalPrice = finalPrice,
                couponId = appliedCouponId,
                couponCode = appliedCouponCode,
                quantity = item.quantity
            )
        }

        // Tính giảm giá bill-level
        var billLevelDiscount = 0.0
        for (coupon in couponsToApply) {
            if (coupon.applyTo == "bill") {
                val discount = calculateBillDiscount(subtotal, coupon)
                if (discount > 0) {
                    billLevelDiscount += discount
                    appliedCoupons.add(
                        AppliedCouponInfo(
                            couponId = coupon.id,
                            code = coupon.code,
                            name = coupon.name,
                            discountType = coupon.couponType,
                            discountValue = coupon.discountValue,
                            discountAmount = discount,
                            applyTo = coupon.applyTo
                        )
                    )

                    // Kiểm tra cần phê duyệt
                    if (coupon.requiresApproval) {
                        val threshold = coupon.approvalThreshold ?: 0.0
                        if (discount > threshold) {
                            requiresApproval = true
                            approvalReason = "Giảm giá ${formatCurrency(discount)} vượt ngưỡng phê duyệt ${formatCurrency(threshold)}"
                        }
                    }
                }
            }
        }

        // Tổng hợp kết quả
        val totalItemDiscount = itemResults.sumOf { it.discountAmount }
        val totalDiscount = totalItemDiscount + billLevelDiscount

        // Tính tổng cộng (giá đã bao gồm VAT - giảm giá)
        val grandTotal = (subtotal - totalDiscount).coerceAtLeast(0.0)

        // Tính VAT theo phương pháp tách (giá đã bao gồm VAT)
        // VAT = grandTotal - (grandTotal ÷ 1.08)
        // Làm tròn xuống (toLong) để đồng nhất với OrderHistoryScreen
        val avgVatRate = if (items.isNotEmpty()) {
            items.map { it.vatRate }.average()
        } else 0.0

        val priceBeforeVat = (grandTotal / (1 + avgVatRate / 100.0)).toLong().toDouble()
        val totalVat = grandTotal - priceBeforeVat

        return BillDiscountResult(
            items = itemResults,
            subtotal = subtotal,
            totalDiscount = totalDiscount,
            priceBeforeVat = priceBeforeVat,
            totalVat = totalVat,
            grandTotal = grandTotal,
            appliedCoupons = appliedCoupons,
            requiresApproval = requiresApproval,
            approvalReason = approvalReason
        )
    }

    /**
     * Tính giảm giá cho một món cụ thể
     */
    private fun calculateItemDiscount(
        item: OrderItemForDiscount,
        coupon: CouponEntity
    ): Double {
        // Kiểm tra coupon có áp dụng cho món này không
        if (!isCouponApplicableToItem(item, coupon)) {
            return 0.0
        }

        // Kiểm tra số lượng tối thiểu
        if (item.quantity < coupon.minQuantity) {
            return 0.0
        }

        val itemTotal = item.unitPrice * item.quantity
        val discount = when (coupon.couponType) {
            "percentage" -> {
                val calculatedDiscount = itemTotal * (coupon.discountValue / 100.0)
                // Áp dụng max discount nếu có
                coupon.maxDiscount?.let { maxDiscount ->
                    calculatedDiscount.coerceAtMost(maxDiscount)
                } ?: calculatedDiscount
            }
            "fixed" -> {
                coupon.discountValue.coerceAtMost(itemTotal)
            }
            else -> 0.0
        }

        return discount
    }

    /**
     * Tính giảm giá bill-level
     */
    private fun calculateBillDiscount(
        subtotal: Double,
        coupon: CouponEntity
    ): Double {
        if (coupon.applyTo != "bill") {
            return 0.0
        }

        val discount = when (coupon.couponType) {
            "percentage" -> {
                val calculatedDiscount = subtotal * (coupon.discountValue / 100.0)
                coupon.maxDiscount?.let { maxDiscount ->
                    calculatedDiscount.coerceAtMost(maxDiscount)
                } ?: calculatedDiscount
            }
            "fixed" -> {
                coupon.discountValue.coerceAtMost(subtotal)
            }
            else -> 0.0
        }

        return discount
    }

    /**
     * Kiểm tra coupon có hợp lệ không
     */
    private fun isValidCoupon(coupon: CouponEntity, now: Date, orderAmount: Double): Boolean {
        // Kiểm tra active
        if (!coupon.isActive) return false

        // Kiểm tra ngày hiệu lực
        coupon.startDate?.let { startDateStr ->
            try {
                val startDate = dateFormat.parse(startDateStr)
                if (startDate != null && now.before(startDate)) return false
            } catch (e: Exception) { /* ignore parse errors */ }
        }

        coupon.endDate?.let { endDateStr ->
            try {
                val endDate = dateFormat.parse(endDateStr)
                if (endDate != null && now.after(endDate)) return false
            } catch (e: Exception) { /* ignore parse errors */ }
        }

        // Kiểm tra giới hạn sử dụng
        coupon.usageLimit?.let { limit ->
            if (coupon.usageCount >= limit) return false
        }

        // Kiểm tra giới hạn sử dụng hàng ngày
        coupon.dailyLimit?.let { limit ->
            if (coupon.dailyUsageCount >= limit) return false
        }

        // Kiểm tra giá trị đơn hàng tối thiểu
        if (orderAmount < coupon.minOrderAmount) return false

        return true
    }

    /**
     * Kiểm tra coupon có áp dụng được cho món không
     */
    private fun isCouponApplicableToItem(
        item: OrderItemForDiscount,
        coupon: CouponEntity
    ): Boolean {
        return when (coupon.applyTo) {
            "bill" -> true  // Bill-level áp dụng riêng
            "item" -> {
                // Kiểm tra productId có trong danh sách
                val productIds = parseJsonList(coupon.productIds)
                productIds.isEmpty() || productIds.contains(item.productId)
            }
            "category" -> {
                // Kiểm tra categoryId có trong danh sách
                val categoryIds = parseJsonList(coupon.categoryIds)
                item.categoryId != null &&
                    (categoryIds.isEmpty() || categoryIds.contains(item.categoryId))
            }
            else -> false
        }
    }

    /**
     * Parse JSON string thành list
     */
    private fun parseJsonList(jsonString: String?): List<String> {
        if (jsonString.isNullOrBlank()) return emptyList()
        return try {
            val type = object : TypeToken<List<String>>() {}.type
            gson.fromJson(jsonString, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Format số tiền
     */
    private fun formatCurrency(amount: Double): String {
        return String.format(Locale.US, "%,.0f", amount) + "đ"
    }

    /**
     * Tính VAT theo đúng công thức Việt Nam
     *
     * @param priceBeforeVat Giá trước thuế (đã trừ giảm giá)
     * @param vatRate Thuế suất VAT (%)
     * @return Tiền VAT
     */
    fun calculateVat(priceBeforeVat: Double, vatRate: Double): Double {
        return priceBeforeVat * (vatRate / 100.0)
    }

    /**
     * Tính giá sau thuế
     *
     * @param priceBeforeVat Giá trước thuế
     * @param vatRate Thuế suất VAT (%)
     * @return Giá sau thuế
     */
    fun calculatePriceAfterVat(priceBeforeVat: Double, vatRate: Double): Double {
        return priceBeforeVat + calculateVat(priceBeforeVat, vatRate)
    }

    /**
     * Tính giá trước thuế từ giá sau thuế
     * (Đối với trường hợp giá đã bao gồm VAT)
     *
     * @param priceIncludingVat Giá đã bao gồm VAT
     * @param vatRate Thuế suất VAT (%)
     * @return Giá trước thuế
     */
    fun calculatePriceBeforeVat(priceIncludingVat: Double, vatRate: Double): Double {
        return priceIncludingVat / (1 + vatRate / 100.0)
    }
}
