package com.techres.ccb.presentation.screens.initialsync

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.delay

// Sync item data class for UI display
data class SyncItemData(
    val id: String,
    val title: String,
    val icon: ImageVector,
    val status: SyncItemStatus = SyncItemStatus.PENDING,
    val count: Int = 0
)

enum class SyncItemStatus {
    PENDING, SYNCING, COMPLETED, ERROR
}

@Composable
fun InitialSyncScreen(
    onSyncComplete: () -> Unit,
    viewModel: InitialSyncViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Build sync items based on UI state
    val syncItems = remember(uiState) {
        listOf(
            SyncItemData(
                id = "brands",
                title = "Thương hiệu",
                icon = Icons.Default.Business,
                status = when {
                    uiState.brandsSynced -> SyncItemStatus.COMPLETED
                    uiState.status == InitialSyncStatus.SYNCING && !uiState.brandsSynced -> SyncItemStatus.SYNCING
                    uiState.status == InitialSyncStatus.ERROR -> SyncItemStatus.ERROR
                    else -> SyncItemStatus.PENDING
                },
                count = uiState.brandsCount
            ),
            SyncItemData(
                id = "branches",
                title = "Chi nhánh",
                icon = Icons.Default.Store,
                status = when {
                    uiState.branchesSynced -> SyncItemStatus.COMPLETED
                    uiState.status == InitialSyncStatus.SYNCING && uiState.brandsSynced -> SyncItemStatus.SYNCING
                    uiState.status == InitialSyncStatus.ERROR -> SyncItemStatus.ERROR
                    else -> SyncItemStatus.PENDING
                },
                count = uiState.branchesCount
            )
        )
    }

    val isCompleted = uiState.status == InitialSyncStatus.COMPLETED
    val hasError = uiState.status == InitialSyncStatus.ERROR

    // Start sync when screen loads
    LaunchedEffect(Unit) {
        viewModel.startSync()
    }

    // Navigate when sync completes
    LaunchedEffect(isCompleted) {
        if (isCompleted) {
            delay(800)
            onSyncComplete()
        }
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // Left Panel - Branding
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.primary,
                            MaterialTheme.colorScheme.primaryContainer
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.padding(48.dp)
            ) {
                // Logo
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                            .background(Color.White),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Restaurant,
                            contentDescription = "Logo",
                            modifier = Modifier.size(56.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                Text(
                    text = "CCB POS",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Sync icon animation
                val infiniteTransition = rememberInfiniteTransition(label = "sync")
                val rotation by infiniteTransition.animateFloat(
                    initialValue = 0f,
                    targetValue = 360f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(1500, easing = LinearEasing),
                        repeatMode = RepeatMode.Restart
                    ),
                    label = "rotation"
                )

                when {
                    hasError -> {
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
                        Icon(
                            imageVector = Icons.Default.Sync,
                            contentDescription = null,
                            modifier = Modifier
                                .size(48.dp)
                                .graphicsLayer { rotationZ = rotation },
                            tint = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = when {
                        hasError -> "Đã xảy ra lỗi"
                        isCompleted -> "Sẵn sàng!"
                        else -> "Đang tải dữ liệu..."
                    },
                    fontSize = 18.sp,
                    color = Color.White.copy(alpha = 0.9f)
                )
            }
        }

        // Right Panel - Sync Progress
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(MaterialTheme.colorScheme.surface),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .widthIn(max = 450.dp)
                    .padding(32.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp)
                ) {
                    // Header
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudDownload,
                            contentDescription = null,
                            modifier = Modifier.size(32.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Tải thông tin",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Đang tải danh sách thương hiệu và chi nhánh bạn có quyền truy cập",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    // Overall progress
                    LinearProgressIndicator(
                        progress = { uiState.progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = when {
                            hasError -> MaterialTheme.colorScheme.error
                            else -> MaterialTheme.colorScheme.primary
                        },
                        trackColor = MaterialTheme.colorScheme.primaryContainer
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "${(uiState.progress * 100).toInt()}% hoàn tất",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        modifier = Modifier.align(Alignment.End)
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    // Sync items list
                    syncItems.forEach { item ->
                        SyncItemRow(item = item)
                        if (item != syncItems.last()) {
                            Spacer(modifier = Modifier.height(16.dp))
                        }
                    }

                    // Error message
                    if (hasError && uiState.error != null) {
                        Spacer(modifier = Modifier.height(24.dp))

                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = Color(0xFFFFEBEE)
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Error,
                                        contentDescription = null,
                                        tint = Color(0xFFE91E63),
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = uiState.error ?: "Đã xảy ra lỗi",
                                        fontSize = 14.sp,
                                        color = Color(0xFFC62828)
                                    )
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                                Button(
                                    onClick = { viewModel.retry() },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFFE91E63)
                                    )
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Thử lại")
                                }
                            }
                        }
                    }

                    // Summary when completed
                    if (isCompleted) {
                        Spacer(modifier = Modifier.height(32.dp))

                        Card(
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
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color(0xFF4CAF50),
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = "Hoàn tất!",
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF2E7D32)
                                    )
                                    Text(
                                        text = "Vui lòng chọn chi nhánh làm việc",
                                        fontSize = 12.sp,
                                        color = Color(0xFF4CAF50)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SyncItemRow(item: SyncItemData) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = when (item.status) {
                    SyncItemStatus.SYNCING -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                    SyncItemStatus.COMPLETED -> Color(0xFFE8F5E9)
                    SyncItemStatus.ERROR -> Color(0xFFFFEBEE)
                    else -> Color.Transparent
                },
                shape = RoundedCornerShape(12.dp)
            )
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Icon
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(
                    when (item.status) {
                        SyncItemStatus.COMPLETED -> Color(0xFF4CAF50)
                        SyncItemStatus.SYNCING -> MaterialTheme.colorScheme.primary
                        SyncItemStatus.ERROR -> MaterialTheme.colorScheme.error
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = item.icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = when (item.status) {
                    SyncItemStatus.PENDING -> MaterialTheme.colorScheme.onSurfaceVariant
                    else -> Color.White
                }
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        // Title and count
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            when (item.status) {
                SyncItemStatus.COMPLETED -> {
                    Text(
                        text = "${item.count} mục",
                        fontSize = 14.sp,
                        color = Color(0xFF4CAF50)
                    )
                }
                SyncItemStatus.SYNCING -> {
                    Text(
                        text = "Đang tải...",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                SyncItemStatus.ERROR -> {
                    Text(
                        text = "Lỗi",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.error
                    )
                }
                else -> {}
            }
        }

        // Status icon
        when (item.status) {
            SyncItemStatus.PENDING -> {
                Icon(
                    imageVector = Icons.Default.Schedule,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                )
            }
            SyncItemStatus.SYNCING -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            SyncItemStatus.COMPLETED -> {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = Color(0xFF4CAF50)
                )
            }
            SyncItemStatus.ERROR -> {
                Icon(
                    imageVector = Icons.Default.Error,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}
