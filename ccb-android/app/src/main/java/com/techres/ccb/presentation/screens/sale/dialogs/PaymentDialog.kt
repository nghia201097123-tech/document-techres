package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.techres.ccb.domain.model.Payment
import com.techres.ccb.domain.model.PaymentMethod
import com.techres.ccb.domain.model.PaymentStatus
import com.techres.ccb.presentation.screens.sale.formatCurrency
import com.techres.ccb.presentation.theme.Success

/**
 * Đối tượng áp dụng giảm giá
 */
enum class DiscountTarget(val displayName: String) {
    BILL("Toàn bộ hóa đơn"),
    ITEM("Món cụ thể"),
    CATEGORY("Danh mục"),
    PRODUCT_TYPE("Loại sản phẩm")
}

// Hiển thị coupon trong PaymentDialog
data class CouponDisplayItem(
    val id: String,
    val code: String,
    val name: String,
    val description: String?,
    val couponType: String,      // percentage, fixed
    val applyTo: String,         // bill, item, category
    val discountValue: Double,
    val maxDiscount: Double?,
    val minOrderAmount: Double,
    val isApplied: Boolean = false,
    // Usage limits
    val usageLimit: Int? = null,
    val usageCount: Int = 0,
    val dailyLimit: Int? = null,
    val dailyUsageCount: Int = 0,
    // Date validity
    val startDate: String? = null,
    val endDate: String? = null,
    // Availability status - computed based on conditions
    val isAvailable: Boolean = true,
    val unavailableReason: String? = null
)

data class AppliedDiscount(
    val couponId: String,
    val code: String,
    val name: String,
    val discountType: String,  // percentage, fixed
    val discountValue: Double,
    val discountAmount: Long,   // Số tiền thực tế được giảm
    val target: DiscountTarget = DiscountTarget.BILL,  // Đối tượng áp dụng
    val targetName: String? = null  // Tên đối tượng cụ thể (tên món, tên danh mục...)
)

/**
 * Thông tin món để hiển thị trong PaymentDialog
 */
data class PaymentOrderItem(
    val id: String,
    val name: String,
    val quantity: Int,
    val unitPrice: Long,
    val totalPrice: Long,
    val discountAmount: Long = 0,
    val categoryId: String? = null,
    val categoryName: String? = null,
    val vatRate: Double = 0.0 // % VAT (8, 10, etc.)
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PaymentDialog(
    totalAmount: Long,
    subtotal: Long = totalAmount,
    discountAmount: Long = 0,
    vatAmount: Long = 0,
    appliedDiscounts: List<AppliedDiscount> = emptyList(),
    couponCode: String = "",
    couponError: String? = null,
    isApplyingCoupon: Boolean = false,
    availableCoupons: List<CouponDisplayItem> = emptyList(), // Danh sách tất cả coupon (bao gồm cả không khả dụng)
    // Order items for item-level discount
    orderItems: List<PaymentOrderItem> = emptyList(),
    // Discount breakdown for clear display
    itemDiscountTotal: Long = 0,
    billDiscountTotal: Long = 0,
    billDiscountDescription: String? = null,  // e.g. "Giảm 10%" or "Giảm 50,000đ"
    onCouponCodeChange: (String) -> Unit = {},
    onApplyCoupon: () -> Unit = {},
    onApplyCouponById: (String) -> Unit = {}, // Áp dụng coupon theo ID
    onRemoveDiscount: (String) -> Unit = {},
    // Manual discount callbacks
    onApplyManualDiscount: (amount: Long, reason: String?) -> Unit = { _, _ -> },
    onApplyPercentDiscount: (percent: Int, reason: String?) -> Unit = { _, _ -> },
    onApplyItemDiscount: (itemId: String, amount: Long, discountType: String) -> Unit = { _, _, _ -> },
    onApplyCategoryDiscount: (categoryId: String, percent: Int) -> Unit = { _, _ -> },
    onClearDiscount: () -> Unit = {},
    onClearItemDiscounts: () -> Unit = {},
    onClearBillDiscount: () -> Unit = {},
    onPrintTemporaryBill: () -> Unit = {}, // In bill tạm (sau khi đã áp dụng giảm giá)
    lastPaymentMethod: PaymentMethod = PaymentMethod.CASH, // Phương thức thanh toán gần nhất
    onDismiss: () -> Unit,
    onPaymentComplete: (List<Payment>) -> Unit
) {
    // Auto-select last used payment method
    var selectedMethod by remember { mutableStateOf(lastPaymentMethod) }
    // Auto-fill with total amount
    var receivedAmountText by remember { mutableStateOf(totalAmount.toString()) }
    // Track if first click on input field (to clear on first click)
    var isFirstClickOnInput by remember { mutableStateOf(true) }

    // Discount section state
    var showDiscountSection by remember { mutableStateOf(false) }
    var discountTab by remember { mutableStateOf(0) } // 0=Món (ưu tiên 1), 1=Bill (ưu tiên 2), 2=Coupon

    // VAT detail popup state
    var showVatDetail by remember { mutableStateOf(false) }

    val receivedAmount = receivedAmountText.toLongOrNull() ?: 0L
    val changeAmount = if (receivedAmount >= totalAmount) receivedAmount - totalAmount else 0L
    val canComplete = when (selectedMethod) {
        PaymentMethod.CASH -> receivedAmount >= totalAmount
        else -> true
    }

    // Get unique categories from order items
    val categories = remember(orderItems) {
        orderItems.mapNotNull { item ->
            if (item.categoryId != null && item.categoryName != null) {
                item.categoryId to item.categoryName
            } else null
        }.distinctBy { it.first }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // ===== HEADER =====
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF4CAF50))
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Receipt,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Thanh toán",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    Text(
                        text = formatCurrency(totalAmount),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng", tint = Color.White)
                    }
                }

                // ===== PAYMENT METHOD TABS =====
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER).forEach { method ->
                        val isSelected = selectedMethod == method
                        Card(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    selectedMethod = method
                                    receivedAmountText = if (method != PaymentMethod.CASH) totalAmount.toString() else ""
                                },
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) Color(0xFFFF5722) else MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp, horizontal = 16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Text(text = method.icon, fontSize = 20.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = method.displayName,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
                                )
                                if (isSelected) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Icon(Icons.Default.CheckCircle, null, tint = Color.White, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                }

                // ===== MAIN CONTENT =====
                Row(modifier = Modifier.weight(1f)) {
                    // ===== LEFT: Amount input + Numpad =====
                    Column(
                        modifier = Modifier
                            .weight(0.55f)
                            .fillMaxHeight()
                            .padding(12.dp)
                    ) {
                        if (selectedMethod == PaymentMethod.CASH) {
                            Text(
                                text = "Tiền khách đưa",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))

                            OutlinedTextField(
                                value = receivedAmountText,
                                onValueChange = { receivedAmountText = it.filter { c -> c.isDigit() } },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp)
                                    .onFocusChanged { focusState ->
                                        if (focusState.isFocused && isFirstClickOnInput) {
                                            receivedAmountText = ""
                                            isFirstClickOnInput = false
                                        }
                                    },
                                textStyle = MaterialTheme.typography.titleLarge.copy(
                                    textAlign = TextAlign.End,
                                    fontWeight = FontWeight.Bold
                                ),
                                suffix = { Text("đ", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.outline) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                shape = RoundedCornerShape(10.dp),
                                visualTransformation = ThousandSeparatorTransformation()
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            // Quick suggestions - 1 tap to select
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())
                            ) {
                                val suggestions = buildQuickAmountSuggestions(totalAmount)

                                suggestions.forEach { (amount, label) ->
                                    val isActive = receivedAmount == amount
                                    SuggestionChip(
                                        onClick = { receivedAmountText = amount.toString() },
                                        label = {
                                            Text(
                                                label ?: "${amount / 1000}k",
                                                fontSize = 10.sp,
                                                fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal
                                            )
                                        },
                                        colors = SuggestionChipDefaults.suggestionChipColors(
                                            containerColor = if (isActive) Color(0xFF4CAF50).copy(alpha = 0.2f)
                                            else MaterialTheme.colorScheme.surface
                                        )
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            NumPadCompact(
                                onNumberClick = { receivedAmountText += it },
                                onBackspace = { if (receivedAmountText.isNotEmpty()) receivedAmountText = receivedAmountText.dropLast(1) },
                                onClear = { receivedAmountText = "" }
                            )

                            Spacer(modifier = Modifier.weight(1f))

                            // Change display
                            if (receivedAmount >= totalAmount) {
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("💰 Tiền thừa:", style = MaterialTheme.typography.titleMedium)
                                        Text(
                                            formatCurrency(changeAmount),
                                            style = MaterialTheme.typography.headlineSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF4CAF50)
                                        )
                                    }
                                }
                            }
                        } else {
                            // Bank transfer UI
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(selectedMethod.icon, fontSize = 56.sp)
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(selectedMethod.displayName, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(formatCurrency(totalAmount), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Box(
                                        modifier = Modifier
                                            .size(140.dp)
                                            .background(Color.White, RoundedCornerShape(8.dp))
                                            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("QR Code", color = MaterialTheme.colorScheme.outline)
                                    }
                                }
                            }
                        }
                    }

                    // ===== RIGHT: Summary + Discount =====
                    Column(
                        modifier = Modifier
                            .weight(0.45f)
                            .fillMaxHeight()
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                            .padding(12.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Order summary - Compact layout (không hiển thị chi tiết VAT)
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                                // === TẠM TÍNH ===
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Tạm tính:", style = MaterialTheme.typography.bodyMedium)
                                    Text(formatCurrency(subtotal), style = MaterialTheme.typography.bodyMedium)
                                }

                                // === GIẢM GIÁ (nếu có) - hiển thị tổng ===
                                if (discountAmount > 0) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("Giảm giá", style = MaterialTheme.typography.bodySmall, color = Success)
                                        Text(
                                            "-${formatCurrency(discountAmount)}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Success,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }

                                // === TỔNG THANH TOÁN ===
                                HorizontalDivider(modifier = Modifier.padding(vertical = 6.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("TỔNG:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                    Text(formatCurrency(totalAmount), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge, color = Color(0xFFFF5722))
                                }
                                // VAT info - clickable to show detail
                                if (vatAmount > 0) {
                                    Row(
                                        modifier = Modifier
                                            .clickable { showVatDetail = true }
                                            .padding(vertical = 2.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            "(Đã bao gồm VAT: ${formatCurrency(vatAmount)})",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontSize = 10.sp,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Icon(
                                            Icons.Default.Info,
                                            contentDescription = "Xem chi tiết VAT",
                                            modifier = Modifier.size(12.dp),
                                            tint = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // ===== DISCOUNT SECTION - Minimal Touch Design =====
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                // Header - always visible
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { showDiscountSection = !showDiscountSection }
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.LocalOffer,
                                            contentDescription = null,
                                            modifier = Modifier.size(20.dp),
                                            tint = if (discountAmount > 0) Success else MaterialTheme.colorScheme.outline
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Giảm giá", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        if (discountAmount > 0) {
                                            Badge(containerColor = Success) {
                                                Text("-${formatCurrency(discountAmount)}", fontSize = 10.sp, color = Color.White)
                                            }
                                            Spacer(modifier = Modifier.width(4.dp))
                                        }
                                        Icon(
                                            if (showDiscountSection) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                            contentDescription = null,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }

                                // === DISCOUNT BREAKDOWN - hiển thị chi tiết từng loại ===
                                if (discountAmount > 0) {
                                    // Tính toán để hiển thị ký tự tree đúng
                                    val hasItemDiscount = itemDiscountTotal > 0
                                    val hasBillDiscount = billDiscountTotal > 0
                                    val hasCoupon = appliedDiscounts.isNotEmpty()

                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 12.dp)
                                            .padding(bottom = 8.dp)
                                    ) {
                                        // 1. Item discounts - Giảm giá theo món
                                        if (hasItemDiscount) {
                                            val isLastItem = !hasBillDiscount && !hasCoupon
                                            Card(
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                                colors = CardDefaults.cardColors(containerColor = Success.copy(alpha = 0.08f)),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                                        Text(if (isLastItem) "└" else "├", color = MaterialTheme.colorScheme.outline, fontSize = 12.sp)
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Text("Theo món", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                                    }
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text("-${formatCurrency(itemDiscountTotal)}", color = Success, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                        IconButton(onClick = onClearItemDiscounts, modifier = Modifier.size(24.dp)) {
                                                            Icon(Icons.Default.Close, "Xóa giảm giá món", Modifier.size(14.dp), tint = MaterialTheme.colorScheme.error)
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // 2. Bill discounts - Giảm giá hóa đơn
                                        if (hasBillDiscount) {
                                            val isLastBill = !hasCoupon
                                            Card(
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                                colors = CardDefaults.cardColors(containerColor = Success.copy(alpha = 0.08f)),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                                        Text(if (isLastBill) "└" else "├", color = MaterialTheme.colorScheme.outline, fontSize = 12.sp)
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Text(
                                                            "Hóa đơn${billDiscountDescription?.let { " ($it)" } ?: ""}",
                                                            fontSize = 12.sp,
                                                            fontWeight = FontWeight.Medium,
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis
                                                        )
                                                    }
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text("-${formatCurrency(billDiscountTotal)}", color = Success, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                        IconButton(onClick = onClearBillDiscount, modifier = Modifier.size(24.dp)) {
                                                            Icon(Icons.Default.Close, "Xóa giảm giá HĐ", Modifier.size(14.dp), tint = MaterialTheme.colorScheme.error)
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // 3. Coupon discounts - Mã giảm giá
                                        appliedDiscounts.forEachIndexed { index, discount ->
                                            val isLastCoupon = index == appliedDiscounts.lastIndex
                                            Card(
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                                colors = CardDefaults.cardColors(containerColor = Success.copy(alpha = 0.08f)),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                                        Text(if (isLastCoupon) "└" else "├", color = MaterialTheme.colorScheme.outline, fontSize = 12.sp)
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Icon(Icons.Default.LocalOffer, null, Modifier.size(14.dp), tint = Success)
                                                        Spacer(modifier = Modifier.width(4.dp))
                                                        Text(discount.code, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text("-${formatCurrency(discount.discountAmount)}", color = Success, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                        IconButton(onClick = { onRemoveDiscount(discount.couponId) }, modifier = Modifier.size(24.dp)) {
                                                            Icon(Icons.Default.Close, "Xóa coupon", Modifier.size(14.dp), tint = MaterialTheme.colorScheme.error)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // Discount content
                                AnimatedVisibility(
                                    visible = showDiscountSection,
                                    enter = expandVertically(),
                                    exit = shrinkVertically()
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 12.dp)
                                            .padding(bottom = 12.dp)
                                    ) {
                                        HorizontalDivider()
                                        Spacer(modifier = Modifier.height(8.dp))

                                        // Tab selection - Thứ tự ưu tiên: Theo món (1) → Hóa đơn (2) → Mã giảm giá (3)
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            listOf("Theo món", "Hóa đơn", "Mã giảm giá").forEachIndexed { index, label ->
                                                FilterChip(
                                                    selected = discountTab == index,
                                                    onClick = { discountTab = index },
                                                    label = { Text(label, fontSize = 10.sp) },
                                                    modifier = Modifier.weight(1f),
                                                    colors = FilterChipDefaults.filterChipColors(
                                                        selectedContainerColor = Color(0xFFFF5722),
                                                        selectedLabelColor = Color.White
                                                    )
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(8.dp))

                                        when (discountTab) {
                                            1 -> {
                                                // Bill discount - Ưu tiên 2 (sau giảm giá món)
                                                // Preset values
                                                val presetPercents = listOf(5, 10, 15, 20, 30)
                                                val presetAmounts = listOf(5000L, 10000L, 20000L, 50000L, 100000L)

                                                // Parse billDiscountDescription to determine type and value
                                                // Format: "Giảm X%" for percent, "Giảm X,XXXđ" for amount
                                                val isPercentDiscount = billDiscountDescription?.contains("%") == true
                                                val parsedPercent = if (isPercentDiscount && billDiscountTotal > 0) {
                                                    billDiscountDescription?.replace(Regex("[^0-9]"), "")?.toIntOrNull()
                                                } else null

                                                // Check if value matches a preset
                                                val isPresetPercent = parsedPercent != null && parsedPercent in presetPercents
                                                val isPresetAmount = !isPercentDiscount && billDiscountTotal in presetAmounts

                                                // State for custom input and discount type selection
                                                // Initialize based on applied discount - show value in TextField for both preset and custom
                                                var customPercentText by remember(billDiscountTotal, billDiscountDescription) {
                                                    mutableStateOf(if (isPercentDiscount && parsedPercent != null) parsedPercent.toString() else "")
                                                }
                                                var customAmountText by remember(billDiscountTotal, billDiscountDescription) {
                                                    mutableStateOf(if (!isPercentDiscount && billDiscountTotal > 0) billDiscountTotal.toString() else "")
                                                }
                                                // 0 = none, 1 = percent, 2 = fixed amount
                                                var selectedDiscountType by remember(billDiscountTotal) {
                                                    mutableStateOf(
                                                        when {
                                                            billDiscountTotal == 0L -> 0
                                                            isPercentDiscount -> 1
                                                            else -> 2
                                                        }
                                                    )
                                                }
                                                var selectedPercentValue by remember(billDiscountTotal, billDiscountDescription) {
                                                    // Only set if it matches a preset chip
                                                    mutableStateOf(if (isPresetPercent) parsedPercent else null)
                                                }
                                                var selectedAmountValue by remember(billDiscountTotal, billDiscountDescription) {
                                                    // Only set if it matches a preset chip
                                                    mutableStateOf(if (isPresetAmount) billDiscountTotal else null)
                                                }

                                                // Bill discount - Giảm % section
                                                Text("Giảm %:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                                                    listOf(5, 10, 15, 20, 30).forEach { percent ->
                                                        FilterChip(
                                                            selected = selectedDiscountType == 1 && selectedPercentValue == percent,
                                                            onClick = {
                                                                // Clear fixed amount selection
                                                                customAmountText = ""
                                                                selectedAmountValue = null
                                                                // Set percent selection and show in TextField
                                                                selectedDiscountType = 1
                                                                selectedPercentValue = percent
                                                                customPercentText = percent.toString()
                                                                onApplyPercentDiscount(percent, "Giảm $percent%")
                                                            },
                                                            label = { Text("$percent%", fontSize = 10.sp) },
                                                            modifier = Modifier.weight(1f),
                                                            colors = FilterChipDefaults.filterChipColors(
                                                                selectedContainerColor = Color(0xFFFF5722),
                                                                selectedLabelColor = Color.White
                                                            )
                                                        )
                                                    }
                                                }

                                                // Custom percentage input
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Row(
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    OutlinedTextField(
                                                        value = customPercentText,
                                                        onValueChange = {
                                                            val filtered = it.filter { c -> c.isDigit() }
                                                            if (filtered.isEmpty() || filtered.toIntOrNull()?.let { v -> v <= 100 } == true) {
                                                                customPercentText = filtered
                                                                // Clear fixed amount when typing percent
                                                                if (filtered.isNotEmpty()) {
                                                                    customAmountText = ""
                                                                    selectedAmountValue = null
                                                                    selectedPercentValue = null // Clear chip selection
                                                                }
                                                            }
                                                        },
                                                        placeholder = { Text("Nhập %", fontSize = 11.sp) },
                                                        modifier = Modifier.weight(1f).height(48.dp),
                                                        singleLine = true,
                                                        textStyle = MaterialTheme.typography.bodySmall,
                                                        keyboardOptions = KeyboardOptions(
                                                            keyboardType = KeyboardType.Number,
                                                            imeAction = ImeAction.Done
                                                        ),
                                                        keyboardActions = KeyboardActions(
                                                            onDone = {
                                                                customPercentText.toIntOrNull()?.let { percent ->
                                                                    if (percent in 1..100) {
                                                                        selectedDiscountType = 1
                                                                        selectedPercentValue = null // Custom value, not from chips
                                                                        selectedAmountValue = null
                                                                        onApplyPercentDiscount(percent, "Giảm $percent%")
                                                                        // Keep the value visible - don't clear
                                                                    }
                                                                }
                                                            }
                                                        ),
                                                        suffix = { Text("%", fontSize = 11.sp, color = MaterialTheme.colorScheme.outline) }
                                                    )
                                                    Button(
                                                        onClick = {
                                                            customPercentText.toIntOrNull()?.let { percent ->
                                                                if (percent in 1..100) {
                                                                    selectedDiscountType = 1
                                                                    selectedPercentValue = null // Custom value, not from chips
                                                                    selectedAmountValue = null
                                                                    customAmountText = ""
                                                                    onApplyPercentDiscount(percent, "Giảm $percent%")
                                                                    // Keep the value visible - don't clear customPercentText
                                                                }
                                                            }
                                                        },
                                                        enabled = customPercentText.toIntOrNull()?.let { it in 1..100 } == true,
                                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                        modifier = Modifier.height(48.dp)
                                                    ) {
                                                        Text("Áp dụng", fontSize = 11.sp)
                                                    }
                                                }

                                                Spacer(modifier = Modifier.height(6.dp))
                                                Text("Giảm tiền:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                                Row(
                                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())
                                                ) {
                                                    listOf(5000L, 10000L, 20000L, 50000L, 100000L).forEach { amount ->
                                                        FilterChip(
                                                            selected = selectedDiscountType == 2 && selectedAmountValue == amount,
                                                            onClick = {
                                                                // Clear percent selection
                                                                customPercentText = ""
                                                                selectedPercentValue = null
                                                                // Set amount selection and show in TextField
                                                                selectedDiscountType = 2
                                                                selectedAmountValue = amount
                                                                customAmountText = amount.toString()
                                                                onApplyManualDiscount(amount, "Giảm ${formatCurrency(amount)}")
                                                            },
                                                            label = { Text("${amount/1000}k", fontSize = 10.sp) },
                                                            colors = FilterChipDefaults.filterChipColors(
                                                                selectedContainerColor = Color(0xFFFF5722),
                                                                selectedLabelColor = Color.White
                                                            )
                                                        )
                                                    }
                                                }

                                                // Custom amount input
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Row(
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    OutlinedTextField(
                                                        value = customAmountText,
                                                        onValueChange = {
                                                            customAmountText = it.filter { c -> c.isDigit() }
                                                            // Clear percent when typing amount
                                                            if (it.isNotEmpty()) {
                                                                customPercentText = ""
                                                                selectedPercentValue = null
                                                                selectedAmountValue = null // Clear chip selection
                                                            }
                                                        },
                                                        placeholder = { Text("Nhập số tiền", fontSize = 11.sp) },
                                                        modifier = Modifier.weight(1f).height(48.dp),
                                                        singleLine = true,
                                                        textStyle = MaterialTheme.typography.bodySmall,
                                                        keyboardOptions = KeyboardOptions(
                                                            keyboardType = KeyboardType.Number,
                                                            imeAction = ImeAction.Done
                                                        ),
                                                        keyboardActions = KeyboardActions(
                                                            onDone = {
                                                                customAmountText.toLongOrNull()?.let { amount ->
                                                                    if (amount > 0) {
                                                                        selectedDiscountType = 2
                                                                        selectedAmountValue = null // Custom value, not from chips
                                                                        selectedPercentValue = null
                                                                        onApplyManualDiscount(amount, "Giảm ${formatCurrency(amount)}")
                                                                        // Keep the value visible - don't clear
                                                                    }
                                                                }
                                                            }
                                                        ),
                                                        suffix = { Text("đ", fontSize = 11.sp, color = MaterialTheme.colorScheme.outline) }
                                                    )
                                                    Button(
                                                        onClick = {
                                                            customAmountText.toLongOrNull()?.let { amount ->
                                                                if (amount > 0) {
                                                                    selectedDiscountType = 2
                                                                    selectedAmountValue = null // Custom value, not from chips
                                                                    selectedPercentValue = null
                                                                    customPercentText = ""
                                                                    onApplyManualDiscount(amount, "Giảm ${formatCurrency(amount)}")
                                                                    // Keep the value visible - don't clear customAmountText
                                                                }
                                                            }
                                                        },
                                                        enabled = customAmountText.toLongOrNull()?.let { it > 0 } == true,
                                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                        modifier = Modifier.height(48.dp)
                                                    ) {
                                                        Text("Áp dụng", fontSize = 11.sp)
                                                    }
                                                }

                                                // Clear button
                                                if (discountAmount > 0 && appliedDiscounts.isEmpty()) {
                                                    Spacer(modifier = Modifier.height(4.dp))
                                                    TextButton(
                                                        onClick = {
                                                            selectedDiscountType = 0
                                                            selectedPercentValue = null
                                                            selectedAmountValue = null
                                                            customPercentText = ""
                                                            customAmountText = ""
                                                            onClearDiscount()
                                                        },
                                                        modifier = Modifier.align(Alignment.End),
                                                        contentPadding = PaddingValues(4.dp)
                                                    ) {
                                                        Icon(Icons.Default.Clear, null, Modifier.size(12.dp), tint = MaterialTheme.colorScheme.error)
                                                        Text("Xóa", color = MaterialTheme.colorScheme.error, fontSize = 10.sp)
                                                    }
                                                }
                                            }

                                            0 -> {
                                                // Item discount - Ưu tiên 1 (giảm giá món trước)
                                                // Direct buttons
                                                if (orderItems.isEmpty()) {
                                                    Text("Không có món để giảm giá", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                                                } else {
                                                    // Show items with discounts first for easy verification
                                                    val itemsWithDiscount = orderItems.filter { it.discountAmount > 0 }
                                                    val itemsWithoutDiscount = orderItems.filter { it.discountAmount == 0L }

                                                    // Summary of items with discount
                                                    if (itemsWithDiscount.isNotEmpty()) {
                                                        Card(
                                                            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                                                            colors = CardDefaults.cardColors(containerColor = Success.copy(alpha = 0.1f)),
                                                            shape = RoundedCornerShape(8.dp)
                                                        ) {
                                                            Column(modifier = Modifier.padding(8.dp)) {
                                                                Text(
                                                                    "Món đã giảm giá (${itemsWithDiscount.size}):",
                                                                    style = MaterialTheme.typography.labelSmall,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = Success
                                                                )
                                                                itemsWithDiscount.forEach { item ->
                                                                    Row(
                                                                        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                                        verticalAlignment = Alignment.CenterVertically
                                                                    ) {
                                                                        Text(
                                                                            item.name,
                                                                            style = MaterialTheme.typography.bodySmall,
                                                                            modifier = Modifier.weight(1f),
                                                                            maxLines = 1,
                                                                            overflow = TextOverflow.Ellipsis
                                                                        )
                                                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                                                            Text(
                                                                                "-${formatCurrency(item.discountAmount)}",
                                                                                color = Success,
                                                                                fontSize = 11.sp,
                                                                                fontWeight = FontWeight.Bold
                                                                            )
                                                                            IconButton(
                                                                                onClick = { onApplyItemDiscount(item.id, 0, "fixed") },
                                                                                modifier = Modifier.size(18.dp)
                                                                            ) {
                                                                                Icon(
                                                                                    Icons.Default.Close,
                                                                                    "Xóa giảm giá",
                                                                                    Modifier.size(12.dp),
                                                                                    tint = MaterialTheme.colorScheme.error
                                                                                )
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }

                                                    // List all items for applying discount
                                                    Text(
                                                        if (itemsWithDiscount.isEmpty()) "Chọn món để giảm giá:" else "Thêm giảm giá cho món khác:",
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = MaterialTheme.colorScheme.outline
                                                    )
                                                    Spacer(modifier = Modifier.height(4.dp))

                                                    orderItems.take(5).forEach { item ->
                                                        var expanded by remember { mutableStateOf(false) }

                                                        // Detect if discount matches a preset percent value
                                                        val presetPercents = listOf(5, 10, 20, 50)
                                                        val presetAmounts = listOf(5000L, 10000L, 20000L)

                                                        // Check if discount matches a percent preset
                                                        val matchedPercent = presetPercents.find { percent ->
                                                            item.totalPrice * percent / 100 == item.discountAmount
                                                        }
                                                        val isPercentDiscount = matchedPercent != null
                                                        val isPresetAmount = item.discountAmount in presetAmounts

                                                        // Initialize state based on discount type (like bill discount)
                                                        var customItemPercentText by remember(item.discountAmount) {
                                                            mutableStateOf(if (isPercentDiscount && matchedPercent != null) matchedPercent.toString() else "")
                                                        }
                                                        var customItemAmountText by remember(item.discountAmount) {
                                                            mutableStateOf(if (!isPercentDiscount && item.discountAmount > 0) item.discountAmount.toString() else "")
                                                        }
                                                        // 0 = none, 1 = percent, 2 = amount
                                                        var itemDiscountType by remember(item.discountAmount) {
                                                            mutableStateOf(
                                                                when {
                                                                    item.discountAmount == 0L -> 0
                                                                    isPercentDiscount -> 1
                                                                    else -> 2
                                                                }
                                                            )
                                                        }
                                                        var selectedItemPercentValue by remember(item.discountAmount) {
                                                            mutableStateOf(if (isPercentDiscount) matchedPercent else null)
                                                        }
                                                        var selectedItemAmountValue by remember(item.discountAmount) {
                                                            mutableStateOf(if (isPresetAmount && !isPercentDiscount) item.discountAmount else null)
                                                        }

                                                        Column(modifier = Modifier.fillMaxWidth()) {
                                                            Row(
                                                                modifier = Modifier
                                                                    .fillMaxWidth()
                                                                    .clickable { expanded = !expanded }
                                                                    .padding(vertical = 4.dp)
                                                                    .background(
                                                                        if (item.discountAmount > 0) Success.copy(alpha = 0.05f)
                                                                        else Color.Transparent,
                                                                        RoundedCornerShape(4.dp)
                                                                    ),
                                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                                verticalAlignment = Alignment.CenterVertically
                                                            ) {
                                                                Column(modifier = Modifier.weight(1f)) {
                                                                    Text(item.name, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                                    Text("${formatCurrency(item.totalPrice)} x${item.quantity}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                                                }
                                                                if (item.discountAmount > 0) {
                                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                                        Badge(containerColor = Success) {
                                                                            Text("-${formatCurrency(item.discountAmount)}", fontSize = 9.sp, color = Color.White)
                                                                        }
                                                                        IconButton(
                                                                            onClick = { onApplyItemDiscount(item.id, 0, "fixed") },
                                                                            modifier = Modifier.size(20.dp)
                                                                        ) {
                                                                            Icon(
                                                                                Icons.Default.Close,
                                                                                "Xóa",
                                                                                Modifier.size(14.dp),
                                                                                tint = MaterialTheme.colorScheme.error
                                                                            )
                                                                        }
                                                                    }
                                                                }
                                                                Icon(
                                                                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ChevronRight,
                                                                    null, Modifier.size(16.dp)
                                                                )
                                                            }

                                                            AnimatedVisibility(visible = expanded) {
                                                                Column(modifier = Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, bottom = 8.dp)) {
                                                                    // Preset percentage chips
                                                                    Text("Giảm %:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                                                    Spacer(modifier = Modifier.height(2.dp))
                                                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                                                                        listOf(5, 10, 20, 50).forEach { percent ->
                                                                            val discountForPercent = item.totalPrice * percent / 100
                                                                            FilterChip(
                                                                                selected = itemDiscountType == 1 && selectedItemPercentValue == percent,
                                                                                onClick = {
                                                                                    // Clear amount selection
                                                                                    customItemAmountText = ""
                                                                                    selectedItemAmountValue = null
                                                                                    // Set percent selection
                                                                                    itemDiscountType = 1
                                                                                    selectedItemPercentValue = percent
                                                                                    customItemPercentText = percent.toString()
                                                                                    onApplyItemDiscount(item.id, discountForPercent, "percent")
                                                                                },
                                                                                label = { Text("$percent%", fontSize = 10.sp) },
                                                                                modifier = Modifier.height(28.dp),
                                                                                colors = FilterChipDefaults.filterChipColors(
                                                                                    selectedContainerColor = Color(0xFFFF5722),
                                                                                    selectedLabelColor = Color.White
                                                                                )
                                                                            )
                                                                        }
                                                                    }

                                                                    // Custom percentage input - same as bill discount
                                                                    Spacer(modifier = Modifier.height(4.dp))
                                                                    Row(
                                                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                                        verticalAlignment = Alignment.CenterVertically,
                                                                        modifier = Modifier.fillMaxWidth()
                                                                    ) {
                                                                        OutlinedTextField(
                                                                            value = customItemPercentText,
                                                                            onValueChange = {
                                                                                val filtered = it.filter { c -> c.isDigit() }
                                                                                if (filtered.isEmpty() || filtered.toIntOrNull()?.let { v -> v <= 100 } == true) {
                                                                                    customItemPercentText = filtered
                                                                                    if (filtered.isNotEmpty()) {
                                                                                        customItemAmountText = ""
                                                                                        itemDiscountType = 1
                                                                                        selectedItemAmountValue = null
                                                                                        selectedItemPercentValue = null // Custom value, not preset
                                                                                    }
                                                                                }
                                                                            },
                                                                            placeholder = { Text("Nhập %", fontSize = 11.sp) },
                                                                            modifier = Modifier.weight(1f).height(48.dp),
                                                                            singleLine = true,
                                                                            textStyle = MaterialTheme.typography.bodySmall,
                                                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                                                                            keyboardActions = KeyboardActions(
                                                                                onDone = {
                                                                                    customItemPercentText.toIntOrNull()?.let { percent ->
                                                                                        if (percent in 1..100) {
                                                                                            selectedItemPercentValue = null
                                                                                            selectedItemAmountValue = null
                                                                                            onApplyItemDiscount(item.id, item.totalPrice * percent / 100, "percent")
                                                                                        }
                                                                                    }
                                                                                }
                                                                            ),
                                                                            suffix = { Text("%", fontSize = 11.sp, color = MaterialTheme.colorScheme.outline) }
                                                                        )
                                                                        Button(
                                                                            onClick = {
                                                                                customItemPercentText.toIntOrNull()?.let { percent ->
                                                                                    if (percent in 1..100) {
                                                                                        selectedItemPercentValue = null
                                                                                        selectedItemAmountValue = null
                                                                                        onApplyItemDiscount(item.id, item.totalPrice * percent / 100, "percent")
                                                                                    }
                                                                                }
                                                                            },
                                                                            enabled = customItemPercentText.toIntOrNull()?.let { it in 1..100 } == true,
                                                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                                            modifier = Modifier.height(48.dp)
                                                                        ) {
                                                                            Text("Áp dụng", fontSize = 11.sp)
                                                                        }
                                                                    }

                                                                    // Fixed amount section
                                                                    Spacer(modifier = Modifier.height(6.dp))
                                                                    Text("Giảm tiền:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                                                    Spacer(modifier = Modifier.height(2.dp))
                                                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                                                                        listOf(5000L, 10000L, 20000L).forEach { amount ->
                                                                            FilterChip(
                                                                                selected = itemDiscountType == 2 && selectedItemAmountValue == amount,
                                                                                onClick = {
                                                                                    if (amount <= item.totalPrice) {
                                                                                        // Clear percent selection
                                                                                        customItemPercentText = ""
                                                                                        selectedItemPercentValue = null
                                                                                        // Set amount selection
                                                                                        itemDiscountType = 2
                                                                                        selectedItemAmountValue = amount
                                                                                        customItemAmountText = amount.toString()
                                                                                        onApplyItemDiscount(item.id, amount, "fixed")
                                                                                    }
                                                                                },
                                                                                label = { Text("${amount/1000}k", fontSize = 10.sp) },
                                                                                modifier = Modifier.height(28.dp),
                                                                                enabled = amount <= item.totalPrice,
                                                                                colors = FilterChipDefaults.filterChipColors(
                                                                                    selectedContainerColor = Color(0xFFFF5722),
                                                                                    selectedLabelColor = Color.White
                                                                                )
                                                                            )
                                                                        }
                                                                    }

                                                                    // Custom amount input - same as bill discount
                                                                    Spacer(modifier = Modifier.height(4.dp))
                                                                    Row(
                                                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                                        verticalAlignment = Alignment.CenterVertically,
                                                                        modifier = Modifier.fillMaxWidth()
                                                                    ) {
                                                                        OutlinedTextField(
                                                                            value = customItemAmountText,
                                                                            onValueChange = {
                                                                                customItemAmountText = it.filter { c -> c.isDigit() }
                                                                                if (it.isNotEmpty()) {
                                                                                    customItemPercentText = ""
                                                                                    itemDiscountType = 2
                                                                                    selectedItemPercentValue = null
                                                                                    selectedItemAmountValue = null // Custom value, not preset
                                                                                }
                                                                            },
                                                                            placeholder = { Text("Nhập số tiền", fontSize = 11.sp) },
                                                                            modifier = Modifier.weight(1f).height(48.dp),
                                                                            singleLine = true,
                                                                            textStyle = MaterialTheme.typography.bodySmall,
                                                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                                                                            keyboardActions = KeyboardActions(
                                                                                onDone = {
                                                                                    customItemAmountText.toLongOrNull()?.let { amount ->
                                                                                        if (amount > 0 && amount <= item.totalPrice) {
                                                                                            selectedItemPercentValue = null
                                                                                            selectedItemAmountValue = null
                                                                                            onApplyItemDiscount(item.id, amount, "fixed")
                                                                                        }
                                                                                    }
                                                                                }
                                                                            ),
                                                                            suffix = { Text("đ", fontSize = 11.sp, color = MaterialTheme.colorScheme.outline) }
                                                                        )
                                                                        Button(
                                                                            onClick = {
                                                                                customItemAmountText.toLongOrNull()?.let { amount ->
                                                                                    if (amount > 0 && amount <= item.totalPrice) {
                                                                                        selectedItemPercentValue = null
                                                                                        selectedItemAmountValue = null
                                                                                        onApplyItemDiscount(item.id, amount, "fixed")
                                                                                    }
                                                                                }
                                                                            },
                                                                            enabled = customItemAmountText.toLongOrNull()?.let { it > 0 && it <= item.totalPrice } == true,
                                                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                                            modifier = Modifier.height(48.dp)
                                                                        ) {
                                                                            Text("Áp dụng", fontSize = 11.sp)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                                                    }

                                                    // Category discount
                                                    if (categories.isNotEmpty()) {
                                                        Spacer(modifier = Modifier.height(8.dp))
                                                        Text("Theo danh mục:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                                        categories.take(3).forEach { (categoryId, categoryName) ->
                                                            var expanded by remember { mutableStateOf(false) }
                                                            val itemsInCat = orderItems.filter { it.categoryId == categoryId }
                                                            Column {
                                                                Row(
                                                                    modifier = Modifier
                                                                        .fillMaxWidth()
                                                                        .clickable { expanded = !expanded }
                                                                        .padding(vertical = 4.dp),
                                                                    horizontalArrangement = Arrangement.SpaceBetween
                                                                ) {
                                                                    Text("$categoryName (${itemsInCat.size})", style = MaterialTheme.typography.bodySmall)
                                                                    Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ChevronRight, null, Modifier.size(14.dp))
                                                                }
                                                                AnimatedVisibility(visible = expanded) {
                                                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(start = 8.dp)) {
                                                                        listOf(5, 10, 15, 20).forEach { percent ->
                                                                            FilterChip(
                                                                                selected = false,
                                                                                onClick = {
                                                                                    onApplyCategoryDiscount(categoryId, percent)
                                                                                    expanded = false
                                                                                },
                                                                                label = { Text("$percent%", fontSize = 9.sp) },
                                                                                modifier = Modifier.height(24.dp)
                                                                            )
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            2 -> {
                                                // Coupon section
                                                // Note: Không dùng verticalScroll ở đây vì parent Column đã có verticalScroll rồi
                                                Column {
                                                    // Nhập mã coupon
                                                    Text("Nhập mã giảm giá:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                                    Spacer(modifier = Modifier.height(4.dp))
                                                    Row(
                                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        OutlinedTextField(
                                                            value = couponCode,
                                                            onValueChange = onCouponCodeChange,
                                                            placeholder = { Text("VD: SALE10", fontSize = 11.sp) },
                                                            modifier = Modifier.weight(1f),
                                                            singleLine = true,
                                                            textStyle = MaterialTheme.typography.bodySmall,
                                                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                                                            keyboardActions = KeyboardActions(onDone = { onApplyCoupon() }),
                                                            isError = couponError != null
                                                        )
                                                        Button(
                                                            onClick = onApplyCoupon,
                                                            enabled = !isApplyingCoupon && couponCode.isNotEmpty(),
                                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                                        ) {
                                                            if (isApplyingCoupon) {
                                                                CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                                                            } else {
                                                                Text("Áp dụng", fontSize = 11.sp)
                                                            }
                                                        }
                                                    }
                                                    if (couponError != null) {
                                                        Text(couponError, color = MaterialTheme.colorScheme.error, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp))
                                                    }

                                                    // Danh sách tất cả coupon
                                                    if (availableCoupons.isNotEmpty()) {
                                                        Spacer(modifier = Modifier.height(12.dp))
                                                        HorizontalDivider()
                                                        Spacer(modifier = Modifier.height(8.dp))

                                                        // Separate available and unavailable coupons
                                                        val usableCoupons = availableCoupons.filter { it.isAvailable }
                                                        val unavailableCoupons = availableCoupons.filter { !it.isAvailable }

                                                        // Available coupons section
                                                        if (usableCoupons.isNotEmpty()) {
                                                            Row(
                                                                modifier = Modifier.fillMaxWidth(),
                                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                                verticalAlignment = Alignment.CenterVertically
                                                            ) {
                                                                Text(
                                                                    "Có thể dùng (${usableCoupons.size}):",
                                                                    style = MaterialTheme.typography.labelSmall,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = Success
                                                                )
                                                            }
                                                            Spacer(modifier = Modifier.height(4.dp))

                                                            usableCoupons.forEach { coupon ->
                                                                val isAlreadyApplied = appliedDiscounts.any { it.couponId == coupon.id }
                                                                CouponCard(
                                                                    coupon = coupon,
                                                                    isApplied = isAlreadyApplied,
                                                                    currentOrderAmount = subtotal,
                                                                    onApply = { onApplyCouponById(coupon.id) },
                                                                    onRemove = { onRemoveDiscount(coupon.id) }
                                                                )
                                                                Spacer(modifier = Modifier.height(4.dp))
                                                            }
                                                        }

                                                        // Unavailable coupons section
                                                        if (unavailableCoupons.isNotEmpty()) {
                                                            if (usableCoupons.isNotEmpty()) {
                                                                Spacer(modifier = Modifier.height(8.dp))
                                                            }
                                                            Text(
                                                                "Chưa đủ điều kiện (${unavailableCoupons.size}):",
                                                                style = MaterialTheme.typography.labelSmall,
                                                                fontWeight = FontWeight.Medium,
                                                                color = MaterialTheme.colorScheme.outline
                                                            )
                                                            Spacer(modifier = Modifier.height(4.dp))

                                                            unavailableCoupons.forEach { coupon ->
                                                                CouponCard(
                                                                    coupon = coupon,
                                                                    isApplied = false,
                                                                    currentOrderAmount = subtotal,
                                                                    onApply = { },
                                                                    onRemove = { }
                                                                )
                                                                Spacer(modifier = Modifier.height(4.dp))
                                                            }
                                                        }
                                                    } else {
                                                        Spacer(modifier = Modifier.height(8.dp))
                                                        Text(
                                                            "Chưa có coupon nào",
                                                            fontSize = 10.sp,
                                                            color = MaterialTheme.colorScheme.outline,
                                                            fontStyle = FontStyle.Italic
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ===== FOOTER - Compact =====
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Hủy button
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(0.15f),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 12.dp)
                    ) {
                        Text("Hủy", fontSize = 13.sp)
                    }

                    // In Bill Tạm button
                    OutlinedButton(
                        onClick = onPrintTemporaryBill,
                        modifier = Modifier.weight(0.25f),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFFF9800))
                    ) {
                        Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Bill tạm", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    }

                    // Xác nhận button
                    Button(
                        onClick = {
                            val payment = Payment(
                                method = selectedMethod,
                                amount = totalAmount,
                                receivedAmount = if (selectedMethod == PaymentMethod.CASH) receivedAmount else null,
                                changeAmount = if (selectedMethod == PaymentMethod.CASH) changeAmount else null,
                                status = PaymentStatus.COMPLETED
                            )
                            onPaymentComplete(listOf(payment))
                        },
                        modifier = Modifier.weight(0.6f),
                        enabled = canComplete,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50),
                            disabledContainerColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                        )
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("THANH TOÁN", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        }
    }

    // VAT Detail Dialog
    if (showVatDetail) {
        VatDetailDialog(
            orderItems = orderItems,
            totalVatAmount = vatAmount,
            onDismiss = { showVatDetail = false }
        )
    }
}

@Composable
private fun VatDetailDialog(
    orderItems: List<PaymentOrderItem>,
    totalVatAmount: Long,
    onDismiss: () -> Unit
) {
    // Calculate VAT for each item
    val itemsWithVat = remember(orderItems) {
        orderItems.map { item ->
            val priceAfterDiscount = item.totalPrice - item.discountAmount
            val vatAmount = if (item.vatRate > 0) {
                // VAT đã bao gồm trong giá: price = priceBeforeVat * (1 + vatRate/100)
                // vatAmount = price - priceBeforeVat = price - price/(1+vatRate/100)
                val priceBeforeVat = priceAfterDiscount / (1 + item.vatRate / 100)
                (priceAfterDiscount - priceBeforeVat).toLong()
            } else 0L
            Triple(item, vatAmount, item.vatRate)
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Chi tiết VAT",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng", modifier = Modifier.size(20.dp))
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))

                // Header row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Món", fontWeight = FontWeight.Medium, fontSize = 12.sp, modifier = Modifier.weight(1f))
                    Text("Giá", fontWeight = FontWeight.Medium, fontSize = 12.sp, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                    Text("VAT %", fontWeight = FontWeight.Medium, fontSize = 12.sp, modifier = Modifier.width(50.dp), textAlign = TextAlign.End)
                    Text("Tiền VAT", fontWeight = FontWeight.Medium, fontSize = 12.sp, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                }

                Spacer(modifier = Modifier.height(4.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))

                // Items list
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(itemsWithVat.size) { index ->
                        val (item, itemVat, vatRate) = itemsWithVat[index]
                        val priceAfterDiscount = item.totalPrice - item.discountAmount

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    item.name,
                                    fontSize = 12.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    "x${item.quantity}",
                                    fontSize = 10.sp,
                                    color = MaterialTheme.colorScheme.outline
                                )
                            }
                            Text(
                                formatCurrency(priceAfterDiscount),
                                fontSize = 11.sp,
                                modifier = Modifier.width(80.dp),
                                textAlign = TextAlign.End
                            )
                            Text(
                                if (vatRate > 0) "${vatRate.toInt()}%" else "-",
                                fontSize = 11.sp,
                                modifier = Modifier.width(50.dp),
                                textAlign = TextAlign.End,
                                color = if (vatRate > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                            )
                            Text(
                                if (itemVat > 0) formatCurrency(itemVat) else "-",
                                fontSize = 11.sp,
                                fontWeight = if (itemVat > 0) FontWeight.Medium else FontWeight.Normal,
                                modifier = Modifier.width(80.dp),
                                textAlign = TextAlign.End,
                                color = if (itemVat > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))

                // Total VAT
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "Tổng VAT:",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        formatCurrency(totalVatAmount),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Close button
                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("Đóng")
                }
            }
        }
    }
}

@Composable
fun NumPadCompact(
    onNumberClick: (String) -> Unit,
    onBackspace: () -> Unit,
    onClear: () -> Unit
) {
    val buttons = listOf(
        listOf("1", "2", "3"),
        listOf("4", "5", "6"),
        listOf("7", "8", "9"),
        listOf("C", "0", "⌫")
    )

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        buttons.forEach { row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                row.forEach { button ->
                    Button(
                        onClick = {
                            when (button) {
                                "⌫" -> onBackspace()
                                "C" -> onClear()
                                else -> onNumberClick(button)
                            }
                        },
                        modifier = Modifier.weight(1f).height(44.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = when (button) {
                                "C" -> Color(0xFFFFEBEE)
                                "⌫" -> MaterialTheme.colorScheme.surfaceVariant
                                else -> Color(0xFFFFF3E0)
                            },
                            contentColor = when (button) {
                                "C" -> Color(0xFFD32F2F)
                                else -> MaterialTheme.colorScheme.onSurface
                            }
                        ),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(0.dp),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 1.dp)
                    ) {
                        Text(button, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}

private fun roundUp(amount: Long, unit: Long): Long {
    return ((amount + unit - 1) / unit) * unit
}

/**
 * Tạo danh sách gợi ý số tiền nhanh dựa trên tổng tiền
 * Gợi ý các mệnh giá phổ biến và làm tròn hợp lý
 */
private fun buildQuickAmountSuggestions(totalAmount: Long): List<Pair<Long, String?>> {
    val suggestions = mutableListOf<Pair<Long, String?>>()

    // 1. Số tiền chính xác (Đủ)
    suggestions.add(totalAmount to "Đủ")

    // 2. Làm tròn lên các mốc nhỏ (nếu khác totalAmount)
    val smallRoundUps = listOf(10000L, 20000L, 50000L, 100000L)
    smallRoundUps.forEach { unit ->
        val rounded = roundUp(totalAmount, unit)
        if (rounded > totalAmount && rounded !in suggestions.map { it.first }) {
            suggestions.add(rounded to null)
        }
    }

    // 3. Các mệnh giá tiền phổ biến (làm tròn lên)
    val commonDenominations = listOf(
        100000L, 200000L, 500000L,
        1000000L, 1500000L, 2000000L,
        3000000L, 5000000L, 10000000L
    )
    commonDenominations.forEach { denom ->
        if (denom >= totalAmount && denom !in suggestions.map { it.first }) {
            val label = when {
                denom >= 1000000L -> "${denom / 1000000}M"
                else -> "${denom / 1000}k"
            }
            suggestions.add(denom to label)
        }
    }

    // 4. Thêm các mốc tiền lẻ hữu ích cho số tiền lớn (VD: 1M + 100k, 1M + 200k)
    if (totalAmount > 500000L) {
        val baseAmounts = listOf(1000000L, 2000000L, 5000000L)
        val additions = listOf(100000L, 200000L, 500000L)
        baseAmounts.forEach { base ->
            additions.forEach { add ->
                val combined = base + add
                if (combined > totalAmount && combined !in suggestions.map { it.first }) {
                    val label = when {
                        combined == 1100000L -> "1.1M"
                        combined == 1200000L -> "1.2M"
                        combined == 1500000L -> "1.5M"
                        combined == 2100000L -> "2.1M"
                        combined == 2200000L -> "2.2M"
                        combined == 2500000L -> "2.5M"
                        combined >= 1000000L -> "${combined / 1000}k"
                        else -> "${combined / 1000}k"
                    }
                    suggestions.add(combined to label)
                }
            }
        }
    }

    // Sắp xếp theo số tiền và lấy tối đa 8 gợi ý
    return suggestions
        .distinctBy { it.first }
        .sortedBy { it.first }
        .take(8)
}

/**
 * Card hiển thị thông tin coupon với trạng thái chi tiết
 * @param onRemove Callback khi user click để bỏ chọn coupon đã áp dụng
 * @param currentOrderAmount Số tiền đơn hàng hiện tại (để tính thiếu bao nhiêu)
 */
@Composable
private fun CouponCard(
    coupon: CouponDisplayItem,
    isApplied: Boolean,
    currentOrderAmount: Long = 0,
    onApply: () -> Unit,
    onRemove: () -> Unit = {}
) {
    val discountText = when (coupon.couponType) {
        "percentage" -> {
            val maxText = coupon.maxDiscount?.let { " (max ${formatCurrency(it.toLong())})" } ?: ""
            "-${coupon.discountValue.toInt()}%$maxText"
        }
        else -> "-${formatCurrency(coupon.discountValue.toLong())}"
    }

    // Calculate usage remaining
    val usageRemaining = coupon.usageLimit?.let { it - coupon.usageCount }
    val dailyRemaining = coupon.dailyLimit?.let { it - coupon.dailyUsageCount }

    // Check if coupon is available
    val canUse = coupon.isAvailable && !isApplied

    // Build conditions info
    val missingAmount = if (coupon.minOrderAmount > 0 && currentOrderAmount < coupon.minOrderAmount.toLong()) {
        coupon.minOrderAmount.toLong() - currentOrderAmount
    } else null

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (canUse || isApplied) {
                    Modifier.clickable {
                        if (isApplied) onRemove() else onApply()
                    }
                } else Modifier
            ),
        colors = CardDefaults.cardColors(
            containerColor = when {
                isApplied -> Success.copy(alpha = 0.1f)
                !coupon.isAvailable -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            }
        ),
        border = when {
            isApplied -> BorderStroke(1.dp, Success)
            !coupon.isAvailable -> BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            else -> BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
        }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            // Left: Coupon info
            Column(modifier = Modifier.weight(1f)) {
                // Row 1: Code + Discount badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = coupon.code,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = when {
                            isApplied -> Success
                            !coupon.isAvailable -> MaterialTheme.colorScheme.outline
                            else -> MaterialTheme.colorScheme.primary
                        }
                    )
                    Badge(
                        containerColor = when {
                            isApplied -> Success
                            !coupon.isAvailable -> MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                            else -> Color(0xFFFF5722)
                        }
                    ) {
                        Text(discountText, fontSize = 9.sp, color = Color.White)
                    }
                }

                // Row 2: Name (compact)
                Text(
                    text = coupon.name,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = if (!coupon.isAvailable) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.onSurface
                )

                // Row 3: Usage info + Conditions (compact horizontal)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Usage remaining
                    if (usageRemaining != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Inventory,
                                null,
                                Modifier.size(10.dp),
                                tint = if (usageRemaining <= 0) MaterialTheme.colorScheme.error
                                       else if (usageRemaining <= 3) Color(0xFFFF9800)
                                       else MaterialTheme.colorScheme.outline
                            )
                            Text(
                                " ${coupon.usageCount}/${coupon.usageLimit}",
                                fontSize = 9.sp,
                                color = if (usageRemaining <= 0) MaterialTheme.colorScheme.error
                                       else MaterialTheme.colorScheme.outline
                            )
                        }
                    }

                    // Daily remaining
                    if (dailyRemaining != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Today,
                                null,
                                Modifier.size(10.dp),
                                tint = if (dailyRemaining <= 0) MaterialTheme.colorScheme.error
                                       else MaterialTheme.colorScheme.outline
                            )
                            Text(
                                " ${coupon.dailyUsageCount}/${coupon.dailyLimit}/ngày",
                                fontSize = 9.sp,
                                color = if (dailyRemaining <= 0) MaterialTheme.colorScheme.error
                                       else MaterialTheme.colorScheme.outline
                            )
                        }
                    }

                    // Min order amount
                    if (coupon.minOrderAmount > 0) {
                        Text(
                            "≥${formatCurrency(coupon.minOrderAmount.toLong())}",
                            fontSize = 9.sp,
                            color = if (missingAmount != null) MaterialTheme.colorScheme.error
                                   else MaterialTheme.colorScheme.outline
                        )
                    }
                }

                // Row 4: Unavailable reason or missing amount (if any)
                if (!coupon.isAvailable && coupon.unavailableReason != null) {
                    Text(
                        text = "⚠ ${coupon.unavailableReason}",
                        fontSize = 9.sp,
                        color = MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.Medium
                    )
                } else if (missingAmount != null && coupon.isAvailable) {
                    Text(
                        text = "Cần thêm ${formatCurrency(missingAmount)}",
                        fontSize = 9.sp,
                        color = Color(0xFFFF9800),
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Right: Action button
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(start = 4.dp)
            ) {
                when {
                    isApplied -> {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Đã áp dụng",
                            tint = Success,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    !coupon.isAvailable -> {
                        Icon(
                            imageVector = Icons.Default.Block,
                            contentDescription = "Không khả dụng",
                            tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    else -> {
                        Button(
                            onClick = onApply,
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                            modifier = Modifier.height(24.dp)
                        ) {
                            Text("Dùng", fontSize = 9.sp)
                        }
                    }
                }
            }
        }
    }
}

/**
 * VisualTransformation để hiển thị số tiền với dấu chấm ngàn
 * VD: 775000 -> 775.000
 */
private class ThousandSeparatorTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val originalText = text.text

        // Format số với dấu chấm ngàn
        val formattedText = if (originalText.isNotEmpty()) {
            try {
                val number = originalText.toLongOrNull() ?: 0L
                java.text.NumberFormat.getInstance(java.util.Locale("vi", "VN")).format(number)
            } catch (e: Exception) {
                originalText
            }
        } else {
            originalText
        }

        // Tạo OffsetMapping để cursor di chuyển đúng vị trí
        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                if (originalText.isEmpty()) return 0

                // Đếm số dấu chấm được thêm vào trước vị trí offset
                val digitsBeforeOffset = offset
                val dotsAdded = (digitsBeforeOffset - 1) / 3
                return (offset + dotsAdded).coerceAtMost(formattedText.length)
            }

            override fun transformedToOriginal(offset: Int): Int {
                if (formattedText.isEmpty()) return 0

                // Đếm số dấu chấm trước vị trí offset trong formatted text
                var dotsCount = 0
                for (i in 0 until offset.coerceAtMost(formattedText.length)) {
                    if (formattedText[i] == '.') dotsCount++
                }
                return (offset - dotsCount).coerceAtMost(originalText.length)
            }
        }

        return TransformedText(AnnotatedString(formattedText), offsetMapping)
    }
}

private fun formatCurrency(amount: Long): String {
    return java.text.NumberFormat.getInstance(java.util.Locale("vi", "VN")).format(amount) + "đ"
}
