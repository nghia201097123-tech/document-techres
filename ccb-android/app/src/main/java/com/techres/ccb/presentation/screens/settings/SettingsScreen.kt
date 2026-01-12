package com.techres.ccb.presentation.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.repository.SyncStep
import com.techres.ccb.data.repository.SyncStepStatus
import com.techres.ccb.presentation.theme.Success

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToDebug: () -> Unit = {},
    onNavigateToKitchenPrinter: () -> Unit = {},
    onNavigateToBillPrinter: () -> Unit = {},
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Show sync progress dialog when syncing or completed
    if (uiState.isSyncing || uiState.syncComplete) {
        SyncProgressDialog(
            branchName = uiState.branchName,
            syncSteps = uiState.syncSteps,
            progress = uiState.syncProgress,
            isCompleted = uiState.syncComplete,
            error = uiState.syncError,
            onDismiss = {
                if (uiState.syncComplete || uiState.syncError != null) {
                    viewModel.resetSyncState()
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cài đặt") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Sync section
            item {
                Text(
                    text = "Đồng bộ dữ liệu",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }

            item {
                SettingsCard(
                    icon = Icons.Default.Sync,
                    title = "Đồng bộ ngay",
                    subtitle = "Đồng bộ dữ liệu master từ server",
                    onClick = { viewModel.syncNow() }
                )
            }

            item {
                SettingsCard(
                    icon = Icons.Default.Schedule,
                    title = "Đồng bộ lần cuối",
                    subtitle = uiState.lastSyncTime ?: "Chưa đồng bộ"
                )
            }

            // Printer section
            item {
                Text(
                    text = "Máy in",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                )
            }

            item {
                SettingsCard(
                    icon = Icons.Default.Print,
                    title = "Quản lý Bếp & Máy in",
                    subtitle = "Gán máy in cho từng bếp",
                    onClick = onNavigateToKitchenPrinter
                )
            }

            item {
                SettingsCard(
                    icon = Icons.Default.Receipt,
                    title = "Máy in Bill",
                    subtitle = "Cấu hình máy in hóa đơn",
                    onClick = onNavigateToBillPrinter
                )
            }

            // Store info section
            item {
                Text(
                    text = "Thông tin cửa hàng",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                )
            }

            item {
                SettingsCard(
                    icon = Icons.Default.Store,
                    title = "Cửa hàng",
                    subtitle = uiState.branchName
                )
            }

            item {
                SettingsCard(
                    icon = Icons.Default.Smartphone,
                    title = "Thiết bị",
                    subtitle = uiState.deviceId
                )
            }

            // App info section
            item {
                Text(
                    text = "Ứng dụng",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                )
            }

            item {
                SettingsCard(
                    icon = Icons.Default.Info,
                    title = "Phiên bản",
                    subtitle = "1.0.0"
                )
            }

            item {
                SettingsCard(
                    icon = Icons.Default.Help,
                    title = "Hỗ trợ",
                    subtitle = "Liên hệ hỗ trợ kỹ thuật",
                    onClick = { /* TODO: Open support */ }
                )
            }

            // Debug section (only in debug builds)
            item {
                Text(
                    text = "Developer",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                )
            }

            item {
                SettingsCard(
                    icon = Icons.Default.Storage,
                    title = "Database Debug",
                    subtitle = "Xem dữ liệu trong database",
                    onClick = onNavigateToDebug
                )
            }
        }
    }

    // Show sync result
    if (uiState.syncError != null) {
        LaunchedEffect(uiState.syncError) {
            // Reset error after showing
        }
    }
}

@Composable
private fun SettingsCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: (() -> Unit)? = null,
    trailing: @Composable (() -> Unit)? = null
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (onClick != null) Modifier.clickable(onClick = onClick)
                else Modifier
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = subtitle,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
            if (trailing != null) {
                trailing()
            } else if (onClick != null) {
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )
            }
        }
    }
}

/**
 * Sync progress dialog showing detailed progress for each step
 */
@Composable
private fun SyncProgressDialog(
    branchName: String,
    syncSteps: Map<SyncStep, SyncStepUiState>,
    progress: Float,
    isCompleted: Boolean,
    error: String?,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = { if (isCompleted || error != null) onDismiss() }) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .width(400.dp)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header with icon
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                error != null -> Color(0xFFFFEBEE)
                                isCompleted -> Color(0xFFE8F5E9)
                                else -> Color(0xFFE3F2FD)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    when {
                        error != null -> {
                            Icon(
                                imageVector = Icons.Default.Error,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = Color(0xFFE91E63)
                            )
                        }
                        isCompleted -> {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = Color(0xFF4CAF50)
                            )
                        }
                        else -> {
                            CircularProgressIndicator(
                                modifier = Modifier.size(48.dp),
                                strokeWidth = 4.dp,
                                color = Color(0xFF2196F3)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = when {
                        error != null -> "Đồng bộ thất bại"
                        isCompleted -> "Đồng bộ hoàn tất!"
                        else -> "Đang đồng bộ dữ liệu"
                    },
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = when {
                        error != null -> Color(0xFFE91E63)
                        isCompleted -> Color(0xFF4CAF50)
                        else -> MaterialTheme.colorScheme.onSurface
                    }
                )

                if (branchName.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = branchName,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }

                if (error != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = error,
                        fontSize = 12.sp,
                        color = Color(0xFFE91E63)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Sync steps list
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    )
                ) {
                    LazyColumn(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(syncSteps.toList()) { (_, stepState) ->
                            SyncStepRow(
                                name = stepState.name,
                                status = stepState.status,
                                count = stepState.count
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Progress bar
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = when {
                        error != null -> Color(0xFFE91E63)
                        isCompleted -> Color(0xFF4CAF50)
                        else -> Color(0xFF2196F3)
                    },
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "${(progress * 100).toInt()}%",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = when {
                        error != null -> Color(0xFFE91E63)
                        isCompleted -> Color(0xFF4CAF50)
                        else -> Color(0xFF2196F3)
                    }
                )

                // Close button (only when completed or error)
                if (isCompleted || error != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = onDismiss,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isCompleted) Color(0xFF4CAF50) else MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Text(
                            text = "Đóng",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SyncStepRow(
    name: String,
    status: SyncStepStatus,
    count: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Status icon
        when (status) {
            SyncStepStatus.PENDING -> {
                Icon(
                    imageVector = Icons.Default.RadioButtonUnchecked,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                )
            }
            SyncStepStatus.IN_PROGRESS -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = Color(0xFF2196F3)
                )
            }
            SyncStepStatus.COMPLETED -> {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = Color(0xFF4CAF50)
                )
            }
            SyncStepStatus.ERROR -> {
                Icon(
                    imageVector = Icons.Default.Error,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = Color(0xFFE91E63)
                )
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Step name
        Text(
            text = name,
            fontSize = 14.sp,
            color = when (status) {
                SyncStepStatus.PENDING ->
                    MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                SyncStepStatus.IN_PROGRESS ->
                    Color(0xFF2196F3)
                SyncStepStatus.COMPLETED ->
                    Color(0xFF4CAF50)
                SyncStepStatus.ERROR ->
                    Color(0xFFE91E63)
            },
            fontWeight = if (status == SyncStepStatus.IN_PROGRESS)
                FontWeight.Medium else FontWeight.Normal,
            modifier = Modifier.weight(1f)
        )

        // Count (only show if completed and count > 0)
        if (status == SyncStepStatus.COMPLETED && count > 0) {
            Text(
                text = "$count",
                fontSize = 12.sp,
                color = Color(0xFF4CAF50),
                fontWeight = FontWeight.Medium
            )
        }
    }
}
