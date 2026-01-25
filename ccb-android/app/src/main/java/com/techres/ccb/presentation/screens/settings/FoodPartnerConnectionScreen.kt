package com.techres.ccb.presentation.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
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
    onNavigateToAddAccount: () -> Unit = {},
    onNavigateToRelogin: (accountId: String, platform: String) -> Unit = { _, _ -> },
    viewModel: FoodPartnerConnectionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // Show snackbar for action result
    LaunchedEffect(uiState.actionResult) {
        uiState.actionResult?.let { result ->
            snackbarHostState.showSnackbar(
                message = result.message,
                duration = SnackbarDuration.Short
            )
            viewModel.clearActionResult()
        }
    }

    Scaffold(
        topBar = {
            PosTopAppBar(
                title = { Text("Cổng kết nối") },
                onBack = onNavigateBack,
                actions = {
                    IconButton(onClick = { viewModel.loadAccounts() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Tải lại")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToAddAccount,
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Thêm liên kết")
            }
        },
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState) { data ->
                val isSuccess = uiState.actionResult?.success ?: true
                Snackbar(
                    snackbarData = data,
                    containerColor = if (isSuccess) Color(0xFF4CAF50) else MaterialTheme.colorScheme.error,
                    contentColor = Color.White
                )
            }
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
                            text = "Chưa có cổng kết nối nào",
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Vui lòng đồng bộ dữ liệu hoặc thêm liên kết mới",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )
                    }
                }
                else -> {
                    // Group accounts by platform
                    val groupedAccounts = uiState.accounts.groupBy { it.platform.lowercase() }

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        groupedAccounts.forEach { (platform, accounts) ->
                            // Platform header
                            item(key = "header_$platform") {
                                PlatformHeader(
                                    platform = platform,
                                    accountCount = accounts.size
                                )
                            }

                            // Accounts in this platform
                            itemsIndexed(
                                items = accounts,
                                key = { _, account -> account.id }
                            ) { index, account ->
                                AccountCard(
                                    account = account,
                                    index = index + 1,
                                    isTesting = uiState.testingAccountId == account.id,
                                    isDisconnecting = uiState.disconnectingAccountId == account.id,
                                    onRelogin = { onNavigateToRelogin(account.id, account.platform) },
                                    onTest = { viewModel.testConnection(account.id) },
                                    onDisconnect = { viewModel.disconnectAccount(account.id) }
                                )
                            }
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
}

@Composable
private fun PlatformHeader(
    platform: String,
    accountCount: Int
) {
    val platformColor = when (platform) {
        "grab" -> Color(0xFF00B14F)
        "befood" -> Color(0xFFFFB300)
        "shopee_food" -> Color(0xFFEE4D2D)
        else -> MaterialTheme.colorScheme.primary
    }

    val platformName = when (platform) {
        "grab" -> "GrabFood"
        "befood" -> "BeFood"
        "shopee_food" -> "ShopeeFood"
        else -> platform
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Platform icon
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(platformColor),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = platformName.first().toString(),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column {
            Text(
                text = platformName,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "$accountCount cổng kết nối",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
    }
}

@Composable
private fun AccountCard(
    account: FoodPartnerAccount,
    index: Int,
    isTesting: Boolean,
    isDisconnecting: Boolean,
    onRelogin: () -> Unit,
    onTest: () -> Unit,
    onDisconnect: () -> Unit
) {
    val isConnected = account.status == "connected"
    val isAnyActionInProgress = isTesting || isDisconnecting

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Index number
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.width(50.dp)
                ) {
                    Text(
                        text = "#$index",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Shop",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Account info
                Column(modifier = Modifier.weight(1f)) {
                    // Username/Display name
                    Text(
                        text = account.username ?: account.displayName ?: "Không có tên",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    // Status badge
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (isConnected) Color(0xFFE8F5E9) else Color(0xFFFCE4EC)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                if (isConnected) Icons.Default.CheckCircle else Icons.Default.Error,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = if (isConnected) Color(0xFF4CAF50) else Color(0xFFE91E63)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isConnected) "Đã kết nối" else "Mất kết nối",
                                fontSize = 12.sp,
                                color = if (isConnected) Color(0xFF4CAF50) else Color(0xFFE91E63)
                            )
                        }
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
            }

            // Action buttons row
            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(12.dp))

            // Buttons - similar to web dashboard
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Test button
                ActionButton(
                    text = if (isTesting) "Đang kiểm tra..." else "Kiểm tra",
                    icon = Icons.Default.Sync,
                    color = Color(0xFF2196F3),
                    enabled = !isAnyActionInProgress,
                    isLoading = isTesting,
                    onClick = onTest,
                    modifier = Modifier.weight(1f)
                )

                // Relogin button (for disconnected accounts)
                if (!isConnected) {
                    ActionButton(
                        text = "Đăng nhập",
                        icon = Icons.Default.Login,
                        color = Color(0xFF4CAF50),
                        enabled = !isAnyActionInProgress,
                        onClick = onRelogin,
                        modifier = Modifier.weight(1f)
                    )
                }

                // Disconnect button
                ActionButton(
                    text = if (isDisconnecting) "Đang ngắt..." else "Ngắt kết nối",
                    icon = Icons.Default.LinkOff,
                    color = Color(0xFFE91E63),
                    enabled = !isAnyActionInProgress && isConnected,
                    isLoading = isDisconnecting,
                    onClick = onDisconnect,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun ActionButton(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = color,
            disabledContentColor = color.copy(alpha = 0.4f)
        ),
        border = ButtonDefaults.outlinedButtonBorder.copy(
            brush = androidx.compose.ui.graphics.SolidColor(
                if (enabled) color.copy(alpha = 0.5f) else color.copy(alpha = 0.2f)
            )
        )
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(14.dp),
                strokeWidth = 2.dp,
                color = color
            )
        } else {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(14.dp)
            )
        }
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = text,
            fontSize = 11.sp,
            maxLines = 1
        )
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
