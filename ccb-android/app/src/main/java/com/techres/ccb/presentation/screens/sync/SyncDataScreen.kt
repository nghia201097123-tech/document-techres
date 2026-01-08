package com.techres.ccb.presentation.screens.sync

import androidx.compose.animation.core.*
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncDataScreen(
    branchName: String,
    viewModel: SyncDataViewModel = hiltViewModel(),
    onSyncComplete: () -> Unit,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(branchName) {
        viewModel.setBranchName(branchName)
    }

    // Auto start sync
    LaunchedEffect(Unit) {
        viewModel.startSync(onSyncComplete)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Đồng bộ dữ liệu") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1976D2),
                    titleContentColor = Color.White
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
            // Header Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Sync Icon with Animation
                    if (uiState.isSyncing) {
                        val infiniteTransition = rememberInfiniteTransition(label = "sync")
                        val rotation by infiniteTransition.animateFloat(
                            initialValue = 0f,
                            targetValue = 360f,
                            animationSpec = infiniteRepeatable(
                                animation = tween(1000, easing = LinearEasing),
                                repeatMode = RepeatMode.Restart
                            ),
                            label = "rotation"
                        )
                        Icon(
                            Icons.Default.Sync,
                            contentDescription = null,
                            modifier = Modifier
                                .size(64.dp)
                                .rotate(rotation),
                            tint = Color(0xFF1976D2)
                        )
                    } else if (uiState.isCompleted) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = Color(0xFF4CAF50)
                        )
                    } else {
                        Icon(
                            Icons.Default.CloudDownload,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = Color(0xFF1976D2)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        when {
                            uiState.isCompleted -> "Đồng bộ hoàn tất!"
                            uiState.isSyncing -> "Đang đồng bộ..."
                            else -> "Chuẩn bị đồng bộ"
                        },
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            uiState.isCompleted -> Color(0xFF4CAF50)
                            else -> Color(0xFF1976D2)
                        }
                    )

                    if (uiState.currentSyncItem != null) {
                        Text(
                            uiState.currentSyncItem!!,
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Overall Progress
                    LinearProgressIndicator(
                        progress = { uiState.overallProgress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = Color(0xFF4CAF50),
                        trackColor = Color(0xFFE0E0E0)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        "${(uiState.overallProgress * 100).toInt()}%",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1976D2)
                    )
                }
            }

            // Sync Items List
            Text(
                "Chi tiết đồng bộ",
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Gray
            )

            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.syncItems) { item ->
                    SyncItemCard(item = item)
                }
            }

            // Bottom info
            if (uiState.isCompleted) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
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
                            tint = Color(0xFF4CAF50)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Dữ liệu đã được đồng bộ thành công. Đang chuyển đến màn hình chính...",
                            fontSize = 14.sp,
                            color = Color(0xFF2E7D32)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SyncItemCard(item: SyncItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when (item.status) {
                SyncStatus.COMPLETED -> Color(0xFFE8F5E9)
                SyncStatus.SYNCING -> Color(0xFFE3F2FD)
                SyncStatus.ERROR -> Color(0xFFFFEBEE)
                else -> Color.White
            }
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Status Icon
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(
                        when (item.status) {
                            SyncStatus.COMPLETED -> Color(0xFF4CAF50)
                            SyncStatus.SYNCING -> Color(0xFF2196F3)
                            SyncStatus.ERROR -> Color(0xFFF44336)
                            else -> Color(0xFFE0E0E0)
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                when (item.status) {
                    SyncStatus.COMPLETED -> Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                    SyncStatus.SYNCING -> {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    }
                    SyncStatus.ERROR -> Icon(
                        Icons.Default.Error,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                    else -> Icon(
                        Icons.Default.HourglassEmpty,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    item.name,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                if (item.status == SyncStatus.COMPLETED && item.itemCount > 0) {
                    Text(
                        "${item.itemCount} mục",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                if (item.status == SyncStatus.SYNCING) {
                    Spacer(modifier = Modifier.height(4.dp))
                    LinearProgressIndicator(
                        progress = { item.progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp)),
                        color = Color(0xFF2196F3),
                        trackColor = Color(0xFFBBDEFB)
                    )
                }
            }

            // Status text
            Text(
                when (item.status) {
                    SyncStatus.COMPLETED -> "Hoàn tất"
                    SyncStatus.SYNCING -> "Đang tải..."
                    SyncStatus.ERROR -> "Lỗi"
                    else -> "Chờ"
                },
                fontSize = 12.sp,
                color = when (item.status) {
                    SyncStatus.COMPLETED -> Color(0xFF4CAF50)
                    SyncStatus.SYNCING -> Color(0xFF2196F3)
                    SyncStatus.ERROR -> Color(0xFFF44336)
                    else -> Color.Gray
                }
            )
        }
    }
}
