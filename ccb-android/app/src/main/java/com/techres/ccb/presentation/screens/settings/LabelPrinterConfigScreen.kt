package com.techres.ccb.presentation.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.KitchenPrintMode
import com.techres.ccb.data.local.entity.LabelSize
import com.techres.ccb.data.local.entity.PrinterProtocol
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
    var selectedProtocol by remember { mutableStateOf(printer.getPrinterProtocolEnum()) }
    var printerIp by remember { mutableStateOf(printer.printerIp ?: "") }
    var printerPort by remember { mutableStateOf(printer.printerPort.toString()) }

    // Label size
    var selectedLabelSize by remember { mutableStateOf(printer.getLabelSize()) }
    var labelGapMm by remember { mutableStateOf(printer.labelGapMm.toString()) }
    var printDensity by remember { mutableStateOf(printer.printDensity) }

    // Label display options
    var labelPrintPrice by remember { mutableStateOf(printer.labelPrintPrice) }
    var labelPrintStoreName by remember { mutableStateOf(printer.labelPrintStoreName) }
    var labelPrintOrderNumber by remember { mutableStateOf(printer.labelPrintOrderNumber) }
    var labelPrintTableName by remember { mutableStateOf(printer.labelPrintTableName) }
    var labelPrintTime by remember { mutableStateOf(printer.labelPrintTime) }
    var labelStoreName by remember { mutableStateOf(printer.labelStoreName ?: "") }
    var labelReverse by remember { mutableStateOf(printer.labelReverse) }

    // Font and spacing
    var labelFontScale by remember { mutableStateOf(printer.labelFontScale) }
    var labelMaxToppings by remember { mutableStateOf(printer.labelMaxToppings) }
    var labelLineSpacing by remember { mutableStateOf(printer.labelLineSpacing) }

    // Dropdown expanded states
    var protocolExpanded by remember { mutableStateOf(false) }
    var labelSizeExpanded by remember { mutableStateOf(false) }
    var fontScaleExpanded by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier
                    .width(360.dp)
                    .heightIn(max = 600.dp)
                    .verticalScroll(rememberScrollState())
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
                            .background(color.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Label,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp),
                            tint = color
                        )
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "Cấu hình máy in tem",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = printer.name,
                            fontSize = 14.sp,
                            color = color
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // ========== PRINTER CONNECTION SECTION ==========
                Text(
                    text = "Loại máy in (Protocol)",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))

                ExposedDropdownMenuBox(
                    expanded = protocolExpanded,
                    onExpandedChange = { protocolExpanded = !protocolExpanded }
                ) {
                    OutlinedTextField(
                        value = selectedProtocol.displayName,
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = protocolExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = color,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outline
                        )
                    )
                    ExposedDropdownMenu(
                        expanded = protocolExpanded,
                        onDismissRequest = { protocolExpanded = false }
                    ) {
                        PrinterProtocol.entries.forEach { protocol ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(
                                            text = protocol.displayName,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = when (protocol) {
                                                PrinterProtocol.ESCPOS -> "Máy in hóa đơn (EPSON, BIXOLON...)"
                                                PrinterProtocol.TSPL -> "Máy in tem (XPRINTER, TSC, GAINSCHA...)"
                                            },
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                },
                                onClick = {
                                    selectedProtocol = protocol
                                    protocolExpanded = false
                                },
                                leadingIcon = {
                                    Icon(
                                        imageVector = when (protocol) {
                                            PrinterProtocol.ESCPOS -> Icons.Default.Receipt
                                            PrinterProtocol.TSPL -> Icons.Default.LocalOffer
                                        },
                                        contentDescription = null,
                                        tint = if (selectedProtocol == protocol) color else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // IP Address and Port
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = printerIp,
                        onValueChange = { printerIp = it },
                        label = { Text("IP máy in") },
                        placeholder = { Text("192.168.1.100") },
                        modifier = Modifier.weight(2f),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = printerPort,
                        onValueChange = { printerPort = it.filter { c -> c.isDigit() } },
                        label = { Text("Cổng") },
                        placeholder = { Text("9100") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                Spacer(modifier = Modifier.height(12.dp))

                // ========== LABEL SIZE SECTION ==========
                Text(
                    text = "Cấu hình in tem",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = color
                )
                Spacer(modifier = Modifier.height(8.dp))

                // Label size selection
                Text(
                    text = "Kích thước tem",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))

                ExposedDropdownMenuBox(
                    expanded = labelSizeExpanded,
                    onExpandedChange = { labelSizeExpanded = !labelSizeExpanded }
                ) {
                    OutlinedTextField(
                        value = selectedLabelSize.displayName,
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = labelSizeExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = labelSizeExpanded,
                        onDismissRequest = { labelSizeExpanded = false }
                    ) {
                        LabelSize.ALL_SIZES.forEach { size ->
                            DropdownMenuItem(
                                text = { Text(size.displayName) },
                                onClick = {
                                    selectedLabelSize = size
                                    labelSizeExpanded = false
                                },
                                trailingIcon = {
                                    if (selectedLabelSize.widthMm == size.widthMm &&
                                        selectedLabelSize.heightMm == size.heightMm) {
                                        Icon(
                                            Icons.Default.Check,
                                            contentDescription = null,
                                            tint = color
                                        )
                                    }
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Gap and density
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = labelGapMm,
                        onValueChange = { labelGapMm = it.filter { c -> c.isDigit() } },
                        label = { Text("Gap (mm)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = if (labelMaxToppings == 0) "" else labelMaxToppings.toString(),
                        onValueChange = { value ->
                            labelMaxToppings = value.filter { it.isDigit() }.toIntOrNull()?.coerceIn(0, 20) ?: 0
                        },
                        label = { Text("Max topping") },
                        placeholder = { Text("0 = tự động") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Print density slider
                Text(
                    text = "Độ đậm: $printDensity",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Slider(
                    value = printDensity.toFloat(),
                    onValueChange = { printDensity = it.toInt() },
                    valueRange = 0f..15f,
                    steps = 14,
                    modifier = Modifier.fillMaxWidth(),
                    colors = SliderDefaults.colors(
                        thumbColor = color,
                        activeTrackColor = color
                    )
                )
                Text(
                    text = "0 = nhạt, 15 = đậm nhất",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Font Scale Dropdown
                val fontScaleOptions = listOf(
                    0.7f to "Rất nhỏ (0.7x)",
                    0.8f to "Nhỏ (0.8x)",
                    0.9f to "Hơi nhỏ (0.9x)",
                    1.0f to "Bình thường (1.0x)",
                    1.1f to "Hơi lớn (1.1x)",
                    1.2f to "Lớn (1.2x)",
                    1.3f to "Rất lớn (1.3x)"
                )
                ExposedDropdownMenuBox(
                    expanded = fontScaleExpanded,
                    onExpandedChange = { fontScaleExpanded = it }
                ) {
                    OutlinedTextField(
                        value = fontScaleOptions.find { it.first == labelFontScale }?.second
                            ?: "Bình thường (1.0x)",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Cỡ chữ") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = fontScaleExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = fontScaleExpanded,
                        onDismissRequest = { fontScaleExpanded = false }
                    ) {
                        fontScaleOptions.forEach { (scale, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = {
                                    labelFontScale = scale
                                    fontScaleExpanded = false
                                }
                            )
                        }
                    }
                }

                // Line spacing slider
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Khoảng cách dòng: ${(labelLineSpacing * 100).toInt()}%",
                    fontSize = 14.sp
                )
                Text(
                    text = when {
                        labelLineSpacing <= 0.85f -> "Rất sát"
                        labelLineSpacing <= 0.95f -> "Sát"
                        labelLineSpacing <= 1.05f -> "Bình thường"
                        labelLineSpacing <= 1.2f -> "Rộng"
                        else -> "Rất rộng"
                    },
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Slider(
                    value = labelLineSpacing,
                    onValueChange = { labelLineSpacing = it },
                    valueRange = 0.8f..1.5f,
                    steps = 6,
                    colors = SliderDefaults.colors(
                        thumbColor = color,
                        activeTrackColor = color
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                Spacer(modifier = Modifier.height(12.dp))

                // ========== DISPLAY OPTIONS SECTION ==========
                Text(
                    text = "Hiển thị trên tem",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = color
                )
                Spacer(modifier = Modifier.height(8.dp))

                // In giá
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = labelPrintPrice,
                        onCheckedChange = { labelPrintPrice = it },
                        colors = CheckboxDefaults.colors(checkedColor = color)
                    )
                    Text(text = "In giá", fontSize = 14.sp)
                }

                // In tên cửa hàng
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = labelPrintStoreName,
                        onCheckedChange = { labelPrintStoreName = it },
                        colors = CheckboxDefaults.colors(checkedColor = color)
                    )
                    Text(text = "In tên cửa hàng", fontSize = 14.sp)
                }

                // Tên cửa hàng hiển thị (show only when labelPrintStoreName is checked)
                if (labelPrintStoreName) {
                    OutlinedTextField(
                        value = labelStoreName,
                        onValueChange = { labelStoreName = it },
                        label = { Text("Tên cửa hàng hiển thị") },
                        placeholder = { Text("VD: Quán Cà phê ABC") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 40.dp),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                // In mã đơn hàng
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = labelPrintOrderNumber,
                        onCheckedChange = { labelPrintOrderNumber = it },
                        colors = CheckboxDefaults.colors(checkedColor = color)
                    )
                    Text(text = "In mã đơn hàng", fontSize = 14.sp)
                }

                // In tên bàn
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = labelPrintTableName,
                        onCheckedChange = { labelPrintTableName = it },
                        colors = CheckboxDefaults.colors(checkedColor = color)
                    )
                    Text(text = "In tên bàn", fontSize = 14.sp)
                }

                // In thời gian
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = labelPrintTime,
                        onCheckedChange = { labelPrintTime = it },
                        colors = CheckboxDefaults.colors(checkedColor = color)
                    )
                    Text(text = "In thời gian", fontSize = 14.sp)
                }

                // Đảo chiều tem
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = labelReverse,
                        onCheckedChange = { labelReverse = it },
                        colors = CheckboxDefaults.colors(checkedColor = color)
                    )
                    Column {
                        Text(text = "Đảo chiều tem (180°)", fontSize = 14.sp)
                        Text(
                            text = "In tem ngược 180° cho máy in đặt ngược",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

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
                            val updatedPrinter = printer.copy(
                                printerProtocol = selectedProtocol.name,
                                printerIp = printerIp.ifBlank { null },
                                printerPort = printerPort.toIntOrNull() ?: 9100,
                                labelWidthMm = selectedLabelSize.widthMm,
                                labelHeightMm = selectedLabelSize.heightMm,
                                labelGapMm = labelGapMm.toIntOrNull() ?: 3,
                                printDensity = printDensity,
                                labelPrintPrice = labelPrintPrice,
                                labelPrintStoreName = labelPrintStoreName,
                                labelPrintOrderNumber = labelPrintOrderNumber,
                                labelPrintTableName = labelPrintTableName,
                                labelPrintTime = labelPrintTime,
                                labelStoreName = labelStoreName.ifBlank { null },
                                labelReverse = labelReverse,
                                labelFontScale = labelFontScale,
                                labelMaxToppings = labelMaxToppings,
                                labelLineSpacing = labelLineSpacing
                            )
                            onSave(updatedPrinter)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = color
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
