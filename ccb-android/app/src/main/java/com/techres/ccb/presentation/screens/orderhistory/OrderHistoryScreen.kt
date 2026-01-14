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
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.runtime.mutableStateMapOf
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
import com.techres.ccb.util.AppliedCouponInfo
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
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

    // State for expandable items (collapsed by default)
    val expandedItems = remember { mutableStateMapOf<String, Boolean>() }

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
                .fillMaxHeight(0.9f)
                .padding(8.dp),
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // ========== HEADER ==========
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF5F5F5))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Title + Order number
                    Column {
                        Text(
                            text = "Chi tiết đơn hàng",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "#${order.orderNumber.takeLast(8)}",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Status badge
                        Box(
                            modifier = Modifier
                                .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(statusText, color = statusColor, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }

                        // Close button
                        IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                            Icon(Icons.Default.Close, "Đóng", tint = Color.Gray)
                        }
                    }
                }

                // ========== ACTION BUTTONS (compact row) ==========
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Sync status icon (compact)
                    val syncInfo = when (order.syncStatus) {
                        "synced" -> Triple(Icons.Default.CloudDone, Color(0xFF4CAF50), "Đã đồng bộ")
                        "syncing" -> Triple(Icons.Default.Sync, Color(0xFF2196F3), "Đang...")
                        "failed" -> Triple(Icons.Default.CloudOff, Color(0xFFf44336), "Lỗi")
                        else -> Triple(Icons.Default.Cloud, Color(0xFFFF9800), "Chờ")
                    }
                    IconButton(
                        onClick = onSyncOrder,
                        enabled = !isSyncing && order.syncStatus != "synced",
                        modifier = Modifier
                            .size(32.dp)
                            .background(syncInfo.second.copy(alpha = 0.1f), CircleShape)
                    ) {
                        Icon(syncInfo.first, syncInfo.third, tint = syncInfo.second, modifier = Modifier.size(18.dp))
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    // Reprint button (compact)
                    if (isCompleted) {
                        OutlinedButton(
                            onClick = onReprintBill,
                            enabled = !isPrinting,
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Icon(Icons.Default.Print, null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (isPrinting) "Đang in..." else "In lại", fontSize = 12.sp)
                        }
                    }

                    // Cancel button (compact)
                    if (isCompleted) {
                        OutlinedButton(
                            onClick = { showCancelDialog = true },
                            enabled = !isCancelling,
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFf44336)),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Icon(Icons.Default.Cancel, null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (isCancelling) "Đang..." else "Huỷ đơn", fontSize = 12.sp)
                        }
                    }
                }

                // ========== MESSAGES ==========
                Column(modifier = Modifier.padding(horizontal = 12.dp)) {
                    listOf(
                        printMessage to (printMessage?.contains("thành công") == true),
                        syncMessage to (syncMessage?.contains("Lỗi") != true),
                        cancelMessage to (cancelMessage?.contains("thành công") == true)
                    ).forEach { (msg, isSuccess) ->
                        if (!msg.isNullOrEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 4.dp)
                                    .background(
                                        if (isSuccess) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                                        RoundedCornerShape(4.dp)
                                    )
                                    .padding(8.dp)
                            ) {
                                Text(msg, fontSize = 12.sp, color = if (isSuccess) Color(0xFF2E7D32) else Color(0xFFC62828))
                            }
                        }
                    }
                }

                Divider(color = Color.LightGray.copy(alpha = 0.5f))

                // ========== SCROLLABLE CONTENT ==========
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 12.dp)
                ) {
                    // Order Info - Compact grid
                    item {
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.weight(1f)) {
                                CompactInfo("Bàn", order.tableName ?: "---")
                                CompactInfo("Thu ngân", order.staffName ?: "---")
                                CompactInfo("Giờ vào", formatDateTime(parseTimestamp(order.createdAt)))
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                CompactInfo("Số khách", "${order.guestCount}")
                                CompactInfo("Thanh toán", getPaymentMethodName(order.paymentMethod))
                                order.completedAt?.let { CompactInfo("Giờ ra", formatDateTime(parseTimestamp(it))) }
                            }
                        }

                        if (!isCompleted && !order.cancelReason.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("Lý do hủy: ${order.cancelReason}", fontSize = 12.sp, color = Color(0xFFf44336), fontStyle = FontStyle.Italic)
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Divider(color = Color.LightGray.copy(alpha = 0.5f))
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Items header
                    item {
                        Text("Danh sách món (${orderItems.filter { !it.isComboChild }.size})", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Items List - Collapsible
                    val parentItems = orderItems.filter { !it.isComboChild }
                    val comboChildrenMap = orderItems.filter { it.isComboChild }.groupBy { it.comboParentId }

                    items(parentItems) { item ->
                        val comboChildren = if (item.isComboParent) comboChildrenMap[item.id] ?: emptyList() else emptyList()
                        val hasDetails = !item.notes.isNullOrBlank() || comboChildren.isNotEmpty() || item.discountAmount > 0
                        val isExpanded = expandedItems[item.id] ?: false

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFFAFAFA))
                                .clickable(enabled = hasDetails) { expandedItems[item.id] = !isExpanded }
                                .padding(8.dp)
                        ) {
                            // Main row: Qty + Name + Price
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                                    // Quantity badge
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .background(Color(0xFFE3F2FD), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(item.quantity.toString(), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1976D2))
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(item.productName, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                        Text(formatCurrency(item.unitPrice.toLong()), fontSize = 11.sp, color = Color.Gray)
                                    }
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        formatCurrency(item.totalPrice.toLong()),
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF1976D2)
                                    )
                                    if (item.discountAmount > 0) {
                                        Text(
                                            "-${formatCurrency(item.discountAmount.toLong())}",
                                            fontSize = 11.sp,
                                            color = Color(0xFF4CAF50)
                                        )
                                    }
                                }

                                // Expand icon
                                if (hasDetails) {
                                    Icon(
                                        if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp),
                                        tint = Color.Gray
                                    )
                                }
                            }

                            // Expandable details
                            if (isExpanded && hasDetails) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Divider(color = Color.LightGray.copy(alpha = 0.3f))
                                Spacer(modifier = Modifier.height(8.dp))

                                // Variants/Toppings
                                if (!item.notes.isNullOrBlank()) {
                                    val parts = item.notes.split(" | ")
                                    val variantsPart = parts.firstOrNull() ?: ""
                                    val userNote = parts.getOrNull(1)

                                    val variants = variantsPart.split(",").map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("Ghi chú:") }
                                    variants.forEach { variant ->
                                        val colonIndex = variant.lastIndexOf(":")
                                        val name = if (colonIndex > 0) variant.substring(0, colonIndex) else variant
                                        val price = if (colonIndex > 0) variant.substring(colonIndex + 1).toLongOrNull() ?: 0L else 0L

                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("• $name", fontSize = 12.sp, color = Color(0xFF616161))
                                            if (price > 0) Text("+${formatCurrency(price)}", fontSize = 12.sp, color = Color.Gray)
                                        }
                                    }

                                    if (!userNote.isNullOrBlank()) {
                                        Text(userNote, fontSize = 11.sp, fontStyle = FontStyle.Italic, color = Color(0xFF757575), modifier = Modifier.padding(top = 4.dp))
                                    }
                                }

                                // Combo children
                                if (comboChildren.isNotEmpty()) {
                                    Text("Bao gồm:", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Color(0xFFE65100), modifier = Modifier.padding(top = 4.dp))
                                    comboChildren.forEach { child ->
                                        Text("  • ${child.productName} x${child.quantity}", fontSize = 12.sp, color = Color(0xFF616161))
                                    }
                                }

                                // Discount detail - làm rõ loại giảm giá
                                if (item.discountAmount > 0) {
                                    val discountLabel = when {
                                        item.discountType == "percent" && item.discountValue > 0 -> "Giảm ${item.discountValue.toInt()}%"
                                        item.discountType == "amount" || item.discountType == "cash" -> "Giảm tiền mặt"
                                        else -> "Giảm giá"
                                    }
                                    val discountTypeText = when (item.discountType) {
                                        "percent" -> "(Phần trăm)"
                                        "amount", "cash" -> "(Tiền mặt)"
                                        else -> ""
                                    }
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row {
                                            Text("→ $discountLabel", fontSize = 12.sp, color = Color(0xFF4CAF50), fontWeight = FontWeight.Medium)
                                            if (discountTypeText.isNotEmpty()) {
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text(discountTypeText, fontSize = 10.sp, color = Color(0xFF81C784))
                                            }
                                        }
                                        Text("-${formatCurrency(item.discountAmount.toLong())}", fontSize = 12.sp, color = Color(0xFF4CAF50), fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                        }
                    }

                    // Spacer before summary
                    item { Spacer(modifier = Modifier.height(12.dp)) }
                }

                // ========== SUMMARY FOOTER ==========
                Divider()
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF5F5F5))
                        .padding(12.dp)
                ) {
                    // Calculate discount breakdown
                    val itemDiscountTotal = orderItems.sumOf { it.discountAmount }
                    val totalDiscount = order.discountAmount
                    val vatRate = 8.0
                    val priceAfterDiscount = order.subtotal - totalDiscount
                    val priceBeforeVat = priceAfterDiscount / (1 + vatRate / 100)
                    val vatAmount = priceAfterDiscount - priceBeforeVat

                    // Parse applied coupons from JSON
                    val appliedCoupons: List<AppliedCouponInfo> = try {
                        if (!order.appliedCouponsJson.isNullOrEmpty()) {
                            val type = object : TypeToken<List<AppliedCouponInfo>>() {}.type
                            Gson().fromJson(order.appliedCouponsJson, type)
                        } else emptyList()
                    } catch (e: Exception) {
                        emptyList()
                    }

                    // Calculate coupon discount total
                    val couponDiscountTotal = appliedCoupons.sumOf { it.discountAmount }
                    // Bill discount (excluding items and coupons)
                    val billDiscount = (totalDiscount - itemDiscountTotal - couponDiscountTotal).coerceAtLeast(0.0)

                    // Subtotal
                    SummaryRow("Tạm tính", formatCurrency(order.subtotal.toLong()))

                    // Item discounts
                    if (itemDiscountTotal > 0) {
                        SummaryRow("Giảm giá món", "-${formatCurrency(itemDiscountTotal.toLong())}", Color(0xFF4CAF50))
                    }

                    // Coupon discounts - hiển thị từng coupon riêng biệt
                    appliedCoupons.forEach { coupon ->
                        val couponLabel = buildString {
                            append("Coupon: ${coupon.code}")
                            when (coupon.discountType) {
                                "percentage" -> append(" (${coupon.discountValue.toInt()}%)")
                                "fixed" -> append(" (Tiền mặt)")
                            }
                        }
                        SummaryRow(couponLabel, "-${formatCurrency(coupon.discountAmount.toLong())}", Color(0xFF2196F3))
                    }

                    // Bill discount (if any remaining after coupons)
                    if (billDiscount > 0) {
                        SummaryRow("Giảm giá HĐ", "-${formatCurrency(billDiscount.toLong())}", Color(0xFF4CAF50))
                    }

                    // VAT
                    SummaryRow("VAT (${vatRate.toInt()}%)", formatCurrency(vatAmount.toLong()), Color.Gray)

                    Spacer(modifier = Modifier.height(4.dp))
                    Divider()
                    Spacer(modifier = Modifier.height(4.dp))

                    // Total
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("TỔNG CỘNG", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text(
                            formatCurrency(order.totalAmount.toLong()),
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = if (isCompleted) Color(0xFF4CAF50) else Color.Gray
                        )
                    }

                    // Payment info
                    if (isCompleted && order.paidAmount > 0) {
                        SummaryRow("Khách đưa", formatCurrency(order.paidAmount.toLong()))
                        if (order.changeAmount > 0) {
                            SummaryRow("Tiền thừa", formatCurrency(order.changeAmount.toLong()))
                        }
                    }
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

@Composable
private fun CompactInfo(label: String, value: String) {
    Row(modifier = Modifier.padding(vertical = 2.dp)) {
        Text(label, fontSize = 11.sp, color = Color.Gray, modifier = Modifier.width(70.dp))
        Text(value, fontSize = 11.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun SummaryRow(label: String, value: String, color: Color = Color.Unspecified) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 13.sp, color = if (color != Color.Unspecified) color else Color.Gray)
        Text(value, fontSize = 13.sp, color = if (color != Color.Unspecified) color else Color.Unspecified)
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
