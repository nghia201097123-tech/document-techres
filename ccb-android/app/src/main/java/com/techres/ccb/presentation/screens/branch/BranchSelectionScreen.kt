package com.techres.ccb.presentation.screens.branch

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import kotlinx.coroutines.delay

// Mock data classes
data class MockBrand(
    val id: String,
    val name: String,
    val logo: String? = null,
    val branches: List<MockBranch> = emptyList()
)

data class MockBranch(
    val id: String,
    val name: String,
    val address: String,
    val phone: String? = null
)

// Sync states
enum class SyncState {
    NOT_STARTED,
    SYNCING,
    COMPLETED
}

// Mock sync item
private data class BranchSyncItem(
    val id: String,
    val name: String,
    val icon: ImageVector,
    val status: BranchSyncStatus = BranchSyncStatus.PENDING,
    val count: Int = 0
)

private enum class BranchSyncStatus {
    PENDING, SYNCING, COMPLETED, ERROR
}

@Composable
fun BranchSelectionScreen(
    onContinueToOpenShift: (branchName: String) -> Unit,
    onContinueToExistingShift: (branchName: String) -> Unit,
    onCloseShift: () -> Unit,
    onBack: () -> Unit
) {
    // Mock data
    val mockBrands = remember {
        listOf(
            MockBrand(
                id = "1",
                name = "Gà Rán TechRes",
                branches = listOf(
                    MockBranch("1", "Chi nhánh Quận 1", "123 Nguyễn Huệ, Q.1"),
                    MockBranch("2", "Chi nhánh Quận 3", "456 Võ Văn Tần, Q.3"),
                    MockBranch("3", "Chi nhánh Quận 7", "789 Nguyễn Văn Linh, Q.7")
                )
            ),
            MockBrand(
                id = "2",
                name = "Coffee House",
                branches = listOf(
                    MockBranch("4", "Landmark 81", "Vinhomes Central Park"),
                    MockBranch("5", "Phú Mỹ Hưng", "SC Vivo City, Q.7")
                )
            ),
            MockBrand(
                id = "3",
                name = "Phở Việt",
                branches = listOf(
                    MockBranch("6", "Chi nhánh Thủ Đức", "200 Võ Văn Ngân, Thủ Đức")
                )
            )
        )
    }

    var selectedBrand by remember { mutableStateOf<MockBrand?>(null) }
    var selectedBranch by remember { mutableStateOf<MockBranch?>(null) }
    var syncState by remember { mutableStateOf(SyncState.NOT_STARTED) }
    var syncProgress by remember { mutableFloatStateOf(0f) }
    var showShiftDialog by remember { mutableStateOf(false) }

    // Mock: check if shift exists (for demo, randomly true/false based on branch id)
    val hasExistingShift = remember(selectedBranch) {
        selectedBranch?.id?.toIntOrNull()?.rem(2) == 0 // Even branch IDs have existing shift
    }

    // Sync items state
    var syncItems by remember {
        mutableStateOf(
            listOf(
                BranchSyncItem("categories", "Danh mục", Icons.Default.Category),
                BranchSyncItem("products", "Sản phẩm", Icons.Default.Fastfood),
                BranchSyncItem("areas", "Khu vực", Icons.Default.Map),
                BranchSyncItem("tables", "Bàn", Icons.Default.TableBar),
                BranchSyncItem("staff", "Nhân viên", Icons.Default.People)
            )
        )
    }

    // Shift dialog
    if (showShiftDialog) {
        ShiftExistsDialog(
            branchName = selectedBranch?.name ?: "",
            onContinue = {
                showShiftDialog = false
                selectedBranch?.let { onContinueToExistingShift(it.name) }
            },
            onCloseShift = {
                showShiftDialog = false
                onCloseShift()
            },
            onDismiss = { showShiftDialog = false }
        )
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // Left Panel - Branding & Brand Selection
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
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp)
            ) {
                // Header with back button
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBack,
                        colors = IconButtonDefaults.iconButtonColors(
                            contentColor = Color.White
                        )
                    ) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Chọn nơi làm việc",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Brand selection title
                Text(
                    text = "THƯƠNG HIỆU",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White.copy(alpha = 0.7f),
                    letterSpacing = 1.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Brand list
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(mockBrands) { brand ->
                        BrandSelectionCard(
                            brand = brand,
                            isSelected = selectedBrand?.id == brand.id,
                            onClick = {
                                selectedBrand = brand
                                selectedBranch = null
                                syncState = SyncState.NOT_STARTED
                                syncProgress = 0f
                                // Reset sync items
                                syncItems = syncItems.map { it.copy(status = BranchSyncStatus.PENDING, count = 0) }
                            }
                        )
                    }
                }

                // Logo at bottom
                Spacer(modifier = Modifier.height(24.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Restaurant,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = Color.White.copy(alpha = 0.6f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "CCB POS",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.6f)
                    )
                }
            }
        }

        // Right Panel - Branch Selection & Sync
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(MaterialTheme.colorScheme.surface)
        ) {
            if (selectedBrand == null) {
                // Empty state
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Store,
                        contentDescription = null,
                        modifier = Modifier.size(80.dp),
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Vui lòng chọn thương hiệu",
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp)
                ) {
                    // Header
                    Text(
                        text = "CHI NHÁNH",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        letterSpacing = 1.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = selectedBrand!!.name,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Text(
                        text = "${selectedBrand!!.branches.size} chi nhánh",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Branch list (only show when not syncing)
                    if (syncState == SyncState.NOT_STARTED) {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            items(selectedBrand!!.branches) { branch ->
                                BranchSelectionCard(
                                    branch = branch,
                                    isSelected = selectedBranch?.id == branch.id,
                                    onClick = { selectedBranch = branch }
                                )
                            }
                        }
                    } else {
                        // Show sync progress
                        SyncProgressPanel(
                            branchName = selectedBranch?.name ?: "",
                            syncItems = syncItems,
                            syncProgress = syncProgress,
                            isCompleted = syncState == SyncState.COMPLETED,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Action buttons based on state
                    when (syncState) {
                        SyncState.NOT_STARTED -> {
                            // Sync button (only show when branch is selected)
                            Button(
                                onClick = {
                                    syncState = SyncState.SYNCING
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp),
                                enabled = selectedBranch != null,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF2196F3)
                                )
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CloudDownload,
                                    contentDescription = null
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Đồng bộ dữ liệu",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                        SyncState.SYNCING -> {
                            // Mock sync animation
                            LaunchedEffect(Unit) {
                                val mockCounts = listOf(12, 48, 4, 20, 8)

                                for (i in syncItems.indices) {
                                    syncItems = syncItems.toMutableList().apply {
                                        this[i] = this[i].copy(status = BranchSyncStatus.SYNCING)
                                    }

                                    delay(500)

                                    syncItems = syncItems.toMutableList().apply {
                                        this[i] = this[i].copy(
                                            status = BranchSyncStatus.COMPLETED,
                                            count = mockCounts[i]
                                        )
                                    }

                                    syncProgress = (i + 1).toFloat() / syncItems.size
                                }

                                syncState = SyncState.COMPLETED
                            }

                            // Syncing indicator button (disabled)
                            Button(
                                onClick = { },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp),
                                enabled = false,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF2196F3),
                                    disabledContainerColor = Color(0xFF2196F3).copy(alpha = 0.7f)
                                )
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = "Đang đồng bộ...",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.White
                                )
                            }
                        }
                        SyncState.COMPLETED -> {
                            // Continue button
                            Button(
                                onClick = {
                                    if (hasExistingShift) {
                                        showShiftDialog = true
                                    } else {
                                        selectedBranch?.let { onContinueToOpenShift(it.name) }
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF4CAF50)
                                )
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Tiếp tục",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(Icons.Default.ArrowForward, contentDescription = null)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SyncProgressPanel(
    branchName: String,
    syncItems: List<BranchSyncItem>,
    syncProgress: Float,
    isCompleted: Boolean,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp)
        ) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (!isCompleted) {
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
                    Icon(
                        imageVector = Icons.Default.Sync,
                        contentDescription = null,
                        modifier = Modifier
                            .size(24.dp)
                            .graphicsLayer { rotationZ = rotation },
                        tint = MaterialTheme.colorScheme.primary
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = Color(0xFF4CAF50)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = if (isCompleted) "Đồng bộ hoàn tất!" else "Đang đồng bộ...",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isCompleted) Color(0xFF4CAF50) else MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = branchName,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Progress bar
            LinearProgressIndicator(
                progress = { syncProgress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = if (isCompleted) Color(0xFF4CAF50) else MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "${(syncProgress * 100).toInt()}%",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                modifier = Modifier.align(Alignment.End)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Sync items
            syncItems.forEach { item ->
                SyncItemRowCompact(item = item)
                Spacer(modifier = Modifier.height(8.dp))
            }

            if (isCompleted) {
                Spacer(modifier = Modifier.height(8.dp))
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
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF4CAF50),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Tổng cộng ${syncItems.sumOf { it.count }} mục đã tải về",
                            fontSize = 13.sp,
                            color = Color(0xFF2E7D32)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SyncItemRowCompact(item: BranchSyncItem) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = when (item.status) {
                    BranchSyncStatus.COMPLETED -> Color(0xFFE8F5E9)
                    BranchSyncStatus.SYNCING -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                    else -> Color.Transparent
                },
                shape = RoundedCornerShape(8.dp)
            )
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(
                    when (item.status) {
                        BranchSyncStatus.COMPLETED -> Color(0xFF4CAF50)
                        BranchSyncStatus.SYNCING -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = item.icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = if (item.status == BranchSyncStatus.PENDING)
                    MaterialTheme.colorScheme.onSurfaceVariant
                else
                    Color.White
            )
        }

        Spacer(modifier = Modifier.width(10.dp))

        Text(
            text = item.name,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.onSurface
        )

        when (item.status) {
            BranchSyncStatus.COMPLETED -> {
                Text(
                    text = "${item.count}",
                    fontSize = 12.sp,
                    color = Color(0xFF4CAF50),
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.width(6.dp))
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = Color(0xFF4CAF50)
                )
            }
            BranchSyncStatus.SYNCING -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            else -> {
                Icon(
                    imageVector = Icons.Default.Schedule,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                )
            }
        }
    }
}

@Composable
private fun ShiftExistsDialog(
    branchName: String,
    onContinue: () -> Unit,
    onCloseShift: () -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .width(360.dp)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Icon
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFFFF3E0)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = Color(0xFFFF9800)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = "Ca làm việc đang mở",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Chi nhánh \"$branchName\" đang có ca làm việc. Bạn muốn tiếp tục ca hiện tại hay đóng ca?",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Close shift button
                    OutlinedButton(
                        onClick = onCloseShift,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color(0xFFE91E63)
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Đóng ca",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    // Continue button
                    Button(
                        onClick = onContinue,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50)
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Tiếp tục",
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
private fun BrandSelectionCard(
    brand: MockBrand,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                Color.White
            else
                Color.White.copy(alpha = 0.15f)
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 8.dp else 0.dp
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        if (isSelected)
                            MaterialTheme.colorScheme.primary
                        else
                            Color.White.copy(alpha = 0.2f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Storefront,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = Color.White
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = brand.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSelected)
                        MaterialTheme.colorScheme.primary
                    else
                        Color.White
                )
                Text(
                    text = "${brand.branches.size} chi nhánh",
                    fontSize = 12.sp,
                    color = if (isSelected)
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    else
                        Color.White.copy(alpha = 0.7f)
                )
            }

            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

@Composable
private fun BranchSelectionCard(
    branch: MockBranch,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .then(
                if (isSelected)
                    Modifier.border(2.dp, Color(0xFF4CAF50), RoundedCornerShape(16.dp))
                else
                    Modifier
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                Color(0xFFE8F5E9)
            else
                MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 4.dp else 1.dp
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        if (isSelected)
                            Color(0xFF4CAF50)
                        else
                            MaterialTheme.colorScheme.surface
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Store,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = if (isSelected)
                        Color.White
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = branch.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSelected)
                        Color(0xFF2E7D32)
                    else
                        MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = branch.address,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }

            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF4CAF50),
                    modifier = Modifier.size(24.dp)
                )
            } else {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
