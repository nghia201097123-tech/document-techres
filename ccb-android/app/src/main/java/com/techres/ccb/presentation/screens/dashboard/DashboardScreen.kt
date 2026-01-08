package com.techres.ccb.presentation.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF5F5F5))
        ) {
            // Header Section
            item {
                HeaderSection(
                    branchName = uiState.branchName,
                    staffName = uiState.staffName,
                    onRefresh = { viewModel.refresh() },
                    onSettings = onNavigateToSettings,
                    onLogout = onLogout
                )
            }

            // Stats Section
            item {
                StatsSection(
                    todayRevenue = uiState.todayRevenue,
                    totalActiveOrders = uiState.totalActiveOrders,
                    completedOrders = uiState.todayOrderCount,
                    newFoodOrders = uiState.newFoodOrderCount
                )
            }

            // Quick Actions
            item {
                QuickActionsSection(
                    onNavigateToSale = onNavigateToSale,
                    onNavigateToFoodOrders = onNavigateToFoodOrders,
                    onNavigateToShift = onNavigateToShift,
                    newFoodOrderCount = uiState.newFoodOrderCount
                )
            }

            // Tab Selection
            item {
                OrderTabsSection(
                    selectedTab = selectedTab,
                    posOrdersCount = uiState.posOrders.size,
                    foodOrdersCount = uiState.foodAppOrders.size,
                    onTabSelected = { selectedTab = it }
                )
            }

            // Orders Content based on selected tab
            when (selectedTab) {
                0 -> {
                    // POS Orders
                    if (uiState.posOrders.isEmpty()) {
                        item {
                            EmptyState(
                                icon = Icons.Default.Storefront,
                                message = "Chưa có đơn tại quầy",
                                subMessage = "Nhấn + để tạo đơn mới"
                            )
                        }
                    } else {
                        items(uiState.posOrders, key = { it.id }) { order ->
                            PosOrderItem(
                                order = order,
                                onStatusChange = { newStatus ->
                                    viewModel.updatePosOrderStatus(order.id, newStatus)
                                }
                            )
                        }
                    }
                }
                1 -> {
                    // Food App Orders
                    if (uiState.foodAppOrders.isEmpty()) {
                        item {
                            EmptyState(
                                icon = Icons.Default.DeliveryDining,
                                message = "Chưa có đơn từ app",
                                subMessage = "Đơn mới sẽ hiển thị ở đây"
                            )
                        }
                    } else {
                        items(uiState.foodAppOrders, key = { it.id }) { order ->
                            FoodOrderItem(
                                order = order,
                                onAccept = { viewModel.acceptFoodOrder(order.id) },
                                onStartPreparing = { viewModel.startPreparingFoodOrder(order.id) },
                                onMarkReady = { viewModel.markFoodOrderReady(order.id) },
                                onComplete = { viewModel.completeFoodOrder(order.id) }
                            )
                        }
                    }
                }
            }

            // Bottom spacing
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
fun HeaderSection(
    branchName: String,
    staffName: String,
    onRefresh: () -> Unit,
    onSettings: () -> Unit,
    onLogout: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(Color(0xFF1976D2), Color(0xFF42A5F5))
                )
            )
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    branchName,
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "Xin chào, $staffName",
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 14.sp
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(onClick = onRefresh) {
                    Icon(Icons.Default.Refresh, "Làm mới", tint = Color.White)
                }
                IconButton(onClick = onSettings) {
                    Icon(Icons.Default.Settings, "Cài đặt", tint = Color.White)
                }
                IconButton(onClick = onLogout) {
                    Icon(Icons.Default.Logout, "Đăng xuất", tint = Color.White)
                }
            }
        }
    }
}

@Composable
fun StatsSection(
    todayRevenue: Long,
    totalActiveOrders: Int,
    completedOrders: Int,
    newFoodOrders: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(
            title = "Doanh thu hôm nay",
            value = formatCurrency(todayRevenue),
            icon = Icons.Default.AttachMoney,
            color = Color(0xFF4CAF50),
            modifier = Modifier.width(160.dp)
        )
        StatCard(
            title = "Đơn đang xử lý",
            value = totalActiveOrders.toString(),
            icon = Icons.Default.Pending,
            color = Color(0xFFFF9800),
            modifier = Modifier.width(140.dp)
        )
        StatCard(
            title = "Hoàn thành",
            value = completedOrders.toString(),
            icon = Icons.Default.CheckCircle,
            color = Color(0xFF2196F3),
            modifier = Modifier.width(140.dp)
        )
        if (newFoodOrders > 0) {
            StatCard(
                title = "Đơn app mới",
                value = newFoodOrders.toString(),
                icon = Icons.Default.NotificationsActive,
                color = Color(0xFFE91E63),
                modifier = Modifier.width(140.dp)
            )
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(color.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    title,
                    fontSize = 12.sp,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                value,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
fun QuickActionsSection(
    onNavigateToSale: () -> Unit,
    onNavigateToFoodOrders: () -> Unit,
    onNavigateToShift: () -> Unit,
    newFoodOrderCount: Int
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            QuickActionButton(
                icon = Icons.Default.PointOfSale,
                label = "Bán hàng",
                color = Color(0xFF4CAF50),
                onClick = onNavigateToSale
            )
            QuickActionButton(
                icon = Icons.Default.DeliveryDining,
                label = "Đơn App",
                color = Color(0xFFFF5722),
                badge = if (newFoodOrderCount > 0) newFoodOrderCount else null,
                onClick = onNavigateToFoodOrders
            )
            QuickActionButton(
                icon = Icons.Default.Schedule,
                label = "Ca làm",
                color = Color(0xFF9C27B0),
                onClick = onNavigateToShift
            )
        }
    }
}

@Composable
fun QuickActionButton(
    icon: ImageVector,
    label: String,
    color: Color,
    badge: Int? = null,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(color.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
            }
            if (badge != null) {
                Badge(
                    containerColor = Color(0xFFE91E63),
                    modifier = Modifier.align(Alignment.TopEnd)
                ) {
                    Text(badge.toString())
                }
            }
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun OrderTabsSection(
    selectedTab: Int,
    posOrdersCount: Int,
    foodOrdersCount: Int,
    onTabSelected: (Int) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(4.dp)
        ) {
            OrderTab(
                title = "Tại quầy",
                count = posOrdersCount,
                icon = Icons.Default.Storefront,
                isSelected = selectedTab == 0,
                color = Color(0xFF2196F3),
                onClick = { onTabSelected(0) },
                modifier = Modifier.weight(1f)
            )
            OrderTab(
                title = "App Food",
                count = foodOrdersCount,
                icon = Icons.Default.DeliveryDining,
                isSelected = selectedTab == 1,
                color = Color(0xFFFF5722),
                onClick = { onTabSelected(1) },
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
fun OrderTab(
    title: String,
    count: Int,
    icon: ImageVector,
    isSelected: Boolean,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val bgColor = if (isSelected) color.copy(alpha = 0.1f) else Color.Transparent
    val contentColor = if (isSelected) color else Color.Gray

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = contentColor, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            title,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            color = contentColor
        )
        Spacer(modifier = Modifier.width(6.dp))
        Badge(containerColor = contentColor) {
            Text(count.toString())
        }
    }
}

@Composable
fun EmptyState(
    icon: ImageVector,
    message: String,
    subMessage: String
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                null,
                modifier = Modifier.size(64.dp),
                tint = Color.LightGray
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(message, fontSize = 16.sp, color = Color.Gray)
            Text(subMessage, fontSize = 14.sp, color = Color.LightGray)
        }
    }
}

@Composable
fun PosOrderItem(
    order: PosOrder,
    onStatusChange: (PosOrderStatus) -> Unit
) {
    val statusColor = Color(order.status.color)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Order Icon
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(statusColor.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        if (order.tableName != null) Icons.Default.TableBar else Icons.Default.TakeoutDining,
                        null,
                        tint = statusColor,
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        "#${order.orderNumber}",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Order Info
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        order.tableName ?: "Mang đi",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    StatusChip(status = order.status.displayName, color = statusColor)
                }
                Spacer(modifier = Modifier.height(4.dp))
                order.customerName?.let {
                    Text(it, fontSize = 13.sp, color = Color.Gray)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${order.itemCount} món", fontSize = 13.sp, color = Color.Gray)
                    Text(" • ", color = Color.LightGray)
                    Text(
                        formatCurrency(order.totalAmount),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF1976D2)
                    )
                }
            }

            // Action Button
            ActionButton(
                status = order.status,
                onAction = {
                    when (order.status) {
                        PosOrderStatus.PENDING -> onStatusChange(PosOrderStatus.PREPARING)
                        PosOrderStatus.PREPARING -> onStatusChange(PosOrderStatus.READY)
                        PosOrderStatus.READY -> onStatusChange(PosOrderStatus.SERVED)
                        else -> {}
                    }
                }
            )
        }
    }
}

@Composable
fun ActionButton(status: PosOrderStatus, onAction: () -> Unit) {
    val (text, color) = when (status) {
        PosOrderStatus.PENDING -> "Làm" to Color(0xFF2196F3)
        PosOrderStatus.PREPARING -> "Xong" to Color(0xFF4CAF50)
        PosOrderStatus.READY -> "Giao" to Color(0xFF9C27B0)
        else -> return
    }

    Button(
        onClick = onAction,
        colors = ButtonDefaults.buttonColors(containerColor = color),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(text, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun FoodOrderItem(
    order: FoodAppOrder,
    onAccept: () -> Unit,
    onStartPreparing: () -> Unit,
    onMarkReady: () -> Unit,
    onComplete: () -> Unit
) {
    val platformColor = Color(order.platform.color)
    val statusColor = Color(order.status.color)
    val isNew = order.status == FoodOrderStatus.NEW

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .then(
                if (isNew) Modifier.border(2.dp, platformColor, RoundedCornerShape(12.dp))
                else Modifier
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (isNew) platformColor.copy(alpha = 0.05f) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isNew) 4.dp else 1.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Platform Icon
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(platformColor.copy(alpha = 0.15f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(order.platform.icon, fontSize = 22.sp)
                    Text(
                        order.platform.shortName,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = platformColor
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Order Info
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        order.orderCode,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    StatusChip(status = order.status.displayName, color = statusColor)
                    if (!order.isPaid) {
                        Spacer(modifier = Modifier.width(4.dp))
                        CodBadge()
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(order.customerName, fontSize = 13.sp, color = Color.Gray)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${order.items.size} món", fontSize = 13.sp, color = Color.Gray)
                    Text(" • ", color = Color.LightGray)
                    Text(
                        formatCurrency(order.totalAmount),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = platformColor
                    )
                }
            }

            // Action Button
            FoodActionButton(
                status = order.status,
                color = statusColor,
                onAccept = onAccept,
                onStartPreparing = onStartPreparing,
                onMarkReady = onMarkReady,
                onComplete = onComplete
            )
        }
    }
}

@Composable
fun FoodActionButton(
    status: FoodOrderStatus,
    color: Color,
    onAccept: () -> Unit,
    onStartPreparing: () -> Unit,
    onMarkReady: () -> Unit,
    onComplete: () -> Unit
) {
    val (text, action) = when (status) {
        FoodOrderStatus.NEW -> "Nhận" to onAccept
        FoodOrderStatus.ACCEPTED -> "Làm" to onStartPreparing
        FoodOrderStatus.PREPARING -> "Xong" to onMarkReady
        FoodOrderStatus.READY, FoodOrderStatus.DELIVERING -> "Giao" to onComplete
        else -> return
    }

    Button(
        onClick = action,
        colors = ButtonDefaults.buttonColors(containerColor = color),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(text, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun StatusChip(status: String, color: Color) {
    Box(
        modifier = Modifier
            .background(color.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            status,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = color
        )
    }
}

@Composable
fun CodBadge() {
    Box(
        modifier = Modifier
            .background(Color(0xFFFFF3E0), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            "COD",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFE65100)
        )
    }
}

// Helper
private fun formatCurrency(amount: Long): String {
    return String.format("%,d đ", amount).replace(",", ".")
}
