package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
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
    val categoryName: String? = null
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
    // Order items for item-level discount
    orderItems: List<PaymentOrderItem> = emptyList(),
    onCouponCodeChange: (String) -> Unit = {},
    onApplyCoupon: () -> Unit = {},
    onRemoveDiscount: (String) -> Unit = {},
    // Manual discount callbacks
    onApplyManualDiscount: (amount: Long, reason: String?) -> Unit = { _, _ -> },
    onApplyPercentDiscount: (percent: Int, reason: String?) -> Unit = { _, _ -> },
    onApplyItemDiscount: (itemId: String, amount: Long) -> Unit = { _, _ -> },
    onApplyCategoryDiscount: (categoryId: String, percent: Int) -> Unit = { _, _ -> },
    onClearDiscount: () -> Unit = {},
    onDismiss: () -> Unit,
    onPaymentComplete: (List<Payment>) -> Unit
) {
    var selectedMethod by remember { mutableStateOf(PaymentMethod.CASH) }
    var receivedAmountText by remember { mutableStateOf("") }

    // Discount section state
    var showDiscountSection by remember { mutableStateOf(false) }
    var discountTab by remember { mutableStateOf(0) } // 0=Bill, 1=Món, 2=Coupon

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
                .fillMaxHeight(0.92f),
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
                            .padding(16.dp)
                    ) {
                        if (selectedMethod == PaymentMethod.CASH) {
                            Text(
                                text = "Tiền khách đưa",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))

                            OutlinedTextField(
                                value = receivedAmountText,
                                onValueChange = { receivedAmountText = it.filter { c -> c.isDigit() } },
                                modifier = Modifier.fillMaxWidth(),
                                textStyle = MaterialTheme.typography.headlineMedium.copy(
                                    textAlign = TextAlign.End,
                                    fontWeight = FontWeight.Bold
                                ),
                                suffix = { Text("đ", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.outline) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            // Quick suggestions - 1 tap to select
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                val suggestions = listOf(
                                    totalAmount to "Đủ",
                                    roundUp(totalAmount, 50000) to null,
                                    roundUp(totalAmount, 100000) to null,
                                    roundUp(totalAmount, 200000) to null,
                                    500000L to "500k"
                                ).filter { it.first >= totalAmount }.distinctBy { it.first }.take(5)

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

                            Spacer(modifier = Modifier.height(8.dp))

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
                        // Order summary
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Tạm tính:", style = MaterialTheme.typography.bodyMedium)
                                    Text(formatCurrency(subtotal), style = MaterialTheme.typography.bodyMedium)
                                }
                                if (discountAmount > 0) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Giảm giá:", style = MaterialTheme.typography.bodyMedium, color = Success)
                                        Text("-${formatCurrency(discountAmount)}", style = MaterialTheme.typography.bodyMedium, color = Success)
                                    }
                                }
                                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("TỔNG:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                    Text(formatCurrency(totalAmount), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = Color(0xFFFF5722))
                                }
                                if (vatAmount > 0) {
                                    Text("(Đã gồm VAT: ${formatCurrency(vatAmount)})", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
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
                                        if (discountAmount > 0) {
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Badge(containerColor = Success) {
                                                Text("-${formatCurrency(discountAmount)}", fontSize = 10.sp, color = Color.White)
                                            }
                                        }
                                    }
                                    Icon(
                                        if (showDiscountSection) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }

                                // Applied discounts - always show when exists
                                if (appliedDiscounts.isNotEmpty()) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 12.dp)
                                            .padding(bottom = 8.dp)
                                    ) {
                                        appliedDiscounts.forEach { discount ->
                                            Card(
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                                colors = CardDefaults.cardColors(containerColor = Success.copy(alpha = 0.1f)),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth().padding(8.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                                            Icon(Icons.Default.CheckCircle, null, Modifier.size(14.dp), tint = Success)
                                                            Spacer(modifier = Modifier.width(4.dp))
                                                            Text(discount.code, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                        }
                                                        // Show discount target
                                                        Text(
                                                            text = "Áp dụng: ${discount.targetName ?: discount.target.displayName}",
                                                            fontSize = 10.sp,
                                                            color = MaterialTheme.colorScheme.outline
                                                        )
                                                    }
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text("-${formatCurrency(discount.discountAmount)}", color = Success, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                        IconButton(onClick = { onRemoveDiscount(discount.couponId) }, modifier = Modifier.size(20.dp)) {
                                                            Icon(Icons.Default.Close, "Xóa", Modifier.size(14.dp), tint = MaterialTheme.colorScheme.error)
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

                                        // Tab selection - minimal touch
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            listOf("Hóa đơn", "Theo món", "Mã giảm giá").forEachIndexed { index, label ->
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
                                            0 -> {
                                                // State for custom input and discount type selection
                                                var customPercentText by remember { mutableStateOf("") }
                                                var customAmountText by remember { mutableStateOf("") }
                                                // 0 = none, 1 = percent, 2 = fixed amount
                                                var selectedDiscountType by remember { mutableStateOf(0) }
                                                var selectedPercentValue by remember { mutableStateOf<Int?>(null) }
                                                var selectedAmountValue by remember { mutableStateOf<Long?>(null) }

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
                                                                // Set percent selection
                                                                selectedDiscountType = 1
                                                                selectedPercentValue = percent
                                                                customPercentText = ""
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
                                                                // Set amount selection
                                                                selectedDiscountType = 2
                                                                selectedAmountValue = amount
                                                                customAmountText = "" // Clear custom input when selecting chip
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

                                            1 -> {
                                                // Item discount - direct buttons
                                                if (orderItems.isEmpty()) {
                                                    Text("Không có món để giảm giá", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                                                } else {
                                                    orderItems.take(5).forEach { item ->
                                                        var expanded by remember { mutableStateOf(false) }
                                                        var customItemDiscountText by remember { mutableStateOf("") }
                                                        Column {
                                                            Row(
                                                                modifier = Modifier
                                                                    .fillMaxWidth()
                                                                    .clickable { expanded = !expanded }
                                                                    .padding(vertical = 4.dp),
                                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                                verticalAlignment = Alignment.CenterVertically
                                                            ) {
                                                                Column(modifier = Modifier.weight(1f)) {
                                                                    Text(item.name, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                                    Text("${formatCurrency(item.totalPrice)} x${item.quantity}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                                                }
                                                                if (item.discountAmount > 0) {
                                                                    Text("-${formatCurrency(item.discountAmount)}", color = Success, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                                }
                                                                Icon(
                                                                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ChevronRight,
                                                                    null, Modifier.size(16.dp)
                                                                )
                                                            }

                                                            AnimatedVisibility(visible = expanded) {
                                                                Column(
                                                                    modifier = Modifier
                                                                        .fillMaxWidth()
                                                                        .padding(start = 8.dp, end = 8.dp, bottom = 4.dp)
                                                                ) {
                                                                    // Preset percentage chips
                                                                    Row(
                                                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                                                        modifier = Modifier.fillMaxWidth()
                                                                    ) {
                                                                        listOf(5, 10, 20, 50).forEach { percent ->
                                                                            FilterChip(
                                                                                selected = false,
                                                                                onClick = {
                                                                                    onApplyItemDiscount(item.id, item.totalPrice * percent / 100)
                                                                                    expanded = false
                                                                                },
                                                                                label = { Text("$percent%", fontSize = 9.sp) },
                                                                                modifier = Modifier.height(24.dp)
                                                                            )
                                                                        }
                                                                    }
                                                                    // Custom amount input for item discount
                                                                    Spacer(modifier = Modifier.height(4.dp))
                                                                    Row(
                                                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                                                        verticalAlignment = Alignment.CenterVertically,
                                                                        modifier = Modifier.fillMaxWidth()
                                                                    ) {
                                                                        OutlinedTextField(
                                                                            value = customItemDiscountText,
                                                                            onValueChange = { customItemDiscountText = it.filter { c -> c.isDigit() } },
                                                                            placeholder = { Text("Nhập tiền", fontSize = 9.sp) },
                                                                            modifier = Modifier.weight(1f).height(40.dp),
                                                                            singleLine = true,
                                                                            textStyle = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                                                                            keyboardOptions = KeyboardOptions(
                                                                                keyboardType = KeyboardType.Number,
                                                                                imeAction = ImeAction.Done
                                                                            ),
                                                                            keyboardActions = KeyboardActions(
                                                                                onDone = {
                                                                                    customItemDiscountText.toLongOrNull()?.let { amount ->
                                                                                        if (amount > 0 && amount <= item.totalPrice) {
                                                                                            onApplyItemDiscount(item.id, amount)
                                                                                            customItemDiscountText = ""
                                                                                            expanded = false
                                                                                        }
                                                                                    }
                                                                                }
                                                                            ),
                                                                            suffix = { Text("đ", fontSize = 9.sp) }
                                                                        )
                                                                        Button(
                                                                            onClick = {
                                                                                customItemDiscountText.toLongOrNull()?.let { amount ->
                                                                                    if (amount > 0 && amount <= item.totalPrice) {
                                                                                        onApplyItemDiscount(item.id, amount)
                                                                                        customItemDiscountText = ""
                                                                                        expanded = false
                                                                                    }
                                                                                }
                                                                            },
                                                                            enabled = customItemDiscountText.toLongOrNull()?.let { it > 0 && it <= item.totalPrice } == true,
                                                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                                                            modifier = Modifier.height(40.dp)
                                                                        ) {
                                                                            Text("OK", fontSize = 10.sp)
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
                                                // Coupon input
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

                                                // Example coupons hint
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text("Đối tượng áp dụng:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                                Column(modifier = Modifier.padding(start = 8.dp)) {
                                                    Text("• Toàn bộ hóa đơn", fontSize = 10.sp, color = MaterialTheme.colorScheme.outline)
                                                    Text("• Món cụ thể", fontSize = 10.sp, color = MaterialTheme.colorScheme.outline)
                                                    Text("• Danh mục (VD: Trà sữa)", fontSize = 10.sp, color = MaterialTheme.colorScheme.outline)
                                                    Text("• Loại sản phẩm", fontSize = 10.sp, color = MaterialTheme.colorScheme.outline)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ===== FOOTER =====
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(0.25f)) {
                        Text("Hủy")
                    }

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
                        modifier = Modifier.weight(0.75f),
                        enabled = canComplete,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50),
                            disabledContainerColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                        )
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("XÁC NHẬN THANH TOÁN", fontWeight = FontWeight.Bold)
                    }
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

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        buttons.forEach { row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                row.forEach { button ->
                    Button(
                        onClick = {
                            when (button) {
                                "⌫" -> onBackspace()
                                "C" -> onClear()
                                else -> onNumberClick(button)
                            }
                        },
                        modifier = Modifier.weight(1f).height(52.dp),
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
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 1.dp)
                    ) {
                        Text(button, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}

private fun roundUp(amount: Long, unit: Long): Long {
    return ((amount + unit - 1) / unit) * unit
}
