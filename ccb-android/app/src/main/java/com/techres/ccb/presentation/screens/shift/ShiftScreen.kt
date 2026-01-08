package com.techres.ccb.presentation.screens.shift

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.presentation.theme.Success

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShiftScreen(
    onNavigateBack: () -> Unit,
    viewModel: ShiftViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var showOpenShiftDialog by remember { mutableStateOf(false) }
    var showCloseShiftDialog by remember { mutableStateOf(false) }
    var openingAmount by remember { mutableStateOf("") }
    var closingAmount by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ca làm việc") },
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
            if (uiState.currentShift == null) {
                // No active shift
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.AccessTime,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Chưa mở ca",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Mở ca để bắt đầu bán hàng",
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(
                            onClick = { showOpenShiftDialog = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Mở ca")
                        }
                    }
                }
            } else {
                // Active shift
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Success.copy(alpha = 0.1f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Success
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Ca đang mở",
                                fontWeight = FontWeight.Bold,
                                color = Success
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Bắt đầu: ${uiState.currentShift?.openedAt?.take(16)?.replace("T", " ") ?: ""}")
                        Text("Nhân viên: ${uiState.currentShift?.staffName ?: ""}")
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Shift summary
                Text(
                    text = "Tổng kết ca",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(12.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        ShiftSummaryRow("Tiền đầu ca", formatPrice(uiState.currentShift?.openingAmount ?: 0.0))
                        Divider(modifier = Modifier.padding(vertical = 8.dp))
                        ShiftSummaryRow("Tổng đơn hàng", "${uiState.totalOrders} đơn")
                        ShiftSummaryRow("Doanh thu", formatPrice(uiState.totalRevenue), isHighlighted = true)
                        Divider(modifier = Modifier.padding(vertical = 8.dp))
                        ShiftSummaryRow("Tiền mặt", formatPrice(uiState.cashRevenue))
                        ShiftSummaryRow("Chuyển khoản", formatPrice(uiState.transferRevenue))
                        ShiftSummaryRow("Thẻ", formatPrice(uiState.cardRevenue))
                        Divider(modifier = Modifier.padding(vertical = 8.dp))
                        ShiftSummaryRow(
                            "Tiền mặt dự kiến",
                            formatPrice((uiState.currentShift?.openingAmount ?: 0.0) + uiState.cashRevenue),
                            isHighlighted = true
                        )
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                Button(
                    onClick = { showCloseShiftDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Chốt ca")
                }
            }
        }
    }

    // Open shift dialog
    if (showOpenShiftDialog) {
        AlertDialog(
            onDismissRequest = { showOpenShiftDialog = false },
            title = { Text("Mở ca làm việc") },
            text = {
                Column {
                    Text("Nhập số tiền đầu ca:")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = openingAmount,
                        onValueChange = { openingAmount = it.filter { c -> c.isDigit() } },
                        label = { Text("Tiền đầu ca") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        suffix = { Text("đ") },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.openShift(openingAmount.toDoubleOrNull() ?: 0.0)
                        showOpenShiftDialog = false
                        openingAmount = ""
                    }
                ) {
                    Text("Mở ca")
                }
            },
            dismissButton = {
                TextButton(onClick = { showOpenShiftDialog = false }) {
                    Text("Hủy")
                }
            }
        )
    }

    // Close shift dialog
    if (showCloseShiftDialog) {
        AlertDialog(
            onDismissRequest = { showCloseShiftDialog = false },
            title = { Text("Chốt ca làm việc") },
            text = {
                Column {
                    Text("Nhập số tiền cuối ca:")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = closingAmount,
                        onValueChange = { closingAmount = it.filter { c -> c.isDigit() } },
                        label = { Text("Tiền cuối ca") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        suffix = { Text("đ") },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.closeShift(closingAmount.toDoubleOrNull() ?: 0.0)
                        showCloseShiftDialog = false
                        closingAmount = ""
                    }
                ) {
                    Text("Chốt ca")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCloseShiftDialog = false }) {
                    Text("Hủy")
                }
            }
        )
    }
}

@Composable
private fun ShiftSummaryRow(
    label: String,
    value: String,
    isHighlighted: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontWeight = if (isHighlighted) FontWeight.SemiBold else FontWeight.Normal
        )
        Text(
            text = value,
            fontWeight = if (isHighlighted) FontWeight.Bold else FontWeight.Normal,
            color = if (isHighlighted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
        )
    }
}

private fun formatPrice(amount: Double): String {
    return String.format("%,.0f đ", amount)
}
