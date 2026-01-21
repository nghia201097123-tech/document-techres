package com.techres.ccb.presentation.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.KitchenPrintMode
import com.techres.ccb.data.local.entity.PrinterProtocol
import com.techres.ccb.data.printer.LabelPrintService
import com.techres.ccb.data.printer.PrinterResult
import com.techres.ccb.data.printer.PrinterService
import com.techres.ccb.presentation.components.PosTopAppBar
import kotlinx.coroutines.delay
import java.util.Date

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LabelPrinterConfigScreen(
    onNavigateBack: () -> Unit,
    viewModel: LabelPrinterConfigViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var selectedPrinter by remember { mutableStateOf<KitchenEntity?>(null) }
    var showTestPrintDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            PosTopAppBar(
                title = { Text("Máy in Tem") },
                onBack = onNavigateBack
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
                    containerColor = Color(0xFFE8F5E9)
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
                        Icons.Default.Label,
                        contentDescription = null,
                        tint = Color(0xFF388E3C),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Máy in Tem (TSPL)",
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF388E3C)
                        )
                        Text(
                            text = "Cấu hình máy in tem cho từng bếp/bar",
                            fontSize = 12.sp,
                            color = Color(0xFF388E3C).copy(alpha = 0.7f)
                        )
                    }
                }
            }

            when {
                uiState.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            CircularProgressIndicator()
                            Text(
                                text = "Đang tải dữ liệu...",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
                uiState.labelPrinters.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            modifier = Modifier.padding(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Label,
                                contentDescription = null,
                                modifier = Modifier.size(80.dp),
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                            )
                            Text(
                                text = "Chưa có máy in tem",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                            Text(
                                text = "Vui lòng cấu hình chế độ in \"Tem\" hoặc \"Phiếu + Tem\" trong mục Máy in Món",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.labelPrinters) { printer ->
                            LabelPrinterCard(
                                printer = printer,
                                onTestPrint = {
                                    selectedPrinter = printer
                                    showTestPrintDialog = true
                                },
                                onToggleActive = { isActive ->
                                    viewModel.toggleActiveStatus(printer.id, isActive)
                                }
                            )
                        }

                        item {
                            Spacer(modifier = Modifier.height(16.dp))
                        }
                    }
                }
            }
        }
    }

    // Test print dialog
    if (showTestPrintDialog && selectedPrinter != null) {
        LabelTestPrintDialog(
            printer = selectedPrinter!!,
            onDismiss = { showTestPrintDialog = false }
        )
    }
}

@Composable
private fun LabelPrinterCard(
    printer: KitchenEntity,
    onTestPrint: () -> Unit,
    onToggleActive: (Boolean) -> Unit
) {
    val color = Color(0xFF4CAF50)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (printer.isActive) Color.White else Color(0xFFF5F5F5)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (printer.isActive) color.copy(alpha = 0.15f)
                            else Color.Gray.copy(alpha = 0.15f)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Label,
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = if (printer.isActive) color else Color.Gray
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = printer.name,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (printer.isActive)
                            MaterialTheme.colorScheme.onSurface
                        else
                            MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                    Text(
                        text = "Máy in tem",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }

                Switch(
                    checked = printer.isActive,
                    onCheckedChange = onToggleActive,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = color,
                        uncheckedThumbColor = Color.White,
                        uncheckedTrackColor = Color.Gray.copy(alpha = 0.5f)
                    )
                )
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

                    if (printer.printerIp != null) {
                        LabelPrinterInfoRow("Tên máy in", printer.printerName ?: "Chưa đặt tên")
                        LabelPrinterInfoRow("Địa chỉ IP", printer.printerIp!!)
                        LabelPrinterInfoRow("Cổng", printer.printerPort.toString())
                        LabelPrinterInfoRow("Protocol", printer.getPrinterProtocolEnum().displayName)
                        LabelPrinterInfoRow("Kích thước tem", printer.getLabelSize().displayName)
                        LabelPrinterInfoRow("Chế độ in", when (printer.getPrintModeEnum()) {
                            KitchenPrintMode.TICKET -> "Phiếu bếp"
                            KitchenPrintMode.LABEL -> "Tem"
                            KitchenPrintMode.BOTH -> "Phiếu + Tem"
                        })
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

            // Test print button
            Button(
                onClick = onTestPrint,
                modifier = Modifier.fillMaxWidth(),
                enabled = printer.printerIp != null,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = color
                )
            ) {
                Icon(
                    Icons.Default.Print,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("In thử tem")
            }
        }
    }
}

@Composable
private fun LabelPrinterInfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
        Text(
            text = value,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun LabelTestPrintDialog(
    printer: KitchenEntity,
    onDismiss: () -> Unit
) {
    var printStatus by remember { mutableStateOf<String?>(null) }
    var isPrinting by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Print,
                    contentDescription = null,
                    tint = Color(0xFF4CAF50)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("In thử tem")
            }
        },
        text = {
            Column {
                Text("Máy in: ${printer.name}")
                Text("IP: ${printer.printerIp}:${printer.printerPort}")
                Text("Protocol: ${printer.getPrinterProtocolEnum().displayName}")
                Text("Kích thước: ${printer.getLabelSize().displayName}")

                if (isPrinting) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Đang in tem thử...")
                    }
                }

                printStatus?.let { status ->
                    Spacer(modifier = Modifier.height(16.dp))
                    val isSuccess = status.contains("thành công", ignoreCase = true)
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSuccess) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                if (isSuccess) Icons.Default.CheckCircle else Icons.Default.Error,
                                contentDescription = null,
                                tint = if (isSuccess) Color(0xFF4CAF50) else Color(0xFFF44336)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = status,
                                color = if (isSuccess) Color(0xFF2E7D32) else Color(0xFFC62828)
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    isPrinting = true
                    printStatus = null

                    // Test print label
                    val testLabel = LabelPrintService.LabelData(
                        kitchenName = printer.name,
                        itemName = "TEM THỬ - TEST LABEL",
                        quantity = 1,
                        totalQuantity = 1,
                        labelIndex = 1,
                        displayNumber = "TEST-001",
                        tableName = "Bàn Test",
                        pagerNumber = 99,
                        orderTime = Date(),
                        toppings = listOf("Topping 1", "Topping 2"),
                        notes = "Đây là tem in thử",
                        storeName = printer.labelStoreName,
                        showPrice = printer.labelPrintPrice,
                        price = 50000,
                        showStoreName = printer.labelPrintStoreName,
                        showOrderNumber = printer.labelPrintOrderNumber,
                        showTableName = printer.labelPrintTableName,
                        showTime = printer.labelPrintTime
                    )

                    val printerIp = printer.printerIp ?: ""
                    val printerPort = printer.printerPort

                    Thread {
                        try {
                            val result = if (printer.getPrinterProtocolEnum() == PrinterProtocol.TSPL) {
                                LabelPrintService.printLabelTspl(
                                    printerIp = printerIp,
                                    printerPort = printerPort,
                                    label = testLabel,
                                    labelWidthMm = printer.labelWidthMm,
                                    labelHeightMm = printer.labelHeightMm,
                                    labelGapMm = printer.labelGapMm,
                                    printDensity = printer.printDensity,
                                    reverse = printer.labelReverse,
                                    fontScale = printer.labelFontScale,
                                    maxToppings = printer.labelMaxToppings,
                                    lineSpacing = printer.labelLineSpacing
                                )
                            } else {
                                LabelPrintService.printLabelEscPos(
                                    printerIp = printerIp,
                                    printerPort = printerPort,
                                    label = testLabel,
                                    paperWidth = printer.paperWidth
                                )
                            }

                            printStatus = when (result) {
                                is PrinterResult.Success -> "In tem thành công!"
                                is PrinterResult.Error -> "Lỗi: ${result.message}"
                            }
                        } catch (e: Exception) {
                            printStatus = "Lỗi: ${e.message}"
                        }
                        isPrinting = false
                    }.start()
                },
                enabled = !isPrinting,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF4CAF50)
                )
            ) {
                Text("In thử")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Đóng")
            }
        }
    )
}
