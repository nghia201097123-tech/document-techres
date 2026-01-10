package com.techres.ccb.presentation.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel(),
    onNavigateToSale: () -> Unit = {},
    onNavigateToFoodOrders: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    onNavigateToShift: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()

    var selectedTab by remember { mutableIntStateOf(0) }
    var gridColumns by remember { mutableIntStateOf(4) }
    val currentTime = remember { SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()) }
    val currentDate = remember { SimpleDateFormat("EEEE, dd/MM", Locale("vi")).format(Date()) }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8F9FA))
    ) {
        // Left Sidebar
        DashboardSidebar(
            branchName = uiState.branchName,
            staffName = uiState.staffName,
            onNavigateToSale = onNavigateToSale,
            onNavigateToFoodOrders = onNavigateToFoodOrders,
            onNavigateToShift = onNavigateToShift,
            onNavigateToSettings = onNavigateToSettings,
            onLogout = onLogout
        )

        // Main Content
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
        ) {
            // Top Header
            DashboardHeader(
                currentTime = currentTime,
                currentDate = currentDate,
                todayRevenue = uiState.todayRevenue,
                totalOrders = uiState.todayOrderCount,
                pendingOrders = uiState.draftPosCount
            )

            // Stats Cards
            StatsCardsRow(
                draftCount = uiState.draftPosCount,
                confirmedCount = uiState.confirmedPosCount,
                completedCount = uiState.todayOrderCount,
                foodAppCount = uiState.foodAppOrderCount
            )

            // Tab Bar & Grid Controls
            OrdersTabBar(
                selectedTab = selectedTab,
                onTabSelected = { selectedTab = it },
                posCount = uiState.posOrders.size,
                appCount = uiState.foodAppOrderCount,
                gridColumns = gridColumns,
                onGridColumnsChanged = { gridColumns = it }
            )

            // Orders Grid
            Box(modifier = Modifier.weight(1f)) {
                when {
                    uiState.isLoading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    selectedTab == 0 -> {
                        if (uiState.posOrders.isEmpty()) {
                            EmptyOrdersState()
                        } else {
                            LazyVerticalGrid(
                                columns = GridCells.Fixed(gridColumns),
                                contentPadding = PaddingValues(16.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                items(uiState.posOrders, key = { it.id }) { order ->
                                    OrderCard(order = order)
                                }
                                // Bottom spacing
                                item(span = { GridItemSpan(gridColumns) }) {
                                    Spacer(modifier = Modifier.height(80.dp))
                                }
                            }
                        }
                    }
                    else -> {
                        EmptyOrdersState(
                            icon = Icons.Default.DeliveryDining,
                            message = "Đơn từ App",
                            subMessage = "Chưa có đơn hàng từ ứng dụng"
                        )
                    }
                }

                // FAB
                FloatingActionButton(
                    onClick = onNavigateToSale,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(24.dp)
                        .size(64.dp),
                    containerColor = Color(0xFF4CAF50),
                    contentColor = Color.White,
                    shape = CircleShape
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = "Tạo đơn mới",
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun DashboardSidebar(
    branchName: String,
    staffName: String,
    onNavigateToSale: () -> Unit,
    onNavigateToFoodOrders: () -> Unit,
    onNavigateToShift: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(80.dp)
            .fillMaxHeight()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF1976D2),
                        Color(0xFF1565C0)
                    )
                )
            )
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Logo
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Outlined.Restaurant,
                contentDescription = null,
                modifier = Modifier.size(28.dp),
                tint = Color.White
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Navigation Items
        SidebarNavItem(
            icon = Icons.Default.PointOfSale,
            label = "Bán hàng",
            isActive = true,
            onClick = onNavigateToSale
        )

        SidebarNavItem(
            icon = Icons.Default.DeliveryDining,
            label = "Đơn App",
            onClick = onNavigateToFoodOrders
        )

        SidebarNavItem(
            icon = Icons.Default.TableBar,
            label = "Bàn",
            onClick = {}
        )

        SidebarNavItem(
            icon = Icons.Default.Schedule,
            label = "Ca làm",
            onClick = onNavigateToShift
        )

        Spacer(modifier = Modifier.weight(1f))

        // Bottom Items
        SidebarNavItem(
            icon = Icons.Default.Settings,
            label = "Cài đặt",
            onClick = onNavigateToSettings
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Staff Avatar
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.2f))
                .clickable(onClick = onLogout),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = "Đăng xuất",
                modifier = Modifier.size(24.dp),
                tint = Color.White
            )
        }
    }
}

@Composable
private fun SidebarNavItem(
    icon: ImageVector,
    label: String,
    isActive: Boolean = false,
    badge: Int? = null,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .padding(vertical = 4.dp)
            .size(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isActive) Color.White.copy(alpha = 0.2f)
                else Color.Transparent
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    modifier = Modifier.size(22.dp),
                    tint = Color.White
                )
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
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = label,
                fontSize = 9.sp,
                color = Color.White.copy(alpha = 0.9f),
                maxLines = 1
            )
        }
    }
}

@Composable
private fun DashboardHeader(
    currentTime: String,
    currentDate: String,
    todayRevenue: Long,
    totalOrders: Int,
    pendingOrders: Int
) {
    Surface(
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left: Time & Date
            Column {
                Text(
                    text = currentTime,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1976D2)
                )
                Text(
                    text = currentDate,
                    fontSize = 14.sp,
                    color = Color.Gray
                )
            }

            // Right: Stats
            Row(
                horizontalArrangement = Arrangement.spacedBy(32.dp)
            ) {
                HeaderStat(
                    label = "Doanh thu hôm nay",
                    value = formatCurrency(todayRevenue),
                    color = Color(0xFF4CAF50)
                )
                HeaderStat(
                    label = "Tổng đơn",
                    value = totalOrders.toString(),
                    color = Color(0xFF2196F3)
                )
                HeaderStat(
                    label = "Đang chờ",
                    value = pendingOrders.toString(),
                    color = Color(0xFFFF9800)
                )
            }
        }
    }
}

@Composable
private fun HeaderStat(
    label: String,
    value: String,
    color: Color
) {
    Column(horizontalAlignment = Alignment.End) {
        Text(
            text = value,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            fontSize = 12.sp,
            color = Color.Gray
        )
    }
}

@Composable
private fun StatsCardsRow(
    draftCount: Int,
    confirmedCount: Int,
    completedCount: Int,
    foodAppCount: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.Edit,
            label = "Chờ xác nhận",
            count = draftCount,
            color = Color(0xFFFF9800)
        )
        StatCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.CheckCircle,
            label = "Đã xác nhận",
            count = confirmedCount,
            color = Color(0xFF2196F3)
        )
        StatCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.Done,
            label = "Hoàn tất",
            count = completedCount,
            color = Color(0xFF4CAF50)
        )
        StatCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.DeliveryDining,
            label = "Đơn App",
            count = foodAppCount,
            color = Color(0xFFE91E63)
        )
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    count: Int,
    color: Color
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(12.dp)
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
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = color
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = count.toString(),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
                Text(
                    text = label,
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }
        }
    }
}

@Composable
private fun OrdersTabBar(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    posCount: Int,
    appCount: Int,
    gridColumns: Int,
    onGridColumnsChanged: (Int) -> Unit
) {
    Surface(color = Color.White) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tabs
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TabChip(
                    label = "Đơn Quầy",
                    count = posCount,
                    isSelected = selectedTab == 0,
                    color = Color(0xFF1976D2),
                    onClick = { onTabSelected(0) }
                )
                TabChip(
                    label = "Đơn App",
                    count = appCount,
                    isSelected = selectedTab == 1,
                    color = Color(0xFFE91E63),
                    onClick = { onTabSelected(1) }
                )
            }

            // Grid Column Selector
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.GridView,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = Color.Gray
                )
                listOf(3, 4, 5, 6).forEach { cols ->
                    FilterChip(
                        selected = gridColumns == cols,
                        onClick = { onGridColumnsChanged(cols) },
                        label = { Text("$cols", fontSize = 12.sp) },
                        modifier = Modifier.height(32.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF1976D2),
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun TabChip(
    label: String,
    count: Int,
    isSelected: Boolean,
    color: Color,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) color else Color.Transparent,
        border = if (!isSelected) ButtonDefaults.outlinedButtonBorder else null
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                fontSize = 14.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (isSelected) Color.White else Color.Gray
            )
            Spacer(modifier = Modifier.width(8.dp))
            Badge(
                containerColor = if (isSelected) Color.White.copy(alpha = 0.2f) else color.copy(alpha = 0.1f)
            ) {
                Text(
                    text = count.toString(),
                    fontSize = 11.sp,
                    color = if (isSelected) Color.White else color
                )
            }
        }
    }
}

@Composable
private fun OrderCard(order: PosOrder) {
    val statusColor = Color(order.status.color)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clickable { },
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Order number
                Box(
                    modifier = Modifier
                        .background(statusColor, RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "#${order.orderNumber.toString().padStart(3, '0')}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                // Time
                Text(
                    text = formatTime(order.createdAt),
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }

            // Center: Table info
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = if (order.tableName != null) Icons.Default.TableBar else Icons.Default.TakeoutDining,
                    contentDescription = null,
                    modifier = Modifier.size(28.dp),
                    tint = statusColor
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = order.tableName ?: "Mang đi",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "${order.itemCount} món",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            // Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formatCompactCurrency(order.totalAmount),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1976D2)
                )
                // Action button
                Surface(
                    onClick = { },
                    shape = RoundedCornerShape(6.dp),
                    color = statusColor.copy(alpha = 0.1f)
                ) {
                    Text(
                        text = if (order.status == PosOrderStatus.DRAFT) "Xác nhận" else "Hoàn tất",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = statusColor
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyOrdersState(
    icon: ImageVector = Icons.Default.Storefront,
    message: String = "Chưa có đơn hàng",
    subMessage: String = "Nhấn + để tạo đơn mới"
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFE3F2FD)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = Color(0xFF1976D2)
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = message,
                fontSize = 18.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF424242)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subMessage,
                fontSize = 14.sp,
                color = Color.Gray
            )
        }
    }
}

private fun formatCurrency(amount: Long): String {
    return String.format("%,d đ", amount).replace(",", ".")
}

private fun formatCompactCurrency(amount: Long): String {
    return when {
        amount >= 1_000_000 -> String.format("%.1fM", amount / 1_000_000.0)
        amount >= 1_000 -> "${amount / 1_000}K"
        else -> "${amount}đ"
    }
}

private fun formatTime(timestamp: Long): String {
    val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
    return sdf.format(Date(timestamp))
}
