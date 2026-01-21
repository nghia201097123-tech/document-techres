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
import androidx.compose.runtime.rememberCoroutineScope
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
import com.techres.ccb.data.printer.LabelPrintService
import com.techres.ccb.data.printer.PrinterResult
import com.techres.ccb.presentation.components.PosTopAppBar
import kotlinx.coroutines.launch
import java.util.Date

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LabelPrinterConfigScreen(
    onNavigateBack: () -> Unit,
    viewModel: LabelPrinterConfigViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val coroutineScope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var selectedPrinter by remember { mutableStateOf<KitchenEntity?>(null) }
    var showSettingsDialog by remember { mutableStateOf(false) }
    var printingPrinterId by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            PosTopAppBar(
                title = { Text("Máy in Tem") },
                onBack = onNavigateBack
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
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
                                isPrinting = printingPrinterId == printer.id,
                                onConfigurePrinter = {
                                    selectedPrinter = printer
                                    showSettingsDialog = true
                                },
                                onTestPrint = {
                                    if (printingPrinterId != null) return@LabelPrinterCard
                                    printingPrinterId = printer.id

                                    coroutineScope.launch {
                                        try {
                                            val testLabel = LabelPrintService.LabelData(
                                                itemName = "TEM THỬ - TEST LABEL",
                                                quantity = 1,
                                                orderNumber = "TEST-001",
                                                dailyOrderNumber = 1,
                                                tableName = "Bàn Test",
                                                pagerNumber = 99,
                                                orderTime = Date(),
                                                toppings = listOf("Topping 1", "Topping 2"),
                                                note = "Đây là tem in thử",
                                                storeName = printer.labelStoreName,
                                                labelIndex = 1,
                                                totalLabels = 1
                                            )

                                            val result = LabelPrintService.printLabels(
                                                kitchen = printer,
                                                labelData = testLabel
                                            )

                                            when (result) {
                                                is PrinterResult.Success -> {
                                                    snackbarHostState.showSnackbar("In tem thử thành công!")
                                                }
                                                is PrinterResult.Error -> {
                                                    snackbarHostState.showSnackbar("Lỗi: ${result.message}")
                                                }
                                            }
                                        } catch (e: Exception) {
                                            snackbarHostState.showSnackbar("Lỗi: ${e.message}")
                                        }
                                        printingPrinterId = null
                                    }
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

    // Settings dialog
    if (showSettingsDialog && selectedPrinter != null) {
        LabelPrinterSettingsDialog(
            printer = selectedPrinter!!,
            onDismiss = { showSettingsDialog = false },
            onSave = { updatedPrinter ->
                viewModel.updateLabelPrinterSettings(updatedPrinter)
                showSettingsDialog = false
            }
        )
    }
}

@Composable
private fun LabelPrinterCard(
    printer: KitchenEntity,
    isPrinting: Boolean = false,
    onConfigurePrinter: () -> Unit,
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

            // Action buttons - same layout as KitchenPrinterCard
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

                // Test print button - enabled when IP is configured and not printing
                Button(
                    onClick = onTestPrint,
                    modifier = Modifier.weight(1f),
                    enabled = !printer.printerIp.isNullOrBlank() && !isPrinting,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = color
                    )
                ) {
                    if (isPrinting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            Icons.Default.Print,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(if (isPrinting) "Đang in..." else "In thử")
                }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LabelPrinterSettingsDialog(
    printer: KitchenEntity,
    onDismiss: () -> Unit,
    onSave: (KitchenEntity) -> Unit
) {
    val color = Color(0xFF4CAF50)

    // Printer connection state
    var printerProtocol by remember { mutableStateOf(printer.printerProtocol) }
    var printerIp by remember { mutableStateOf(printer.printerIp ?: "") }
    var printerPort by remember { mutableStateOf(printer.printerPort.toString()) }

    // Label display options
    var labelPrintPrice by remember { mutableStateOf(printer.labelPrintPrice) }
    var labelPrintStoreName by remember { mutableStateOf(printer.labelPrintStoreName) }
    var labelPrintOrderNumber by remember { mutableStateOf(printer.labelPrintOrderNumber) }
    var labelPrintTableName by remember { mutableStateOf(printer.labelPrintTableName) }
    var labelPrintTime by remember { mutableStateOf(printer.labelPrintTime) }
    var labelStoreName by remember { mutableStateOf(printer.labelStoreName ?: "") }
    var labelReverse by remember { mutableStateOf(printer.labelReverse) }

    // Label size - use LabelSize for dropdown
    var selectedLabelSize by remember {
        mutableStateOf(
            com.techres.ccb.data.local.entity.LabelSize.ALL_SIZES.find {
                it.widthMm == printer.labelWidthMm && it.heightMm == printer.labelHeightMm
            } ?: com.techres.ccb.data.local.entity.LabelSize.SIZE_72x30
        )
    }
    var labelGapMm by remember { mutableStateOf(printer.labelGapMm.toString()) }

    // Font and spacing
    var labelFontScale by remember { mutableStateOf(printer.labelFontScale) }
    var labelMaxToppings by remember { mutableStateOf(printer.labelMaxToppings.toString()) }
    var labelLineSpacing by remember { mutableStateOf(printer.labelLineSpacing) }

    // Dropdown expanded states
    var protocolExpanded by remember { mutableStateOf(false) }
    var labelSizeExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Settings,
                    contentDescription = null,
                    tint = color
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Cài đặt tem - ${printer.name}")
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 500.dp)
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // ========== PRINTER CONNECTION SECTION ==========
                    item {
                        Text(
                            text = "Kết nối máy in",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = color
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Printer Protocol dropdown
                    item {
                        ExposedDropdownMenuBox(
                            expanded = protocolExpanded,
                            onExpandedChange = { protocolExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = when (printerProtocol) {
                                    "TSPL" -> "TSPL (Máy in tem)"
                                    else -> "ESC/POS (Máy in hóa đơn)"
                                },
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Loại máy in") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = protocolExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(
                                expanded = protocolExpanded,
                                onDismissRequest = { protocolExpanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("TSPL (Máy in tem)") },
                                    onClick = {
                                        printerProtocol = "TSPL"
                                        protocolExpanded = false
                                    }
                                )
                                DropdownMenuItem(
                                    text = { Text("ESC/POS (Máy in hóa đơn)") },
                                    onClick = {
                                        printerProtocol = "ESCPOS"
                                        protocolExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // IP and Port
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = printerIp,
                                onValueChange = { printerIp = it },
                                label = { Text("IP máy in") },
                                placeholder = { Text("192.168.1.100") },
                                modifier = Modifier.weight(2f),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = printerPort,
                                onValueChange = { printerPort = it.filter { c -> c.isDigit() } },
                                label = { Text("Cổng") },
                                placeholder = { Text("9100") },
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                        }
                    }

                    // ========== LABEL SIZE SECTION ==========
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Kích thước tem",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = color
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Label size dropdown
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            ExposedDropdownMenuBox(
                                expanded = labelSizeExpanded,
                                onExpandedChange = { labelSizeExpanded = it },
                                modifier = Modifier.weight(2f)
                            ) {
                                OutlinedTextField(
                                    value = selectedLabelSize.displayName,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Kích thước") },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = labelSizeExpanded) },
                                    modifier = Modifier.fillMaxWidth().menuAnchor()
                                )
                                ExposedDropdownMenu(
                                    expanded = labelSizeExpanded,
                                    onDismissRequest = { labelSizeExpanded = false }
                                ) {
                                    com.techres.ccb.data.local.entity.LabelSize.ALL_SIZES.forEach { size ->
                                        DropdownMenuItem(
                                            text = { Text(size.displayName) },
                                            onClick = {
                                                selectedLabelSize = size
                                                labelSizeExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                            OutlinedTextField(
                                value = labelGapMm,
                                onValueChange = { labelGapMm = it.filter { c -> c.isDigit() } },
                                label = { Text("Gap (mm)") },
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                        }
                    }

                    // Max toppings per label
                    item {
                        OutlinedTextField(
                            value = labelMaxToppings,
                            onValueChange = { labelMaxToppings = it.filter { c -> c.isDigit() } },
                            label = { Text("Số topping tối đa / tem (0 = tự động)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    // Font scale slider
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Cỡ chữ: ${String.format("%.1f", labelFontScale)}x",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = color
                        )
                        Slider(
                            value = labelFontScale,
                            onValueChange = { labelFontScale = it },
                            valueRange = 0.5f..2.0f,
                            steps = 14,
                            colors = SliderDefaults.colors(
                                thumbColor = color,
                                activeTrackColor = color
                            )
                        )
                    }

                    // Line spacing slider
                    item {
                        Text(
                            text = "Khoảng cách dòng: ${String.format("%.1f", labelLineSpacing)}x",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = color
                        )
                        Slider(
                            value = labelLineSpacing,
                            onValueChange = { labelLineSpacing = it },
                            valueRange = 0.5f..2.0f,
                            steps = 14,
                            colors = SliderDefaults.colors(
                                thumbColor = color,
                                activeTrackColor = color
                            )
                        )
                    }

                    // Store name
                    item {
                        OutlinedTextField(
                            value = labelStoreName,
                            onValueChange = { labelStoreName = it },
                            label = { Text("Tên cửa hàng hiển thị") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    // ========== DISPLAY OPTIONS SECTION ==========
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Hiển thị trên tem",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = color
                        )
                    }

                    item {
                        LabelSettingSwitch(
                            label = "In giá",
                            checked = labelPrintPrice,
                            onCheckedChange = { labelPrintPrice = it },
                            color = color
                        )
                    }

                    item {
                        LabelSettingSwitch(
                            label = "In tên cửa hàng",
                            checked = labelPrintStoreName,
                            onCheckedChange = { labelPrintStoreName = it },
                            color = color
                        )
                    }

                    item {
                        LabelSettingSwitch(
                            label = "In mã đơn hàng",
                            checked = labelPrintOrderNumber,
                            onCheckedChange = { labelPrintOrderNumber = it },
                            color = color
                        )
                    }

                    item {
                        LabelSettingSwitch(
                            label = "In tên bàn",
                            checked = labelPrintTableName,
                            onCheckedChange = { labelPrintTableName = it },
                            color = color
                        )
                    }

                    item {
                        LabelSettingSwitch(
                            label = "In thời gian",
                            checked = labelPrintTime,
                            onCheckedChange = { labelPrintTime = it },
                            color = color
                        )
                    }

                    item {
                        LabelSettingSwitch(
                            label = "Đảo chiều tem (180°)",
                            checked = labelReverse,
                            onCheckedChange = { labelReverse = it },
                            color = color
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val updatedPrinter = printer.copy(
                        printerProtocol = printerProtocol,
                        printerIp = printerIp.ifBlank { null },
                        printerPort = printerPort.toIntOrNull() ?: 9100,
                        labelPrintPrice = labelPrintPrice,
                        labelPrintStoreName = labelPrintStoreName,
                        labelPrintOrderNumber = labelPrintOrderNumber,
                        labelPrintTableName = labelPrintTableName,
                        labelPrintTime = labelPrintTime,
                        labelStoreName = labelStoreName.ifBlank { null },
                        labelReverse = labelReverse,
                        labelWidthMm = selectedLabelSize.widthMm,
                        labelHeightMm = selectedLabelSize.heightMm,
                        labelGapMm = labelGapMm.toIntOrNull() ?: 3,
                        labelFontScale = labelFontScale,
                        labelMaxToppings = labelMaxToppings.toIntOrNull() ?: 0,
                        labelLineSpacing = labelLineSpacing
                    )
                    onSave(updatedPrinter)
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = color
                )
            ) {
                Text("Lưu")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Hủy")
            }
        }
    )
}

@Composable
private fun LabelSettingSwitch(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    color: Color
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 14.sp
        )
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = color,
                uncheckedThumbColor = Color.White,
                uncheckedTrackColor = Color.Gray.copy(alpha = 0.5f)
            )
        )
    }
}
