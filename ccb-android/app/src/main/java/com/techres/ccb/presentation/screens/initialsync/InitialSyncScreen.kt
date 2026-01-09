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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

// Sync item data class
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
    onSyncComplete: () -> Unit
) {
    // Mock sync items
    var syncItems by remember {
        mutableStateOf(
            listOf(
                SyncItemData("brands", "Thương hiệu", Icons.Default.Business),
                SyncItemData("branches", "Chi nhánh", Icons.Default.Store),
                SyncItemData("categories", "Danh mục", Icons.Default.Category),
                SyncItemData("products", "Sản phẩm", Icons.Default.Fastfood),
                SyncItemData("areas", "Khu vực", Icons.Default.Map),
                SyncItemData("tables", "Bàn", Icons.Default.TableBar),
                SyncItemData("staff", "Nhân viên", Icons.Default.People)
            )
        )
    }

    var overallProgress by remember { mutableFloatStateOf(0f) }
    var currentItemIndex by remember { mutableIntStateOf(-1) }
    var isCompleted by remember { mutableStateOf(false) }

    // Mock sync animation
    LaunchedEffect(Unit) {
        delay(500) // Initial delay

        for (i in syncItems.indices) {
            currentItemIndex = i

            // Update current item to syncing
            syncItems = syncItems.toMutableList().apply {
                this[i] = this[i].copy(status = SyncItemStatus.SYNCING)
            }

            // Simulate sync delay
            delay(600)

            // Mock counts
            val mockCounts = listOf(3, 5, 12, 48, 4, 20, 8)

            // Update current item to completed
            syncItems = syncItems.toMutableList().apply {
                this[i] = this[i].copy(
                    status = SyncItemStatus.COMPLETED,
                    count = mockCounts[i]
                )
            }

            overallProgress = (i + 1).toFloat() / syncItems.size
        }

        isCompleted = true
        delay(1000)
        onSyncComplete()
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

                if (!isCompleted) {
                    Icon(
                        imageVector = Icons.Default.Sync,
                        contentDescription = null,
                        modifier = Modifier
                            .size(48.dp)
                            .graphicsLayer { rotationZ = rotation },
                        tint = Color.White.copy(alpha = 0.8f)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = Color(0xFF4CAF50)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = if (isCompleted) "Sẵn sàng!" else "Đang đồng bộ...",
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
                            text = "Đồng bộ dữ liệu",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Đang tải dữ liệu cần thiết để hoạt động offline",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Overall progress
                    LinearProgressIndicator(
                        progress = { overallProgress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.primaryContainer
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "${(overallProgress * 100).toInt()}% hoàn tất",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        modifier = Modifier.align(Alignment.End)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Sync items list
                    syncItems.forEach { item ->
                        SyncItemRow(item = item)
                        if (item != syncItems.last()) {
                            Spacer(modifier = Modifier.height(12.dp))
                        }
                    }

                    // Summary when completed
                    if (isCompleted) {
                        Spacer(modifier = Modifier.height(24.dp))

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
                                        text = "Đồng bộ hoàn tất!",
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF2E7D32)
                                    )
                                    Text(
                                        text = "Tổng cộng ${syncItems.sumOf { it.count }} mục đã được tải về",
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
                    else -> Color.Transparent
                },
                shape = RoundedCornerShape(8.dp)
            )
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Icon
        Box(
            modifier = Modifier
                .size(40.dp)
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
                modifier = Modifier.size(20.dp),
                tint = when (item.status) {
                    SyncItemStatus.PENDING -> MaterialTheme.colorScheme.onSurfaceVariant
                    else -> Color.White
                }
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Title and count
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            if (item.status == SyncItemStatus.COMPLETED && item.count > 0) {
                Text(
                    text = "${item.count} mục",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
        }

        // Status icon
        when (item.status) {
            SyncItemStatus.PENDING -> {
                Icon(
                    imageVector = Icons.Default.Schedule,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                )
            }
            SyncItemStatus.SYNCING -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            SyncItemStatus.COMPLETED -> {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = Color(0xFF4CAF50)
                )
            }
            SyncItemStatus.ERROR -> {
                Icon(
                    imageVector = Icons.Default.Error,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}
