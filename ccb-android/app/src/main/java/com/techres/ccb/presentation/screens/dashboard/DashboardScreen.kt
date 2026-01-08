package com.techres.ccb.presentation.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.domain.model.FoodAppOrder
import com.techres.ccb.domain.model.FoodOrderStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel(),
    onNavigateToSale: () -> Unit,
    onNavigateToFoodOrders: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToShift: () -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            // Compact Header
            Surface(
                color = Color(0xFF1976D2),
                shadowElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            uiState.branchName,
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "${uiState.staffName} • ${formatCurrency(uiState.todayRevenue)}",
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 12.sp
                        )
                    }
                    Row {
                        IconButton(onClick = { viewModel.refresh() }, modifier = Modifier.size(40.dp)) {
                            Icon(Icons.Default.Refresh, null, tint = Color.White)
                        }
                        IconButton(onClick = onNavigateToSettings, modifier = Modifier.size(40.dp)) {
                            Icon(Icons.Default.Settings, null, tint = Color.White)
                        }
                        IconButton(onClick = onLogout, modifier = Modifier.size(40.dp)) {
                            Icon(Icons.Default.Logout, null, tint = Color.White)
                        }
                    }
                }
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToSale,
                containerColor = Color(0xFF4CAF50),
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Tạo đơn mới")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF5F5F5))
        ) {
            // Compact Quick Actions + Stats
            QuickStatsBar(
                totalActive = uiState.totalActiveOrders,
                draftCount = uiState.draftPosCount,
                confirmedCount = uiState.confirmedPosCount,
                newFoodCount = uiState.newFoodOrderCount,
                onNavigateToSale = onNavigateToSale,
                onNavigateToFoodOrders = onNavigateToFoodOrders,
                onNavigateToShift = onNavigateToShift
            )

            // Tab Selection + Grid Column Selector
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Tabs
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.White,
                    contentColor = Color(0xFF1976D2),
                    modifier = Modifier.weight(1f)
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Storefront, null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Quầy", fontSize = 12.sp)
                                if (uiState.posOrders.isNotEmpty()) {
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Badge(containerColor = Color(0xFF2196F3)) {
                                        Text("${uiState.posOrders.size}", fontSize = 10.sp)
                                    }
                                }
                            }
                        }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.DeliveryDining, null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("App", fontSize = 12.sp)
                                if (uiState.foodAppOrders.isNotEmpty()) {
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Badge(
                                        containerColor = if (uiState.newFoodOrderCount > 0)
                                            Color(0xFFE91E63) else Color(0xFFFF5722)
                                    ) {
                                        Text("${uiState.foodAppOrders.size}", fontSize = 10.sp)
                                    }
                                }
                            }
                        }
                    )
                }

                // Grid Column Selector
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.GridView,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = Color.Gray
                    )
                    listOf(4, 6, 8).forEach { cols ->
                        FilterChip(
                            selected = uiState.gridColumns == cols,
                            onClick = { viewModel.setGridColumns(cols) },
                            label = { Text("$cols", fontSize = 11.sp) },
                            modifier = Modifier.height(28.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFF1976D2),
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }
            }

            // Orders Grid
            when (selectedTab) {
                0 -> {
                    if (uiState.posOrders.isEmpty()) {
                        EmptyState(
                            icon = Icons.Default.Storefront,
                            message = "Chưa có đơn tại quầy",
                            subMessage = "Nhấn + để tạo đơn mới"
                        )
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(uiState.gridColumns),
                            contentPadding = PaddingValues(8.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(uiState.posOrders, key = { it.id }) { order ->
                                PosOrderCompactItem(
                                    order = order,
                                    onConfirm = { viewModel.confirmPosOrder(order.id) },
                                    onComplete = { viewModel.completePosOrder(order.id) }
                                )
                            }
                            // Bottom spacing for FAB
                            item(span = { GridItemSpan(uiState.gridColumns) }) {
                                Spacer(modifier = Modifier.height(80.dp))
                            }
                        }
                    }
                }
                1 -> {
                    if (uiState.foodAppOrders.isEmpty()) {
                        EmptyState(
                            icon = Icons.Default.DeliveryDining,
                            message = "Chưa có đơn từ app",
                            subMessage = "Đơn mới sẽ hiển thị ở đây"
                        )
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(uiState.gridColumns),
                            contentPadding = PaddingValues(8.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(uiState.foodAppOrders, key = { it.id }) { order ->
                                FoodOrderCompactItem(
                                    order = order,
                                    onAccept = { viewModel.acceptFoodOrder(order.id) },
                                    onStartPreparing = { viewModel.startPreparingFoodOrder(order.id) },
                                    onMarkReady = { viewModel.markFoodOrderReady(order.id) },
                                    onComplete = { viewModel.completeFoodOrder(order.id) }
                                )
                            }
                            // Bottom spacing for FAB
                            item(span = { GridItemSpan(uiState.gridColumns) }) {
                                Spacer(modifier = Modifier.height(80.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun QuickStatsBar(
    totalActive: Int,
    draftCount: Int,
    confirmedCount: Int,
    newFoodCount: Int,
    onNavigateToSale: () -> Unit,
    onNavigateToFoodOrders: () -> Unit,
    onNavigateToShift: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Bán hàng
            QuickStatItem(
                icon = Icons.Default.PointOfSale,
                label = "Bán hàng",
                color = Color(0xFF4CAF50),
                onClick = onNavigateToSale
            )

            VerticalDivider(modifier = Modifier.height(40.dp))

            // Đơn App
            QuickStatItem(
                icon = Icons.Default.DeliveryDining,
                label = "Đơn App",
                color = Color(0xFFFF5722),
                badge = if (newFoodCount > 0) newFoodCount else null,
                onClick = onNavigateToFoodOrders
            )

            VerticalDivider(modifier = Modifier.height(40.dp))

            // Ca làm
            QuickStatItem(
                icon = Icons.Default.Schedule,
                label = "Ca làm",
                color = Color(0xFF9C27B0),
                onClick = onNavigateToShift
            )

            VerticalDivider(modifier = Modifier.height(40.dp))

            // Tổng đơn
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    totalActive.toString(),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1976D2)
                )
                Text("Đang xử lý", fontSize = 10.sp, color = Color.Gray)
            }
        }
    }
}

@Composable
fun QuickStatItem(
    icon: ImageVector,
    label: String,
    color: Color,
    badge: Int? = null,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box {
            Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
            if (badge != null) {
                Badge(
                    containerColor = Color(0xFFE91E63),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 6.dp, y = (-4).dp)
                ) {
                    Text(badge.toString(), fontSize = 9.sp)
                }
            }
        }
        Text(label, fontSize = 10.sp, color = Color.Gray)
    }
}

@Composable
fun EmptyState(icon: ImageVector, message: String, subMessage: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, modifier = Modifier.size(64.dp), tint = Color.LightGray)
            Spacer(modifier = Modifier.height(16.dp))
            Text(message, fontSize = 16.sp, color = Color.Gray)
            Text(subMessage, fontSize = 14.sp, color = Color.LightGray)
        }
    }
}

// Compact POS Order Item cho Grid
@Composable
fun PosOrderCompactItem(
    order: PosOrder,
    onConfirm: () -> Unit,
    onComplete: () -> Unit
) {
    val statusColor = Color(order.status.color)
    val isDraft = order.status == PosOrderStatus.DRAFT

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.85f)
            .clickable { if (isDraft) onConfirm() else onComplete() },
        colors = CardDefaults.cardColors(
            containerColor = statusColor.copy(alpha = 0.12f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Order number badge
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(statusColor, RoundedCornerShape(4.dp))
                    .padding(vertical = 2.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "#${order.orderNumber}",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            // Icon + Table
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    if (order.tableName != null) Icons.Default.TableBar else Icons.Default.TakeoutDining,
                    null,
                    tint = statusColor,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    order.tableName ?: "Mang đi",
                    fontWeight = FontWeight.Bold,
                    fontSize = 9.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
            }

            // Amount
            Text(
                formatCompactCurrency(order.totalAmount),
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1976D2),
                maxLines = 1
            )

            // Status text
            Text(
                if (isDraft) "Xác nhận" else "Hoàn tất",
                fontSize = 8.sp,
                fontWeight = FontWeight.Medium,
                color = statusColor
            )
        }
    }
}

// Compact Food Order Item cho Grid 8 cột
@Composable
fun FoodOrderCompactItem(
    order: FoodAppOrder,
    onAccept: () -> Unit,
    onStartPreparing: () -> Unit,
    onMarkReady: () -> Unit,
    onComplete: () -> Unit
) {
    val platformColor = Color(order.platform.color)
    val statusColor = Color(order.status.color)
    val isNew = order.status == FoodOrderStatus.NEW

    val onClickAction = when (order.status) {
        FoodOrderStatus.NEW -> onAccept
        FoodOrderStatus.ACCEPTED -> onStartPreparing
        FoodOrderStatus.PREPARING -> onMarkReady
        FoodOrderStatus.READY, FoodOrderStatus.DELIVERING -> onComplete
        else -> { {} }
    }

    val actionText = when (order.status) {
        FoodOrderStatus.NEW -> "Nhận đơn"
        FoodOrderStatus.ACCEPTED -> "Bắt đầu"
        FoodOrderStatus.PREPARING -> "Sẵn sàng"
        FoodOrderStatus.READY, FoodOrderStatus.DELIVERING -> "Xong"
        else -> ""
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.85f)
            .clickable(onClick = onClickAction)
            .then(
                if (isNew) Modifier.border(2.dp, platformColor, RoundedCornerShape(8.dp))
                else Modifier
            ),
        colors = CardDefaults.cardColors(
            containerColor = platformColor.copy(alpha = 0.12f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isNew) 4.dp else 2.dp),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Platform badge header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(platformColor, RoundedCornerShape(4.dp))
                    .padding(vertical = 2.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "${order.platform.icon} ${order.platform.shortName}",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            // Order code
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    order.orderCode,
                    fontWeight = FontWeight.Bold,
                    fontSize = 9.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
                Text(
                    "${order.items.size} món",
                    fontSize = 8.sp,
                    color = Color.Gray
                )
            }

            // Amount
            Text(
                formatCompactCurrency(order.totalAmount),
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = platformColor,
                maxLines = 1
            )

            // Action text
            if (actionText.isNotEmpty()) {
                Text(
                    actionText,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Medium,
                    color = statusColor
                )
            }
        }
    }
}

// Helper
private fun formatCurrency(amount: Long): String {
    return String.format("%,d đ", amount).replace(",", ".")
}

// Compact currency format (e.g., 150K, 1.2M)
private fun formatCompactCurrency(amount: Long): String {
    return when {
        amount >= 1_000_000 -> String.format("%.1fM", amount / 1_000_000.0)
        amount >= 1_000 -> "${amount / 1_000}K"
        else -> "${amount}đ"
    }
}
