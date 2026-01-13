package com.techres.ccb.presentation.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.presentation.theme.Success
import com.techres.ccb.presentation.theme.Warning
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToMenu: (String?) -> Unit,
    onNavigateToOrder: (String) -> Unit,
    onNavigateToShift: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToSale: () -> Unit,
    onNavigateToFoodOrder: () -> Unit,
    onLogout: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = uiState.branchName,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Xin chào, ${uiState.staffName}",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Cài đặt")
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, contentDescription = "Đổi nhân viên")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            // Quick actions - Row 1
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    icon = Icons.Default.PointOfSale,
                    title = "Bán hàng",
                    color = Color(0xFF4CAF50),  // Green
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToSale
                )
                QuickActionCard(
                    icon = Icons.Default.DeliveryDining,
                    title = "Đơn App Food",
                    color = Color(0xFFFF5722),  // Deep Orange
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToFoodOrder
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Quick actions - Row 2
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    icon = Icons.Default.Add,
                    title = "Tạo đơn mới",
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        val newOrderId = UUID.randomUUID().toString()
                        viewModel.createNewOrder(newOrderId)
                        onNavigateToMenu(newOrderId)
                    }
                )
                QuickActionCard(
                    icon = Icons.Default.AccessTime,
                    title = "Ca làm việc",
                    color = Success,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToShift
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Quick actions - Row 3
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    icon = Icons.Default.Settings,
                    title = "Cài đặt",
                    color = Color(0xFF607D8B),  // Blue Grey
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToSettings
                )
                // Placeholder for future feature
                Spacer(modifier = Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Active orders section
            Text(
                text = "Đơn đang phục vụ (${uiState.activeOrders.size})",
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))

            if (uiState.activeOrders.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.RestaurantMenu,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Chưa có đơn hàng",
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                    }
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.activeOrders) { order ->
                        OrderCard(
                            order = order,
                            onClick = { onNavigateToOrder(order.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickActionCard(
    icon: ImageVector,
    title: String,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(100.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = color),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun OrderCard(
    order: OrderEntity,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = order.tableName ?: "Mang đi",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                StatusChip(status = order.status)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = formatPrice(order.totalAmount),
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "Tạo lúc: ${order.createdAt.take(16).replace("T", " ")}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
    }
}

@Composable
private fun StatusChip(status: String) {
    val (color, text) = when (status) {
        "pending" -> Warning to "Chờ"
        "preparing" -> MaterialTheme.colorScheme.primary to "Đang làm"
        "ready" -> Success to "Sẵn sàng"
        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f) to status
    }

    Surface(
        shape = RoundedCornerShape(4.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            fontSize = 12.sp,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun formatPrice(amount: Double): String {
    return String.format("%,.0f đ", amount)
}
