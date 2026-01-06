package com.techres.ccb.presentation.screens.payment

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.presentation.theme.Success

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentScreen(
    orderId: String,
    onNavigateBack: () -> Unit,
    onPaymentComplete: () -> Unit,
    viewModel: PaymentViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(orderId) {
        viewModel.loadOrder(orderId)
    }

    LaunchedEffect(uiState.isPaymentComplete) {
        if (uiState.isPaymentComplete) {
            onPaymentComplete()
        }
    }

    var receivedAmount by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Thanh toán") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            // Order summary
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(
                        text = "Đơn hàng ${uiState.order?.orderNumber ?: ""}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Số lượng món:")
                        Text("${uiState.itemCount} món")
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tạm tính:")
                        Text(formatPrice(uiState.order?.subtotal ?: 0.0))
                    }
                    if ((uiState.order?.discountAmount ?: 0.0) > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Giảm giá:")
                            Text("-${formatPrice(uiState.order?.discountAmount ?: 0.0)}")
                        }
                    }
                    Divider(modifier = Modifier.padding(vertical = 8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("TỔNG CỘNG:", fontWeight = FontWeight.Bold)
                        Text(
                            formatPrice(uiState.order?.totalAmount ?: 0.0),
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Payment method selection
            Text(
                text = "Phương thức thanh toán",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PaymentMethodCard(
                    icon = Icons.Default.Money,
                    title = "Tiền mặt",
                    isSelected = uiState.selectedPaymentMethod == "cash",
                    onClick = { viewModel.selectPaymentMethod("cash") },
                    modifier = Modifier.weight(1f)
                )
                PaymentMethodCard(
                    icon = Icons.Default.AccountBalance,
                    title = "Chuyển khoản",
                    isSelected = uiState.selectedPaymentMethod == "bank_transfer",
                    onClick = { viewModel.selectPaymentMethod("bank_transfer") },
                    modifier = Modifier.weight(1f)
                )
                PaymentMethodCard(
                    icon = Icons.Default.CreditCard,
                    title = "Thẻ",
                    isSelected = uiState.selectedPaymentMethod == "card",
                    onClick = { viewModel.selectPaymentMethod("card") },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Cash received (only for cash payment)
            if (uiState.selectedPaymentMethod == "cash") {
                OutlinedTextField(
                    value = receivedAmount,
                    onValueChange = {
                        receivedAmount = it.filter { char -> char.isDigit() }
                        viewModel.setReceivedAmount(receivedAmount.toDoubleOrNull() ?: 0.0)
                    },
                    label = { Text("Tiền khách đưa") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    suffix = { Text("đ") }
                )

                if (uiState.changeAmount > 0) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = Success.copy(alpha = 0.1f)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Tiền thừa:", fontWeight = FontWeight.Medium)
                            Text(
                                formatPrice(uiState.changeAmount),
                                fontWeight = FontWeight.Bold,
                                color = Success
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Confirm button
            Button(
                onClick = { viewModel.processPayment() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = uiState.canProcessPayment && !uiState.isProcessing,
                shape = RoundedCornerShape(12.dp)
            ) {
                if (uiState.isProcessing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Icon(Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Xác nhận thanh toán", fontSize = 16.sp)
                }
            }
        }
    }
}

@Composable
private fun PaymentMethodCard(
    icon: ImageVector,
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val borderColor = if (isSelected) MaterialTheme.colorScheme.primary
    else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)

    val backgroundColor = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
    else MaterialTheme.colorScheme.surface

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .border(2.dp, borderColor, RoundedCornerShape(12.dp))
            .background(backgroundColor)
            .clickable(onClick = onClick)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(28.dp),
                tint = if (isSelected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (isSelected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

private fun formatPrice(amount: Double): String {
    return String.format("%,.0f đ", amount)
}
