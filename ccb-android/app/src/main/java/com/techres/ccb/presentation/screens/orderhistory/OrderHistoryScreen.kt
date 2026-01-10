package com.techres.ccb.presentation.screens.orderhistory

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.TableRestaurant
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderHistoryScreen(
    onBack: () -> Unit,
    viewModel: OrderHistoryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.History,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Lịch sử đơn hàng")
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Stats Summary
            OrderStatsSummary(
                completedCount = uiState.completedCount,
                cancelledCount = uiState.cancelledCount,
                totalRevenue = uiState.totalRevenue
            )

            // Filters Section
            FiltersSection(
                statusFilter = uiState.statusFilter,
                dateFilter = uiState.dateFilter,
                onStatusFilterChange = { viewModel.setStatusFilter(it) },
                onDateFilterChange = { viewModel.setDateFilter(it) }
            )

            // Orders List
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Đang tải...")
                }
            } else if (uiState.orders.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.Receipt,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "Không có đơn hàng nào",
                            color = Color.Gray,
                            fontSize = 16.sp
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.orders) { order ->
                        OrderHistoryCard(
                            order = order,
                            onClick = { viewModel.showOrderDetail(order.id) }
                        )
                    }
                }
            }
        }

        // Order Detail Dialog
        if (uiState.showOrderDetail && uiState.selectedOrder != null) {
            OrderDetailDialog(
                order = uiState.selectedOrder!!,
                orderItems = uiState.selectedOrderItems,
                onDismiss = { viewModel.hideOrderDetail() }
            )
        }
    }
}

@Composable
private fun OrderStatsSummary(
    completedCount: Int,
    cancelledCount: Int,
    totalRevenue: Long
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(
                label = "Hoàn tất",
                value = completedCount.toString(),
                color = Color(0xFF4CAF50)
            )
            StatItem(
                label = "Đã hủy",
                value = cancelledCount.toString(),
                color = Color(0xFFf44336)
            )
            StatItem(
                label = "Doanh thu",
                value = formatCurrency(totalRevenue),
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
private fun StatItem(
    label: String,
    value: String,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FiltersSection(
    statusFilter: OrderHistoryFilter,
    dateFilter: DateFilter,
    onStatusFilterChange: (OrderHistoryFilter) -> Unit,
    onDateFilterChange: (DateFilter) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        // Status Filter
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.FilterList,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = Color.Gray
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "Trạng thái:",
                fontSize = 14.sp,
                color = Color.Gray
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(OrderHistoryFilter.entries.toList()) { filter ->
                FilterChip(
                    selected = statusFilter == filter,
                    onClick = { onStatusFilterChange(filter) },
                    label = { Text(filter.displayName, fontSize = 13.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Date Filter
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.History,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = Color.Gray
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "Thời gian:",
                fontSize = 14.sp,
                color = Color.Gray
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(DateFilter.entries.toList()) { filter ->
                FilterChip(
                    selected = dateFilter == filter,
                    onClick = { onDateFilterChange(filter) },
                    label = { Text(filter.displayName, fontSize = 13.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.secondary,
                        selectedLabelColor = MaterialTheme.colorScheme.onSecondary
                    )
                )
            }
        }
    }
    Divider(modifier = Modifier.padding(horizontal = 16.dp))
}

@Composable
private fun OrderHistoryCard(
    order: OrderHistoryItem,
    onClick: () -> Unit
) {
    val isCompleted = order.status == "completed"
    val statusColor = if (isCompleted) Color(0xFF4CAF50) else Color(0xFFf44336)
    val statusIcon = if (isCompleted) Icons.Default.CheckCircle else Icons.Default.Cancel
    val statusText = if (isCompleted) "Hoàn tất" else "Đã hủy"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Receipt,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "#${order.orderNumber}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(
                            color = statusColor.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = statusIcon,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = statusColor
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = statusText,
                        fontSize = 12.sp,
                        color = statusColor,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Info Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Left: Table/Customer info
                Column {
                    if (!order.tableName.isNullOrEmpty()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.TableRestaurant,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = Color.Gray
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = order.tableName,
                                fontSize = 13.sp,
                                color = Color.Gray
                            )
                        }
                    }
                    if (!order.customerName.isNullOrEmpty()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = Color.Gray
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = order.customerName,
                                fontSize = 13.sp,
                                color = Color.Gray
                            )
                        }
                    }
                    Text(
                        text = "${order.itemCount} món",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }

                // Right: Amount and time
                Column(
                    horizontalAlignment = Alignment.End
                ) {
                    Text(
                        text = formatCurrency(order.totalAmount),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = if (isCompleted) Color(0xFF4CAF50) else Color.Gray
                    )
                    Text(
                        text = formatTime(order.createdAt),
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    if (!isCompleted && !order.cancelReason.isNullOrEmpty()) {
                        Text(
                            text = order.cancelReason,
                            fontSize = 11.sp,
                            color = Color(0xFFf44336),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderDetailDialog(
    order: OrderEntity,
    orderItems: List<OrderItemEntity>,
    onDismiss: () -> Unit
) {
    val isCompleted = order.status == "completed"
    val statusColor = if (isCompleted) Color(0xFF4CAF50) else Color(0xFFf44336)
    val statusText = if (isCompleted) "Hoàn tất" else "Đã hủy"

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Chi tiết đơn hàng",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "#${order.orderNumber}",
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }
                    Box(
                        modifier = Modifier
                            .background(
                                color = statusColor.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(8.dp)
                            )
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = statusText,
                            color = statusColor,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Divider()
                Spacer(modifier = Modifier.height(16.dp))

                // Order Info
                if (!order.tableName.isNullOrEmpty()) {
                    InfoRow(label = "Bàn", value = order.tableName)
                }
                if (!order.customerName.isNullOrEmpty()) {
                    InfoRow(label = "Khách hàng", value = order.customerName)
                }
                if (!order.staffName.isNullOrEmpty()) {
                    InfoRow(label = "Nhân viên", value = order.staffName)
                }
                InfoRow(label = "Thời gian tạo", value = formatDateTime(parseTimestamp(order.createdAt)))

                if (isCompleted && !order.paymentMethod.isNullOrEmpty()) {
                    InfoRow(label = "Thanh toán", value = getPaymentMethodName(order.paymentMethod))
                    order.completedAt?.let {
                        InfoRow(label = "Hoàn tất lúc", value = formatDateTime(parseTimestamp(it)))
                    }
                }

                if (!isCompleted) {
                    order.cancelledAt?.let {
                        InfoRow(label = "Hủy lúc", value = formatDateTime(parseTimestamp(it)))
                    }
                    if (!order.cancelReason.isNullOrEmpty()) {
                        InfoRow(label = "Lý do hủy", value = order.cancelReason, valueColor = Color(0xFFf44336))
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Divider()
                Spacer(modifier = Modifier.height(16.dp))

                // Items List
                Text(
                    text = "Danh sách món (${orderItems.size})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(
                    modifier = Modifier.height(250.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(orderItems) { item ->
                        // Grab-style order item display
                        Column(modifier = Modifier.fillMaxWidth()) {
                            // Row 1: Quantity badge + Product name + Total price
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Row(
                                    modifier = Modifier.weight(1f),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    // Quantity badge
                                    Box(
                                        modifier = Modifier
                                            .size(22.dp)
                                            .background(Color(0xFFE3F2FD), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = item.quantity.toString(),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF1976D2)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = item.productName,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                                Text(
                                    text = formatCurrency(item.totalPrice.toLong()),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1976D2)
                                )
                            }

                            // Row 2: Unit price
                            Text(
                                text = formatCurrency(item.unitPrice.toLong()),
                                fontSize = 12.sp,
                                color = Color.Gray,
                                modifier = Modifier.padding(start = 32.dp, top = 2.dp)
                            )

                            // Row 3: Variants/Toppings - Grab style with prices
                            if (!item.notes.isNullOrBlank()) {
                                // Split variants from user note by " | "
                                val parts = item.notes.split(" | ")
                                val variantsPart = parts.firstOrNull() ?: ""
                                val userNote = parts.getOrNull(1)

                                // Parse variants: "Kiwi:10000, Size S:10000"
                                val variants = variantsPart.split(",").map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("Ghi chú:") }
                                if (variants.isNotEmpty()) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(start = 32.dp, top = 6.dp)
                                    ) {
                                        variants.forEach { variant ->
                                            // Parse "Name:Price" format
                                            val colonIndex = variant.lastIndexOf(":")
                                            val name = if (colonIndex > 0) variant.substring(0, colonIndex) else variant
                                            val price = if (colonIndex > 0) variant.substring(colonIndex + 1).toLongOrNull() ?: 0L else 0L

                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(vertical = 2.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(
                                                    modifier = Modifier.weight(1f),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        text = "•",
                                                        fontSize = 13.sp,
                                                        color = Color.Gray,
                                                        modifier = Modifier.padding(end = 8.dp)
                                                    )
                                                    Text(
                                                        text = name,
                                                        fontSize = 13.sp,
                                                        color = Color(0xFF424242)
                                                    )
                                                }
                                                if (price > 0) {
                                                    Text(
                                                        text = "+${formatCurrency(price)}",
                                                        fontSize = 12.sp,
                                                        color = Color.Gray
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                // Row 4: User note (if any)
                                if (!userNote.isNullOrBlank()) {
                                    Text(
                                        text = userNote,
                                        fontSize = 12.sp,
                                        fontStyle = FontStyle.Italic,
                                        color = Color(0xFF666666),
                                        modifier = Modifier.padding(start = 32.dp, top = 4.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Divider()
                Spacer(modifier = Modifier.height(12.dp))

                // Totals
                if (order.discountAmount > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tạm tính", color = Color.Gray)
                        Text(formatCurrency(order.subtotal.toLong()))
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Giảm giá", color = Color(0xFF4CAF50))
                        Text("-${formatCurrency(order.discountAmount.toLong())}", color = Color(0xFF4CAF50))
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Tổng cộng",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Text(
                        text = formatCurrency(order.totalAmount.toLong()),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = if (isCompleted) Color(0xFF4CAF50) else Color.Gray
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Close Button
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Đóng")
                }
            }
        }
    }
}

@Composable
private fun InfoRow(
    label: String,
    value: String,
    valueColor: Color = Color.Unspecified
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            color = Color.Gray
        )
        Text(
            text = value,
            fontSize = 13.sp,
            color = if (valueColor != Color.Unspecified) valueColor else Color.Unspecified
        )
    }
}

private fun formatCurrency(amount: Long): String {
    val formatter = NumberFormat.getNumberInstance(Locale("vi", "VN"))
    return "${formatter.format(amount)}đ"
}

private fun formatTime(timestamp: Long): String {
    val sdf = SimpleDateFormat("HH:mm dd/MM", Locale.getDefault())
    return sdf.format(Date(timestamp))
}

private fun formatDateTime(timestamp: Long): String {
    val sdf = SimpleDateFormat("HH:mm - dd/MM/yyyy", Locale.getDefault())
    return sdf.format(Date(timestamp))
}

private fun parseTimestamp(isoTime: String): Long {
    return try {
        java.time.Instant.parse(isoTime).toEpochMilli()
    } catch (e: Exception) {
        System.currentTimeMillis()
    }
}

private fun getPaymentMethodName(method: String?): String {
    return when (method?.lowercase()) {
        "cash" -> "Tiền mặt"
        "card" -> "Thẻ"
        "transfer" -> "Chuyển khoản"
        "momo" -> "MoMo"
        "zalopay" -> "ZaloPay"
        else -> method ?: "Chưa xác định"
    }
}
