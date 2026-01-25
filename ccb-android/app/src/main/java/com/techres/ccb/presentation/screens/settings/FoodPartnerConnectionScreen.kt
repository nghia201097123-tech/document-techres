package com.techres.ccb.presentation.screens.settings

import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.presentation.components.PosTopAppBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FoodPartnerConnectionScreen(
    onNavigateBack: () -> Unit,
    viewModel: FoodPartnerConnectionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadAccounts()
    }

    Scaffold(
        topBar = {
            PosTopAppBar(
                title = { Text("Cổng liên kết") },
                onBack = onNavigateBack,
                actions = {
                    // Refresh button
                    IconButton(onClick = { viewModel.loadAccounts() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Tải lại")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                uiState.error != null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Error,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = uiState.error ?: "Có lỗi xảy ra",
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadAccounts() }) {
                            Text("Thử lại")
                        }
                    }
                }
                uiState.accounts.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.LinkOff,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Chưa có cổng liên kết nào",
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Vui lòng liên kết tài khoản trên Web Dashboard",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Summary card
                        item {
                            SummaryCard(
                                totalAccounts = uiState.accounts.size,
                                connectedCount = uiState.accounts.count { it.status == "connected" },
                                disconnectedCount = uiState.accounts.count { it.status == "disconnected" }
                            )
                        }

                        // Account list
                        items(uiState.accounts) { account ->
                            FoodPartnerAccountCard(
                                account = account,
                                isReconnecting = uiState.reconnectingAccountId == account.id,
                                onReconnect = { viewModel.reconnectAccount(account.id) }
                            )
                        }

                        // Last sync info
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Đồng bộ lúc: ${uiState.lastSyncTime ?: "Chưa đồng bộ"}",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }
        }
    }

    // Show snackbar for reconnect result
    uiState.reconnectResult?.let { result ->
        LaunchedEffect(result) {
            // Auto clear after showing
            viewModel.clearReconnectResult()
        }
    }
}

@Composable
private fun SummaryCard(
    totalAccounts: Int,
    connectedCount: Int,
    disconnectedCount: Int
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(
                value = totalAccounts.toString(),
                label = "Tổng cộng",
                color = MaterialTheme.colorScheme.primary
            )
            StatItem(
                value = connectedCount.toString(),
                label = "Đã kết nối",
                color = Color(0xFF4CAF50)
            )
            StatItem(
                value = disconnectedCount.toString(),
                label = "Mất kết nối",
                color = if (disconnectedCount > 0) Color(0xFFE91E63) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )
        }
    }
}

@Composable
private fun StatItem(
    value: String,
    label: String,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
    }
}

@Composable
private fun FoodPartnerAccountCard(
    account: FoodPartnerAccount,
    isReconnecting: Boolean,
    onReconnect: () -> Unit
) {
    val platformColor = when (account.platform.lowercase()) {
        "grab" -> Color(0xFF00B14F)
        "befood" -> Color(0xFFFFB300)
        "shopee_food" -> Color(0xFFEE4D2D)
        else -> MaterialTheme.colorScheme.primary
    }

    val platformName = when (account.platform.lowercase()) {
        "grab" -> "GrabFood"
        "befood" -> "BeFood"
        "shopee_food" -> "ShopeeFood"
        else -> account.platform
    }

    val isConnected = account.status == "connected"

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isConnected)
                MaterialTheme.colorScheme.surface
            else
                Color(0xFFFFF3E0)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Platform icon/badge
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(platformColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = platformName.first().toString(),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = platformColor
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Account info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = platformName,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
                Text(
                    text = account.displayName ?: account.username ?: "Không có tên",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Status badge
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(
                                if (isConnected) Color(0xFF4CAF50)
                                else Color(0xFFE91E63)
                            )
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isConnected) "Đã kết nối" else "Mất kết nối",
                        fontSize = 12.sp,
                        color = if (isConnected) Color(0xFF4CAF50) else Color(0xFFE91E63)
                    )
                }

                // Show error if disconnected
                if (!isConnected && account.lastError != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = account.lastError,
                        fontSize = 11.sp,
                        color = Color(0xFFE91E63).copy(alpha = 0.8f),
                        maxLines = 2
                    )
                }
            }

            // Reconnect button (only for disconnected accounts)
            if (!isConnected) {
                Spacer(modifier = Modifier.width(8.dp))
                Button(
                    onClick = onReconnect,
                    enabled = !isReconnecting,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF2196F3)
                    ),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    if (isReconnecting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = Color.White
                        )
                    } else {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isReconnecting) "Đang kết nối..." else "Kết nối lại",
                        fontSize = 12.sp
                    )
                }
            } else {
                // Connected indicator
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF4CAF50),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

// Data class for UI
data class FoodPartnerAccount(
    val id: String,
    val platform: String,
    val displayName: String?,
    val username: String?,
    val status: String,
    val lastError: String?,
    val errorCount: Int
)
