package com.techres.ccb.presentation.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.delay
import com.techres.ccb.BuildConfig
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.PrinterProtocol
import com.techres.ccb.data.local.entity.LabelSize
import com.techres.ccb.data.local.entity.KitchenPrintMode
import com.techres.ccb.data.printer.PrinterService
import com.techres.ccb.data.printer.PrinterResult
import com.techres.ccb.data.printer.KitchenTicketPrintService
import com.techres.ccb.data.printer.LabelPrintService
import java.util.Date

/**
 * Get icon for kitchen based on type
 */
private fun getKitchenIcon(kitchenType: String?): ImageVector {
    return when (kitchenType?.lowercase()) {
        "cooking", "nau" -> Icons.Default.Countertops
        "grill", "nuong" -> Icons.Default.OutdoorGrill
        "bar", "drink", "uong" -> Icons.Default.LocalBar
        "dessert", "sweet" -> Icons.Default.Cake
        else -> Icons.Default.Restaurant
    }
}

/**
 * Get color for kitchen based on type
 */
private fun getKitchenColor(kitchenType: String?): Color {
    return when (kitchenType?.lowercase()) {
        "cooking", "nau" -> Color(0xFFFF5722)
        "grill", "nuong" -> Color(0xFFE91E63)
        "bar", "drink", "uong" -> Color(0xFF2196F3)
        "dessert", "sweet" -> Color(0xFFFF9800)
        else -> Color(0xFF9C27B0)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KitchenPrinterScreen(
    onBack: () -> Unit,
    viewModel: KitchenPrinterViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var selectedKitchen by remember { mutableStateOf<KitchenEntity?>(null) }
    var showPrinterDialog by remember { mutableStateOf(false) }
    var showTestPrintDialog by remember { mutableStateOf(false) }
    var testPrintKitchen by remember { mutableStateOf<KitchenEntity?>(null) }

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

            // Content based on state
            when {
                uiState.isLoading -> {
                    // Loading state
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
                uiState.kitchens.isEmpty() -> {
                    // Empty state
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
                                imageVector = Icons.Default.Restaurant,
                                contentDescription = null,
                                modifier = Modifier.size(80.dp),
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                            )
                            Text(
                                text = "Chưa có bếp nào",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                            Text(
                                text = "Vui lòng đồng bộ dữ liệu từ server hoặc thêm bếp trên hệ thống quản lý",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                textAlign = TextAlign.Center
                            )

                            // Debug button - only show in DEBUG builds
                            if (BuildConfig.DEBUG) {
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { viewModel.insertDebugData() },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFFFF9800)
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(
                                        Icons.Default.BugReport,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Thêm dữ liệu debug")
                                }
                            }
                        }
                    }
                }
                else -> {
                    // Kitchen list
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.kitchens) { kitchen ->
                            KitchenPrinterCard(
                                kitchen = kitchen,
                                onConfigurePrinter = {
                                    selectedKitchen = kitchen
                                    showPrinterDialog = true
                                },
                                onTestPrint = {
                                    testPrintKitchen = kitchen
                                    showTestPrintDialog = true
                                },
                                onToggleActive = { isActive ->
                                    viewModel.toggleActiveStatus(kitchen.id, isActive)
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
        }
    }

    // Printer configuration dialog
    if (showPrinterDialog && selectedKitchen != null) {
        PrinterConfigDialog(
            kitchen = selectedKitchen!!,
            onDismiss = { showPrinterDialog = false },
            onSave = { ip, port, name, protocol, labelSize, printDensity, paperWidth, printMode,
                       ticketCutAfterPrint, ticketPrintItemsSeparately, ticketCopies, ticketFontSize,
                       labelPrintPrice, labelPrintStoreName, labelPrintOrderNumber,
                       labelPrintTableName, labelPrintTime, labelStoreName, labelReverse,
                       labelFontScale, labelMaxToppings ->
                viewModel.updateFullPrinterConfig(
                    kitchenId = selectedKitchen!!.id,
                    ip = ip.ifBlank { null },
                    port = port,
                    name = name.ifBlank { null },
                    isConnected = ip.isNotBlank(),
                    protocol = protocol.name,
                    labelWidthMm = labelSize.widthMm,
                    labelHeightMm = labelSize.heightMm,
                    labelGapMm = labelSize.gapMm,
                    printDensity = printDensity,
                    paperWidth = paperWidth,
                    printMode = printMode.name,
                    ticketCutAfterPrint = ticketCutAfterPrint,
                    ticketPrintItemsSeparately = ticketPrintItemsSeparately,
                    ticketCopies = ticketCopies,
                    ticketFontSize = ticketFontSize,
                    labelPrintPrice = labelPrintPrice,
                    labelPrintStoreName = labelPrintStoreName,
                    labelPrintOrderNumber = labelPrintOrderNumber,
                    labelPrintTableName = labelPrintTableName,
                    labelPrintTime = labelPrintTime,
                    labelStoreName = labelStoreName.ifBlank { null },
                    labelReverse = labelReverse,
                    labelFontScale = labelFontScale,
                    labelMaxToppings = labelMaxToppings
                )
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
    kitchen: KitchenEntity,
    onConfigurePrinter: () -> Unit,
    onTestPrint: () -> Unit,
    onToggleActive: (Boolean) -> Unit
) {
    val icon = getKitchenIcon(kitchen.kitchenType)
    val color = getKitchenColor(kitchen.kitchenType)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (kitchen.isActive) Color.White else Color(0xFFF5F5F5)
        )
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
                        .background(
                            if (kitchen.isActive) color.copy(alpha = 0.15f)
                            else Color.Gray.copy(alpha = 0.15f)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = if (kitchen.isActive) color else Color.Gray
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Kitchen info
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = kitchen.name,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (kitchen.isActive)
                            MaterialTheme.colorScheme.onSurface
                        else
                            MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                    Text(
                        text = kitchen.description ?: kitchen.kitchenType ?: "",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }

                // Enable/Disable Switch
                Switch(
                    checked = kitchen.isActive,
                    onCheckedChange = onToggleActive,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = color,
                        uncheckedThumbColor = Color.White,
                        uncheckedTrackColor = Color.Gray.copy(alpha = 0.5f)
                    )
                )
            }

            // Show inactive message if disabled
            if (!kitchen.isActive) {
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFFF3E0)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = Color(0xFFFF9800)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Bếp đang tắt - không in khi có order",
                            fontSize = 12.sp,
                            color = Color(0xFFE65100)
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
                        PrinterInfoRow("Protocol", kitchen.getPrinterProtocolEnum().displayName)
                        PrinterInfoRow("Chế độ in", when (kitchen.getPrintModeEnum()) {
                            KitchenPrintMode.TICKET -> "Phiếu bếp"
                            KitchenPrintMode.LABEL -> "Tem"
                            KitchenPrintMode.BOTH -> "Phiếu + Tem"
                        })
                        if (kitchen.getPrinterProtocolEnum() == PrinterProtocol.ESCPOS) {
                            PrinterInfoRow("Khổ giấy", "${kitchen.paperWidth}mm")
                        }
                        if (kitchen.getPrinterProtocolEnum() == PrinterProtocol.TSPL) {
                            PrinterInfoRow("Kích thước tem", kitchen.getLabelSize().displayName)
                        }
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

                // Test print button - enabled when IP is configured (not requiring isPrinterConnected flag)
                Button(
                    onClick = onTestPrint,
                    modifier = Modifier.weight(1f),
                    enabled = !kitchen.printerIp.isNullOrBlank(),
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
    kitchen: KitchenEntity,
    onDismiss: () -> Unit,
    onSave: (ip: String, port: Int, name: String, protocol: PrinterProtocol, labelSize: LabelSize, printDensity: Int, paperWidth: Int, printMode: KitchenPrintMode,
             ticketCutAfterPrint: Boolean, ticketPrintItemsSeparately: Boolean, ticketCopies: Int, ticketFontSize: String,
             labelPrintPrice: Boolean, labelPrintStoreName: Boolean, labelPrintOrderNumber: Boolean,
             labelPrintTableName: Boolean, labelPrintTime: Boolean, labelStoreName: String, labelReverse: Boolean,
             labelFontScale: Float, labelMaxToppings: Int) -> Unit
) {
    val color = getKitchenColor(kitchen.kitchenType)

    var printerName by remember { mutableStateOf(kitchen.printerName ?: "") }
    var printerIp by remember { mutableStateOf(kitchen.printerIp ?: "") }
    var printerPort by remember { mutableStateOf(kitchen.printerPort.toString()) }
    var selectedProtocol by remember { mutableStateOf(kitchen.getPrinterProtocolEnum()) }
    var selectedLabelSize by remember { mutableStateOf(kitchen.getLabelSize()) }
    var printDensity by remember { mutableStateOf(kitchen.printDensity) }
    var selectedPaperWidth by remember { mutableStateOf(kitchen.paperWidth) }
    var selectedPrintMode by remember { mutableStateOf(kitchen.getPrintModeEnum()) }

    // Ticket printing config
    var ticketCutAfterPrint by remember { mutableStateOf(kitchen.ticketCutAfterPrint) }
    var ticketPrintItemsSeparately by remember { mutableStateOf(kitchen.ticketPrintItemsSeparately) }
    var ticketCopies by remember { mutableStateOf(kitchen.ticketCopies) }
    var ticketFontSize by remember { mutableStateOf(kitchen.ticketFontSize ?: "medium") }
    var ticketFontSizeExpanded by remember { mutableStateOf(false) }

    // Label printing config
    var labelPrintPrice by remember { mutableStateOf(kitchen.labelPrintPrice) }
    var labelPrintStoreName by remember { mutableStateOf(kitchen.labelPrintStoreName) }
    var labelPrintOrderNumber by remember { mutableStateOf(kitchen.labelPrintOrderNumber) }
    var labelPrintTableName by remember { mutableStateOf(kitchen.labelPrintTableName) }
    var labelPrintTime by remember { mutableStateOf(kitchen.labelPrintTime) }
    var labelStoreName by remember { mutableStateOf(kitchen.labelStoreName ?: "") }
    var labelReverse by remember { mutableStateOf(kitchen.labelReverse) }
    var labelFontScale by remember { mutableStateOf(kitchen.labelFontScale) }
    var labelMaxToppings by remember { mutableStateOf(kitchen.labelMaxToppings) }
    var labelFontScaleExpanded by remember { mutableStateOf(false) }

    var protocolExpanded by remember { mutableStateOf(false) }
    var labelSizeExpanded by remember { mutableStateOf(false) }
    var paperWidthExpanded by remember { mutableStateOf(false) }
    var printModeExpanded by remember { mutableStateOf(false) }

    // Paper width options - đồng bộ với web dashboard
    val paperWidthOptions = listOf(58, 76, 80, 110, 112)

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
                            imageVector = Icons.Default.Print,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp),
                            tint = color
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
                            color = color
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Printer name
                OutlinedTextField(
                    value = printerName,
                    onValueChange = { printerName = it },
                    label = { Text("Tên máy in") },
                    placeholder = { Text("VD: XPRINTER, EPSON TM-T82") },
                    leadingIcon = {
                        Icon(Icons.Default.Label, contentDescription = null)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                // IP Address and Port in a row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = printerIp,
                        onValueChange = { printerIp = it },
                        label = { Text("IP Address") },
                        placeholder = { Text("192.168.1.100") },
                        modifier = Modifier.weight(2f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = printerPort,
                        onValueChange = { printerPort = it.filter { c -> c.isDigit() } },
                        label = { Text("Port") },
                        placeholder = { Text("9100") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Protocol Selection - IMPORTANT
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

                Spacer(modifier = Modifier.height(16.dp))

                // Print Mode Selection
                Text(
                    text = "Chế độ in",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))

                ExposedDropdownMenuBox(
                    expanded = printModeExpanded,
                    onExpandedChange = { printModeExpanded = !printModeExpanded }
                ) {
                    OutlinedTextField(
                        value = when (selectedPrintMode) {
                            KitchenPrintMode.TICKET -> "Phiếu bếp (Ticket)"
                            KitchenPrintMode.LABEL -> "Tem (Label)"
                            KitchenPrintMode.BOTH -> "Cả hai (Phiếu + Tem)"
                        },
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = printModeExpanded) },
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
                        expanded = printModeExpanded,
                        onDismissRequest = { printModeExpanded = false }
                    ) {
                        KitchenPrintMode.entries.forEach { mode ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(
                                            text = when (mode) {
                                                KitchenPrintMode.TICKET -> "Phiếu bếp (Ticket)"
                                                KitchenPrintMode.LABEL -> "Tem (Label)"
                                                KitchenPrintMode.BOTH -> "Cả hai (Phiếu + Tem)"
                                            },
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = when (mode) {
                                                KitchenPrintMode.TICKET -> "In danh sách món trên 1 tờ"
                                                KitchenPrintMode.LABEL -> "In tem riêng cho từng món"
                                                KitchenPrintMode.BOTH -> "In cả phiếu và tem"
                                            },
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                },
                                onClick = {
                                    selectedPrintMode = mode
                                    printModeExpanded = false
                                },
                                leadingIcon = {
                                    Icon(
                                        imageVector = when (mode) {
                                            KitchenPrintMode.TICKET -> Icons.Default.Receipt
                                            KitchenPrintMode.LABEL -> Icons.Default.LocalOffer
                                            KitchenPrintMode.BOTH -> Icons.Default.Layers
                                        },
                                        contentDescription = null,
                                        tint = if (selectedPrintMode == mode) color else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                            )
                        }
                    }
                }

                // ESC/POS-specific settings (Paper width)
                if (selectedProtocol == PrinterProtocol.ESCPOS) {
                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Khổ giấy",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    ExposedDropdownMenuBox(
                        expanded = paperWidthExpanded,
                        onExpandedChange = { paperWidthExpanded = !paperWidthExpanded }
                    ) {
                        OutlinedTextField(
                            value = "${selectedPaperWidth}mm",
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = paperWidthExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        ExposedDropdownMenu(
                            expanded = paperWidthExpanded,
                            onDismissRequest = { paperWidthExpanded = false }
                        ) {
                            paperWidthOptions.forEach { width ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = "${width}mm",
                                            fontWeight = FontWeight.Medium
                                        )
                                    },
                                    onClick = {
                                        selectedPaperWidth = width
                                        paperWidthExpanded = false
                                    },
                                    trailingIcon = {
                                        if (selectedPaperWidth == width) {
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
                }

                // TSPL-specific settings
                if (selectedProtocol == PrinterProtocol.TSPL) {
                    Spacer(modifier = Modifier.height(16.dp))

                    // Label size selection
                    Text(
                        text = "Kích thước tem",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))

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

                    // Print density slider
                    Text(
                        text = "Độ đậm: $printDensity",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
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
                }

                // Ticket printing config - Show for TICKET and BOTH modes
                if (selectedPrintMode == KitchenPrintMode.TICKET || selectedPrintMode == KitchenPrintMode.BOTH) {
                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Cấu hình in phiếu bếp",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = color
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    // Ticket cut after print
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = ticketCutAfterPrint,
                            onCheckedChange = { ticketCutAfterPrint = it },
                            colors = CheckboxDefaults.colors(checkedColor = color)
                        )
                        Text(
                            text = "Cắt giấy sau khi in",
                            fontSize = 14.sp,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    // Print items separately
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = ticketPrintItemsSeparately,
                            onCheckedChange = { ticketPrintItemsSeparately = it },
                            colors = CheckboxDefaults.colors(checkedColor = color)
                        )
                        Text(
                            text = "In từng món riêng biệt",
                            fontSize = 14.sp,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    // Ticket copies
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "Số bản in:",
                            fontSize = 14.sp
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            IconButton(
                                onClick = { if (ticketCopies > 1) ticketCopies-- },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(Icons.Default.Remove, contentDescription = "Giảm", tint = color)
                            }
                            Text(
                                text = ticketCopies.toString(),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                            IconButton(
                                onClick = { if (ticketCopies < 5) ticketCopies++ },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Tăng", tint = color)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Font size selection
                    Text(
                        text = "Cỡ chữ:",
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))

                    val fontSizeOptions = listOf(
                        "small" to "Nhỏ",
                        "medium" to "Vừa",
                        "large" to "Lớn"
                    )

                    ExposedDropdownMenuBox(
                        expanded = ticketFontSizeExpanded,
                        onExpandedChange = { ticketFontSizeExpanded = !ticketFontSizeExpanded }
                    ) {
                        OutlinedTextField(
                            value = fontSizeOptions.find { it.first == ticketFontSize }?.second ?: "Vừa",
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = ticketFontSizeExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        ExposedDropdownMenu(
                            expanded = ticketFontSizeExpanded,
                            onDismissRequest = { ticketFontSizeExpanded = false }
                        ) {
                            fontSizeOptions.forEach { (value, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        ticketFontSize = value
                                        ticketFontSizeExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Label printing config - Show for LABEL and BOTH modes
                if (selectedPrintMode == KitchenPrintMode.LABEL || selectedPrintMode == KitchenPrintMode.BOTH) {
                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Cấu hình in tem",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = color
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    // Label print options
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

                    // Store name input (show only when labelPrintStoreName is checked)
                    if (labelPrintStoreName) {
                        OutlinedTextField(
                            value = labelStoreName,
                            onValueChange = { labelStoreName = it },
                            label = { Text("Tên cửa hàng") },
                            placeholder = { Text("VD: Quán Cà phê ABC") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(start = 40.dp),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

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
                        expanded = labelFontScaleExpanded,
                        onExpandedChange = { labelFontScaleExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = fontScaleOptions.find { it.first == labelFontScale }?.second
                                ?: "Bình thường (1.0x)",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Cỡ chữ tem") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = labelFontScaleExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        ExposedDropdownMenu(
                            expanded = labelFontScaleExpanded,
                            onDismissRequest = { labelFontScaleExpanded = false }
                        ) {
                            fontScaleOptions.forEach { (scale, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        labelFontScale = scale
                                        labelFontScaleExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Max Toppings Input
                    OutlinedTextField(
                        value = if (labelMaxToppings == 0) "" else labelMaxToppings.toString(),
                        onValueChange = { value ->
                            labelMaxToppings = value.filter { it.isDigit() }.toIntOrNull()?.coerceIn(0, 20) ?: 0
                        },
                        label = { Text("Số topping tối đa") },
                        placeholder = { Text("0 = Tự động") },
                        supportingText = {
                            val recommended = selectedLabelSize.getRecommendedMaxToppings()
                            Text("Đề xuất: $recommended topping (0 = tự động theo khổ tem)")
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(12.dp)
                    )
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
                            onSave(
                                printerIp,
                                printerPort.toIntOrNull() ?: 9100,
                                printerName,
                                selectedProtocol,
                                selectedLabelSize,
                                printDensity,
                                selectedPaperWidth,
                                selectedPrintMode,
                                ticketCutAfterPrint,
                                ticketPrintItemsSeparately,
                                ticketCopies,
                                ticketFontSize,
                                labelPrintPrice,
                                labelPrintStoreName,
                                labelPrintOrderNumber,
                                labelPrintTableName,
                                labelPrintTime,
                                labelStoreName,
                                labelReverse,
                                labelFontScale,
                                labelMaxToppings
                            )
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

/**
 * Loại in thử
 */
private enum class TestPrintType {
    SIMPLE_TEXT, // Test text đơn giản (không bitmap)
    CONNECTION,  // Test kết nối
    TICKET,      // In phiếu bếp
    LABEL        // In tem
}

@Composable
private fun TestPrintDialog(
    kitchen: KitchenEntity,
    onDismiss: () -> Unit
) {
    val color = getKitchenColor(kitchen.kitchenType)

    var selectedPrintType by remember { mutableStateOf<TestPrintType?>(null) }
    var printState by remember { mutableStateOf<PrintState>(PrintState.Idle) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Execute print when type is selected
    LaunchedEffect(selectedPrintType) {
        if (selectedPrintType == null) return@LaunchedEffect

        if (kitchen.printerIp.isNullOrBlank()) {
            printState = PrintState.Error
            errorMessage = "Chưa cấu hình địa chỉ IP"
            return@LaunchedEffect
        }

        // Step 1: Connecting
        printState = PrintState.Connecting
        delay(300)

        // Step 2: Test connection first
        val connectionResult = PrinterService.testConnection(
            ip = kitchen.printerIp!!,
            port = kitchen.printerPort
        )

        when (connectionResult) {
            is PrinterResult.Error -> {
                printState = PrintState.Error
                errorMessage = connectionResult.message
                return@LaunchedEffect
            }
            is PrinterResult.Success -> {
                // Connection OK, proceed to print
            }
        }

        // Step 3: Sending print data based on type
        printState = PrintState.Sending

        val printResult = when (selectedPrintType) {
            TestPrintType.SIMPLE_TEXT -> {
                // Simple ASCII text only - no bitmap, no Vietnamese
                LabelPrintService.printSimpleTest(
                    ip = kitchen.printerIp!!,
                    port = kitchen.printerPort
                )
            }
            TestPrintType.CONNECTION -> {
                // Just test connection page
                PrinterService.printTestPage(
                    ip = kitchen.printerIp!!,
                    port = kitchen.printerPort,
                    kitchenName = kitchen.name,
                    printerName = kitchen.printerName
                )
            }
            TestPrintType.TICKET -> {
                // Print kitchen ticket
                val ticketData = KitchenTicketPrintService.KitchenTicketData(
                    kitchenName = kitchen.name,
                    orderNumber = "TEST${System.currentTimeMillis() % 10000}",
                    tableName = "Bàn 1",
                    orderTime = Date(),
                    staffName = "Nhân viên test",
                    items = listOf(
                        KitchenTicketPrintService.KitchenItem(
                            name = "Lục trà macchiato",
                            quantity = 1,
                            price = 320000.0,
                            note = "Ít đá",
                            toppings = emptyList(),
                            toppingPrices = listOf(
                                "Size L" to 100000.0,
                                "Trân châu cam" to 100000.0,
                                "Trân châu vàng" to 100000.0
                            ),
                            options = mapOf("Đá" to "50%", "Đường" to "30%") // Size đã có trong toppingPrices
                        ),
                        KitchenTicketPrintService.KitchenItem(
                            name = "Cà phê sữa đá",
                            quantity = 1,
                            price = 25000.0,
                            note = null,
                            toppings = emptyList(),
                            toppingPrices = emptyList(),
                            options = mapOf("Size" to "M", "Đá" to "100%", "Đường" to "50%")
                        ),
                        KitchenTicketPrintService.KitchenItem(
                            name = "Bánh mì thịt nướng",
                            quantity = 1,
                            price = 30000.0,
                            note = "Không hành",
                            toppings = listOf("Thêm rau", "Thêm ớt"),
                            toppingPrices = emptyList(),
                            options = emptyMap()
                        )
                    ),
                    note = "Đơn hàng test - Vui lòng kiểm tra",
                    isUrgent = false,
                    ticketType = "NEW"
                )
                KitchenTicketPrintService.printTicket(kitchen, ticketData)
            }
            TestPrintType.LABEL -> {
                // Print label with price data for testing
                val labelData = LabelPrintService.LabelData(
                    itemName = "Trà sữa trân châu đường đen",
                    itemCode = "TS001",
                    quantity = 2,
                    size = "L",
                    sugar = "70%",
                    ice = "Ít đá",
                    toppings = listOf("Trân châu đen", "Thạch dừa"),
                    toppingPrices = listOf(
                        "Trân châu đen" to 10000.0,
                        "Thạch dừa" to 8000.0
                    ),
                    note = "Ít đá, không đường, mang đi",
                    tableName = "Bàn 5",
                    orderNumber = "TEST${System.currentTimeMillis() % 10000}",
                    orderTime = Date(),
                    staffName = "Nhân viên test",
                    // Price data for testing "In giá" option
                    unitPrice = 35000.0,
                    totalToppingPrice = 18000.0,
                    totalPrice = 53000.0,
                    finalPrice = 45000.0,
                    discountAmount = 8000.0
                )
                LabelPrintService.printLabels(kitchen, labelData)
            }
            null -> PrinterResult.Error("Chưa chọn loại in")
        }

        // Step 4: Handle result
        when (printResult) {
            is PrinterResult.Success -> {
                printState = PrintState.Success
            }
            is PrinterResult.Error -> {
                printState = PrintState.Error
                errorMessage = printResult.message
            }
        }
    }

    Dialog(onDismissRequest = {
        if (printState != PrintState.Connecting && printState != PrintState.Sending) onDismiss()
    }) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier
                    .width(340.dp)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
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
                            imageVector = Icons.Default.Print,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp),
                            tint = color
                        )
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "In thử",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = kitchen.name,
                            fontSize = 14.sp,
                            color = color
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Show menu or printing state
                if (selectedPrintType == null) {
                    // Menu selection
                    Text(
                        text = "Chọn loại in thử:",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Simple text test button (no bitmap) - RECOMMENDED FIRST
                    PrintOptionButton(
                        icon = Icons.Default.TextFields,
                        title = "Test Text (không bitmap)",
                        subtitle = "In chữ ASCII đơn giản để test máy in",
                        color = Color(0xFF4CAF50),
                        onClick = { selectedPrintType = TestPrintType.SIMPLE_TEXT }
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Test connection button
                    PrintOptionButton(
                        icon = Icons.Default.Wifi,
                        title = "Test kết nối",
                        subtitle = "Kiểm tra kết nối máy in",
                        color = Color(0xFF2196F3),
                        onClick = { selectedPrintType = TestPrintType.CONNECTION }
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Print ticket button
                    PrintOptionButton(
                        icon = Icons.Default.Receipt,
                        title = "In phiếu bếp (Ticket)",
                        subtitle = "In danh sách món cho bếp",
                        color = Color(0xFFFF5722),
                        onClick = { selectedPrintType = TestPrintType.TICKET }
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Print label button
                    PrintOptionButton(
                        icon = Icons.Default.LocalOffer,
                        title = "In tem (Label)",
                        subtitle = "In tem dán ly/món ăn",
                        color = Color(0xFF9C27B0),
                        onClick = { selectedPrintType = TestPrintType.LABEL }
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Cancel button
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Hủy")
                    }
                } else {
                    // Printing state UI
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(
                                when (printState) {
                                    PrintState.Success -> Color(0xFFE8F5E9)
                                    PrintState.Error -> Color(0xFFFFEBEE)
                                    else -> color.copy(alpha = 0.1f)
                                }
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        when (printState) {
                            PrintState.Idle, PrintState.Connecting, PrintState.Sending -> {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(40.dp),
                                    color = color,
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
                            PrintState.Sending -> when (selectedPrintType) {
                                TestPrintType.SIMPLE_TEXT -> "Đang in text đơn giản..."
                                TestPrintType.TICKET -> "Đang in phiếu bếp..."
                                TestPrintType.LABEL -> "Đang in tem..."
                                else -> "Đang gửi lệnh in..."
                            }
                            PrintState.Success -> when (selectedPrintType) {
                                TestPrintType.SIMPLE_TEXT -> "In text thành công!"
                                TestPrintType.TICKET -> "In phiếu bếp thành công!"
                                TestPrintType.LABEL -> "In tem thành công!"
                                else -> "In thử thành công!"
                            }
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
                            PrintState.Error -> errorMessage ?: "Không thể kết nối đến ${kitchen.printerIp}"
                            else -> "${kitchen.printerName ?: "Máy in"}\n${kitchen.printerIp ?: "Chưa cấu hình"}:${kitchen.printerPort}"
                        },
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Print preview info
                    if (printState == PrintState.Success && selectedPrintType != TestPrintType.CONNECTION) {
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
                                when (selectedPrintType) {
                                    TestPrintType.TICKET -> {
                                        Text(
                                            text = "═══ PHIẾU BẾP ═══",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = kitchen.name.uppercase(),
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "Bàn: Bàn 1",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "1. Cà phê sữa đá x2",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "2. Trà sữa ô long x1",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "3. Bánh mì thịt nướng x3",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                    }
                                    TestPrintType.LABEL -> {
                                        Text(
                                            text = "╔══════════════╗",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "║ TRÀ SỮA      ║",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "║ Size: L      ║",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "║ Đường: 70%   ║",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "║ Bàn: Bàn 5   ║",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "║ (1/2, 2/2)   ║",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Text(
                                            text = "╚══════════════╝",
                                            fontSize = 11.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                    }
                                    else -> {}
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // Close/Retry buttons
                    if (printState == PrintState.Success || printState == PrintState.Error) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (printState == PrintState.Error) {
                                OutlinedButton(
                                    onClick = {
                                        printState = PrintState.Idle
                                        errorMessage = null
                                        selectedPrintType = null
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Thử lại")
                                }
                            }

                            Button(
                                onClick = onDismiss,
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (printState == PrintState.Success) Color(0xFF4CAF50) else color
                                )
                            ) {
                                Text("Đóng")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PrintOptionButton(
    icon: ImageVector,
    title: String,
    subtitle: String,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.08f)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = color
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = subtitle,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
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
