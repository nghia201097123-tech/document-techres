package com.techres.ccb.presentation.screens.order

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.OrderItemEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderScreen(
    orderId: String,
    onNavigateBack: () -> Unit,
    onNavigateToMenu: () -> Unit,
    onNavigateToPayment: () -> Unit,
    viewModel: OrderViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(orderId) {
        viewModel.loadOrder(orderId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Đơn hàng ${uiState.order?.orderNumber ?: ""}") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                }
            )
        },
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tạm tính:")
                        Text(formatPrice(uiState.order?.subtotal ?: 0.0))
                    }
                    if ((uiState.order?.discountAmount ?: 0.0) > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Giảm giá:")
                            Text("-${formatPrice(uiState.order?.discountAmount ?: 0.0)}")
                        }
                    }
                    Divider(modifier = Modifier.padding(vertical = 8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tổng cộng:", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text(
                            formatPrice(uiState.order?.totalAmount ?: 0.0),
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = onNavigateToMenu,
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Thêm món")
                        }
                        Button(
                            onClick = onNavigateToPayment,
                            modifier = Modifier.weight(1f),
                            enabled = uiState.orderItems.isNotEmpty()
                        ) {
                            Icon(Icons.Default.Payment, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Thanh toán")
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        if (uiState.orderItems.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.ShoppingCart,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "Chưa có món nào",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = onNavigateToMenu) {
                        Text("Thêm món")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(uiState.orderItems) { item ->
                    OrderItemCard(
                        item = item,
                        onIncrease = { viewModel.updateItemQuantity(item, item.quantity + 1) },
                        onDecrease = { viewModel.updateItemQuantity(item, item.quantity - 1) },
                        onDelete = { viewModel.deleteItem(item) }
                    )
                }
            }
        }
    }
}

@Composable
private fun OrderItemCard(
    item: OrderItemEntity,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Product info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.productName,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatPrice(item.unitPrice),
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }

            // Quantity controls
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                IconButton(
                    onClick = { if (item.quantity > 1) onDecrease() else onDelete() },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        if (item.quantity > 1) Icons.Default.Remove else Icons.Default.Delete,
                        contentDescription = "Giảm",
                        tint = if (item.quantity > 1) MaterialTheme.colorScheme.onSurface
                        else MaterialTheme.colorScheme.error
                    )
                }
                Text(
                    text = "${item.quantity}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                IconButton(
                    onClick = onIncrease,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tăng")
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Total price
            Text(
                text = formatPrice(item.totalPrice),
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

private fun formatPrice(amount: Double): String {
    return String.format("%,.0f đ", amount)
}
