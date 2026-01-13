package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.techres.ccb.domain.model.Payment
import com.techres.ccb.domain.model.PaymentMethod
import com.techres.ccb.domain.model.PaymentStatus
import com.techres.ccb.presentation.screens.sale.formatCurrency
import com.techres.ccb.presentation.theme.Success

data class AppliedDiscount(
    val couponId: String,
    val code: String,
    val name: String,
    val discountType: String,  // percentage, fixed
    val discountValue: Double,
    val discountAmount: Long   // Số tiền thực tế được giảm
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
    val categoryId: String? = null
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
    onClearDiscount: () -> Unit = {},
    onDismiss: () -> Unit,
    onPaymentComplete: (List<Payment>) -> Unit
) {
    var selectedMethod by remember { mutableStateOf(PaymentMethod.CASH) }
    var receivedAmountText by remember { mutableStateOf("") }

    // Discount section - collapsed by default
    var showDiscountSection by remember { mutableStateOf(false) }
    var manualDiscountText by remember { mutableStateOf("") }
    var showDiscountInput by remember { mutableStateOf(false) }

    // Item discount states
    var showItemDiscounts by remember { mutableStateOf(false) }
    var selectedItemForDiscount by remember { mutableStateOf<String?>(null) }
    var itemDiscountText by remember { mutableStateOf("") }

    val receivedAmount = receivedAmountText.toLongOrNull() ?: 0L
    val changeAmount = if (receivedAmount >= totalAmount) receivedAmount - totalAmount else 0L
    val canComplete = when (selectedMethod) {
        PaymentMethod.CASH -> receivedAmount >= totalAmount
        else -> true // Other methods auto-complete
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.92f),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // ===== HEADER - Compact with total =====
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
                    // Total amount - prominent
                    Text(
                        text = formatCurrency(totalAmount),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Đóng",
                            tint = Color.White
                        )
                    }
                }

                // ===== PAYMENT METHOD TABS - Prominent =====
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Show only main payment methods as tabs
                    listOf(PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER).forEach { method ->
                        val isSelected = selectedMethod == method
                        Card(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    selectedMethod = method
                                    if (method != PaymentMethod.CASH) {
                                        receivedAmountText = totalAmount.toString()
                                    } else {
                                        receivedAmountText = ""
                                    }
                                },
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected)
                                    Color(0xFFFF5722)
                                else
                                    MaterialTheme.colorScheme.surface
                            ),
                            elevation = CardDefaults.cardElevation(
                                defaultElevation = if (isSelected) 4.dp else 1.dp
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp, horizontal = 16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = method.icon,
                                    fontSize = 20.sp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = method.displayName,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
                                )
                                if (isSelected) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
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
                            // Cash payment UI
                            Text(
                                text = "Tiền khách đưa",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            // Amount display - larger
                            OutlinedTextField(
                                value = receivedAmountText,
                                onValueChange = { receivedAmountText = it.filter { c -> c.isDigit() } },
                                modifier = Modifier.fillMaxWidth(),
                                textStyle = MaterialTheme.typography.headlineMedium.copy(
                                    textAlign = TextAlign.End,
                                    fontWeight = FontWeight.Bold
                                ),
                                suffix = {
                                    Text(
                                        "đ",
                                        style = MaterialTheme.typography.titleLarge,
                                        color = MaterialTheme.colorScheme.outline
                                    )
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF4CAF50),
                                    unfocusedBorderColor = MaterialTheme.colorScheme.outline
                                )
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // Quick amount suggestions - horizontal scroll
                            Text(
                                text = "Gợi ý",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.outline
                            )
                            Spacer(modifier = Modifier.height(6.dp))

                            val suggestions = listOf(
                                totalAmount to "Đủ tiền",
                                roundUp(totalAmount, 10000) to null,
                                roundUp(totalAmount, 50000) to null,
                                roundUp(totalAmount, 100000) to null,
                                roundUp(totalAmount, 200000) to null,
                                roundUp(totalAmount, 500000) to null
                            ).filter { it.first >= totalAmount }
                                .distinctBy { it.first }
                                .take(5)

                            Row(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                suggestions.forEach { (amount, label) ->
                                    val isActive = receivedAmount == amount
                                    SuggestionChip(
                                        onClick = { receivedAmountText = amount.toString() },
                                        label = {
                                            Text(
                                                label ?: formatCurrency(amount),
                                                fontSize = 11.sp,
                                                fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal
                                            )
                                        },
                                        colors = SuggestionChipDefaults.suggestionChipColors(
                                            containerColor = if (isActive)
                                                Color(0xFF4CAF50).copy(alpha = 0.2f)
                                            else
                                                MaterialTheme.colorScheme.surface
                                        ),
                                        border = if (isActive)
                                            SuggestionChipDefaults.suggestionChipBorder(
                                                enabled = true,
                                                borderColor = Color(0xFF4CAF50)
                                            )
                                        else
                                            SuggestionChipDefaults.suggestionChipBorder(enabled = true)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Numpad - bigger buttons
                            NumPadCompact(
                                onNumberClick = { num ->
                                    receivedAmountText += num
                                },
                                onBackspace = {
                                    if (receivedAmountText.isNotEmpty()) {
                                        receivedAmountText = receivedAmountText.dropLast(1)
                                    }
                                },
                                onClear = {
                                    receivedAmountText = ""
                                }
                            )

                            Spacer(modifier = Modifier.weight(1f))

                            // Change amount display - prominent
                            if (receivedAmount >= totalAmount) {
                                Card(
                                    colors = CardDefaults.cardColors(
                                        containerColor = Color(0xFFE8F5E9)
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text("💰", fontSize = 20.sp)
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "Tiền thừa:",
                                                style = MaterialTheme.typography.titleMedium
                                            )
                                        }
                                        Text(
                                            text = formatCurrency(changeAmount),
                                            style = MaterialTheme.typography.headlineSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF4CAF50)
                                        )
                                    }
                                }
                            }
                        } else {
                            // Other payment methods UI - centered with QR
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(16.dp)
                                ) {
                                    Text(
                                        text = selectedMethod.icon,
                                        fontSize = 56.sp
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = selectedMethod.displayName,
                                        style = MaterialTheme.typography.headlineSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = formatCurrency(totalAmount),
                                        style = MaterialTheme.typography.displaySmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))

                                    when (selectedMethod) {
                                        PaymentMethod.BANK_TRANSFER -> {
                                            Text(
                                                text = "Quét QR hoặc chuyển khoản",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.outline
                                            )
                                            Spacer(modifier = Modifier.height(12.dp))
                                            // QR Code placeholder
                                            Box(
                                                modifier = Modifier
                                                    .size(140.dp)
                                                    .background(Color.White, RoundedCornerShape(8.dp))
                                                    .border(
                                                        1.dp,
                                                        MaterialTheme.colorScheme.outline,
                                                        RoundedCornerShape(8.dp)
                                                    ),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text("QR Code", color = MaterialTheme.colorScheme.outline)
                                            }
                                        }
                                        else -> {
                                            Text(
                                                text = "Đã thanh toán qua ${selectedMethod.displayName}",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.outline
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ===== RIGHT: Order summary + Discount (collapsible) =====
                    Column(
                        modifier = Modifier
                            .weight(0.45f)
                            .fillMaxHeight()
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                            .padding(12.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Order summary - compact
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Tạm tính:", style = MaterialTheme.typography.bodyMedium)
                                    Text(formatCurrency(subtotal), style = MaterialTheme.typography.bodyMedium)
                                }
                                if (discountAmount > 0) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Giảm giá:", style = MaterialTheme.typography.bodyMedium, color = Success)
                                        Text("-${formatCurrency(discountAmount)}", style = MaterialTheme.typography.bodyMedium, color = Success)
                                    }
                                }
                                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("TỔNG:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                    Text(
                                        formatCurrency(totalAmount),
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = Color(0xFFFF5722)
                                    )
                                }
                                if (vatAmount > 0) {
                                    Text(
                                        "(Đã bao gồm VAT 8%: ${formatCurrency(vatAmount)})",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.outline
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // ===== DISCOUNT SECTION - Collapsible =====
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                // Header - clickable to expand/collapse
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
                                        Text(
                                            text = "Giảm giá",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                        if (discountAmount > 0) {
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Badge(containerColor = Success) {
                                                Text(
                                                    "-${formatCurrency(discountAmount)}",
                                                    fontSize = 10.sp,
                                                    color = Color.White
                                                )
                                            }
                                        }
                                    }
                                    Icon(
                                        if (showDiscountSection) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }

                                // Discount content - animated visibility
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

                                        // Quick percent buttons
                                        Text(
                                            "Giảm nhanh",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.outline
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            listOf(5, 10, 15, 20, 30).forEach { percent ->
                                                FilterChip(
                                                    selected = false,
                                                    onClick = {
                                                        onApplyPercentDiscount(percent, "Giảm $percent%")
                                                    },
                                                    label = { Text("$percent%", fontSize = 11.sp) },
                                                    modifier = Modifier.weight(1f),
                                                    colors = FilterChipDefaults.filterChipColors(
                                                        containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                                                    )
                                                )
                                            }
                                        }

                                        // Clear discount button
                                        if (discountAmount > 0 && appliedDiscounts.isEmpty()) {
                                            Spacer(modifier = Modifier.height(8.dp))
                                            TextButton(
                                                onClick = onClearDiscount,
                                                modifier = Modifier.align(Alignment.End),
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                            ) {
                                                Icon(
                                                    Icons.Default.Clear,
                                                    contentDescription = null,
                                                    modifier = Modifier.size(14.dp),
                                                    tint = MaterialTheme.colorScheme.error
                                                )
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Xóa giảm giá", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(8.dp))

                                        // Manual input toggle
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable { showDiscountInput = !showDiscountInput },
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                if (showDiscountInput) Icons.Default.ExpandLess else Icons.Default.Edit,
                                                contentDescription = null,
                                                modifier = Modifier.size(16.dp),
                                                tint = MaterialTheme.colorScheme.primary
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                "Nhập số tiền giảm",
                                                fontSize = 12.sp,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                        }

                                        // Manual input
                                        AnimatedVisibility(
                                            visible = showDiscountInput,
                                            enter = expandVertically(),
                                            exit = shrinkVertically()
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(top = 8.dp),
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                OutlinedTextField(
                                                    value = manualDiscountText,
                                                    onValueChange = { manualDiscountText = it.filter { c -> c.isDigit() } },
                                                    placeholder = { Text("Số tiền", fontSize = 12.sp) },
                                                    modifier = Modifier.weight(1f),
                                                    singleLine = true,
                                                    textStyle = MaterialTheme.typography.bodySmall,
                                                    keyboardOptions = KeyboardOptions(
                                                        keyboardType = KeyboardType.Number,
                                                        imeAction = ImeAction.Done
                                                    ),
                                                    suffix = { Text("đ", fontSize = 12.sp) }
                                                )
                                                Button(
                                                    onClick = {
                                                        val value = manualDiscountText.toLongOrNull() ?: 0L
                                                        if (value > 0) {
                                                            onApplyManualDiscount(value, "Giảm ${formatCurrency(value)}")
                                                            manualDiscountText = ""
                                                            showDiscountInput = false
                                                        }
                                                    },
                                                    enabled = manualDiscountText.isNotEmpty(),
                                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                                                ) {
                                                    Text("OK", fontSize = 12.sp)
                                                }
                                            }
                                        }

                                        // Coupon input
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Text(
                                            "Mã giảm giá",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.outline
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            OutlinedTextField(
                                                value = couponCode,
                                                onValueChange = onCouponCodeChange,
                                                placeholder = { Text("Nhập mã", fontSize = 12.sp) },
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
                                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                                            ) {
                                                if (isApplyingCoupon) {
                                                    CircularProgressIndicator(
                                                        modifier = Modifier.size(14.dp),
                                                        strokeWidth = 2.dp
                                                    )
                                                } else {
                                                    Text("OK", fontSize = 12.sp)
                                                }
                                            }
                                        }
                                        if (couponError != null) {
                                            Text(
                                                text = couponError,
                                                color = MaterialTheme.colorScheme.error,
                                                fontSize = 11.sp,
                                                modifier = Modifier.padding(top = 4.dp)
                                            )
                                        }

                                        // Applied discounts
                                        if (appliedDiscounts.isNotEmpty()) {
                                            Spacer(modifier = Modifier.height(8.dp))
                                            appliedDiscounts.forEach { discount ->
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .padding(vertical = 2.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Icon(
                                                            Icons.Default.CheckCircle,
                                                            contentDescription = null,
                                                            modifier = Modifier.size(14.dp),
                                                            tint = Success
                                                        )
                                                        Spacer(modifier = Modifier.width(4.dp))
                                                        Text(
                                                            text = discount.code,
                                                            fontSize = 12.sp,
                                                            fontWeight = FontWeight.Medium
                                                        )
                                                    }
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text(
                                                            text = "-${formatCurrency(discount.discountAmount)}",
                                                            color = Success,
                                                            fontSize = 12.sp
                                                        )
                                                        IconButton(
                                                            onClick = { onRemoveDiscount(discount.couponId) },
                                                            modifier = Modifier.size(20.dp)
                                                        ) {
                                                            Icon(
                                                                Icons.Default.Close,
                                                                contentDescription = "Xóa",
                                                                modifier = Modifier.size(14.dp),
                                                                tint = MaterialTheme.colorScheme.error
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // Item-level discount
                                        if (orderItems.isNotEmpty()) {
                                            Spacer(modifier = Modifier.height(12.dp))
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable { showItemDiscounts = !showItemDiscounts },
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    "Giảm theo món (${orderItems.size})",
                                                    style = MaterialTheme.typography.labelMedium,
                                                    color = MaterialTheme.colorScheme.outline
                                                )
                                                Icon(
                                                    if (showItemDiscounts) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                                    contentDescription = null,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }

                                            AnimatedVisibility(
                                                visible = showItemDiscounts,
                                                enter = expandVertically(),
                                                exit = shrinkVertically()
                                            ) {
                                                Column(modifier = Modifier.padding(top = 8.dp)) {
                                                    orderItems.forEach { item ->
                                                        Row(
                                                            modifier = Modifier
                                                                .fillMaxWidth()
                                                                .clickable {
                                                                    selectedItemForDiscount = if (selectedItemForDiscount == item.id) null else item.id
                                                                    itemDiscountText = ""
                                                                }
                                                                .padding(vertical = 4.dp),
                                                            horizontalArrangement = Arrangement.SpaceBetween,
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Text(
                                                                "${item.name} x${item.quantity}",
                                                                style = MaterialTheme.typography.bodySmall,
                                                                modifier = Modifier.weight(1f),
                                                                maxLines = 1
                                                            )
                                                            if (item.discountAmount > 0) {
                                                                Text(
                                                                    "-${formatCurrency(item.discountAmount)}",
                                                                    style = MaterialTheme.typography.bodySmall,
                                                                    color = Success
                                                                )
                                                            }
                                                        }

                                                        // Discount input for selected item
                                                        if (selectedItemForDiscount == item.id) {
                                                            Row(
                                                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                                                modifier = Modifier.padding(vertical = 4.dp)
                                                            ) {
                                                                listOf(5, 10, 20).forEach { percent ->
                                                                    FilterChip(
                                                                        selected = false,
                                                                        onClick = {
                                                                            val discountAmt = (item.totalPrice * percent / 100)
                                                                            onApplyItemDiscount(item.id, discountAmt)
                                                                            selectedItemForDiscount = null
                                                                        },
                                                                        label = { Text("$percent%", fontSize = 10.sp) },
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
                                }
                            }
                        }
                    }
                }

                // ===== FOOTER - Action buttons =====
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(0.25f)
                    ) {
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

/**
 * Compact numpad for payment dialog
 */
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

    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        buttons.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                row.forEach { button ->
                    Button(
                        onClick = {
                            when (button) {
                                "⌫" -> onBackspace()
                                "C" -> onClear()
                                else -> onNumberClick(button)
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(52.dp),
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
                        Text(
                            text = button,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}

private fun roundUp(amount: Long, unit: Long): Long {
    return ((amount + unit - 1) / unit) * unit
}
