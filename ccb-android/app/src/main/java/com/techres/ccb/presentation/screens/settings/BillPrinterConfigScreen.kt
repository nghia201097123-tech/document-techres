package com.techres.ccb.presentation.screens.settings

import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity

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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Máy in Bill") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                }
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
                        onSetDefaultClick = { viewModel.setDefault(config.id) },
                        onTemplateClick = { viewModel.showTemplateSelector(config) },
                        onToggleAutoPrint = { viewModel.toggleAutoPrint(config) }
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
    onSetDefaultClick: () -> Unit,
    onTemplateClick: () -> Unit,
    onToggleAutoPrint: () -> Unit
) {
    val template = templates.find { it.id == config.templateId }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (config.isDefault)
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else MaterialTheme.colorScheme.surface
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
                            if (config.isDefault) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surfaceVariant
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Receipt,
                        contentDescription = null,
                        tint = if (config.isDefault) Color.White
                        else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = config.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        if (config.isDefault) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = MaterialTheme.colorScheme.primary
                            ) {
                                Text(
                                    "Mặc định",
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    fontSize = 10.sp,
                                    color = Color.White
                                )
                            }
                        }
                    }
                    config.description?.let {
                        Text(
                            text = it,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }

                // Connection indicator
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(
                            if (config.isConnected) Color(0xFF4CAF50)
                            else Color(0xFFBDBDBD)
                        )
                )
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
                            Icons.Default.Wifi,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Kết nối: ${config.connectionType.uppercase()}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
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

            // Actions
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

                // Set default button
                if (!config.isDefault) {
                    OutlinedButton(
                        onClick = onSetDefaultClick,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Mặc định")
                    }
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
