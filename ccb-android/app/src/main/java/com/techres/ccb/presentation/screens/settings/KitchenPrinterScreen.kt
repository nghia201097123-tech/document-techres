package com.techres.ccb.presentation.screens.settings

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import kotlinx.coroutines.delay

// Mock data for kitchens
data class MockKitchen(
    val id: String,
    val name: String,
    val icon: ImageVector,
    val color: Color,
    val description: String,
    var printerIp: String? = null,
    var printerPort: Int = 9100,
    var printerName: String? = null,
    var isConnected: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KitchenPrinterScreen(
    onBack: () -> Unit
) {
    // Mock 3 kitchens
    var kitchens by remember {
        mutableStateOf(
            listOf(
                MockKitchen(
                    id = "kitchen_1",
                    name = "Bếp nấu",
                    icon = Icons.Default.Countertops,
                    color = Color(0xFFFF5722),
                    description = "Chế biến các món nấu, canh, súp",
                    printerIp = "192.168.1.101",
                    printerPort = 9100,
                    printerName = "EPSON TM-T82",
                    isConnected = true
                ),
                MockKitchen(
                    id = "kitchen_2",
                    name = "Bếp nướng",
                    icon = Icons.Default.OutdoorGrill,
                    color = Color(0xFFE91E63),
                    description = "Các món nướng, BBQ, xiên que",
                    printerIp = "192.168.1.102",
                    printerPort = 9100,
                    printerName = "EPSON TM-T88",
                    isConnected = true
                ),
                MockKitchen(
                    id = "kitchen_3",
                    name = "Kho bia",
                    icon = Icons.Default.LocalBar,
                    color = Color(0xFF2196F3),
                    description = "Bia, nước giải khát, đồ uống",
                    printerIp = null,
                    printerName = null,
                    isConnected = false
                )
            )
        )
    }

    var selectedKitchen by remember { mutableStateOf<MockKitchen?>(null) }
    var showPrinterDialog by remember { mutableStateOf(false) }
    var showTestPrintDialog by remember { mutableStateOf(false) }
    var testPrintKitchen by remember { mutableStateOf<MockKitchen?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Quản lý Bếp & Máy in") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF5F5F5))
        ) {
            // Header info
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFE3F2FD)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = Color(0xFF1976D2),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Cấu hình máy in cho từng bếp",
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF1976D2)
                        )
                        Text(
                            text = "Gán địa chỉ IP máy in và in thử để kiểm tra kết nối",
                            fontSize = 12.sp,
                            color = Color(0xFF1976D2).copy(alpha = 0.7f)
                        )
                    }
                }
            }

            // Kitchen list
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(kitchens) { kitchen ->
                    KitchenPrinterCard(
                        kitchen = kitchen,
                        onConfigurePrinter = {
                            selectedKitchen = kitchen
                            showPrinterDialog = true
                        },
                        onTestPrint = {
                            testPrintKitchen = kitchen
                            showTestPrintDialog = true
                        }
                    )
                }

                // Bottom spacing
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }

    // Printer configuration dialog
    if (showPrinterDialog && selectedKitchen != null) {
        PrinterConfigDialog(
            kitchen = selectedKitchen!!,
            onDismiss = { showPrinterDialog = false },
            onSave = { ip, port, name ->
                kitchens = kitchens.map {
                    if (it.id == selectedKitchen!!.id) {
                        it.copy(
                            printerIp = ip,
                            printerPort = port,
                            printerName = name,
                            isConnected = ip.isNotBlank()
                        )
                    } else it
                }
                showPrinterDialog = false
            }
        )
    }

    // Test print dialog
    if (showTestPrintDialog && testPrintKitchen != null) {
        TestPrintDialog(
            kitchen = testPrintKitchen!!,
            onDismiss = { showTestPrintDialog = false }
        )
    }
}

@Composable
private fun KitchenPrinterCard(
    kitchen: MockKitchen,
    onConfigurePrinter: () -> Unit,
    onTestPrint: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Kitchen header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Kitchen icon
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(kitchen.color.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = kitchen.icon,
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = kitchen.color
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Kitchen info
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = kitchen.name,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = kitchen.description,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }

                // Connection status
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            if (kitchen.isConnected) Color(0xFFE8F5E9)
                            else Color(0xFFFFEBEE)
                        )
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(
                                    if (kitchen.isConnected) Color(0xFF4CAF50)
                                    else Color(0xFFE53935)
                                )
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (kitchen.isConnected) "Đã kết nối" else "Chưa kết nối",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (kitchen.isConnected) Color(0xFF2E7D32) else Color(0xFFC62828)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Printer info
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFF5F5F5)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Print,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Thông tin máy in",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (kitchen.printerIp != null) {
                        PrinterInfoRow("Tên máy in", kitchen.printerName ?: "Chưa đặt tên")
                        PrinterInfoRow("Địa chỉ IP", kitchen.printerIp!!)
                        PrinterInfoRow("Cổng", kitchen.printerPort.toString())
                    } else {
                        Text(
                            text = "Chưa cấu hình máy in",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Configure button
                OutlinedButton(
                    onClick = onConfigurePrinter,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(
                        Icons.Default.Settings,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Cấu hình")
                }

                // Test print button
                Button(
                    onClick = onTestPrint,
                    modifier = Modifier.weight(1f),
                    enabled = kitchen.isConnected,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = kitchen.color
                    )
                ) {
                    Icon(
                        Icons.Default.Print,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("In thử")
                }
            }
        }
    }
}

@Composable
private fun PrinterInfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
        Text(
            text = value,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PrinterConfigDialog(
    kitchen: MockKitchen,
    onDismiss: () -> Unit,
    onSave: (ip: String, port: Int, name: String) -> Unit
) {
    var printerName by remember { mutableStateOf(kitchen.printerName ?: "") }
    var printerIp by remember { mutableStateOf(kitchen.printerIp ?: "") }
    var printerPort by remember { mutableStateOf(kitchen.printerPort.toString()) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier
                    .width(360.dp)
                    .padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(kitchen.color.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Print,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp),
                            tint = kitchen.color
                        )
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "Cấu hình máy in",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = kitchen.name,
                            fontSize = 14.sp,
                            color = kitchen.color
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Printer name
                OutlinedTextField(
                    value = printerName,
                    onValueChange = { printerName = it },
                    label = { Text("Tên máy in") },
                    placeholder = { Text("VD: EPSON TM-T82") },
                    leadingIcon = {
                        Icon(Icons.Default.Label, contentDescription = null)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // IP Address
                OutlinedTextField(
                    value = printerIp,
                    onValueChange = { printerIp = it },
                    label = { Text("Địa chỉ IP") },
                    placeholder = { Text("VD: 192.168.1.100") },
                    leadingIcon = {
                        Icon(Icons.Default.Wifi, contentDescription = null)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Port
                OutlinedTextField(
                    value = printerPort,
                    onValueChange = { printerPort = it.filter { c -> c.isDigit() } },
                    label = { Text("Cổng (Port)") },
                    placeholder = { Text("9100") },
                    leadingIcon = {
                        Icon(Icons.Default.Router, contentDescription = null)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Hủy")
                    }

                    Button(
                        onClick = {
                            onSave(
                                printerIp,
                                printerPort.toIntOrNull() ?: 9100,
                                printerName
                            )
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = kitchen.color
                        )
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Lưu")
                    }
                }
            }
        }
    }
}

@Composable
private fun TestPrintDialog(
    kitchen: MockKitchen,
    onDismiss: () -> Unit
) {
    var printState by remember { mutableStateOf<PrintState>(PrintState.Idle) }

    // Simulate print process
    LaunchedEffect(Unit) {
        printState = PrintState.Connecting
        delay(1000)
        printState = PrintState.Sending
        delay(1500)
        printState = PrintState.Success
    }

    Dialog(onDismissRequest = { if (printState != PrintState.Connecting && printState != PrintState.Sending) onDismiss() }) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier
                    .width(320.dp)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Icon based on state
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(
                            when (printState) {
                                PrintState.Success -> Color(0xFFE8F5E9)
                                PrintState.Error -> Color(0xFFFFEBEE)
                                else -> kitchen.color.copy(alpha = 0.1f)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    when (printState) {
                        PrintState.Idle, PrintState.Connecting, PrintState.Sending -> {
                            CircularProgressIndicator(
                                modifier = Modifier.size(40.dp),
                                color = kitchen.color,
                                strokeWidth = 3.dp
                            )
                        }
                        PrintState.Success -> {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = Color(0xFF4CAF50)
                            )
                        }
                        PrintState.Error -> {
                            Icon(
                                Icons.Default.Error,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = Color(0xFFE53935)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Title
                Text(
                    text = when (printState) {
                        PrintState.Idle -> "Chuẩn bị in..."
                        PrintState.Connecting -> "Đang kết nối máy in..."
                        PrintState.Sending -> "Đang gửi lệnh in..."
                        PrintState.Success -> "In thử thành công!"
                        PrintState.Error -> "Lỗi kết nối"
                    },
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Subtitle
                Text(
                    text = when (printState) {
                        PrintState.Success -> "Kiểm tra máy in ${kitchen.name}\n(${kitchen.printerIp})"
                        PrintState.Error -> "Không thể kết nối đến ${kitchen.printerIp}"
                        else -> "${kitchen.printerName}\n${kitchen.printerIp}:${kitchen.printerPort}"
                    },
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Test print content preview
                if (printState == PrintState.Success) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFFFAFAFA)
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "--- IN THỬ ---",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                            )
                            Text(
                                text = kitchen.name.uppercase(),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                            )
                            Text(
                                text = "IP: ${kitchen.printerIp}",
                                fontSize = 11.sp,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                            )
                            Text(
                                text = "Port: ${kitchen.printerPort}",
                                fontSize = 11.sp,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                            )
                            Text(
                                text = "----------------",
                                fontSize = 11.sp,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Close button
                if (printState == PrintState.Success || printState == PrintState.Error) {
                    Button(
                        onClick = onDismiss,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (printState == PrintState.Success) Color(0xFF4CAF50) else kitchen.color
                        )
                    ) {
                        Text("Đóng")
                    }
                }
            }
        }
    }
}

private enum class PrintState {
    Idle,
    Connecting,
    Sending,
    Success,
    Error
}
