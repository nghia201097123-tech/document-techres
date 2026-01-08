package com.techres.ccb.presentation.screens.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.presentation.theme.Success

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToDebug: () -> Unit = {},
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

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
                    subtitle = if (uiState.isSyncing) "Đang đồng bộ..." else "Đồng bộ dữ liệu master từ server",
                    onClick = { viewModel.syncNow() },
                    trailing = {
                        if (uiState.isSyncing) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        }
                    }
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
                    title = "Cài đặt máy in",
                    subtitle = "Kết nối máy in bill, máy in tem",
                    onClick = { /* TODO: Navigate to printer settings */ }
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
