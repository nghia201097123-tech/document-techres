package com.techres.ccb.presentation.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            uiState.branchName,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            "Xin chào, ${uiState.staffName}",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                        )
                    }
                },
                actions = {
                    // Notification badge for new orders
                    if (uiState.newFoodOrderCount > 0) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = Color(0xFFFF5722)) {
                                    Text("${uiState.newFoodOrderCount}")
                                }
                            }
                        ) {
                            IconButton(onClick = onNavigateToFoodOrders) {
                                Icon(
                                    Icons.Default.Notifications,
                                    contentDescription = "Đơn mới",
                                    tint = MaterialTheme.colorScheme.onPrimary
                                )
                            }
                        }
                    }
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Làm mới",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(
                            Icons.Default.Settings,
                            contentDescription = "Cài đặt",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                    IconButton(onClick = onLogout) {
                        Icon(
                            Icons.Default.Logout,
                            contentDescription = "Đăng xuất",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateToSale,
                icon = { Icon(Icons.Default.PointOfSale, contentDescription = null) },
                text = { Text("Bán hàng", fontWeight = FontWeight.Bold) },
                containerColor = Color(0xFF4CAF50),
                contentColor = Color.White
            )
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Stats Cards Row
                item {
                    StatsRow(
                        totalOrders = uiState.totalActiveOrders,
                        todayRevenue = uiState.todayRevenue,
                        todayOrderCount = uiState.todayOrderCount
                    )
                }

                // Quick Actions
                item {
                    QuickActionsRow(
                        onNavigateToSale = onNavigateToSale,
                        onNavigateToFoodOrders = onNavigateToFoodOrders,
                        onNavigateToShift = onNavigateToShift,
                        newFoodOrderCount = uiState.newFoodOrderCount
                    )
                }

                // POS Orders Section
                item {
                    SectionHeader(
                        title = "Đơn tại quầy",
                        count = uiState.posOrders.size,
                        icon = Icons.Default.Storefront,
                        color = Color(0xFF2196F3),
                        badges = listOf(
                            BadgeInfo("Chờ", uiState.pendingPosCount, Color(0xFFFF9800)),
                            BadgeInfo("Đang làm", uiState.preparingPosCount, Color(0xFF2196F3))
                        )
                    )
                }

                if (uiState.posOrders.isEmpty()) {
                    item {
                        EmptySection(
                            message = "Chưa có đơn tại quầy",
                            icon = Icons.Default.Storefront
                        )
                    }
                } else {
                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(uiState.posOrders, key = { it.id }) { order ->
                                PosOrderCard(
                                    order = order,
                                    onUpdateStatus = { newStatus ->
                                        viewModel.updatePosOrderStatus(order.id, newStatus)
                                    }
                                )
                            }
                        }
                    }
                }

                // Food App Orders Section
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    SectionHeader(
                        title = "Đơn từ App Food",
                        count = uiState.foodAppOrders.size,
                        icon = Icons.Default.DeliveryDining,
                        color = Color(0xFFFF5722),
                        badges = listOf(
                            BadgeInfo("Mới", uiState.newFoodOrderCount, Color(0xFFFF5722)),
                            BadgeInfo("Đang xử lý", uiState.processingFoodOrderCount, Color(0xFF9C27B0))
                        ),
                        onViewAll = onNavigateToFoodOrders
                    )
                }

                if (uiState.foodAppOrders.isEmpty()) {
                    item {
                        EmptySection(
                            message = "Chưa có đơn từ app food",
                            icon = Icons.Default.DeliveryDining
                        )
                    }
                } else {
                    items(uiState.foodAppOrders.take(5), key = { it.id }) { order ->
                        FoodOrderCompactCard(
                            order = order,
                            onAccept = { viewModel.acceptFoodOrder(order.id) },
                            onStartPreparing = { viewModel.startPreparingFoodOrder(order.id) },
                            onMarkReady = { viewModel.markFoodOrderReady(order.id) },
                            onComplete = { viewModel.completeFoodOrder(order.id) }
                        )
                    }

                    // View all button if more than 5 orders
                    if (uiState.foodAppOrders.size > 5) {
                        item {
                            OutlinedButton(
                                onClick = onNavigateToFoodOrders,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Xem tất cả ${uiState.foodAppOrders.size} đơn")
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(Icons.Default.ArrowForward, contentDescription = null)
                            }
                        }
                    }
                }

                // Bottom spacing for FAB
                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }
}

@Composable
fun StatsRow(
    totalOrders: Int,
    todayRevenue: Long,
    todayOrderCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(
            title = "Đơn đang xử lý",
            value = totalOrders.toString(),
            icon = Icons.Default.Receipt,
            color = Color(0xFF2196F3),
            modifier = Modifier.weight(1f)
        )
        StatCard(
            title = "Doanh thu hôm nay",
            value = formatCurrency(todayRevenue),
            icon = Icons.Default.AttachMoney,
            color = Color(0xFF4CAF50),
            modifier = Modifier.weight(1f)
        )
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
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(color.copy(alpha = 0.2f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    title,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    value,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
            }
        }
    }
}

@Composable
fun QuickActionsRow(
    onNavigateToSale: () -> Unit,
    onNavigateToFoodOrders: () -> Unit,
    onNavigateToShift: () -> Unit,
    newFoodOrderCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        QuickActionChip(
            icon = Icons.Default.PointOfSale,
            label = "Bán hàng",
            color = Color(0xFF4CAF50),
            onClick = onNavigateToSale,
            modifier = Modifier.weight(1f)
        )
        QuickActionChip(
            icon = Icons.Default.DeliveryDining,
            label = "Đơn App",
            color = Color(0xFFFF5722),
            badge = if (newFoodOrderCount > 0) newFoodOrderCount else null,
            onClick = onNavigateToFoodOrders,
            modifier = Modifier.weight(1f)
        )
        QuickActionChip(
            icon = Icons.Default.AccessTime,
            label = "Ca làm",
            color = Color(0xFF9C27B0),
            onClick = onNavigateToShift,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun QuickActionChip(
    icon: ImageVector,
    label: String,
    color: Color,
    badge: Int? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(label, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            if (badge != null) {
                Spacer(modifier = Modifier.width(4.dp))
                Badge(containerColor = color) {
                    Text(badge.toString(), fontSize = 10.sp)
                }
            }
        }
    }
}

data class BadgeInfo(val label: String, val count: Int, val color: Color)

@Composable
fun SectionHeader(
    title: String,
    count: Int,
    icon: ImageVector,
    color: Color,
    badges: List<BadgeInfo> = emptyList(),
    onViewAll: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.width(8.dp))
            Badge(containerColor = color.copy(alpha = 0.2f)) {
                Text(count.toString(), color = color, fontWeight = FontWeight.Bold)
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            badges.filter { it.count > 0 }.forEach { badge ->
                Badge(containerColor = badge.color.copy(alpha = 0.15f)) {
                    Text(
                        "${badge.label}: ${badge.count}",
                        color = badge.color,
                        fontSize = 10.sp
                    )
                }
            }
            if (onViewAll != null) {
                TextButton(onClick = onViewAll, contentPadding = PaddingValues(horizontal = 8.dp)) {
                    Text("Xem tất cả", fontSize = 12.sp)
                    Icon(Icons.Default.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
fun EmptySection(message: String, icon: ImageVector) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.outline
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.outline
            )
        }
    }
}

@Composable
fun PosOrderCard(
    order: PosOrder,
    onUpdateStatus: (PosOrderStatus) -> Unit
) {
    Card(
        modifier = Modifier
            .width(200.dp)
            .border(
                width = 2.dp,
                color = Color(order.status.color).copy(alpha = 0.3f),
                shape = RoundedCornerShape(12.dp)
            ),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header: Table/Takeaway + Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (order.tableName != null) Icons.Default.TableBar else Icons.Default.TakeoutDining,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        order.tableName ?: "Mang đi",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
                Box(
                    modifier = Modifier
                        .background(
                            Color(order.status.color).copy(alpha = 0.15f),
                            RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        order.status.displayName,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(order.status.color)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Order info
            order.customerName?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "${order.itemCount} món",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
                Text(
                    "#${order.orderNumber}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                formatCurrency(order.totalAmount),
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Action button based on status
            when (order.status) {
                PosOrderStatus.PENDING -> {
                    Button(
                        onClick = { onUpdateStatus(PosOrderStatus.PREPARING) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2196F3)),
                        contentPadding = PaddingValues(vertical = 4.dp)
                    ) {
                        Text("Bắt đầu làm", fontSize = 12.sp)
                    }
                }
                PosOrderStatus.PREPARING -> {
                    Button(
                        onClick = { onUpdateStatus(PosOrderStatus.READY) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                        contentPadding = PaddingValues(vertical = 4.dp)
                    ) {
                        Text("Sẵn sàng", fontSize = 12.sp)
                    }
                }
                PosOrderStatus.READY -> {
                    Button(
                        onClick = { onUpdateStatus(PosOrderStatus.SERVED) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF9C27B0)),
                        contentPadding = PaddingValues(vertical = 4.dp)
                    ) {
                        Text("Đã phục vụ", fontSize = 12.sp)
                    }
                }
                else -> {}
            }
        }
    }
}

@Composable
fun FoodOrderCompactCard(
    order: FoodAppOrder,
    onAccept: () -> Unit,
    onStartPreparing: () -> Unit,
    onMarkReady: () -> Unit,
    onComplete: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = if (order.status == FoodOrderStatus.NEW) 2.dp else 1.dp,
                color = Color(order.platform.color).copy(
                    alpha = if (order.status == FoodOrderStatus.NEW) 0.5f else 0.2f
                ),
                shape = RoundedCornerShape(12.dp)
            ),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (order.status == FoodOrderStatus.NEW) 4.dp else 1.dp
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Platform badge
                    Box(
                        modifier = Modifier
                            .background(
                                Color(order.platform.color).copy(alpha = 0.15f),
                                RoundedCornerShape(4.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(order.platform.icon, fontSize = 12.sp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                order.platform.shortName,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(order.platform.color)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        order.orderCode,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }

                // Status badge
                Box(
                    modifier = Modifier
                        .background(
                            Color(order.status.color).copy(alpha = 0.15f),
                            RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        order.status.displayName,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(order.status.color)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Customer info and items
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        order.customerName,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        "${order.items.size} món: ${order.items.take(2).joinToString(", ") { it.productName }}${if (order.items.size > 2) "..." else ""}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        formatCurrency(order.totalAmount),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    if (!order.isPaid) {
                        Text(
                            "COD",
                            fontSize = 10.sp,
                            color = Color(0xFFE65100),
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    formatTimeAgo(order.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.weight(1f)
                )

                when (order.status) {
                    FoodOrderStatus.NEW -> {
                        Button(
                            onClick = onAccept,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                        ) {
                            Text("Nhận đơn", fontSize = 12.sp)
                        }
                    }
                    FoodOrderStatus.ACCEPTED -> {
                        Button(
                            onClick = onStartPreparing,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF9C27B0)),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                        ) {
                            Text("Bắt đầu làm", fontSize = 12.sp)
                        }
                    }
                    FoodOrderStatus.PREPARING -> {
                        Button(
                            onClick = onMarkReady,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2196F3)),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                        ) {
                            Text("Sẵn sàng", fontSize = 12.sp)
                        }
                    }
                    FoodOrderStatus.READY, FoodOrderStatus.DELIVERING -> {
                        Button(
                            onClick = onComplete,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                        ) {
                            Text("Hoàn thành", fontSize = 12.sp)
                        }
                    }
                    else -> {}
                }
            }
        }
    }
}

// Helper functions
private fun formatCurrency(amount: Long): String {
    return String.format("%,d đ", amount).replace(",", ".")
}

private fun formatTimeAgo(timestamp: Long): String {
    val diff = System.currentTimeMillis() - timestamp
    val minutes = diff / (1000 * 60)
    val hours = minutes / 60

    return when {
        minutes < 1 -> "Vừa xong"
        minutes < 60 -> "$minutes phút trước"
        hours < 24 -> "$hours giờ trước"
        else -> "${hours / 24} ngày trước"
    }
}
