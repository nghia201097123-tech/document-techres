package com.techres.ccb.presentation.screens.closeshift

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CloseShiftScreen(
    viewModel: CloseShiftViewModel = hiltViewModel(),
    onShiftClosed: () -> Unit,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    // Confirm Dialog
    if (uiState.showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.hideConfirmDialog() },
            icon = { Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFFF9800)) },
            title = { Text("Xác nhận chốt ca") },
            text = {
                Column {
                    Text("Bạn có chắc chắn muốn chốt ca làm việc?")
                    if (uiState.summary.cashDifference != 0L) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Chênh lệch tiền mặt: ${formatCurrency(uiState.summary.cashDifference)}",
                            color = if (uiState.summary.cashDifference < 0) Color.Red else Color(0xFF4CAF50),
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.closeShift(onShiftClosed) },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF44336))
                ) {
                    Text("Chốt ca")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.hideConfirmDialog() }) {
                    Text("Hủy")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chốt ca làm việc") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFFF44336),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (uiState.noShiftFound) {
            // No open shift found
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.EventBusy,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "Không có ca làm việc đang mở",
                        fontSize = 18.sp,
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(onClick = onBack) {
                        Text("Quay lại")
                    }
                }
            }
        } else if (uiState.error != null && uiState.summary.shiftId.isEmpty()) {
            // Error state (only show if we don't have shift data)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Error,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Color.Red
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        uiState.error ?: "Đã xảy ra lỗi",
                        fontSize = 16.sp,
                        color = Color.Red
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(onClick = onBack) {
                        Text("Quay lại")
                    }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF5F5F5))
                    .verticalScroll(rememberScrollState())
            ) {
                // Shift Info Header
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF44336)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Store, null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                uiState.summary.branchName,
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Mở ca", color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
                                Text(uiState.summary.openTime, color = Color.White, fontSize = 14.sp)
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Chốt ca", color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
                                Text(uiState.summary.closeTime, color = Color.White, fontSize = 14.sp)
                            }
                        }
                    }
                }

                // Order Summary
                SummaryCard(
                    title = "Tổng quan đơn hàng",
                    icon = Icons.Default.Receipt
                ) {
                    SummaryRow("Tổng đơn", uiState.summary.totalOrders.toString())
                    SummaryRow("Hoàn thành", uiState.summary.completedOrders.toString(), Color(0xFF4CAF50))
                    SummaryRow("Đã hủy", uiState.summary.cancelledOrders.toString(), Color(0xFFF44336))
                }

                // Revenue Summary
                SummaryCard(
                    title = "Doanh thu",
                    icon = Icons.Default.TrendingUp
                ) {
                    SummaryRow("Tổng doanh thu", formatCurrency(uiState.summary.totalRevenue), Color(0xFF1976D2), true)
                    Divider(modifier = Modifier.padding(vertical = 8.dp))
                    SummaryRow("Tiền mặt", formatCurrency(uiState.summary.cashRevenue))
                    SummaryRow("Thẻ", formatCurrency(uiState.summary.cardRevenue))
                    SummaryRow("Chuyển khoản", formatCurrency(uiState.summary.transferRevenue))
                    SummaryRow("App đặt món", formatCurrency(uiState.summary.appRevenue))
                }

                // Cash Summary
                SummaryCard(
                    title = "Tiền mặt trong ca",
                    icon = Icons.Default.AttachMoney
                ) {
                    SummaryRow("Tiền đầu ca", formatCurrency(uiState.summary.initialCash))
                    SummaryRow("Thu tiền mặt", formatCurrency(uiState.summary.cashSales), Color(0xFF4CAF50))
                    SummaryRow("Thu khác", formatCurrency(uiState.summary.cashIn), Color(0xFF4CAF50))
                    SummaryRow("Chi", formatCurrency(uiState.summary.cashOut), Color(0xFFF44336))
                    Divider(modifier = Modifier.padding(vertical = 8.dp))
                    SummaryRow("Tiền dự kiến", formatCurrency(uiState.summary.expectedCash), Color(0xFF1976D2), true)
                }

                // Actual Cash Input
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            "Tiền thực tế trong két",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1976D2)
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = if (uiState.actualCashText.isEmpty()) "" else formatCurrency(uiState.summary.actualCash),
                            onValueChange = { viewModel.updateActualCash(it) },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Nhập số tiền thực tế") },
                            leadingIcon = { Icon(Icons.Default.AttachMoney, null) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            shape = RoundedCornerShape(8.dp)
                        )

                        if (uiState.summary.actualCash > 0) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Chênh lệch:", fontWeight = FontWeight.Bold)
                                Text(
                                    formatCurrency(uiState.summary.cashDifference),
                                    fontWeight = FontWeight.Bold,
                                    color = when {
                                        uiState.summary.cashDifference > 0 -> Color(0xFF4CAF50)
                                        uiState.summary.cashDifference < 0 -> Color(0xFFF44336)
                                        else -> Color.Gray
                                    }
                                )
                            }
                        }
                    }
                }

                // Note
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            "Ghi chú",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1976D2)
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = uiState.note,
                            onValueChange = { viewModel.updateNote(it) },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Nhập ghi chú...") },
                            minLines = 2,
                            maxLines = 4,
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Close Shift Button
                Button(
                    onClick = { viewModel.showConfirmDialog() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .height(56.dp),
                    enabled = !uiState.isClosing && uiState.summary.actualCash > 0,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF44336)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (uiState.isClosing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(Icons.Default.ExitToApp, null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("CHỐT CA", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
fun SummaryCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = Color(0xFF1976D2), modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1976D2)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
fun SummaryRow(
    label: String,
    value: String,
    valueColor: Color = Color.Black,
    isBold: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            fontSize = 14.sp,
            color = Color.Gray
        )
        Text(
            value,
            fontSize = 14.sp,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal,
            color = valueColor
        )
    }
}

private fun formatCurrency(amount: Long): String {
    val prefix = if (amount < 0) "-" else ""
    return prefix + String.format("%,d đ", kotlin.math.abs(amount)).replace(",", ".")
}
