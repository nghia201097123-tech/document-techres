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

            // Tab Selection
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = Color(0xFF1976D2)
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Storefront, null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Tại quầy")
                            if (uiState.posOrders.isNotEmpty()) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Badge(containerColor = Color(0xFF2196F3)) {
                                    Text("${uiState.posOrders.size}")
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
                            Icon(Icons.Default.DeliveryDining, null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("App Food")
                            if (uiState.foodAppOrders.isNotEmpty()) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Badge(
                                    containerColor = if (uiState.newFoodOrderCount > 0)
                                        Color(0xFFE91E63) else Color(0xFFFF5722)
                                ) {
                                    Text("${uiState.foodAppOrders.size}")
                                }
                            }
                        }
                    }
                )
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
                            columns = GridCells.Fixed(2),
                            contentPadding = PaddingValues(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(uiState.posOrders, key = { it.id }) { order ->
                                PosOrderGridItem(
                                    order = order,
                                    onConfirm = { viewModel.confirmPosOrder(order.id) },
                                    onPay = { viewModel.payPosOrder(order.id) }
                                )
                            }
                            // Bottom spacing for FAB
                            item(span = { GridItemSpan(2) }) {
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
                            columns = GridCells.Fixed(2),
                            contentPadding = PaddingValues(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(uiState.foodAppOrders, key = { it.id }) { order ->
                                FoodOrderGridItem(
                                    order = order,
                                    onAccept = { viewModel.acceptFoodOrder(order.id) },
                                    onStartPreparing = { viewModel.startPreparingFoodOrder(order.id) },
                                    onMarkReady = { viewModel.markFoodOrderReady(order.id) },
                                    onComplete = { viewModel.completeFoodOrder(order.id) }
                                )
                            }
                            // Bottom spacing for FAB
                            item(span = { GridItemSpan(2) }) {
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

@Composable
fun PosOrderGridItem(
    order: PosOrder,
    onConfirm: () -> Unit,
    onPay: () -> Unit
) {
    val statusColor = Color(order.status.color)
    val isDraft = order.status == PosOrderStatus.DRAFT

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.9f),
        colors = CardDefaults.cardColors(
            containerColor = if (isDraft) Color.White else statusColor.copy(alpha = 0.05f)
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
                        .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        "#${order.orderNumber}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
                // Print icon if printed
                if (order.isPrinted) {
                    Icon(
                        Icons.Default.Print,
                        contentDescription = "Đã in",
                        modifier = Modifier.size(16.dp),
                        tint = Color(0xFF4CAF50)
                    )
                }
            }

            // Center content
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Table/Takeaway Icon
                Icon(
                    if (order.tableName != null) Icons.Default.TableBar else Icons.Default.TakeoutDining,
                    null,
                    tint = statusColor,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.height(4.dp))
                // Table name
                Text(
                    order.tableName ?: "Mang đi",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                // Customer name
                order.customerName?.let {
                    Text(
                        it,
                        fontSize = 11.sp,
                        color = Color.Gray,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Footer
            Column {
                // Items & Amount
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("${order.itemCount} món", fontSize = 11.sp, color = Color.Gray)
                    Text(
                        formatCurrency(order.totalAmount),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1976D2)
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Action Button
                when (order.status) {
                    PosOrderStatus.DRAFT -> {
                        Button(
                            onClick = onConfirm,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2196F3)),
                            contentPadding = PaddingValues(vertical = 6.dp),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Icon(Icons.Default.Print, null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Xác nhận", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    PosOrderStatus.CONFIRMED -> {
                        Button(
                            onClick = onPay,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                            contentPadding = PaddingValues(vertical = 6.dp),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Icon(Icons.Default.Payment, null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Thu tiền", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    else -> {}
                }
            }
        }
    }
}

@Composable
fun FoodOrderGridItem(
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
            .aspectRatio(0.9f)
            .then(
                if (isNew) Modifier.border(2.dp, platformColor, RoundedCornerShape(12.dp))
                else Modifier
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (isNew) platformColor.copy(alpha = 0.08f) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isNew) 4.dp else 2.dp),
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
                // Platform badge
                Box(
                    modifier = Modifier
                        .background(platformColor.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 6.dp, vertical = 3.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(order.platform.icon, fontSize = 12.sp)
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            order.platform.shortName,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = platformColor
                        )
                    }
                }
                // Status
                Box(
                    modifier = Modifier
                        .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        order.status.displayName,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
            }

            // Center content
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Order code
                Text(
                    order.orderCode,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                // Customer
                Text(
                    order.customerName,
                    fontSize = 11.sp,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Footer
            Column {
                // Items & Amount
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("${order.items.size} món", fontSize = 11.sp, color = Color.Gray)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            formatCurrency(order.totalAmount),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
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

                Spacer(modifier = Modifier.height(8.dp))

                // Action Button
                val (buttonText, buttonColor, buttonAction) = when (order.status) {
                    FoodOrderStatus.NEW -> Triple("Nhận đơn", Color(0xFF4CAF50), onAccept)
                    FoodOrderStatus.ACCEPTED -> Triple("Bắt đầu", Color(0xFF9C27B0), onStartPreparing)
                    FoodOrderStatus.PREPARING -> Triple("Sẵn sàng", Color(0xFF2196F3), onMarkReady)
                    FoodOrderStatus.READY, FoodOrderStatus.DELIVERING -> Triple("Hoàn thành", Color(0xFF4CAF50), onComplete)
                    else -> Triple("", Color.Gray, {})
                }

                if (buttonText.isNotEmpty()) {
                    Button(
                        onClick = buttonAction,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = buttonColor),
                        contentPadding = PaddingValues(vertical = 6.dp),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(buttonText, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// Helper
private fun formatCurrency(amount: Long): String {
    return String.format("%,d đ", amount).replace(",", ".")
}
