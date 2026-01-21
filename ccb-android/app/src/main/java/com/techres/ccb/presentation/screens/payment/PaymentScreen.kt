package com.techres.ccb.presentation.screens.payment

import androidx.compose.foundation.Image
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.techres.ccb.data.local.entity.BankAccountEntity
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
                .verticalScroll(rememberScrollState())
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
                        Text(formatPrice(uiState.subtotal))
                    }
                    // Show discount if any
                    if (uiState.totalDiscount > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Giảm giá:", color = Success)
                            Text(
                                "-${formatPrice(uiState.totalDiscount)}",
                                color = Success,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    // Show VAT (đã bao gồm trong giá)
                    if (uiState.vatAmount > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Trong đó VAT (8%):")
                            Text(formatPrice(uiState.vatAmount))
                        }
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("TỔNG CỘNG:", fontWeight = FontWeight.Bold)
                        Text(
                            formatPrice(uiState.grandTotal),
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Coupon/Discount section
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
                        text = "Mã giảm giá",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = uiState.couponCode,
                            onValueChange = { viewModel.setCouponCode(it) },
                            placeholder = { Text("Nhập mã giảm giá") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = { viewModel.applyCoupon() }),
                            isError = uiState.discountError != null
                        )
                        Button(
                            onClick = { viewModel.applyCoupon() },
                            enabled = !uiState.isApplyingCoupon && uiState.couponCode.isNotEmpty()
                        ) {
                            if (uiState.isApplyingCoupon) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("Áp dụng")
                            }
                        }
                    }
                    // Show error
                    if (uiState.discountError != null) {
                        Text(
                            text = uiState.discountError!!,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                    // Show applied coupons
                    if (uiState.appliedCoupons.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Đã áp dụng:",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        uiState.appliedCoupons.forEach { coupon ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.LocalOffer,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                        tint = Success
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(
                                            text = coupon.code,
                                            fontWeight = FontWeight.Medium,
                                            fontSize = 14.sp
                                        )
                                        Text(
                                            text = coupon.name,
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "-${formatPrice(coupon.discountAmount)}",
                                        color = Success,
                                        fontWeight = FontWeight.Medium
                                    )
                                    IconButton(
                                        onClick = { viewModel.removeCoupon(coupon.couponId) },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Close,
                                            contentDescription = "Xóa",
                                            modifier = Modifier.size(16.dp),
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Payment method selection
            Text(
                text = "Phương thức thanh toán",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.height(12.dp))

            // First row: Cash, Bank Transfer, Card
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
                    title = "Cà thẻ",
                    isSelected = uiState.selectedPaymentMethod == "credit_card",
                    onClick = { viewModel.selectPaymentMethod("credit_card") },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Second row: E-wallet, QR Code
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PaymentMethodCard(
                    icon = Icons.Default.Smartphone,
                    title = "Ví điện tử",
                    isSelected = uiState.selectedPaymentMethod == "e_wallet",
                    onClick = { viewModel.selectPaymentMethod("e_wallet") },
                    modifier = Modifier.weight(1f)
                )
                PaymentMethodCard(
                    icon = Icons.Default.QrCode2,
                    title = "QR Code",
                    isSelected = uiState.selectedPaymentMethod == "qr_code",
                    onClick = { viewModel.selectPaymentMethod("qr_code") },
                    modifier = Modifier.weight(1f)
                )
                // Empty space for alignment
                Spacer(modifier = Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Bank Transfer / QR Code payment info
            if (uiState.selectedPaymentMethod == "bank_transfer" || uiState.selectedPaymentMethod == "qr_code") {
                BankTransferSection(
                    grandTotal = uiState.grandTotal,
                    orderNumber = uiState.order?.orderNumber ?: "",
                    bankAccount = uiState.bankAccount
                )
                Spacer(modifier = Modifier.height(24.dp))
            }

            // E-wallet payment info
            if (uiState.selectedPaymentMethod == "e_wallet") {
                EWalletSection()
                Spacer(modifier = Modifier.height(24.dp))
            }

            // Credit card payment info
            if (uiState.selectedPaymentMethod == "credit_card") {
                CreditCardSection()
                Spacer(modifier = Modifier.height(24.dp))
            }

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

            Spacer(modifier = Modifier.height(24.dp))

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

@Composable
private fun BankTransferSection(
    grandTotal: Double,
    orderNumber: String,
    bankAccount: BankAccountEntity?
) {
    val clipboardManager = LocalClipboardManager.current
    var showCopiedMessage by remember { mutableStateOf(false) }

    // Use synced bank account or fallback to defaults
    val bankCode = bankAccount?.bankCode ?: "VCB"
    val bankName = bankAccount?.bankName ?: "Vietcombank"
    val accountNumber = bankAccount?.accountNumber ?: "19039164318014"
    val accountName = bankAccount?.accountName ?: "CONG TY TNHH TECHRES"
    val transferContent = bankAccount?.generateTransferContent(orderNumber) ?: "TT $orderNumber"

    // Generate QR URL using VietQR API
    val qrUrl = remember(grandTotal, orderNumber, bankAccount) {
        val amount = grandTotal.toLong()
        bankAccount?.generateQrUrl(amount, transferContent)
            ?: "https://qr.sepay.vn/img?bank=$bankCode&acc=$accountNumber&template=compact&amount=$amount&des=${java.net.URLEncoder.encode(transferContent, "UTF-8")}"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Quét mã QR để thanh toán",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            // QR Code Image
            Card(
                modifier = Modifier.size(200.dp),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                AsyncImage(
                    model = qrUrl,
                    contentDescription = "QR Code thanh toán",
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp),
                    contentScale = ContentScale.Fit
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Bank info
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                BankInfoRow(
                    label = "Ngân hàng:",
                    value = "$bankCode - $bankName"
                )
                BankInfoRow(
                    label = "Số tài khoản:",
                    value = accountNumber,
                    canCopy = true,
                    onCopy = {
                        clipboardManager.setText(AnnotatedString(accountNumber))
                        showCopiedMessage = true
                    }
                )
                BankInfoRow(
                    label = "Chủ tài khoản:",
                    value = accountName
                )
                BankInfoRow(
                    label = "Số tiền:",
                    value = formatPrice(grandTotal),
                    valueColor = MaterialTheme.colorScheme.primary,
                    valueFontWeight = FontWeight.Bold
                )
                BankInfoRow(
                    label = "Nội dung CK:",
                    value = transferContent,
                    canCopy = true,
                    onCopy = {
                        clipboardManager.setText(AnnotatedString(transferContent))
                        showCopiedMessage = true
                    }
                )
            }

            if (showCopiedMessage) {
                LaunchedEffect(Unit) {
                    kotlinx.coroutines.delay(2000)
                    showCopiedMessage = false
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Đã sao chép!",
                    color = Success,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Vui lòng chuyển khoản đúng số tiền và nội dung để được xác nhận tự động",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun BankInfoRow(
    label: String,
    value: String,
    canCopy: Boolean = false,
    onCopy: () -> Unit = {},
    valueColor: Color = Color.Unspecified,
    valueFontWeight: FontWeight = FontWeight.Medium
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = value,
                fontSize = 14.sp,
                fontWeight = valueFontWeight,
                color = if (valueColor != Color.Unspecified) valueColor else MaterialTheme.colorScheme.onSurface
            )
            if (canCopy) {
                IconButton(
                    onClick = onCopy,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Default.ContentCopy,
                        contentDescription = "Sao chép",
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

@Composable
private fun EWalletSection() {
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
                text = "Chọn ví điện tử",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            // E-wallet options
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                EWalletOption(
                    name = "MoMo",
                    color = Color(0xFFA50064),
                    modifier = Modifier.weight(1f)
                )
                EWalletOption(
                    name = "ZaloPay",
                    color = Color(0xFF0068FF),
                    modifier = Modifier.weight(1f)
                )
                EWalletOption(
                    name = "VNPay",
                    color = Color(0xFF005BAA),
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Khách hàng quét mã hoặc chuyển qua ví điện tử đã chọn",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun EWalletOption(
    name: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    var isSelected by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .border(
                width = 2.dp,
                color = if (isSelected) color else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                shape = RoundedCornerShape(8.dp)
            )
            .background(if (isSelected) color.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface)
            .clickable { isSelected = !isSelected }
            .padding(12.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = name,
            fontSize = 14.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (isSelected) color else MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun CreditCardSection() {
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
                text = "Thanh toán bằng thẻ",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Card type icons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CardTypeChip("VISA")
                CardTypeChip("MasterCard")
                CardTypeChip("JCB")
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Info,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Quẹt thẻ trên máy POS để hoàn tất thanh toán",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun CardTypeChip(name: String) {
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.padding(vertical = 4.dp)
    ) {
        Text(
            text = name,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
