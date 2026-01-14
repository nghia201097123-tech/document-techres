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
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.text.style.TextAlign
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
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.unit.Dp
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
                // Table-style order list with horizontal scroll
                val scrollState = rememberScrollState()
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    // Table Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(scrollState)
                            .background(Color(0xFFF5F5F5))
                            .padding(vertical = 10.dp, horizontal = 8.dp)
                    ) {
                        TableHeaderCell("STT", 45.dp)
                        TableHeaderCell("MÃ ĐƠN", 100.dp)
                        TableHeaderCell("BÀN", 60.dp)
                        TableHeaderCell("NHÂN VIÊN", 100.dp)
                        TableHeaderCell("TẠM TÍNH", 85.dp)
                        TableHeaderCell("VAT", 70.dp)
                        TableHeaderCell("GIẢM GIÁ", 80.dp)
                        TableHeaderCell("COUPON", 80.dp)
                        TableHeaderCell("SỐ KHÁCH", 70.dp)
                        TableHeaderCell("THANH TOÁN", 90.dp)
                        TableHeaderCell("ĐỒNG BỘ", 60.dp)
                    }

                    Divider(color = Color.LightGray)

                    // Table Body
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    ) {
                        itemsIndexed(uiState.orders) { index, order ->
                            val startIndex = (uiState.currentPage - 1) * uiState.pageSize
                            OrderTableRow(
                                index = startIndex + index + 1,
                                order = order,
                                scrollState = scrollState,
                                onClick = { viewModel.showOrderDetail(order.id) }
                            )
                            if (index < uiState.orders.size - 1) {
                                Divider(color = Color.LightGray.copy(alpha = 0.5f))
                            }
                        }
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
                isPrinting = uiState.isPrinting,
                printMessage = uiState.printMessage,
                isSyncing = uiState.isSyncing,
                syncMessage = uiState.syncMessage,
                isCancelling = uiState.isCancelling,
                cancelMessage = uiState.cancelMessage,
                onReprintBill = { viewModel.reprintBill() },
                onClearPrintMessage = { viewModel.clearPrintMessage() },
                onSyncOrder = { viewModel.syncOrder() },
                onClearSyncMessage = { viewModel.clearSyncMessage() },
                onCancelOrder = { reason -> viewModel.cancelOrder(reason) },
                onClearCancelMessage = { viewModel.clearCancelMessage() },
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
private fun TableHeaderCell(
    text: String,
    width: Dp
) {
    Text(
        text = text,
        modifier = Modifier.width(width),
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = Color(0xFF666666),
        textAlign = TextAlign.Center,
        maxLines = 1
    )
}

@Composable
private fun OrderTableRow(
    index: Int,
    order: OrderHistoryItem,
    scrollState: ScrollState,
    onClick: () -> Unit
) {
    val isCompleted = order.status == "completed"
    val rowBackground = if (index % 2 == 0) Color.White else Color(0xFFFAFAFA)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState)
            .background(rowBackground)
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // STT
        Text(
            text = index.toString(),
            modifier = Modifier.width(45.dp),
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )

        // Mã đơn
        Text(
            text = order.orderNumber.takeLast(5),
            modifier = Modifier.width(100.dp),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center
        )

        // Bàn
        Text(
            text = order.tableName ?: "---",
            modifier = Modifier.width(60.dp),
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )

        // Nhân viên
        Text(
            text = order.staffName ?: "---",
            modifier = Modifier.width(100.dp),
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )

        // Tạm tính
        Text(
            text = formatCurrencyShort(order.subtotal),
            modifier = Modifier.width(85.dp),
            fontSize = 12.sp,
            textAlign = TextAlign.End
        )

        // VAT
        Text(
            text = formatCurrencyShort(order.vatAmount),
            modifier = Modifier.width(70.dp),
            fontSize = 12.sp,
            textAlign = TextAlign.End
        )

        // Giảm giá
        Text(
            text = formatCurrencyShort(order.discountAmount),
            modifier = Modifier.width(80.dp),
            fontSize = 12.sp,
            color = if (order.discountAmount > 0) Color(0xFF4CAF50) else Color.Unspecified,
            textAlign = TextAlign.End
        )

        // Coupon
        Text(
            text = order.couponCode?.take(8) ?: "0",
            modifier = Modifier.width(80.dp),
            fontSize = 12.sp,
            color = if (!order.couponCode.isNullOrEmpty()) Color(0xFF2196F3) else Color.Unspecified,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )

        // Số khách
        Text(
            text = order.guestCount.toString(),
            modifier = Modifier.width(70.dp),
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )

        // Thanh toán (tổng tiền)
        Text(
            text = formatCurrencyShort(order.totalAmount),
            modifier = Modifier.width(90.dp),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = if (isCompleted) Color(0xFF4CAF50) else Color.Gray,
            textAlign = TextAlign.End
        )

        // Đồng bộ (Sync status)
        Box(
            modifier = Modifier.width(60.dp),
            contentAlignment = Alignment.Center
        ) {
            val (syncIcon, syncColor, syncDesc) = when (order.syncStatus) {
                "synced" -> Triple(Icons.Default.CloudDone, Color(0xFF4CAF50), "Đã đồng bộ")
                "syncing" -> Triple(Icons.Default.Sync, Color(0xFF2196F3), "Đang đồng bộ")
                "failed" -> Triple(Icons.Default.CloudOff, Color(0xFFf44336), "Lỗi đồng bộ")
                else -> Triple(Icons.Default.Cloud, Color(0xFFFF9800), "Chờ đồng bộ") // pending
            }
            Icon(
                imageVector = syncIcon,
                contentDescription = syncDesc,
                modifier = Modifier.size(18.dp),
                tint = syncColor
            )
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
    isPrinting: Boolean = false,
    printMessage: String? = null,
    isSyncing: Boolean = false,
    syncMessage: String? = null,
    isCancelling: Boolean = false,
    cancelMessage: String? = null,
    onReprintBill: () -> Unit = {},
    onClearPrintMessage: () -> Unit = {},
    onSyncOrder: () -> Unit = {},
    onClearSyncMessage: () -> Unit = {},
    onCancelOrder: (String) -> Unit = {},
    onClearCancelMessage: () -> Unit = {},
    onDismiss: () -> Unit
) {
    val isCompleted = order.status == "completed"
    val statusColor = if (isCompleted) Color(0xFF4CAF50) else Color(0xFFf44336)
    val statusText = if (isCompleted) "Hoàn tất" else "Đã hủy"

    // State for cancel confirmation dialog
    var showCancelDialog by remember { mutableStateOf(false) }
    var cancelReason by remember { mutableStateOf("") }

    // Cancel confirmation dialog
    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            title = { Text("Huỷ đơn hàng", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Bạn có chắc muốn huỷ đơn hàng #${order.orderNumber.takeLast(8)}?")
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = cancelReason,
                        onValueChange = { cancelReason = it },
                        label = { Text("Lý do huỷ đơn") },
                        placeholder = { Text("Nhập lý do huỷ đơn...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onCancelOrder(cancelReason.ifEmpty { "Huỷ từ lịch sử đơn hàng" })
                        showCancelDialog = false
                        cancelReason = ""
                    },
                    enabled = !isCancelling,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFf44336))
                ) {
                    Text(if (isCancelling) "Đang huỷ..." else "Xác nhận huỷ")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showCancelDialog = false }) {
                    Text("Đóng")
                }
            }
        )
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .padding(8.dp),
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                // Header with close button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Chi tiết đơn hàng",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "#${order.orderNumber}",
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Sync button - show sync status indicator
                        val syncStatusInfo = when (order.syncStatus) {
                            "synced" -> Triple(Icons.Default.CloudDone, Color(0xFF4CAF50), "Đã đồng bộ")
                            "syncing" -> Triple(Icons.Default.Sync, Color(0xFF2196F3), "Đang đồng bộ")
                            "failed" -> Triple(Icons.Default.CloudOff, Color(0xFFf44336), "Lỗi")
                            else -> Triple(Icons.Default.Cloud, Color(0xFFFF9800), "Chờ") // pending
                        }
                        Button(
                            onClick = onSyncOrder,
                            enabled = !isSyncing && order.syncStatus != "synced",
                            colors = ButtonDefaults.buttonColors(
                                containerColor = syncStatusInfo.second.copy(alpha = 0.9f),
                                disabledContainerColor = syncStatusInfo.second.copy(alpha = 0.5f)
                            ),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                            modifier = Modifier.height(36.dp)
                        ) {
                            Icon(
                                syncStatusInfo.first,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isSyncing) "Đang..." else syncStatusInfo.third,
                                fontSize = 10.sp
                            )
                        }

                        // Reprint button (only for completed orders)
                        if (isCompleted) {
                            Button(
                                onClick = onReprintBill,
                                enabled = !isPrinting,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF2196F3)
                                ),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                                modifier = Modifier.height(36.dp)
                            ) {
                                Icon(
                                    Icons.Default.Print,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    if (isPrinting) "Đang in..." else "In lại bill",
                                    fontSize = 11.sp
                                )
                            }
                        }

                        // Cancel button (only for completed orders)
                        if (isCompleted) {
                            Button(
                                onClick = { showCancelDialog = true },
                                enabled = !isCancelling,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFFf44336)
                                ),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                                modifier = Modifier.height(36.dp)
                            ) {
                                Icon(
                                    Icons.Default.Cancel,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    if (isCancelling) "Đang huỷ..." else "Huỷ đơn",
                                    fontSize = 11.sp
                                )
                            }
                        }

                        // Status badge
                        Box(
                            modifier = Modifier
                                .background(
                                    color = statusColor.copy(alpha = 0.1f),
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = statusText,
                                color = statusColor,
                                fontWeight = FontWeight.Medium,
                                fontSize = 11.sp
                            )
                        }

                        // Close button
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Đóng",
                                tint = Color.Gray
                            )
                        }
                    }
                }

                // Print message
                if (!printMessage.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                color = if (printMessage.contains("thành công")) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                                shape = RoundedCornerShape(6.dp)
                            )
                            .padding(8.dp)
                    ) {
                        Text(
                            text = printMessage,
                            fontSize = 12.sp,
                            color = if (printMessage.contains("thành công")) Color(0xFF2E7D32) else Color(0xFFC62828)
                        )
                    }
                }

                // Sync message
                if (!syncMessage.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                color = if (syncMessage.contains("Lỗi")) Color(0xFFFFEBEE) else Color(0xFFFFF3E0),
                                shape = RoundedCornerShape(6.dp)
                            )
                            .padding(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (syncMessage.contains("Lỗi")) Icons.Default.CloudOff else Icons.Default.Cloud,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = if (syncMessage.contains("Lỗi")) Color(0xFFC62828) else Color(0xFFE65100)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = syncMessage,
                                fontSize = 12.sp,
                                color = if (syncMessage.contains("Lỗi")) Color(0xFFC62828) else Color(0xFFE65100)
                            )
                        }
                    }
                }

                // Cancel message
                if (!cancelMessage.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                color = if (cancelMessage.contains("thành công")) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                                shape = RoundedCornerShape(6.dp)
                            )
                            .padding(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Cancel,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = if (cancelMessage.contains("thành công")) Color(0xFF2E7D32) else Color(0xFFC62828)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = cancelMessage,
                                fontSize = 12.sp,
                                color = if (cancelMessage.contains("thành công")) Color(0xFF2E7D32) else Color(0xFFC62828)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                Divider()
                Spacer(modifier = Modifier.height(12.dp))

                // Order Info - 2 columns like web
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Left column
                    Column(modifier = Modifier.weight(1f)) {
                        InfoRowCompact(label = "Mã đơn", value = order.orderNumber.takeLast(8))
                        InfoRowCompact(label = "Bàn", value = order.tableName ?: "---")
                        InfoRowCompact(label = "Giờ vào", value = formatDateTime(parseTimestamp(order.createdAt)))
                        if (!order.notes.isNullOrEmpty()) {
                            InfoRowCompact(label = "Ghi chú", value = order.notes)
                        }
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    // Right column
                    Column(modifier = Modifier.weight(1f)) {
                        InfoRowCompact(label = "Thu ngân", value = order.staffName ?: "---")
                        InfoRowCompact(label = "Số khách", value = "${order.guestCount} khách")
                        order.completedAt?.let {
                            InfoRowCompact(label = "Giờ ra", value = formatDateTime(parseTimestamp(it)))
                        }
                        if (!order.paymentMethod.isNullOrEmpty()) {
                            InfoRowCompact(label = "Thanh toán", value = getPaymentMethodName(order.paymentMethod))
                        }
                    }
                }

                if (!isCompleted && !order.cancelReason.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Lý do hủy: ${order.cancelReason}",
                        fontSize = 12.sp,
                        color = Color(0xFFf44336),
                        fontStyle = FontStyle.Italic
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
                Divider()
                Spacer(modifier = Modifier.height(12.dp))

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

                            // Show item discount if any
                            if (item.discountAmount > 0) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(start = 32.dp, top = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Show discount label based on type
                                    val discountLabel = if (item.discountType == "percent" && item.discountValue > 0) {
                                        "→ Giảm ${item.discountValue.toInt()}%"
                                    } else {
                                        "→ Giảm giá"
                                    }
                                    Text(
                                        text = discountLabel,
                                        fontSize = 12.sp,
                                        color = Color(0xFF4CAF50),
                                        fontWeight = FontWeight.Medium
                                    )
                                    Text(
                                        text = "-${formatCurrency(item.discountAmount.toLong())}",
                                        fontSize = 12.sp,
                                        color = Color(0xFF4CAF50),
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Divider()
                Spacer(modifier = Modifier.height(12.dp))

                // Calculate discount breakdown
                val itemDiscountTotal = orderItems.sumOf { it.discountAmount }
                val totalDiscount = order.discountAmount
                val billDiscount = (totalDiscount - itemDiscountTotal).coerceAtLeast(0.0)

                // Parse coupon info from appliedCouponsJson if available
                val couponCode = order.couponCode
                val hasCoupon = !couponCode.isNullOrEmpty()

                // VAT calculation (assuming prices include VAT at 8% for F&B)
                val vatRate = 8.0
                val priceAfterDiscount = order.subtotal - totalDiscount
                val priceBeforeVat = priceAfterDiscount / (1 + vatRate / 100)
                val vatAmount = priceAfterDiscount - priceBeforeVat

                // Totals - Always show subtotal
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Tạm tính", color = Color.Gray)
                    Text(formatCurrency(order.subtotal.toLong()))
                }

                // Show item discount if > 0
                if (itemDiscountTotal > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Giảm giá món", color = Color(0xFF4CAF50), fontSize = 14.sp)
                        Text("-${formatCurrency(itemDiscountTotal.toLong())}", color = Color(0xFF4CAF50), fontSize = 14.sp)
                    }
                }

                // Show bill discount if > 0
                if (billDiscount > 0 && !hasCoupon) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Giảm giá hóa đơn", color = Color(0xFF4CAF50), fontSize = 14.sp)
                        Text("-${formatCurrency(billDiscount.toLong())}", color = Color(0xFF4CAF50), fontSize = 14.sp)
                    }
                }

                // Show coupon discount if coupon was applied
                if (hasCoupon && billDiscount > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Mã giảm giá ($couponCode)", color = Color(0xFF2196F3), fontSize = 14.sp)
                        Text("-${formatCurrency(billDiscount.toLong())}", color = Color(0xFF2196F3), fontSize = 14.sp)
                    }
                }

                // Show total discount if there are multiple discount types
                if (totalDiscount > 0 && (itemDiscountTotal > 0 && billDiscount > 0)) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tổng giảm giá", fontWeight = FontWeight.Medium, fontSize = 14.sp)
                        Text("-${formatCurrency(totalDiscount.toLong())}", color = Color(0xFF4CAF50), fontWeight = FontWeight.Medium, fontSize = 14.sp)
                    }
                }

                // VAT info
                Spacer(modifier = Modifier.height(8.dp))
                Divider(color = Color.LightGray.copy(alpha = 0.5f))
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Giá trước VAT", color = Color.Gray, fontSize = 13.sp)
                    Text(formatCurrency(priceBeforeVat.toLong()), fontSize = 13.sp)
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("VAT (${vatRate.toInt()}%)", color = Color.Gray, fontSize = 13.sp)
                    Text(formatCurrency(vatAmount.toLong()), fontSize = 13.sp)
                }

                Spacer(modifier = Modifier.height(8.dp))
                Divider()
                Spacer(modifier = Modifier.height(8.dp))

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

                // Show payment info if completed
                if (isCompleted && order.paidAmount > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tiền khách đưa", color = Color.Gray, fontSize = 13.sp)
                        Text(formatCurrency(order.paidAmount.toLong()), fontSize = 13.sp)
                    }
                    if (order.changeAmount > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Tiền thừa", color = Color.Gray, fontSize = 13.sp)
                            Text(formatCurrency(order.changeAmount.toLong()), fontSize = 13.sp)
                        }
                    }
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

@Composable
private fun InfoRowCompact(
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.padding(vertical = 2.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            color = Color.Gray,
            modifier = Modifier.width(60.dp)
        )
        Text(
            text = value,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private fun formatCurrency(amount: Long): String {
    val formatter = NumberFormat.getNumberInstance(Locale("vi", "VN"))
    return "${formatter.format(amount)}đ"
}

private fun formatCurrencyShort(amount: Long): String {
    return if (amount == 0L) {
        "0"
    } else {
        NumberFormat.getNumberInstance(Locale("vi", "VN")).format(amount)
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
