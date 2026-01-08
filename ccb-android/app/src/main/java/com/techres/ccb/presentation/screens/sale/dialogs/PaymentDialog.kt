package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PaymentDialog(
    totalAmount: Long,
    onDismiss: () -> Unit,
    onPaymentComplete: (List<Payment>) -> Unit
) {
    var selectedMethod by remember { mutableStateOf(PaymentMethod.CASH) }
    var receivedAmountText by remember { mutableStateOf("") }
    var showKeypad by remember { mutableStateOf(true) }

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
                .fillMaxHeight(0.9f),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF4CAF50))
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Payment,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Thanh toán",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Tổng: ${formatCurrency(totalAmount)}",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Đóng",
                            tint = Color.White
                        )
                    }
                }

                Row(modifier = Modifier.weight(1f)) {
                    // Left panel - Payment methods
                    Column(
                        modifier = Modifier
                            .weight(0.35f)
                            .fillMaxHeight()
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                            .padding(12.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(
                            text = "Hình thức thanh toán",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )

                        PaymentMethod.entries.forEach { method ->
                            PaymentMethodCard(
                                method = method,
                                isSelected = selectedMethod == method,
                                onClick = {
                                    selectedMethod = method
                                    if (method != PaymentMethod.CASH) {
                                        receivedAmountText = totalAmount.toString()
                                    } else {
                                        receivedAmountText = ""
                                    }
                                }
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }

                    // Right panel - Amount input
                    Column(
                        modifier = Modifier
                            .weight(0.65f)
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

                            Spacer(modifier = Modifier.height(12.dp))

                            // Amount display
                            OutlinedTextField(
                                value = receivedAmountText,
                                onValueChange = { receivedAmountText = it.filter { c -> c.isDigit() } },
                                modifier = Modifier.fillMaxWidth(),
                                textStyle = MaterialTheme.typography.headlineMedium.copy(
                                    textAlign = TextAlign.End,
                                    fontWeight = FontWeight.Bold
                                ),
                                suffix = { Text("đ", style = MaterialTheme.typography.titleLarge) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // Quick amount buttons
                            Text(
                                text = "Gợi ý",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.outline
                            )
                            Spacer(modifier = Modifier.height(8.dp))

                            val suggestions = listOf(
                                totalAmount,
                                roundUp(totalAmount, 10000),
                                roundUp(totalAmount, 50000),
                                roundUp(totalAmount, 100000),
                                roundUp(totalAmount, 200000),
                                roundUp(totalAmount, 500000)
                            ).distinct().filter { it >= totalAmount }.take(6)

                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                suggestions.forEach { amount ->
                                    SuggestionChip(
                                        onClick = { receivedAmountText = amount.toString() },
                                        label = {
                                            Text(
                                                if (amount == totalAmount) "Đủ tiền" else formatCurrency(amount),
                                                fontSize = 12.sp
                                            )
                                        },
                                        colors = SuggestionChipDefaults.suggestionChipColors(
                                            containerColor = if (receivedAmount == amount)
                                                MaterialTheme.colorScheme.primaryContainer
                                            else
                                                MaterialTheme.colorScheme.surface
                                        )
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Numpad
                            if (showKeypad) {
                                NumPad(
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
                            }

                            Spacer(modifier = Modifier.weight(1f))

                            // Change amount display
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
                                            .padding(16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "💰 Tiền thừa:",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Medium
                                        )
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
                            // Other payment methods UI
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = selectedMethod.icon,
                                        fontSize = 64.sp
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
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
                                                style = MaterialTheme.typography.bodyLarge,
                                                color = MaterialTheme.colorScheme.outline
                                            )
                                            // QR Code placeholder
                                            Spacer(modifier = Modifier.height(16.dp))
                                            Box(
                                                modifier = Modifier
                                                    .size(150.dp)
                                                    .background(
                                                        Color.White,
                                                        RoundedCornerShape(8.dp)
                                                    )
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
                                        PaymentMethod.MOMO, PaymentMethod.ZALOPAY, PaymentMethod.VNPAY -> {
                                            Text(
                                                text = "Mở app ${selectedMethod.displayName} để thanh toán",
                                                style = MaterialTheme.typography.bodyLarge,
                                                color = MaterialTheme.colorScheme.outline,
                                                textAlign = TextAlign.Center
                                            )
                                        }
                                        PaymentMethod.CARD -> {
                                            Text(
                                                text = "Quẹt thẻ trên máy POS",
                                                style = MaterialTheme.typography.bodyLarge,
                                                color = MaterialTheme.colorScheme.outline
                                            )
                                        }
                                        else -> {}
                                    }
                                }
                            }
                        }
                    }
                }

                // Footer - Action buttons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(0.3f)
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
                        modifier = Modifier.weight(0.7f),
                        enabled = canComplete,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50)
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
fun PaymentMethodCard(
    method: PaymentMethod,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                MaterialTheme.colorScheme.primaryContainer
            else
                MaterialTheme.colorScheme.surface
        ),
        border = if (isSelected) {
            CardDefaults.outlinedCardBorder().copy(
                brush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary)
            )
        } else null
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = method.icon,
                fontSize = 24.sp
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = method.displayName,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
            )
            if (isSelected) {
                Spacer(modifier = Modifier.weight(1f))
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
fun NumPad(
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
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        buttons.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
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
                            .height(56.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = when (button) {
                                "C" -> MaterialTheme.colorScheme.errorContainer
                                "⌫" -> MaterialTheme.colorScheme.surfaceVariant
                                else -> MaterialTheme.colorScheme.surface
                            },
                            contentColor = when (button) {
                                "C" -> MaterialTheme.colorScheme.onErrorContainer
                                else -> MaterialTheme.colorScheme.onSurface
                            }
                        ),
                        shape = RoundedCornerShape(8.dp),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
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
