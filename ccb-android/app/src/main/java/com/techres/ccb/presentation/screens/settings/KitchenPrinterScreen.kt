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
import kotlinx.coroutines.launch
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.PrinterProtocol
import com.techres.ccb.data.local.entity.LabelSize
import com.techres.ccb.data.local.entity.KitchenPrintMode
import com.techres.ccb.data.printer.PrinterService
import com.techres.ccb.data.printer.PrinterResult
import com.techres.ccb.data.printer.KitchenTicketPrintService
import com.techres.ccb.data.printer.LabelPrintService
import com.techres.ccb.presentation.components.PosTopAppBar
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
    val coroutineScope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var selectedKitchen by remember { mutableStateOf<KitchenEntity?>(null) }
    var showPrinterDialog by remember { mutableStateOf(false) }
    var printingKitchenId by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            PosTopAppBar(
                title = { Text("Quản lý Bếp & Máy in") },
                onBack = onBack
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
                                isPrinting = printingKitchenId == kitchen.id,
                                onConfigurePrinter = {
                                    selectedKitchen = kitchen
                                    showPrinterDialog = true
                                },
                                onTestPrint = {
                                    if (printingKitchenId != null) return@KitchenPrinterCard
                                    printingKitchenId = kitchen.id

                                    coroutineScope.launch {
                                        try {
                                            val ticketData = KitchenTicketPrintService.KitchenTicketData(
                                                kitchenName = kitchen.name,
                                                orderNumber = "TEST${System.currentTimeMillis() % 10000}",
                                                tableName = "Bàn Test",
                                                pagerNumber = 99,
                                                orderTime = Date(),
                                                staffName = "Nhân viên test",
                                                items = listOf(
                                                    KitchenTicketPrintService.KitchenItem(
                                                        name = "Trà sữa trân châu",
                                                        quantity = 2,
                                                        price = 35000.0,
                                                        note = "Ít đá",
                                                        toppings = listOf("Trân châu đen"),
                                                        toppingPrices = listOf(Triple("Trân châu đen", 10000.0, 1)),
                                                        options = mapOf("Size" to "L", "Đường" to "50%")
                                                    ),
                                                    KitchenTicketPrintService.KitchenItem(
                                                        name = "Cà phê sữa đá",
                                                        quantity = 1,
                                                        price = 25000.0,
                                                        note = null,
                                                        toppings = emptyList(),
                                                        toppingPrices = emptyList(),
                                                        options = mapOf("Size" to "M")
                                                    )
                                                ),
                                                note = "Phiếu in thử",
                                                isUrgent = false,
                                                ticketType = "NEW"
                                            )

                                            val result = KitchenTicketPrintService.printTicket(kitchen, ticketData)

                                            when (result) {
                                                is PrinterResult.Success -> {
                                                    snackbarHostState.showSnackbar("In phiếu thử thành công!")
                                                }
                                                is PrinterResult.Error -> {
                                                    snackbarHostState.showSnackbar("Lỗi: ${result.message}")
                                                }
                                            }
                                        } catch (e: Exception) {
                                            snackbarHostState.showSnackbar("Lỗi: ${e.message}")
                                        }
                                        printingKitchenId = null
                                    }
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
                       ticketCutAfterPrint, ticketPrintItemsSeparately, ticketCopies, ticketFontSize, ticketLineSpacing,
                       ticketPrintOrderNumber, ticketPrintTableName, ticketPrintTime, ticketPrintNotes,
                       ticketPrintPrice, ticketPrintStoreName, ticketStoreName,
                       labelPrintPrice, labelPrintStoreName, labelPrintOrderNumber,
                       labelPrintTableName, labelPrintTime, labelStoreName, labelReverse,
                       labelFontScale, labelMaxToppings, labelLineSpacing ->
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
                    ticketLineSpacing = ticketLineSpacing,
                    ticketPrintOrderNumber = ticketPrintOrderNumber,
                    ticketPrintTableName = ticketPrintTableName,
                    ticketPrintTime = ticketPrintTime,
                    ticketPrintNotes = ticketPrintNotes,
                    ticketPrintPrice = ticketPrintPrice,
                    ticketPrintStoreName = ticketPrintStoreName,
                    ticketStoreName = ticketStoreName.ifBlank { null },
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
                showPrinterDialog = false
            }
        )
    }
}

@Composable
private fun KitchenPrinterCard(
    kitchen: KitchenEntity,
    isPrinting: Boolean = false,
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

                // Test print button - enabled when IP is configured and not printing
                Button(
                    onClick = onTestPrint,
                    modifier = Modifier.weight(1f),
                    enabled = !kitchen.printerIp.isNullOrBlank() && !isPrinting,
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
             ticketCutAfterPrint: Boolean, ticketPrintItemsSeparately: Boolean, ticketCopies: Int, ticketFontSize: String, ticketLineSpacing: Float,
             ticketPrintOrderNumber: Boolean, ticketPrintTableName: Boolean, ticketPrintTime: Boolean, ticketPrintNotes: Boolean,
             ticketPrintPrice: Boolean, ticketPrintStoreName: Boolean, ticketStoreName: String,
             labelPrintPrice: Boolean, labelPrintStoreName: Boolean, labelPrintOrderNumber: Boolean,
             labelPrintTableName: Boolean, labelPrintTime: Boolean, labelStoreName: String, labelReverse: Boolean,
             labelFontScale: Float, labelMaxToppings: Int, labelLineSpacing: Float) -> Unit
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
    var ticketLineSpacing by remember { mutableStateOf(kitchen.ticketLineSpacing) }
    var ticketPrintOrderNumber by remember { mutableStateOf(kitchen.ticketPrintOrderNumber) }
    var ticketPrintTableName by remember { mutableStateOf(kitchen.ticketPrintTableName) }
    var ticketPrintTime by remember { mutableStateOf(kitchen.ticketPrintTime) }
    var ticketPrintNotes by remember { mutableStateOf(kitchen.ticketPrintNotes) }
    var ticketPrintPrice by remember { mutableStateOf(kitchen.ticketPrintPrice) }
    var ticketPrintStoreName by remember { mutableStateOf(kitchen.ticketPrintStoreName) }
    var ticketStoreName by remember { mutableStateOf(kitchen.ticketStoreName ?: "") }

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
    var labelLineSpacing by remember { mutableStateOf(kitchen.labelLineSpacing) }

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

                    // Display options section
                    Text(
                        text = "Hiển thị trên phiếu",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Spacer(modifier = Modifier.height(4.dp))

                    // In mã đơn hàng
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = ticketPrintOrderNumber,
                            onCheckedChange = { ticketPrintOrderNumber = it },
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
                            checked = ticketPrintTableName,
                            onCheckedChange = { ticketPrintTableName = it },
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
                            checked = ticketPrintTime,
                            onCheckedChange = { ticketPrintTime = it },
                            colors = CheckboxDefaults.colors(checkedColor = color)
                        )
                        Text(text = "In thời gian", fontSize = 14.sp)
                    }

                    // In ghi chú
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = ticketPrintNotes,
                            onCheckedChange = { ticketPrintNotes = it },
                            colors = CheckboxDefaults.colors(checkedColor = color)
                        )
                        Text(text = "In ghi chú", fontSize = 14.sp)
                    }

                    // In giá món
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = ticketPrintPrice,
                            onCheckedChange = { ticketPrintPrice = it },
                            colors = CheckboxDefaults.colors(checkedColor = color)
                        )
                        Text(text = "In giá món", fontSize = 14.sp)
                    }

                    // In tên cửa hàng
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = ticketPrintStoreName,
                            onCheckedChange = { ticketPrintStoreName = it },
                            colors = CheckboxDefaults.colors(checkedColor = color)
                        )
                        Text(text = "In tên cửa hàng", fontSize = 14.sp)
                    }

                    // Tên cửa hàng hiển thị (show only when ticketPrintStoreName is checked)
                    if (ticketPrintStoreName) {
                        OutlinedTextField(
                            value = ticketStoreName,
                            onValueChange = { ticketStoreName = it },
                            label = { Text("Tên cửa hàng hiển thị") },
                            placeholder = { Text("VD: Quán Cà phê ABC") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(start = 40.dp),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                    Spacer(modifier = Modifier.height(8.dp))

                    // Cắt giấy sau khi in
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

                    // In từng món riêng biệt
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

                    // Số bản in
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

                    // Cỡ chữ
                    Text(
                        text = "Cỡ chữ:",
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))

                    val fontSizeOptions = listOf(
                        "extra_small" to "Rất nhỏ (0.7x)",
                        "small" to "Nhỏ (0.85x)",
                        "medium" to "Vừa (1.0x)",
                        "large" to "Lớn (1.2x)",
                        "extra_large" to "Rất lớn (1.4x)"
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

                    // Khoảng cách dòng
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Khoảng cách dòng: ${(ticketLineSpacing * 100).toInt()}%",
                        fontSize = 14.sp
                    )
                    Text(
                        text = if (ticketLineSpacing <= 0.4f) "Rất sát" else if (ticketLineSpacing <= 0.6f) "Sát" else "Bình thường",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Slider(
                        value = ticketLineSpacing,
                        onValueChange = { ticketLineSpacing = it },
                        valueRange = 0.3f..1.0f,
                        steps = 6,
                        colors = SliderDefaults.colors(
                            thumbColor = color,
                            activeTrackColor = color
                        )
                    )
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

                    // Label line spacing slider
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
                                ticketLineSpacing,
                                ticketPrintOrderNumber,
                                ticketPrintTableName,
                                ticketPrintTime,
                                ticketPrintNotes,
                                ticketPrintPrice,
                                ticketPrintStoreName,
                                ticketStoreName,
                                labelPrintPrice,
                                labelPrintStoreName,
                                labelPrintOrderNumber,
                                labelPrintTableName,
                                labelPrintTime,
                                labelStoreName,
                                labelReverse,
                                labelFontScale,
                                labelMaxToppings,
                                labelLineSpacing
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
