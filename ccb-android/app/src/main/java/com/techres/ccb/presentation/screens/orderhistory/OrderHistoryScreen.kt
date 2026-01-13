package com.techres.ccb.presentation.screens.orderhistory

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.Badge
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
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
                title = { Text("Lịch sử đơn hàng", fontSize = 16.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                },
                actions = {
                    // Compact stats in top bar
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        CompactStat(uiState.completedCount.toString(), Color(0xFF4CAF50))
                        Text("/", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
                        CompactStat(uiState.cancelledCount.toString(), Color(0xFFf44336))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = formatCurrencyShort(uiState.totalRevenue),
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
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
            // Compact Filters Row
            CompactFiltersRow(
                statusFilter = uiState.statusFilter,
                dateFilter = uiState.dateFilter,
                onStatusFilterChange = { viewModel.setStatusFilter(it) },
                onDateFilterChange = { viewModel.setDateFilter(it) }
            )

            // Orders List
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Đang tải...")
                }
            } else if (uiState.orders.isEmpty()) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Receipt,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Không có đơn hàng nào", color = Color.Gray, fontSize = 14.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.orders) { order ->
                        CompactOrderCard(
                            order = order,
                            onClick = { viewModel.showOrderDetail(order.id) }
                        )
                    }
                }
            }

            // Pagination Controls
            PaginationControls(
                currentPage = uiState.currentPage,
                totalPages = uiState.totalPages,
                pageSize = uiState.pageSize,
                totalCount = uiState.totalCount,
                onPageChange = { viewModel.setPage(it) },
                onNextPage = { viewModel.nextPage() },
                onPreviousPage = { viewModel.previousPage() },
                onPageSizeChange = { viewModel.setPageSize(it) }
            )
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
private fun CompactStat(value: String, color: Color) {
    Text(
        text = value,
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        color = color
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CompactFiltersRow(
    statusFilter: OrderHistoryFilter,
    dateFilter: DateFilter,
    onStatusFilterChange: (OrderHistoryFilter) -> Unit,
    onDateFilterChange: (DateFilter) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFF5F5F5))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Status filters
        OrderHistoryFilter.entries.forEach { filter ->
            FilterChip(
                selected = statusFilter == filter,
                onClick = { onStatusFilterChange(filter) },
                label = { Text(filter.displayName, fontSize = 11.sp) },
                modifier = Modifier.height(28.dp),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        // Date filter dropdown
        var expanded by remember { mutableStateOf(false) }
        Box {
            FilterChip(
                selected = true,
                onClick = { expanded = true },
                label = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(dateFilter.displayName, fontSize = 11.sp)
                        Icon(
                            Icons.Default.KeyboardArrowDown,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                },
                modifier = Modifier.height(28.dp),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.secondary,
                    selectedLabelColor = MaterialTheme.colorScheme.onSecondary
                )
            )
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                DateFilter.entries.forEach { filter ->
                    DropdownMenuItem(
                        text = { Text(filter.displayName, fontSize = 13.sp) },
                        onClick = {
                            onDateFilterChange(filter)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun CompactOrderCard(
    order: OrderHistoryItem,
    onClick: () -> Unit
) {
    val isCompleted = order.status == "completed"
    val statusColor = if (isCompleted) Color(0xFF4CAF50) else Color(0xFFf44336)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Status indicator
            Icon(
                imageVector = if (isCompleted) Icons.Default.CheckCircle else Icons.Default.Cancel,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = statusColor
            )

            Spacer(modifier = Modifier.width(10.dp))

            // Order info
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "#${order.orderNumber}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Text(
                        text = formatCurrency(order.totalAmount),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = if (isCompleted) Color(0xFF4CAF50) else Color.Gray
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = buildString {
                            order.tableName?.let { append(it) }
                            if (!order.tableName.isNullOrEmpty() && order.itemCount > 0) append(" • ")
                            append("${order.itemCount} món")
                        },
                        fontSize = 12.sp,
                        color = Color.Gray,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = formatTime(order.createdAt),
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                }
            }
        }
    }
}

@Composable
private fun PaginationControls(
    currentPage: Int,
    totalPages: Int,
    pageSize: Int,
    totalCount: Int,
    onPageChange: (Int) -> Unit,
    onNextPage: () -> Unit,
    onPreviousPage: () -> Unit,
    onPageSizeChange: (Int) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 4.dp,
        color = Color.White
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Page size selector
            var expanded by remember { mutableStateOf(false) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Hiển thị:", fontSize = 12.sp, color = Color.Gray)
                Spacer(modifier = Modifier.width(4.dp))
                Box {
                    Row(
                        modifier = Modifier
                            .clickable { expanded = true }
                            .border(1.dp, Color.LightGray, RoundedCornerShape(4.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(pageSize.toString(), fontSize = 12.sp)
                        Icon(
                            Icons.Default.KeyboardArrowDown,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    DropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        listOf(5, 10, 20, 30, 50).forEach { size ->
                            DropdownMenuItem(
                                text = { Text("$size đơn", fontSize = 13.sp) },
                                onClick = {
                                    onPageSizeChange(size)
                                    expanded = false
                                }
                            )
                        }
                    }
                }
            }

            // Page info
            Text(
                text = "Tổng: $totalCount đơn",
                fontSize = 12.sp,
                color = Color.Gray
            )

            // Page navigation
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = onPreviousPage,
                    enabled = currentPage > 1,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Default.ChevronLeft,
                        contentDescription = "Trang trước",
                        tint = if (currentPage > 1) MaterialTheme.colorScheme.primary else Color.LightGray
                    )
                }

                Text(
                    text = "$currentPage/$totalPages",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )

                IconButton(
                    onClick = onNextPage,
                    enabled = currentPage < totalPages,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = "Trang sau",
                        tint = if (currentPage < totalPages) MaterialTheme.colorScheme.primary else Color.LightGray
                    )
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

                // Items List - filter out combo children (they're shown under their parent)
                val parentItems = orderItems.filter { !it.isComboChild }
                val comboChildrenMap = orderItems.filter { it.isComboChild }.groupBy { it.comboParentId }

                Text(
                    text = "Danh sách món (${parentItems.size})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(
                    modifier = Modifier.height(250.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(parentItems) { item ->
                        val comboChildren = if (item.isComboParent) comboChildrenMap[item.id] ?: emptyList() else emptyList()
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

                            // Show combo children if this is a combo parent
                            if (comboChildren.isNotEmpty()) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(start = 32.dp, top = 8.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFFFFF3E0).copy(alpha = 0.5f))
                                        .padding(8.dp)
                                ) {
                                    Text(
                                        text = "Bao gồm:",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Color(0xFFE65100),
                                        modifier = Modifier.padding(bottom = 4.dp)
                                    )
                                    comboChildren.forEach { child ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(vertical = 2.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text(
                                                    text = "•",
                                                    fontSize = 14.sp,
                                                    color = Color(0xFFFF9800),
                                                    modifier = Modifier.padding(end = 8.dp)
                                                )
                                                Text(
                                                    text = child.productName,
                                                    fontSize = 13.sp,
                                                    color = Color(0xFF424242)
                                                )
                                            }
                                            Badge(
                                                containerColor = Color(0xFFFF9800).copy(alpha = 0.2f)
                                            ) {
                                                Text(
                                                    text = "x${child.quantity}",
                                                    fontSize = 11.sp,
                                                    color = Color(0xFFE65100)
                                                )
                                            }
                                        }
                                    }
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

private fun formatCurrencyShort(amount: Long): String {
    return when {
        amount >= 1_000_000_000 -> "${amount / 1_000_000_000}B"
        amount >= 1_000_000 -> "${amount / 1_000_000}M"
        amount >= 1_000 -> "${amount / 1_000}K"
        else -> "${amount}đ"
    }
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
