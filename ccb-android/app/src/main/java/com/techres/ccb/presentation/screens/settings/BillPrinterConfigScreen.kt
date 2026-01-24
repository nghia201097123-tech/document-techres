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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity
import com.techres.ccb.presentation.components.PosTopAppBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillPrinterConfigScreen(
    onNavigateBack: () -> Unit,
    viewModel: BillPrinterConfigViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // Show success/error messages
    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearSuccessMessage()
        }
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearErrorMessage()
        }
    }

    // Edit dialog
    if (uiState.showEditDialog && uiState.selectedConfig != null) {
        EditPrinterDialog(
            config = uiState.selectedConfig!!,
            onDismiss = { viewModel.hideEditDialog() },
            onSave = { ip, port ->
                viewModel.updatePrinterAddress(uiState.selectedConfig!!.id, ip, port)
                viewModel.hideEditDialog()
            }
        )
    }

    // Template selector dialog
    if (uiState.showTemplateSelector && uiState.selectedConfig != null) {
        TemplateSelectionDialog(
            templates = uiState.templates,
            currentTemplateId = uiState.selectedConfig!!.templateId,
            onDismiss = { viewModel.hideTemplateSelector() },
            onSelect = { templateId ->
                viewModel.updateTemplate(uiState.selectedConfig!!.id, templateId)
            }
        )
    }

    // Paper width selector dialog
    if (uiState.showPaperWidthSelector && uiState.selectedConfig != null) {
        PaperWidthSelectionDialog(
            currentPaperWidth = uiState.selectedConfig!!.paperWidth,
            onDismiss = { viewModel.hidePaperWidthSelector() },
            onSelect = { paperWidth ->
                viewModel.updatePaperWidth(uiState.selectedConfig!!.id, paperWidth)
                viewModel.hidePaperWidthSelector()
            }
        )
    }

    // Font size selector dialog
    if (uiState.showFontSizeSelector && uiState.selectedConfig != null) {
        FontSizeSelectionDialog(
            currentFontSize = uiState.selectedConfig!!.fontSize,
            onDismiss = { viewModel.hideFontSizeSelector() },
            onSelect = { fontSize ->
                viewModel.updateFontSize(uiState.selectedConfig!!.id, fontSize)
            }
        )
    }

    // Line spacing selector dialog
    if (uiState.showLineSpacingSelector && uiState.selectedConfig != null) {
        LineSpacingSelectionDialog(
            currentLineSpacing = uiState.selectedConfig!!.lineSpacing,
            onDismiss = { viewModel.hideLineSpacingSelector() },
            onSelect = { lineSpacing ->
                viewModel.updateLineSpacing(uiState.selectedConfig!!.id, lineSpacing)
            }
        )
    }

    // Number of copies selector dialog
    if (uiState.showNumberOfCopiesSelector && uiState.selectedConfig != null) {
        NumberOfCopiesSelectionDialog(
            currentCopies = uiState.selectedConfig!!.numberOfCopies,
            onDismiss = { viewModel.hideNumberOfCopiesSelector() },
            onSelect = { copies ->
                viewModel.updateNumberOfCopies(uiState.selectedConfig!!.id, copies)
            }
        )
    }

    // Print settings dialog
    if (uiState.showPrintSettingsDialog && uiState.selectedConfig != null) {
        PrintSettingsDialog(
            config = uiState.selectedConfig!!,
            onDismiss = { viewModel.hidePrintSettingsDialog() },
            onToggleCutPaper = { viewModel.toggleCutPaper(uiState.selectedConfig!!) },
            onToggleOpenCashDrawer = { viewModel.toggleOpenCashDrawer(uiState.selectedConfig!!) },
            onToggleBeepAfterPrint = { viewModel.toggleBeepAfterPrint(uiState.selectedConfig!!) }
        )
    }

    // All settings dialog (combined settings in one dialog)
    if (uiState.showAllSettingsDialog && uiState.selectedConfig != null) {
        BillPrinterAllSettingsDialog(
            config = uiState.selectedConfig!!,
            isSunmiDevice = uiState.isSunmiDevice,
            onDismiss = { viewModel.hideAllSettingsDialog() },
            onSave = { connectionType, printerIp, printerPort, paperWidth, fontSize, lineSpacing, numberOfCopies, printPreview, cutPaper, openCashDrawer, beepAfterPrint ->
                viewModel.updateAllSettings(
                    uiState.selectedConfig!!.id,
                    connectionType, printerIp, printerPort,
                    paperWidth, fontSize, lineSpacing, numberOfCopies,
                    printPreview, cutPaper, openCashDrawer, beepAfterPrint
                )
            }
        )
    }

    Scaffold(
        topBar = {
            PosTopAppBar(
                title = { Text("Máy in Bill") },
                onBack = onNavigateBack
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
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
        } else if (uiState.printerConfigs.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(
                        Icons.Default.PrintDisabled,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                    Text(
                        "Chưa có máy in bill nào",
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    Text(
                        "Vui lòng cấu hình máy in từ web-dashboard",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(
                        "Danh sách máy in hóa đơn",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                items(uiState.printerConfigs) { config ->
                    PrinterConfigCard(
                        config = config,
                        templates = uiState.templates,
                        isTesting = uiState.testingPrinterId == config.id,
                        onEditClick = { viewModel.showEditDialog(config) },
                        onTestClick = { viewModel.testPrinterConnection(config) },
                        onTemplateClick = { viewModel.showTemplateSelector(config) },
                        onAllSettingsClick = { viewModel.showAllSettingsDialog(config) },
                        onToggleAutoPrint = { viewModel.toggleAutoPrint(config) },
                        onToggleActive = { viewModel.toggleActiveStatus(config) }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Info,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Hướng dẫn",
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 14.sp
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "• Cấu hình máy in từ web-dashboard\n" +
                                "• Đồng bộ dữ liệu để cập nhật máy in\n" +
                                "• Bấm Test để kiểm tra kết nối\n" +
                                "• Máy in mặc định sẽ tự động in khi thanh toán",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                lineHeight = 20.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PrinterConfigCard(
    config: BillPrinterConfigEntity,
    templates: List<BillTemplateEntity>,
    isTesting: Boolean,
    onEditClick: () -> Unit,
    onTestClick: () -> Unit,
    onTemplateClick: () -> Unit,
    onAllSettingsClick: () -> Unit,
    onToggleAutoPrint: () -> Unit,
    onToggleActive: () -> Unit
) {
    val template = templates.find { it.id == config.templateId }
    val primaryColor = MaterialTheme.colorScheme.primary

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = when {
                !config.isActive -> Color(0xFFF5F5F5)
                config.isDefault -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                else -> MaterialTheme.colorScheme.surface
            }
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (config.isDefault) 4.dp else 2.dp
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                !config.isActive -> Color.Gray.copy(alpha = 0.3f)
                                config.isDefault -> MaterialTheme.colorScheme.primary
                                else -> MaterialTheme.colorScheme.surfaceVariant
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Receipt,
                        contentDescription = null,
                        tint = when {
                            !config.isActive -> Color.Gray
                            config.isDefault -> Color.White
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        }
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = config.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = if (config.isActive)
                            MaterialTheme.colorScheme.onSurface
                        else
                            MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                    config.description?.let {
                        Text(
                            text = it,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }

                // Enable/Disable Switch
                Switch(
                    checked = config.isActive,
                    onCheckedChange = { onToggleActive() },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = primaryColor,
                        uncheckedThumbColor = Color.White,
                        uncheckedTrackColor = Color.Gray.copy(alpha = 0.5f)
                    )
                )
            }

            // Show inactive message if disabled
            if (!config.isActive) {
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
                            text = "Máy in đang tắt - không in khi thanh toán",
                            fontSize = 12.sp,
                            color = Color(0xFFE65100)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Connection info
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            when (config.connectionType) {
                                "sunmi" -> Icons.Default.PhoneAndroid
                                "bluetooth" -> Icons.Default.Bluetooth
                                "usb" -> Icons.Default.Usb
                                else -> Icons.Default.Wifi
                            },
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = if (config.connectionType == "sunmi")
                                Color(0xFF4CAF50)
                            else
                                MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            when (config.connectionType) {
                                "sunmi" -> "Máy in Sunmi tích hợp"
                                "bluetooth" -> "Kết nối: Bluetooth"
                                "usb" -> "Kết nối: USB"
                                else -> "Kết nối: Mạng LAN"
                            },
                            fontSize = 12.sp,
                            color = if (config.connectionType == "sunmi")
                                Color(0xFF2E7D32)
                            else
                                MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            fontWeight = if (config.connectionType == "sunmi") FontWeight.Medium else FontWeight.Normal
                        )
                    }

                    if (config.connectionType == "network") {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable(onClick = onEditClick)
                        ) {
                            Icon(
                                Icons.Default.Router,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "${config.printerIp ?: "Chưa cấu hình"}:${config.printerPort}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = "Sửa",
                                modifier = Modifier.size(14.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable(onClick = onTemplateClick)
                    ) {
                        Icon(
                            Icons.Default.Description,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Mẫu: ${template?.name ?: "Mặc định"}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                        )
                    }

                    // Paper width - clickable to open all settings
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable(onClick = onAllSettingsClick)
                    ) {
                        Icon(
                            Icons.Default.Straighten,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Khổ giấy: ${config.paperWidth}mm",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                        )
                    }

                    // Số bản in
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable(onClick = onAllSettingsClick)
                    ) {
                        Icon(
                            Icons.Default.ContentCopy,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Số bản in: ${config.numberOfCopies}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                        )
                    }

                    // Print settings summary (cut paper, cash drawer, beep)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable(onClick = onAllSettingsClick)
                    ) {
                        Icon(
                            Icons.Default.Tune,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = buildString {
                                val settings = mutableListOf<String>()
                                if (config.cutPaper) settings.add("Cắt giấy")
                                if (config.openCashDrawer) settings.add("Mở két")
                                if (config.beepAfterPrint) settings.add("Beep")
                                append(if (settings.isEmpty()) "Không có" else settings.joinToString(", "))
                            },
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                        )
                    }

                    // Last error
                    config.lastError?.let { error ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Error,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = Color(0xFFE91E63)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = error,
                                fontSize = 11.sp,
                                color = Color(0xFFE91E63),
                                maxLines = 1
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Auto print toggle
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onToggleAutoPrint)
                    .padding(vertical = 4.dp)
            ) {
                Icon(
                    if (config.autoPrintOnPayment) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = if (config.autoPrintOnPayment) Color(0xFF4CAF50) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Tự động in khi thanh toán",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Actions - Row with Test In and Cài đặt buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Test button
                OutlinedButton(
                    onClick = onTestClick,
                    enabled = !isTesting,
                    modifier = Modifier.weight(1f)
                ) {
                    if (isTesting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(18.dp))
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (isTesting) "Đang in..." else "Test In")
                }

                // Cài đặt button
                Button(
                    onClick = onAllSettingsClick,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = primaryColor
                    )
                ) {
                    Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Cài đặt")
                }
            }
        }
    }
}

@Composable
private fun EditPrinterDialog(
    config: BillPrinterConfigEntity,
    onDismiss: () -> Unit,
    onSave: (ip: String, port: Int) -> Unit
) {
    var ip by remember { mutableStateOf(config.printerIp ?: "") }
    var port by remember { mutableStateOf(config.printerPort.toString()) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp)
            ) {
                Text(
                    "Cấu hình địa chỉ máy in",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = ip,
                    onValueChange = { ip = it },
                    label = { Text("Địa chỉ IP") },
                    placeholder = { Text("192.168.1.100") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = port,
                    onValueChange = { port = it },
                    label = { Text("Port") },
                    placeholder = { Text("9100") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    horizontalArrangement = Arrangement.End,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Hủy")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { onSave(ip, port.toIntOrNull() ?: 9100) },
                        enabled = ip.isNotBlank()
                    ) {
                        Text("Lưu")
                    }
                }
            }
        }
    }
}

@Composable
private fun TemplateSelectionDialog(
    templates: List<BillTemplateEntity>,
    currentTemplateId: String?,
    onDismiss: () -> Unit,
    onSelect: (String?) -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.widthIn(max = 400.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    "Chọn mẫu bill",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Default option
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(null) }
                        .padding(vertical = 12.dp)
                ) {
                    RadioButton(
                        selected = currentTemplateId == null,
                        onClick = { onSelect(null) }
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Mẫu mặc định", fontWeight = FontWeight.Medium)
                        Text(
                            "Sử dụng mẫu mặc định của chi nhánh",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }

                HorizontalDivider()

                // Template list
                LazyColumn(
                    modifier = Modifier.heightIn(max = 300.dp)
                ) {
                    items(templates) { template ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelect(template.id) }
                                .padding(vertical = 12.dp)
                        ) {
                            RadioButton(
                                selected = currentTemplateId == template.id,
                                onClick = { onSelect(template.id) }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(template.name, fontWeight = FontWeight.Medium)
                                    if (template.isDefault) {
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                                        ) {
                                            Text(
                                                "Mặc định",
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                        }
                                    }
                                }
                                Text(
                                    getTemplateTypeLabel(template.templateType),
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text("Đóng")
                }
            }
        }
    }
}

private fun getTemplateTypeLabel(type: String): String {
    return when (type) {
        "classic" -> "Truyền thống"
        "modern" -> "Hiện đại"
        "compact" -> "Thu gọn"
        "detailed" -> "Chi tiết VAT"
        "premium" -> "Cao cấp"
        else -> type
    }
}

// Paper width options
private val PAPER_WIDTH_OPTIONS = listOf(
    PaperWidthOption(32, "32mm (1.25 inch)", "Máy in nhãn nhỏ"),
    PaperWidthOption(44, "44mm (1.75 inch)", "Máy in di động nhỏ"),
    PaperWidthOption(48, "48mm (1.9 inch)", "Máy in di động"),
    PaperWidthOption(57, "57mm (2.25 inch)", "Máy in di động"),
    PaperWidthOption(58, "58mm (2.25 inch)", "Máy in POS nhỏ"),
    PaperWidthOption(76, "76mm (3 inch)", "Máy in POS trung"),
    PaperWidthOption(80, "80mm (3.15 inch)", "Máy in POS chuẩn"),
    PaperWidthOption(110, "110mm (4.3 inch)", "Máy in khổ rộng"),
    PaperWidthOption(112, "112mm (4.4 inch)", "Máy in khổ rộng")
)

private data class PaperWidthOption(
    val width: Int,
    val label: String,
    val description: String
)

@Composable
private fun PaperWidthSelectionDialog(
    currentPaperWidth: Int,
    onDismiss: () -> Unit,
    onSelect: (Int) -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.widthIn(max = 400.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    "Chọn khổ giấy",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                LazyColumn(
                    modifier = Modifier.heightIn(max = 400.dp)
                ) {
                    items(PAPER_WIDTH_OPTIONS) { option ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelect(option.width) }
                                .padding(vertical = 12.dp)
                        ) {
                            RadioButton(
                                selected = currentPaperWidth == option.width,
                                onClick = { onSelect(option.width) }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(option.label, fontWeight = FontWeight.Medium)
                                Text(
                                    option.description,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text("Đóng")
                }
            }
        }
    }
}

// Font size options
private val FONT_SIZE_OPTIONS = listOf(
    FontSizeOption("extra_small", "Rất nhỏ (0.7x)", "Tiết kiệm giấy"),
    FontSizeOption("small", "Nhỏ (0.85x)", "Chữ nhỏ hơn mặc định"),
    FontSizeOption("normal", "Vừa (1.0x)", "Kích thước mặc định"),
    FontSizeOption("large", "Lớn (1.2x)", "Chữ to dễ đọc"),
    FontSizeOption("extra_large", "Rất lớn (1.4x)", "Chữ rất to")
)

private data class FontSizeOption(val value: String, val label: String, val description: String)

private fun getFontSizeLabel(fontSize: String): String {
    return when (fontSize) {
        "extra_small" -> "Rất nhỏ (0.7x)"
        "small" -> "Nhỏ (0.85x)"
        "large" -> "Lớn (1.2x)"
        "extra_large" -> "Rất lớn (1.4x)"
        else -> "Vừa (1.0x)"
    }
}

@Composable
private fun FontSizeSelectionDialog(
    currentFontSize: String,
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.widthIn(max = 400.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Chọn cỡ chữ", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(bottom = 16.dp))
                LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                    items(FONT_SIZE_OPTIONS) { option ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable { onSelect(option.value) }.padding(vertical = 12.dp)) {
                            RadioButton(selected = currentFontSize == option.value, onClick = { onSelect(option.value) })
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(option.label, fontWeight = FontWeight.Medium)
                                Text(option.description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) { Text("Đóng") }
            }
        }
    }
}

@Composable
private fun LineSpacingSelectionDialog(
    currentLineSpacing: Float,
    onDismiss: () -> Unit,
    onSelect: (Float) -> Unit
) {
    var sliderValue by remember { mutableStateOf(currentLineSpacing.coerceIn(0.3f, 1.0f)) }
    val primaryColor = MaterialTheme.colorScheme.primary

    Dialog(onDismissRequest = onDismiss) {
        Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.widthIn(max = 400.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Khoảng cách dòng", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(bottom = 16.dp))

                // Current value display
                Text(
                    text = "${(sliderValue * 100).toInt()}%",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = primaryColor,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Slider with labels
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("30%", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Slider(
                        value = sliderValue,
                        onValueChange = { sliderValue = it },
                        valueRange = 0.3f..1.0f,
                        steps = 6,
                        modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
                        colors = SliderDefaults.colors(
                            thumbColor = primaryColor,
                            activeTrackColor = primaryColor
                        )
                    )
                    Text("100%", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }

                // Description based on value
                val description = when {
                    sliderValue <= 0.35f -> "Rất sát - tiết kiệm giấy"
                    sliderValue <= 0.5f -> "Sát - compact"
                    sliderValue <= 0.7f -> "Bình thường"
                    sliderValue <= 0.85f -> "Rộng - dễ đọc"
                    else -> "Rất rộng"
                }
                Text(
                    text = description,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) { Text("Hủy") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { onSelect(sliderValue) },
                        colors = ButtonDefaults.buttonColors(containerColor = primaryColor)
                    ) { Text("Áp dụng") }
                }
            }
        }
    }
}

@Composable
private fun NumberOfCopiesSelectionDialog(
    currentCopies: Int,
    onDismiss: () -> Unit,
    onSelect: (Int) -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.widthIn(max = 400.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Chọn số bản in", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(bottom = 16.dp))
                LazyColumn(modifier = Modifier.heightIn(max = 300.dp)) {
                    items(5) { index ->
                        val copies = index + 1
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable { onSelect(copies) }.padding(vertical = 12.dp)) {
                            RadioButton(selected = currentCopies == copies, onClick = { onSelect(copies) })
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("$copies bản", fontWeight = FontWeight.Medium)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) { Text("Đóng") }
            }
        }
    }
}

@Composable
private fun PrintSettingsDialog(
    config: BillPrinterConfigEntity,
    onDismiss: () -> Unit,
    onToggleCutPaper: () -> Unit,
    onToggleOpenCashDrawer: () -> Unit,
    onToggleBeepAfterPrint: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.widthIn(max = 400.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Cài đặt in", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(bottom = 16.dp))

                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable(onClick = onToggleCutPaper).padding(vertical = 12.dp)) {
                    Icon(Icons.Default.ContentCut, null, Modifier.size(24.dp), tint = if (config.cutPaper) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Cắt giấy tự động", fontWeight = FontWeight.Medium)
                        Text("Tự động cắt giấy sau khi in", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = config.cutPaper, onCheckedChange = { onToggleCutPaper() })
                }
                HorizontalDivider()

                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable(onClick = onToggleOpenCashDrawer).padding(vertical = 12.dp)) {
                    Icon(Icons.Default.Inventory, null, Modifier.size(24.dp), tint = if (config.openCashDrawer) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Mở két đựng tiền", fontWeight = FontWeight.Medium)
                        Text("Tự động mở két tiền khi in bill", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = config.openCashDrawer, onCheckedChange = { onToggleOpenCashDrawer() })
                }
                HorizontalDivider()

                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable(onClick = onToggleBeepAfterPrint).padding(vertical = 12.dp)) {
                    Icon(Icons.Default.NotificationsActive, null, Modifier.size(24.dp), tint = if (config.beepAfterPrint) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Beep sau khi in", fontWeight = FontWeight.Medium)
                        Text("Phát tiếng beep khi in xong", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = config.beepAfterPrint, onCheckedChange = { onToggleBeepAfterPrint() })
                }

                Spacer(modifier = Modifier.height(16.dp))
                TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) { Text("Đóng") }
            }
        }
    }
}

/**
 * All-in-one settings dialog for bill printer configuration
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BillPrinterAllSettingsDialog(
    config: BillPrinterConfigEntity,
    isSunmiDevice: Boolean, // True nếu thiết bị là Sunmi
    onDismiss: () -> Unit,
    onSave: (connectionType: String, printerIp: String?, printerPort: Int, paperWidth: Int, fontSize: String, lineSpacing: Float, numberOfCopies: Int, printPreview: Boolean, cutPaper: Boolean, openCashDrawer: Boolean, beepAfterPrint: Boolean) -> Unit
) {
    val primaryColor = MaterialTheme.colorScheme.primary

    // Local state for all settings
    var connectionType by remember { mutableStateOf(config.connectionType) }
    var printerIp by remember { mutableStateOf(config.printerIp ?: "") }
    var printerPort by remember { mutableStateOf(config.printerPort.toString()) }
    var paperWidth by remember { mutableStateOf(config.paperWidth) }
    var fontSize by remember { mutableStateOf(config.fontSize) }
    var lineSpacing by remember { mutableStateOf(config.lineSpacing) }
    var numberOfCopies by remember { mutableStateOf(config.numberOfCopies) }
    var printPreview by remember { mutableStateOf(config.printPreview) }
    var cutPaper by remember { mutableStateOf(config.cutPaper) }
    var openCashDrawer by remember { mutableStateOf(config.openCashDrawer) }
    var beepAfterPrint by remember { mutableStateOf(config.beepAfterPrint) }

    // Dropdown expanded states
    var connectionTypeExpanded by remember { mutableStateOf(false) }
    var paperWidthExpanded by remember { mutableStateOf(false) }
    var fontSizeExpanded by remember { mutableStateOf(false) }
    var copiesExpanded by remember { mutableStateOf(false) }

    // Options - chỉ hiển thị "Sunmi (Tích hợp)" nếu thiết bị là Sunmi
    val allConnectionTypeOptions = listOf(
        "network" to "Mạng LAN (Network)",
        "bluetooth" to "Bluetooth",
        "usb" to "USB",
        "sunmi" to "Sunmi (Tích hợp)"
    )
    val connectionTypeOptions = if (isSunmiDevice) {
        allConnectionTypeOptions
    } else {
        allConnectionTypeOptions.filter { it.first != "sunmi" }
    }
    val paperWidthOptions = listOf(58, 76, 80, 110, 112)
    val fontSizeOptions = listOf(
        "extra_small" to "Rất nhỏ (0.7x)",
        "small" to "Nhỏ (0.85x)",
        "medium" to "Vừa (1.0x)",
        "large" to "Lớn (1.2x)",
        "extra_large" to "Rất lớn (1.4x)"
    )

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.widthIn(max = 400.dp)
        ) {
            Column(
                modifier = Modifier
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
                            .background(primaryColor.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp),
                            tint = primaryColor
                        )
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "Cài đặt máy in",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = config.name,
                            fontSize = 14.sp,
                            color = primaryColor
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Connection Type Dropdown
                Text("Loại kết nối", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                ExposedDropdownMenuBox(
                    expanded = connectionTypeExpanded,
                    onExpandedChange = { connectionTypeExpanded = it }
                ) {
                    OutlinedTextField(
                        value = connectionTypeOptions.find { it.first == connectionType }?.second ?: "Mạng LAN (Network)",
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = connectionTypeExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = connectionTypeExpanded,
                        onDismissRequest = { connectionTypeExpanded = false }
                    ) {
                        connectionTypeOptions.forEach { (key, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = {
                                    connectionType = key
                                    connectionTypeExpanded = false
                                },
                                leadingIcon = {
                                    if (key == connectionType) {
                                        Icon(Icons.Default.Check, null, tint = primaryColor)
                                    }
                                }
                            )
                        }
                    }
                }

                // Show Sunmi printer info when selected
                if (connectionType == "sunmi") {
                    Spacer(modifier = Modifier.height(12.dp))
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFFE8F5E9)
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
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = Color(0xFF4CAF50)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "Máy in Sunmi tích hợp",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF2E7D32)
                                )
                                Text(
                                    text = "Sử dụng máy in có sẵn trên thiết bị Sunmi T1/T2/V2",
                                    fontSize = 12.sp,
                                    color = Color(0xFF388E3C)
                                )
                            }
                        }
                    }
                }

                // IP and Port fields (only for network type)
                if (connectionType == "network") {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Địa chỉ IP", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                    OutlinedTextField(
                        value = printerIp,
                        onValueChange = { printerIp = it },
                        placeholder = { Text("192.168.1.100") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Port", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                    OutlinedTextField(
                        value = printerPort,
                        onValueChange = { printerPort = it },
                        placeholder = { Text("9100") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Paper Width Dropdown
                Text("Khổ giấy", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                ExposedDropdownMenuBox(
                    expanded = paperWidthExpanded,
                    onExpandedChange = { paperWidthExpanded = it }
                ) {
                    OutlinedTextField(
                        value = "${paperWidth}mm",
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = paperWidthExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = paperWidthExpanded,
                        onDismissRequest = { paperWidthExpanded = false }
                    ) {
                        paperWidthOptions.forEach { width ->
                            DropdownMenuItem(
                                text = { Text("${width}mm") },
                                onClick = {
                                    paperWidth = width
                                    paperWidthExpanded = false
                                },
                                leadingIcon = {
                                    if (width == paperWidth) {
                                        Icon(Icons.Default.Check, null, tint = primaryColor)
                                    }
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Font Size Dropdown
                Text("Cỡ chữ", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                ExposedDropdownMenuBox(
                    expanded = fontSizeExpanded,
                    onExpandedChange = { fontSizeExpanded = it }
                ) {
                    OutlinedTextField(
                        value = fontSizeOptions.find { it.first == fontSize }?.second ?: "Vừa (1.0x)",
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = fontSizeExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = fontSizeExpanded,
                        onDismissRequest = { fontSizeExpanded = false }
                    ) {
                        fontSizeOptions.forEach { (key, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = {
                                    fontSize = key
                                    fontSizeExpanded = false
                                },
                                leadingIcon = {
                                    if (key == fontSize) {
                                        Icon(Icons.Default.Check, null, tint = primaryColor)
                                    }
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Line Spacing Slider (30% - 100%, đồng bộ với web dashboard)
                Text("Khoảng cách dòng", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("30%", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Slider(
                        value = lineSpacing,
                        onValueChange = { lineSpacing = it },
                        valueRange = 0.3f..1.0f,
                        steps = 6, // 30, 40, 50, 60, 70, 80, 90, 100 (7 điểm dừng = 6 steps)
                        modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
                        colors = SliderDefaults.colors(
                            thumbColor = primaryColor,
                            activeTrackColor = primaryColor
                        )
                    )
                    Text("100%", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
                Text(
                    text = "${(lineSpacing * 100).toInt()}%",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = primaryColor,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Number of Copies Dropdown
                Text("Số bản in", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                ExposedDropdownMenuBox(
                    expanded = copiesExpanded,
                    onExpandedChange = { copiesExpanded = it }
                ) {
                    OutlinedTextField(
                        value = "$numberOfCopies bản",
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = copiesExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = copiesExpanded,
                        onDismissRequest = { copiesExpanded = false }
                    ) {
                        (1..5).forEach { copies ->
                            DropdownMenuItem(
                                text = { Text("$copies bản") },
                                onClick = {
                                    numberOfCopies = copies
                                    copiesExpanded = false
                                },
                                leadingIcon = {
                                    if (copies == numberOfCopies) {
                                        Icon(Icons.Default.Check, null, tint = primaryColor)
                                    }
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(12.dp))

                // Toggle Settings Section
                Text("Cài đặt bổ sung", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))

                // Print Preview Toggle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { printPreview = !printPreview }
                        .padding(vertical = 8.dp)
                ) {
                    Icon(
                        Icons.Default.Preview,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = if (printPreview) primaryColor else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Xem trước khi in", fontWeight = FontWeight.Medium)
                        Text("Hiển thị bản xem trước trước khi in", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = printPreview,
                        onCheckedChange = { printPreview = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = primaryColor
                        )
                    )
                }

                // Cut Paper Toggle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { cutPaper = !cutPaper }
                        .padding(vertical = 8.dp)
                ) {
                    Icon(
                        Icons.Default.ContentCut,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = if (cutPaper) primaryColor else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Cắt giấy tự động", fontWeight = FontWeight.Medium)
                        Text("Tự động cắt giấy sau khi in", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = cutPaper,
                        onCheckedChange = { cutPaper = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = primaryColor
                        )
                    )
                }

                // Open Cash Drawer Toggle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { openCashDrawer = !openCashDrawer }
                        .padding(vertical = 8.dp)
                ) {
                    Icon(
                        Icons.Default.Inventory,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = if (openCashDrawer) primaryColor else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Mở két tiền", fontWeight = FontWeight.Medium)
                        Text("Tự động mở két khi in bill", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = openCashDrawer,
                        onCheckedChange = { openCashDrawer = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = primaryColor
                        )
                    )
                }

                // Beep After Print Toggle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { beepAfterPrint = !beepAfterPrint }
                        .padding(vertical = 8.dp)
                ) {
                    Icon(
                        Icons.Default.NotificationsActive,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = if (beepAfterPrint) primaryColor else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Beep sau khi in", fontWeight = FontWeight.Medium)
                        Text("Phát tiếng beep khi in xong", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = beepAfterPrint,
                        onCheckedChange = { beepAfterPrint = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = primaryColor
                        )
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Action Buttons
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
                            onSave(connectionType, printerIp.ifBlank { null }, printerPort.toIntOrNull() ?: 9100, paperWidth, fontSize, lineSpacing, numberOfCopies, printPreview, cutPaper, openCashDrawer, beepAfterPrint)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = primaryColor)
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Lưu")
                    }
                }
            }
        }
    }
}
