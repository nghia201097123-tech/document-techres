package com.techres.ccb.presentation.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
                        Icon(Icons.Default.Refresh, contentDescription = "Làm mới", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Cài đặt", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, contentDescription = "Đăng xuất", tint = MaterialTheme.colorScheme.onPrimary)
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
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Quick Actions Row
                QuickActionsGrid(
                    onNavigateToSale = onNavigateToSale,
                    onNavigateToFoodOrders = onNavigateToFoodOrders,
                    onNavigateToShift = onNavigateToShift,
                    onNavigateToSettings = onNavigateToSettings,
                    newFoodOrderCount = uiState.newFoodOrderCount
                )

                // POS Orders Section
                OrdersSection(
                    title = "Đơn tại quầy",
                    icon = Icons.Default.Storefront,
                    color = Color(0xFF2196F3),
                    count = uiState.posOrders.size
                ) {
                    if (uiState.posOrders.isEmpty()) {
                        EmptyOrdersPlaceholder(
                            message = "Chưa có đơn tại quầy",
                            icon = Icons.Default.Storefront
                        )
                    } else {
                        PosOrdersIconGrid(
                            orders = uiState.posOrders,
                            onUpdateStatus = { orderId, status ->
                                viewModel.updatePosOrderStatus(orderId, status)
                            }
                        )
                    }
                }

                // Food App Orders Section
                OrdersSection(
                    title = "Đơn từ App Food",
                    icon = Icons.Default.DeliveryDining,
                    color = Color(0xFFFF5722),
                    count = uiState.foodAppOrders.size,
                    onViewAll = if (uiState.foodAppOrders.size > 6) onNavigateToFoodOrders else null
                ) {
                    if (uiState.foodAppOrders.isEmpty()) {
                        EmptyOrdersPlaceholder(
                            message = "Chưa có đơn từ app food",
                            icon = Icons.Default.DeliveryDining
                        )
                    } else {
                        FoodOrdersIconGrid(
                            orders = uiState.foodAppOrders.take(6),
                            onAccept = { viewModel.acceptFoodOrder(it) },
                            onStartPreparing = { viewModel.startPreparingFoodOrder(it) },
                            onMarkReady = { viewModel.markFoodOrderReady(it) },
                            onComplete = { viewModel.completeFoodOrder(it) }
                        )
                    }
                }

                // Bottom spacing for FAB
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

@Composable
fun QuickActionsGrid(
    onNavigateToSale: () -> Unit,
    onNavigateToFoodOrders: () -> Unit,
    onNavigateToShift: () -> Unit,
    onNavigateToSettings: () -> Unit,
    newFoodOrderCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        QuickActionIcon(
            icon = Icons.Default.PointOfSale,
            label = "Bán hàng",
            color = Color(0xFF4CAF50),
            onClick = onNavigateToSale,
            modifier = Modifier.weight(1f)
        )
        QuickActionIcon(
            icon = Icons.Default.DeliveryDining,
            label = "Đơn App",
            color = Color(0xFFFF5722),
            badge = if (newFoodOrderCount > 0) newFoodOrderCount else null,
            onClick = onNavigateToFoodOrders,
            modifier = Modifier.weight(1f)
        )
        QuickActionIcon(
            icon = Icons.Default.AccessTime,
            label = "Ca làm",
            color = Color(0xFF9C27B0),
            onClick = onNavigateToShift,
            modifier = Modifier.weight(1f)
        )
        QuickActionIcon(
            icon = Icons.Default.Settings,
            label = "Cài đặt",
            color = Color(0xFF607D8B),
            onClick = onNavigateToSettings,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun QuickActionIcon(
    icon: ImageVector,
    label: String,
    color: Color,
    badge: Int? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .aspectRatio(1f)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .background(color.copy(alpha = 0.2f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            icon,
                            contentDescription = null,
                            tint = color,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                    if (badge != null) {
                        Badge(
                            containerColor = Color(0xFFFF5722),
                            modifier = Modifier.align(Alignment.TopEnd)
                        ) {
                            Text(badge.toString(), fontSize = 10.sp)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    label,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = color
                )
            }
        }
    }
}

@Composable
fun OrdersSection(
    title: String,
    icon: ImageVector,
    color: Color,
    count: Int,
    onViewAll: (() -> Unit)? = null,
    content: @Composable () -> Unit
) {
    Column {
        // Section Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.width(8.dp))
                Badge(containerColor = color) {
                    Text(count.toString(), fontWeight = FontWeight.Bold)
                }
            }
            if (onViewAll != null) {
                TextButton(onClick = onViewAll) {
                    Text("Xem tất cả", fontSize = 12.sp)
                    Icon(Icons.Default.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp))
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        content()
    }
}

@Composable
fun EmptyOrdersPlaceholder(message: String, icon: ImageVector) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(120.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    icon,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    message,
                    color = MaterialTheme.colorScheme.outline,
                    fontSize = 14.sp
                )
            }
        }
    }
}

@Composable
fun PosOrdersIconGrid(
    orders: List<PosOrder>,
    onUpdateStatus: (String, PosOrderStatus) -> Unit
) {
    // Grid layout 3 columns
    val rows = orders.chunked(3)
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        rows.forEach { rowOrders ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                rowOrders.forEach { order ->
                    PosOrderIconCard(
                        order = order,
                        onUpdateStatus = { onUpdateStatus(order.id, it) },
                        modifier = Modifier.weight(1f)
                    )
                }
                // Fill empty space if row is not complete
                repeat(3 - rowOrders.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun PosOrderIconCard(
    order: PosOrder,
    onUpdateStatus: (PosOrderStatus) -> Unit,
    modifier: Modifier = Modifier
) {
    val statusColor = Color(order.status.color)
    val isTable = order.tableName != null

    Card(
        modifier = modifier
            .aspectRatio(0.85f)
            .clickable {
                // Cycle through status on click
                when (order.status) {
                    PosOrderStatus.PENDING -> onUpdateStatus(PosOrderStatus.PREPARING)
                    PosOrderStatus.PREPARING -> onUpdateStatus(PosOrderStatus.READY)
                    PosOrderStatus.READY -> onUpdateStatus(PosOrderStatus.SERVED)
                    else -> {}
                }
            },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = statusColor.copy(alpha = 0.08f)),
        border = androidx.compose.foundation.BorderStroke(2.dp, statusColor.copy(alpha = 0.3f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Status indicator dot
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(statusColor, CircleShape)
                    .align(Alignment.End)
            )

            // Icon
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .background(statusColor.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isTable) Icons.Default.TableBar else Icons.Default.TakeoutDining,
                    contentDescription = null,
                    tint = statusColor,
                    modifier = Modifier.size(28.dp)
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                // Table name or Takeaway
                Text(
                    order.tableName ?: "Mang đi",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                // Order number
                Text(
                    "#${order.orderNumber}",
                    fontSize = 11.sp,
                    color = statusColor,
                    fontWeight = FontWeight.Bold
                )

                // Amount
                Text(
                    formatCurrency(order.totalAmount),
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Status label
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                    .padding(vertical = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    order.status.displayName,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = statusColor
                )
            }
        }
    }
}

@Composable
fun FoodOrdersIconGrid(
    orders: List<FoodAppOrder>,
    onAccept: (String) -> Unit,
    onStartPreparing: (String) -> Unit,
    onMarkReady: (String) -> Unit,
    onComplete: (String) -> Unit
) {
    // Grid layout 3 columns
    val rows = orders.chunked(3)
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        rows.forEach { rowOrders ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                rowOrders.forEach { order ->
                    FoodOrderIconCard(
                        order = order,
                        onAction = {
                            when (order.status) {
                                FoodOrderStatus.NEW -> onAccept(order.id)
                                FoodOrderStatus.ACCEPTED -> onStartPreparing(order.id)
                                FoodOrderStatus.PREPARING -> onMarkReady(order.id)
                                FoodOrderStatus.READY, FoodOrderStatus.DELIVERING -> onComplete(order.id)
                                else -> {}
                            }
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                // Fill empty space if row is not complete
                repeat(3 - rowOrders.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun FoodOrderIconCard(
    order: FoodAppOrder,
    onAction: () -> Unit,
    modifier: Modifier = Modifier
) {
    val platformColor = Color(order.platform.color)
    val statusColor = Color(order.status.color)
    val isNew = order.status == FoodOrderStatus.NEW

    Card(
        modifier = modifier
            .aspectRatio(0.85f)
            .clickable(onClick = onAction),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = platformColor.copy(alpha = 0.08f)),
        border = androidx.compose.foundation.BorderStroke(
            width = if (isNew) 2.dp else 1.dp,
            color = platformColor.copy(alpha = if (isNew) 0.5f else 0.2f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isNew) 4.dp else 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Platform icon with status dot
            Box {
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .background(platformColor.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(order.platform.icon, fontSize = 24.sp)
                }
                // Status dot
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .background(statusColor, CircleShape)
                        .border(2.dp, Color.White, CircleShape)
                        .align(Alignment.BottomEnd)
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                // Order code
                Text(
                    order.orderCode,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                // Customer name
                Text(
                    order.customerName,
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                // Amount + COD badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        formatCurrency(order.totalAmount),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = platformColor
                    )
                    if (!order.isPaid) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFFFF3E0), RoundedCornerShape(2.dp))
                                .padding(horizontal = 3.dp)
                        ) {
                            Text("COD", fontSize = 8.sp, color = Color(0xFFE65100), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Status / Action button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                    .padding(vertical = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    when (order.status) {
                        FoodOrderStatus.NEW -> "Nhận đơn"
                        FoodOrderStatus.ACCEPTED -> "Bắt đầu"
                        FoodOrderStatus.PREPARING -> "Sẵn sàng"
                        FoodOrderStatus.READY, FoodOrderStatus.DELIVERING -> "Xong"
                        else -> order.status.displayName
                    },
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = statusColor
                )
            }
        }
    }
}

// Helper functions
private fun formatCurrency(amount: Long): String {
    return String.format("%,d đ", amount).replace(",", ".")
}
