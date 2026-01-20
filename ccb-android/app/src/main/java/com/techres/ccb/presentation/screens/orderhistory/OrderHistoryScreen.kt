package com.techres.ccb.presentation.screens.orderhistory

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.heightIn
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
import com.techres.ccb.presentation.components.PosTopAppBar
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.UnfoldMore
import androidx.compose.material.icons.filled.UnfoldLess
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.runtime.mutableStateMapOf
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
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.rememberDatePickerState
import java.time.Instant
import java.time.ZoneId
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderHistoryScreen(
    onBack: () -> Unit,
    viewModel: OrderHistoryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            PosTopAppBar(
                title = { Text("Lịch sử đơn hàng", fontSize = 16.sp) },
                onBack = onBack,
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
                }
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
                customStartDate = uiState.customStartDate,
                customEndDate = uiState.customEndDate,
                onStatusFilterChange = { viewModel.setStatusFilter(it) },
                onDateFilterChange = { viewModel.setDateFilter(it) },
                onShowStartDatePicker = { viewModel.showDatePicker("start") },
                onShowEndDatePicker = { viewModel.showDatePicker("end") }
            )

            // Date Picker Dialog
            if (uiState.showDatePicker) {
                val initialDate = if (uiState.datePickerType == "start") {
                    uiState.customStartDate ?: LocalDate.now()
                } else {
                    uiState.customEndDate ?: LocalDate.now()
                }
                val datePickerState = rememberDatePickerState(
                    initialSelectedDateMillis = initialDate.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
                )

                DatePickerDialog(
                    onDismissRequest = { viewModel.hideDatePicker() },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                datePickerState.selectedDateMillis?.let { millis ->
                                    val selectedDate = Instant.ofEpochMilli(millis)
                                        .atZone(ZoneId.systemDefault())
                                        .toLocalDate()
                                    if (uiState.datePickerType == "start") {
                                        viewModel.setCustomStartDate(selectedDate)
                                    } else {
                                        viewModel.setCustomEndDate(selectedDate)
                                    }
                                }
                            }
                        ) {
                            Text("Chọn")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { viewModel.hideDatePicker() }) {
                            Text("Hủy")
                        }
                    }
                ) {
                    DatePicker(state = datePickerState)
                }
            }

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
                    // Sorting toolbar
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.White)
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        var sortExpanded by remember { mutableStateOf(false) }
                        Box {
                            Surface(
                                onClick = { sortExpanded = true },
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFF37474F),
                                modifier = Modifier.height(30.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Sắp xếp: ${uiState.sortOption.displayName}", fontSize = 12.sp, color = Color.White)
                                    Icon(Icons.Default.KeyboardArrowDown, null, modifier = Modifier.size(16.dp), tint = Color.White)
                                }
                            }
                            DropdownMenu(expanded = sortExpanded, onDismissRequest = { sortExpanded = false }) {
                                SortOption.entries.forEach { option ->
                                    DropdownMenuItem(
                                        text = { Text(option.displayName, fontSize = 14.sp) },
                                        onClick = { viewModel.setSortOption(option); sortExpanded = false }
                                    )
                                }
                            }
                        }
                    }

                    // Table Header - Professional financial layout
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(scrollState)
                            .background(Color(0xFFF5F5F5))
                            .padding(vertical = 10.dp, horizontal = 8.dp)
                    ) {
                        TableHeaderCell("STT", 40.dp)
                        TableHeaderCell("MÃ HÓA ĐƠN", 115.dp)  // Wider for full order number
                        TableHeaderCell("NGÀY GIỜ", 90.dp)     // Date + Time
                        TableHeaderCell("BÀN", 50.dp)
                        TableHeaderCell("LOẠI", 55.dp)         // Order type
                        TableHeaderCell("GIÁ BÁN", 85.dp)      // Subtotal before discount
                        TableHeaderCell("GIẢM GIÁ", 75.dp)     // Total discount
                        TableHeaderCell("SAU GIẢM", 85.dp)     // After discount
                        TableHeaderCell("VAT", 90.dp)          // VAT amount
                        TableHeaderCell("TỔNG", 90.dp)         // Final total
                        TableHeaderCell("", 40.dp)             // Sync status (icon only)
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

                    // Financial Summary Row (for all filtered orders)
                    if (uiState.allOrders.isNotEmpty()) {
                        val completedOrders = uiState.allOrders.filter { it.status == "completed" }
                        val cancelledCount = uiState.allOrders.count { it.status == "cancelled" }
                        val totalSubtotal = completedOrders.sumOf { it.subtotal }
                        val totalDiscount = completedOrders.sumOf { it.discountAmount }
                        val totalAfterDiscount = (totalSubtotal - totalDiscount).coerceAtLeast(0L)
                        val vatRate = 8.0
                        // Tính VAT: nếu database có giá trị thì dùng, không thì tính từ giá sau giảm + phụ thu
                        val totalVat = completedOrders.sumOf { order ->
                            if (order.vatAmount > 0) {
                                order.vatAmount.toLong()
                            } else {
                                // Tính VAT từ giá sau giảm
                                val afterDiscount = (order.subtotal - order.discountAmount).coerceAtLeast(0L)
                                val beforeVat = (afterDiscount / (1 + vatRate / 100)).toLong()
                                val itemsVat = afterDiscount - beforeVat
                                // Tính VAT từ phụ thu
                                val surchargeVat = if (order.surchargeAmount > 0) {
                                    val surchargeBeforeVat = (order.surchargeAmount / (1 + vatRate / 100)).toLong()
                                    order.surchargeAmount.toLong() - surchargeBeforeVat
                                } else 0L
                                itemsVat + surchargeVat
                            }
                        }
                        val totalRevenue = completedOrders.sumOf { it.totalAmount }

                        Divider(color = MaterialTheme.colorScheme.primary, thickness = 1.dp)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(scrollState)
                                .background(Color(0xFFE3F2FD))
                                .padding(vertical = 10.dp, horizontal = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Label showing completed vs cancelled count
                            Text("TỔNG", modifier = Modifier.width(40.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                            Column(modifier = Modifier.width(115.dp)) {
                                Text("${completedOrders.size} hoàn tất", fontSize = 9.sp, color = Color(0xFF4CAF50), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                                if (cancelledCount > 0) {
                                    Text("$cancelledCount đã hủy", fontSize = 9.sp, color = Color(0xFFf44336), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                                }
                            }
                            Text("", modifier = Modifier.width(90.dp))  // NGÀY GIỜ column
                            Text("", modifier = Modifier.width(50.dp))  // BÀN column
                            Text("", modifier = Modifier.width(55.dp))  // LOẠI column
                            // Totals (only from completed orders)
                            Text(formatCurrencyShort(totalSubtotal), modifier = Modifier.width(85.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
                            Text(formatCurrencyShort(totalDiscount), modifier = Modifier.width(75.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4CAF50), textAlign = TextAlign.End)
                            Text(formatCurrencyShort(totalAfterDiscount), modifier = Modifier.width(85.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
                            Text(formatCurrency(totalVat), modifier = Modifier.width(90.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF757575), textAlign = TextAlign.End)
                            Text(formatCurrencyShort(totalRevenue), modifier = Modifier.width(90.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1976D2), textAlign = TextAlign.End)
                            Text("", modifier = Modifier.width(40.dp))
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
    customStartDate: LocalDate?,
    customEndDate: LocalDate?,
    onStatusFilterChange: (OrderHistoryFilter) -> Unit,
    onDateFilterChange: (DateFilter) -> Unit,
    onShowStartDatePicker: () -> Unit,
    onShowEndDatePicker: () -> Unit
) {
    val dateFormatter = remember { DateTimeFormatter.ofPattern("dd/MM/yyyy") }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFF5F5F5))
    ) {
        // Single row: Status filters on left, dropdowns on right
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left side: Status filters (Tất cả / Hoàn tất / Đã hủy)
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OrderHistoryFilter.entries.forEach { filter ->
                    FilterChip(
                        selected = statusFilter == filter,
                        onClick = { onStatusFilterChange(filter) },
                        label = { Text(filter.displayName, fontSize = 12.sp) },
                        modifier = Modifier.height(32.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                        )
                    )
                }
            }

            // Right side: Date filter dropdown
            var dateExpanded by remember { mutableStateOf(false) }
            Box {
                FilterChip(
                    selected = true,
                    onClick = { dateExpanded = true },
                    label = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(dateFilter.displayName, fontSize = 12.sp)
                            Icon(Icons.Default.KeyboardArrowDown, null, modifier = Modifier.size(18.dp))
                        }
                    },
                    modifier = Modifier.height(32.dp),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.secondary,
                        selectedLabelColor = MaterialTheme.colorScheme.onSecondary
                    )
                )
                DropdownMenu(expanded = dateExpanded, onDismissRequest = { dateExpanded = false }) {
                    DateFilter.entries.forEach { filter ->
                        DropdownMenuItem(
                            text = { Text(filter.displayName, fontSize = 14.sp) },
                            onClick = { onDateFilterChange(filter); dateExpanded = false }
                        )
                    }
                }
            }
        }

        // Custom date range (only when CUSTOM selected)
        if (dateFilter == DateFilter.CUSTOM) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Từ:", fontSize = 12.sp, color = Color.Gray)
                Surface(
                    modifier = Modifier.clickable { onShowStartDatePicker() },
                    shape = RoundedCornerShape(4.dp),
                    color = Color.White,
                    shadowElevation = 1.dp
                ) {
                    Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.DateRange, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(customStartDate?.format(dateFormatter) ?: "Chọn ngày", fontSize = 12.sp)
                    }
                }
                Text("Đến:", fontSize = 12.sp, color = Color.Gray)
                Surface(
                    modifier = Modifier.clickable { onShowEndDatePicker() },
                    shape = RoundedCornerShape(4.dp),
                    color = Color.White,
                    shadowElevation = 1.dp
                ) {
                    Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.DateRange, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(customEndDate?.format(dateFormatter) ?: "Chọn ngày", fontSize = 12.sp)
                    }
                }
            }
        }

        Divider(color = Color.LightGray.copy(alpha = 0.5f))
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
    val isCancelled = order.status == "cancelled"
    val rowBackground = when {
        isCancelled -> Color(0xFFFFEBEE).copy(alpha = 0.5f)
        index % 2 == 0 -> Color.White
        else -> Color(0xFFFAFAFA)
    }

    // === FINANCIAL CALCULATIONS (Vietnamese Tax Law) ===
    // VAT is calculated on price AFTER discount + surcharge VAT
    // Formula: priceAfterDiscount = subtotal - discount
    //          itemsVAT = priceAfterDiscount - (priceAfterDiscount / 1.08)
    //          surchargeVAT = surchargeAmount - (surchargeAmount / 1.08)
    //          totalVAT = itemsVAT + surchargeVAT
    val vatRate = 8.0
    val priceAfterDiscount = (order.subtotal - order.discountAmount).coerceAtLeast(0L)
    val priceBeforeVat = (priceAfterDiscount / (1 + vatRate / 100)).toLong()
    val itemsVat = priceAfterDiscount - priceBeforeVat

    // Tính VAT của phụ thu (surcharge không bị giảm giá)
    val surchargeVat = if (order.surchargeAmount > 0) {
        val surchargeBeforeVat = (order.surchargeAmount / (1 + vatRate / 100)).toLong()
        order.surchargeAmount.toLong() - surchargeBeforeVat
    } else 0L

    // Tổng VAT = VAT món + VAT phụ thu
    val calculatedVat = itemsVat + surchargeVat

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState)
            .background(rowBackground)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp, horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // STT
        Text(
            text = index.toString(),
            modifier = Modifier.width(40.dp),
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
            color = if (isCancelled) Color.Gray else Color.Unspecified
        )

        // Mã hóa đơn (Daily order number + order ID)
        Column(
            modifier = Modifier.width(115.dp)
        ) {
            // Daily order number (#0001) - main display
            Text(
                text = order.displayNumber,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Start,
                color = if (isCancelled) Color.Gray else Color(0xFFE65100),
                maxLines = 1
            )
            // Full order number (HD...) - secondary
            Text(
                text = order.orderNumber,
                fontSize = 9.sp,
                textAlign = TextAlign.Start,
                color = if (isCancelled) Color.Gray.copy(alpha = 0.7f) else Color(0xFF757575),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        // Ngày giờ (Date + Time)
        Column(
            modifier = Modifier.width(90.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = formatDateShort(order.createdAt),
                fontSize = 10.sp,
                color = Color.Gray
            )
            Text(
                text = formatTimeOnly(order.createdAt),
                fontSize = 11.sp,
                color = Color.Gray
            )
        }

        // Bàn
        Text(
            text = order.tableName ?: "---",
            modifier = Modifier.width(50.dp),
            fontSize = 11.sp,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )

        // Loại đơn (Order type)
        Text(
            text = when (order.orderType) {
                "dine_in" -> "Tại chỗ"
                "takeaway" -> "Mang đi"
                else -> "---"
            },
            modifier = Modifier.width(55.dp),
            fontSize = 10.sp,
            textAlign = TextAlign.Center,
            color = when (order.orderType) {
                "dine_in" -> Color(0xFF1976D2)
                "takeaway" -> Color(0xFFE65100)
                else -> Color.Gray
            }
        )

        // Giá bán (Subtotal before discount)
        Text(
            text = formatCurrencyShort(order.subtotal),
            modifier = Modifier.width(85.dp),
            fontSize = 12.sp,
            textAlign = TextAlign.End,
            color = if (isCancelled) Color.Gray else Color.Unspecified
        )

        // Giảm giá (Total discount)
        Text(
            text = if (order.discountAmount > 0) formatCurrencyShort(order.discountAmount) else "-",
            modifier = Modifier.width(75.dp),
            fontSize = 12.sp,
            color = if (order.discountAmount > 0) Color(0xFF4CAF50) else Color.LightGray,
            fontWeight = if (order.discountAmount > 0) FontWeight.Medium else FontWeight.Normal,
            textAlign = TextAlign.End
        )

        // Sau giảm (After discount)
        Text(
            text = formatCurrencyShort(priceAfterDiscount),
            modifier = Modifier.width(85.dp),
            fontSize = 12.sp,
            textAlign = TextAlign.End,
            color = if (isCancelled) Color.Gray else Color.Unspecified
        )

        // VAT (Nếu database = 0 thì tính lại từ giá sau giảm + phụ thu)
        val displayVat = if (order.vatAmount > 0) order.vatAmount.toLong() else calculatedVat
        Text(
            text = formatCurrency(displayVat),
            modifier = Modifier.width(90.dp),
            fontSize = 11.sp,
            textAlign = TextAlign.End,
            color = if (isCancelled) Color.Gray else Color(0xFF757575)
        )

        // Tổng (Total amount)
        Text(
            text = formatCurrencyShort(order.totalAmount),
            modifier = Modifier.width(90.dp),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = when {
                isCancelled -> Color(0xFFf44336)
                isCompleted -> Color(0xFF4CAF50)
                else -> Color.Gray
            },
            textAlign = TextAlign.End
        )

        // Đồng bộ (Sync status) - Icon only
        Box(
            modifier = Modifier.width(40.dp),
            contentAlignment = Alignment.Center
        ) {
            val (syncIcon, syncColor, syncDesc) = when (order.syncStatus) {
                "synced" -> Triple(Icons.Default.CloudDone, Color(0xFF4CAF50), "Đã đồng bộ")
                "syncing" -> Triple(Icons.Default.Sync, Color(0xFF2196F3), "Đang đồng bộ")
                "failed" -> Triple(Icons.Default.CloudOff, Color(0xFFf44336), "Lỗi đồng bộ")
                else -> Triple(Icons.Default.Cloud, Color(0xFFFF9800), "Chờ đồng bộ")
            }
            Icon(
                imageVector = syncIcon,
                contentDescription = syncDesc,
                modifier = Modifier.size(16.dp),
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
            // Page size selector - làm to hơn để dễ bấm
            var expanded by remember { mutableStateOf(false) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Hiển thị:", fontSize = 13.sp, color = Color.Gray)
                Spacer(modifier = Modifier.width(8.dp))
                Box {
                    Surface(
                        onClick = { expanded = !expanded },
                        modifier = Modifier.height(40.dp),
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "$pageSize đơn",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                    DropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        listOf(5, 10, 20, 30, 50).forEach { size ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        "$size đơn",
                                        fontSize = 14.sp,
                                        fontWeight = if (size == pageSize) FontWeight.Bold else FontWeight.Normal,
                                        color = if (size == pageSize) MaterialTheme.colorScheme.primary else Color.Unspecified
                                    )
                                },
                                onClick = {
                                    onPageSizeChange(size)
                                    expanded = false
                                },
                                modifier = Modifier.height(44.dp)
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
private fun OrderDetailDialogHeader(
    dailyOrderNumber: Int,
    orderNumber: String,
    isCompleted: Boolean,
    onDismiss: () -> Unit
) {
    val statusColor = remember(isCompleted) { if (isCompleted) Color(0xFF4CAF50) else Color(0xFFf44336) }
    val statusText = remember(isCompleted) { if (isCompleted) "Hoàn tất" else "Đã hủy" }
    val displayNumber = remember(dailyOrderNumber, orderNumber) {
        if (dailyOrderNumber > 0) {
            "#${dailyOrderNumber.toString().padStart(4, '0')}"
        } else {
            "#${orderNumber.takeLast(8)}"
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFF5F5F5))
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "Chi tiết đơn hàng",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = displayNumber,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFE65100)
                )
                Text(
                    text = " · $orderNumber",
                    fontSize = 10.sp,
                    color = Color.Gray
                )
            }
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(statusText, color = statusColor, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            }
            IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Default.Close, "Đóng", tint = Color.Gray)
            }
        }
    }
}

@Composable
private fun OrderDetailActionButtons(
    isCompleted: Boolean,
    syncStatus: String,
    isPrinting: Boolean,
    isSyncing: Boolean,
    isCancelling: Boolean,
    onSyncOrder: () -> Unit,
    onReprintBill: () -> Unit,
    onShowCancelDialog: () -> Unit
) {
    val syncInfo = remember(syncStatus) {
        when (syncStatus) {
            "synced" -> Triple(Icons.Default.CloudDone, Color(0xFF4CAF50), "Đã đồng bộ")
            "syncing" -> Triple(Icons.Default.Sync, Color(0xFF2196F3), "Đang...")
            "failed" -> Triple(Icons.Default.CloudOff, Color(0xFFf44336), "Lỗi")
            else -> Triple(Icons.Default.Cloud, Color(0xFFFF9800), "Chờ")
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        IconButton(
            onClick = onSyncOrder,
            enabled = !isSyncing && syncStatus != "synced",
            modifier = Modifier
                .size(32.dp)
                .background(syncInfo.second.copy(alpha = 0.1f), CircleShape)
        ) {
            Icon(syncInfo.first, syncInfo.third, tint = syncInfo.second, modifier = Modifier.size(18.dp))
        }

        Spacer(modifier = Modifier.weight(1f))

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

            OutlinedButton(
                onClick = onShowCancelDialog,
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
}

@Composable
private fun OrderDetailMessages(
    printMessage: String?,
    syncMessage: String?,
    cancelMessage: String?
) {
    val messages = remember(printMessage, syncMessage, cancelMessage) {
        listOf(
            printMessage to (printMessage?.contains("thành công") == true),
            syncMessage to (syncMessage?.contains("Lỗi") != true),
            cancelMessage to (cancelMessage?.contains("thành công") == true)
        ).filter { it.first != null }
    }

    if (messages.isNotEmpty()) {
        Column(modifier = Modifier.padding(horizontal = 12.dp)) {
            messages.forEach { (msg, isSuccess) ->
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
    }
}

@Composable
private fun OrderDetailSummaryFooter(
    order: OrderEntity,
    orderItems: List<OrderItemEntity>,
    isCompleted: Boolean,
    onShowVatDetail: () -> Unit
) {
    // Memoize all calculations to prevent recalculation on every recomposition
    val summaryData = remember(order, orderItems) {
        val activeOrderItems = orderItems.filter { it.status != "cancelled" && !it.isComboChild }
        val itemDiscountTotal = activeOrderItems.sumOf { it.discountAmount }
        val totalDiscount = order.discountAmount

        val subtotal = order.subtotal
        val afterDiscountRatio = if (subtotal > 0) {
            ((subtotal - totalDiscount).toDouble() / subtotal).coerceIn(0.0, 1.0)
        } else 1.0

        // Calculate VAT
        var vatAmount = 0.0
        activeOrderItems.forEach { item ->
            val toppings = parseVariantsFromNotesStatic(item.notes)
            val toppingsTotal = toppings.sumOf { it.second }
            val actualUnitPrice = (item.totalPrice / item.quantity).toLong()
            val mainUnitPrice = (actualUnitPrice - toppingsTotal).coerceAtLeast(0L)
            val mainPrice = mainUnitPrice * item.quantity

            val mainPriceAfterDiscount = (mainPrice * afterDiscountRatio).toLong()
            if (item.vatRate > 0 && mainPriceAfterDiscount > 0) {
                val priceBeforeVat = (mainPriceAfterDiscount / (1 + item.vatRate / 100.0)).toLong()
                vatAmount += (mainPriceAfterDiscount - priceBeforeVat).toDouble()
            }

            toppings.forEach { (_, toppingPrice) ->
                val toppingTotal = toppingPrice * item.quantity
                val toppingAfterDiscount = (toppingTotal * afterDiscountRatio).toLong()
                if (item.vatRate > 0 && toppingAfterDiscount > 0) {
                    val priceBeforeVat = (toppingAfterDiscount / (1 + item.vatRate / 100.0)).toLong()
                    vatAmount += (toppingAfterDiscount - priceBeforeVat).toDouble()
                }
            }
        }

        if (order.surchargeAmount > 0) {
            val surchargeVatRate = 8.0
            val priceBeforeVat = (order.surchargeAmount / (1 + surchargeVatRate / 100.0)).toLong()
            vatAmount += order.surchargeAmount - priceBeforeVat
        }

        // Parse applied coupons
        val appliedCoupons: List<AppliedCouponInfo> = try {
            if (!order.appliedCouponsJson.isNullOrEmpty()) {
                val type = object : TypeToken<List<AppliedCouponInfo>>() {}.type
                Gson().fromJson(order.appliedCouponsJson, type)
            } else emptyList()
        } catch (e: Exception) {
            emptyList()
        }

        val couponDiscountTotal = appliedCoupons.sumOf { it.discountAmount }
        val billDiscount = (totalDiscount - itemDiscountTotal - couponDiscountTotal).coerceAtLeast(0.0)

        SummaryFooterData(
            subtotal = order.subtotal.toLong(),
            itemDiscountTotal = itemDiscountTotal.toLong(),
            appliedCoupons = appliedCoupons,
            billDiscount = billDiscount.toLong(),
            surchargeAmount = order.surchargeAmount.toLong(),
            vatAmount = vatAmount.toLong(),
            totalAmount = order.totalAmount.toLong(),
            paidAmount = order.paidAmount.toLong(),
            changeAmount = order.changeAmount.toLong()
        )
    }

    Divider()
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFF5F5F5))
            .padding(12.dp)
    ) {
        SummaryRow("Tạm tính (đã gồm VAT)", formatCurrency(summaryData.subtotal))

        if (summaryData.itemDiscountTotal > 0) {
            SummaryRow("Giảm giá món", "-${formatCurrency(summaryData.itemDiscountTotal)}", Color(0xFF4CAF50))
        }

        summaryData.appliedCoupons.forEach { coupon ->
            val couponLabel = buildString {
                append("Coupon: ${coupon.code}")
                when (coupon.discountType) {
                    "percentage" -> append(" (${coupon.discountValue.toInt()}%)")
                    "fixed" -> append(" (Tiền mặt)")
                }
            }
            SummaryRow(couponLabel, "-${formatCurrency(coupon.discountAmount.toLong())}", Color(0xFF2196F3))
        }

        if (summaryData.billDiscount > 0) {
            SummaryRow("Giảm giá HĐ", "-${formatCurrency(summaryData.billDiscount)}", Color(0xFF4CAF50))
        }

        if (summaryData.surchargeAmount > 0) {
            SummaryRow("Phụ thu", "+${formatCurrency(summaryData.surchargeAmount)}", Color(0xFFFF9800))
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onShowVatDetail() }
                .padding(vertical = 2.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Trong đó VAT", fontSize = 13.sp, color = Color.Gray)
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    Icons.Default.Info,
                    contentDescription = "Xem chi tiết VAT",
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            }
            Text(formatCurrency(summaryData.vatAmount), fontSize = 13.sp, color = Color.Gray)
        }

        Spacer(modifier = Modifier.height(4.dp))
        Divider()
        Spacer(modifier = Modifier.height(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("TỔNG CỘNG", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text(
                formatCurrency(summaryData.totalAmount),
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = if (isCompleted) Color(0xFF4CAF50) else Color.Gray
            )
        }

        if (isCompleted && summaryData.paidAmount > 0) {
            SummaryRow("Khách đưa", formatCurrency(summaryData.paidAmount))
            if (summaryData.changeAmount > 0) {
                SummaryRow("Tiền thừa", formatCurrency(summaryData.changeAmount))
            }
        }
    }
}

// Data class to hold summary footer calculations
private data class SummaryFooterData(
    val subtotal: Long,
    val itemDiscountTotal: Long,
    val appliedCoupons: List<AppliedCouponInfo>,
    val billDiscount: Long,
    val surchargeAmount: Long,
    val vatAmount: Long,
    val totalAmount: Long,
    val paidAmount: Long,
    val changeAmount: Long
)

// Static helper function for parsing variants (outside composable)
private fun parseVariantsFromNotesStatic(notes: String?): List<Pair<String, Long>> {
    if (notes.isNullOrEmpty()) return emptyList()
    val variants = mutableListOf<Pair<String, Long>>()
    val parts = notes.split(" | ").firstOrNull()?.takeIf { !it.startsWith("Ghi chú:") } ?: return emptyList()
    parts.split(",").forEach { part ->
        val trimmed = part.trim()
        if (trimmed.isEmpty()) return@forEach
        val priceMatch = Regex("\\(\\+?(\\d[\\d.,]*)\\)").find(trimmed)
        val price = priceMatch?.groupValues?.get(1)?.replace(".", "")?.replace(",", "")?.toLongOrNull() ?: 0L
        if (price > 0) {
            val name = trimmed.replace(priceMatch?.value ?: "", "").trim()
                .removePrefix("+ ").removePrefix("+")
                .let { if (it.contains(":")) it.substringAfter(":").trim() else it }
            variants.add(name to price)
        }
    }
    return variants
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

    // State for VAT detail dialog
    var showVatDetail by remember { mutableStateOf(false) }

    // State for collapsible order info section (default collapsed to prioritize items list)
    var isOrderInfoExpanded by remember { mutableStateOf(false) }

    // Cancel confirmation dialog
    val cancelDisplayNumber = if (order.dailyOrderNumber > 0) {
        "#${order.dailyOrderNumber.toString().padStart(4, '0')}"
    } else {
        "#${order.orderNumber.takeLast(8)}"
    }
    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            title = { Text("Huỷ đơn hàng", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Bạn có chắc muốn huỷ đơn hàng $cancelDisplayNumber?")
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
                // ========== HEADER - Extracted composable ==========
                OrderDetailDialogHeader(
                    dailyOrderNumber = order.dailyOrderNumber,
                    orderNumber = order.orderNumber,
                    isCompleted = isCompleted,
                    onDismiss = onDismiss
                )

                // ========== ACTION BUTTONS - Extracted composable ==========
                OrderDetailActionButtons(
                    isCompleted = isCompleted,
                    syncStatus = order.syncStatus,
                    isPrinting = isPrinting,
                    isSyncing = isSyncing,
                    isCancelling = isCancelling,
                    onSyncOrder = onSyncOrder,
                    onReprintBill = onReprintBill,
                    onShowCancelDialog = { showCancelDialog = true }
                )

                // ========== MESSAGES - Extracted composable ==========
                OrderDetailMessages(
                    printMessage = printMessage,
                    syncMessage = syncMessage,
                    cancelMessage = cancelMessage
                )

                Divider(color = Color.LightGray.copy(alpha = 0.5f))

                // Global expand/collapse state for toppings (must be outside LazyColumn)
                var allToppingsExpanded by remember { mutableStateOf(true) }
                // Per-item expanded state (must be outside LazyColumn to avoid scroll issues)
                val itemToppingsExpanded = remember { mutableStateMapOf<String, Boolean>() }

                // Precompute items lists (must be outside LazyColumn)
                val activeParentItems = orderItems.filter { !it.isComboChild && it.status != "cancelled" }
                val cancelledParentItems = orderItems.filter { !it.isComboChild && it.status == "cancelled" }
                val parentItems = orderItems.filter { !it.isComboChild }.sortedBy { it.status == "cancelled" }
                val comboChildrenMap = orderItems.filter { it.isComboChild }.groupBy { it.comboParentId }

                // ========== SCROLLABLE CONTENT ==========
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 12.dp)
                ) {
                    // Order Info - Collapsible header (compact inline view)
                    item {
                        Spacer(modifier = Modifier.height(8.dp))

                        // Compact inline info: Bàn + Số khách + Thanh toán (always visible)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color(0xFFF0F4F8))
                                .clickable { isOrderInfoExpanded = !isOrderInfoExpanded }
                                .padding(8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Quick info chips
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                // Table chip
                                Text(
                                    "Bàn: ${order.tableName ?: "---"}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF1976D2)
                                )
                                // Guest count
                                Text(
                                    "Khách: ${order.guestCount}",
                                    fontSize = 12.sp,
                                    color = Color(0xFF616161)
                                )
                                // Payment method
                                Text(
                                    getPaymentMethodName(order.paymentMethod),
                                    fontSize = 11.sp,
                                    color = Color.White,
                                    modifier = Modifier
                                        .background(Color(0xFF4CAF50), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }

                            // Expand/collapse icon
                            Icon(
                                imageVector = if (isOrderInfoExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = if (isOrderInfoExpanded) "Thu gọn" else "Xem thêm",
                                modifier = Modifier.size(20.dp),
                                tint = Color.Gray
                            )
                        }

                        // Expandable detail section
                        androidx.compose.animation.AnimatedVisibility(visible = isOrderInfoExpanded) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 8.dp, vertical = 6.dp)
                            ) {
                                Row(modifier = Modifier.fillMaxWidth()) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        CompactInfo("Thu ngân", order.staffName ?: "---")
                                        CompactInfo("Giờ vào", formatDateTime(parseTimestamp(order.createdAt)))
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        order.completedAt?.let { CompactInfo("Giờ ra", formatDateTime(parseTimestamp(it))) }
                                    }
                                }
                            }
                        }

                        if (!isCompleted && !order.cancelReason.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("Lý do hủy: ${order.cancelReason}", fontSize = 12.sp, color = Color(0xFFf44336), fontStyle = FontStyle.Italic)
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Divider(color = Color.LightGray.copy(alpha = 0.5f))
                        Spacer(modifier = Modifier.height(4.dp))
                    }

                    // Items header
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Danh sách món (${activeParentItems.size})", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                if (cancelledParentItems.isNotEmpty()) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("(${cancelledParentItems.size} đã huỷ)", fontSize = 12.sp, color = Color(0xFFf44336))
                                }
                            }
                            // Expand/Collapse all button
                            TextButton(
                                onClick = {
                                    allToppingsExpanded = !allToppingsExpanded
                                    itemToppingsExpanded.clear() // Reset per-item states
                                },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Icon(
                                    imageVector = if (allToppingsExpanded) Icons.Default.UnfoldLess else Icons.Default.UnfoldMore,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = if (allToppingsExpanded) "Thu gọn" else "Mở rộng",
                                    fontSize = 12.sp
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Items List - Match Dashboard design
                    items(parentItems) { item ->
                        val isCancelled = item.status == "cancelled"
                        val comboChildren = if (item.isComboParent) comboChildrenMap[item.id] ?: emptyList() else emptyList()

                        // Parse variants from notes
                        val parts = item.notes?.split(" | ") ?: emptyList()
                        val variantsPart = parts.firstOrNull() ?: ""
                        val userNote = parts.getOrNull(1)
                        val variants = variantsPart.split(",").map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("Ghi chú:") }

                        // Toppings expanded state - per-item state overrides global state
                        // Cancelled items default to collapsed but can still be expanded by user
                        val toppingsExpanded = itemToppingsExpanded[item.id] ?: (if (isCancelled) false else allToppingsExpanded)

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isCancelled) Color(0xFFFFEBEE) else Color(0xFFFAFAFA))
                                .padding(12.dp)
                        ) {
                            // Row 1: Quantity badge + Product name + Total Price
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.Top) {
                                    // Quantity badge
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .background(
                                                if (isCancelled) Color(0xFFFFCDD2) else Color(0xFFE3F2FD),
                                                CircleShape
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            item.quantity.toString(),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isCancelled) Color(0xFFf44336) else Color(0xFF1976D2)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    // Product name with cancelled badge
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            item.productName,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = if (isCancelled) Color(0xFFf44336) else Color.Unspecified,
                                            textDecoration = if (isCancelled) androidx.compose.ui.text.style.TextDecoration.LineThrough else null
                                        )
                                        if (isCancelled) {
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                "ĐÃ HUỶ",
                                                fontSize = 10.sp,
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier
                                                    .background(Color(0xFFf44336), RoundedCornerShape(4.dp))
                                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }
                                Text(
                                    formatCurrency(item.totalPrice.toLong()),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isCancelled) Color(0xFFf44336).copy(alpha = 0.6f) else Color(0xFF1976D2),
                                    textDecoration = if (isCancelled) androidx.compose.ui.text.style.TextDecoration.LineThrough else null
                                )
                            }

                            // Row 2: Base price (indented under product name)
                            Text(
                                formatCurrency(item.unitPrice.toLong()),
                                fontSize = 13.sp,
                                color = if (isCancelled) Color(0xFFf44336).copy(alpha = 0.6f) else Color.Gray,
                                textDecoration = if (isCancelled) androidx.compose.ui.text.style.TextDecoration.LineThrough else null,
                                modifier = Modifier.padding(start = 36.dp, top = 2.dp)
                            )

                            // Row 3: Discount indicator (if has discount)
                            if (item.discountAmount > 0 && !isCancelled) {
                                Text(
                                    "-${formatCurrency(item.discountAmount.toLong())}",
                                    fontSize = 12.sp,
                                    color = Color(0xFF4CAF50),
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(start = 36.dp, top = 2.dp)
                                )
                            }

                            // Row 4: Toppings header - ALWAYS visible when has variants (like Dashboard)
                            if (variants.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(6.dp))

                                // Header showing topping count - clickable to toggle (even for cancelled items)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(4.dp))
                                        .clickable { itemToppingsExpanded[item.id] = !toppingsExpanded }
                                        .padding(start = 36.dp, top = 4.dp, bottom = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = if (toppingsExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                        tint = if (isCancelled) Color(0xFFf44336).copy(alpha = 0.5f) else Color.Gray
                                    )
                                    Text(
                                        text = if (toppingsExpanded) "Tuỳ chọn (${variants.size})" else "Tuỳ chọn (${variants.size}) - Nhấn để xem",
                                        fontSize = 12.sp,
                                        color = if (isCancelled) Color(0xFFf44336).copy(alpha = 0.5f) else Color.Gray,
                                        modifier = Modifier.padding(start = 4.dp)
                                    )
                                }

                                // Row 5: Expanded toppings list
                                if (toppingsExpanded) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(start = 36.dp, top = 4.dp)
                                    ) {
                                        variants.forEach { variant ->
                                            // Parse variant format
                                            var displayName = variant
                                            var price = 0L

                                            // Extract price from "(+xxxxx)" suffix
                                            val priceMatch = Regex("\\s*\\(\\+?(\\d+)\\)\\s*$").find(variant)
                                            if (priceMatch != null) {
                                                price = priceMatch.groupValues[1].toLongOrNull() ?: 0L
                                                displayName = variant.replace(priceMatch.value, "").trim()
                                            } else {
                                                // Try old format "name:price"
                                                val colonIndex = variant.lastIndexOf(":")
                                                if (colonIndex > 0) {
                                                    displayName = variant.substring(0, colonIndex)
                                                    price = variant.substring(colonIndex + 1).toLongOrNull() ?: 0L
                                                }
                                            }

                                            // For toppings starting with "+", remove the "+" prefix
                                            if (displayName.startsWith("+")) {
                                                displayName = displayName.removePrefix("+").trim()
                                            }
                                            // For options with "GroupName: Value" format, show only VALUE
                                            else if (displayName.contains(":")) {
                                                val colonIdx = displayName.indexOf(":")
                                                val value = displayName.substring(colonIdx + 1).trim()
                                                if (value.isNotEmpty()) {
                                                    displayName = value
                                                }
                                            }

                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(vertical = 3.dp),
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
                                                        color = Color.Gray,
                                                        modifier = Modifier.padding(end = 8.dp)
                                                    )
                                                    Text(
                                                        text = displayName,
                                                        fontSize = 14.sp,
                                                        color = Color(0xFF424242)
                                                    )
                                                }
                                                if (price > 0) {
                                                    Text(
                                                        text = "+${formatCurrency(price)}",
                                                        fontSize = 14.sp,
                                                        color = Color(0xFF1976D2),
                                                        fontWeight = FontWeight.Medium
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // User note (always visible if exists)
                            if (!userNote.isNullOrBlank()) {
                                Text(
                                    userNote,
                                    fontSize = 13.sp,
                                    color = Color(0xFF1976D2),
                                    fontStyle = FontStyle.Italic,
                                    modifier = Modifier.padding(start = 36.dp, top = 4.dp)
                                )
                            }

                            // Combo children (always visible if combo)
                            if (comboChildren.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    "Bao gồm:",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFFE65100),
                                    modifier = Modifier.padding(start = 36.dp)
                                )
                                comboChildren.forEach { child ->
                                    Text(
                                        "  • ${child.productName} x${child.quantity}",
                                        fontSize = 12.sp,
                                        color = Color(0xFF616161),
                                        modifier = Modifier.padding(start = 36.dp)
                                    )
                                }
                            }

                            // Cancel reason (show if cancelled)
                            if (isCancelled && !item.cancelReason.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    "Lý do huỷ: ${item.cancelReason}",
                                    fontSize = 12.sp,
                                    color = Color(0xFFf44336),
                                    fontStyle = FontStyle.Italic,
                                    modifier = Modifier.padding(start = 36.dp)
                                )
                            }
                        }
                    }

                    // Phụ thu (Surcharge) items - hiển thị từng món phụ thu riêng nếu có
                    if (order.surchargeAmount > 0) {
                        // Parse surcharges from JSON
                        val surchargeItems: List<SurchargeDisplayItem> = try {
                            if (!order.surchargesJson.isNullOrEmpty()) {
                                val type = object : TypeToken<List<Map<String, Any>>>() {}.type
                                val surchargesList: List<Map<String, Any>> = Gson().fromJson(order.surchargesJson, type)
                                surchargesList.map { map ->
                                    SurchargeDisplayItem(
                                        id = map["id"] as? String ?: "",
                                        name = map["name"] as? String ?: "Phụ thu",
                                        amount = (map["amount"] as? Double) ?: 0.0,
                                        quantity = (map["quantity"] as? Double)?.toInt() ?: 1,
                                        vatRate = (map["vatRate"] as? Double) ?: 0.0
                                    )
                                }
                            } else emptyList()
                        } catch (e: Exception) {
                            emptyList()
                        }

                        if (surchargeItems.isNotEmpty()) {
                            // Hiển thị từng món phụ thu
                            items(surchargeItems) { surchargeItem ->
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFFFFF3E0)) // Light orange background
                                        .padding(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            // Quantity badge
                                            Box(
                                                modifier = Modifier
                                                    .size(24.dp)
                                                    .background(Color(0xFFFFE0B2), CircleShape),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    surchargeItem.quantity.toString(),
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFFFF9800)
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Column {
                                                Text(
                                                    "Phụ thu: ${surchargeItem.name}",
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.Medium,
                                                    color = Color(0xFFE65100)
                                                )
                                                if (surchargeItem.vatRate > 0) {
                                                    Text(
                                                        "Đã gồm VAT ${surchargeItem.vatRate.toInt()}%",
                                                        fontSize = 12.sp,
                                                        color = Color(0xFF757575)
                                                    )
                                                }
                                            }
                                        }
                                        Text(
                                            "+${formatCurrency((surchargeItem.amount * surchargeItem.quantity).toLong())}",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFFFF9800)
                                        )
                                    }
                                }
                            }
                        } else {
                            // Fallback: hiển thị tổng nếu không có chi tiết
                            item {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFFFFF3E0)) // Light orange background
                                        .padding(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            // Icon
                                            Box(
                                                modifier = Modifier
                                                    .size(24.dp)
                                                    .background(Color(0xFFFFE0B2), CircleShape),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    "⊕",
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFFFF9800)
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Column {
                                                Text(
                                                    "Phụ thu",
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.Medium,
                                                    color = Color(0xFFE65100)
                                                )
                                                Text(
                                                    "Phí phụ thu đơn hàng",
                                                    fontSize = 12.sp,
                                                    color = Color(0xFF757575)
                                                )
                                            }
                                        }
                                        Text(
                                            "+${formatCurrency(order.surchargeAmount.toLong())}",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFFFF9800)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Order Note (Ghi chú tổng bill) - hiển thị nếu có
                    if (!order.notes.isNullOrBlank()) {
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFFE3F2FD)) // Light blue background
                                    .padding(12.dp)
                            ) {
                                Text(
                                    "Ghi chú đơn hàng:",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF1976D2)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    order.notes,
                                    fontSize = 14.sp,
                                    color = Color(0xFF424242),
                                    fontStyle = FontStyle.Italic
                                )
                            }
                        }
                    }

                    // Spacer before summary
                    item { Spacer(modifier = Modifier.height(12.dp)) }
                }

                // ========== SUMMARY FOOTER - Extracted composable ==========
                OrderDetailSummaryFooter(
                    order = order,
                    orderItems = orderItems,
                    isCompleted = isCompleted,
                    onShowVatDetail = { showVatDetail = true }
                )
            }
        }
    }

    // VAT Detail Dialog
    if (showVatDetail) {
        HistoryVatDetailDialog(
            orderItems = orderItems,
            subtotal = order.subtotal.toLong(),
            discountAmount = order.discountAmount.toLong(),
            surchargeAmount = order.surchargeAmount.toLong(),
            surchargesJson = order.surchargesJson,
            totalVatAmount = order.vatAmount.toLong(),
            onDismiss = { showVatDetail = false }
        )
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

// Data class for surcharge display
private data class SurchargeDisplayItem(
    val id: String,
    val name: String,
    val amount: Double,
    val quantity: Int = 1,
    val vatRate: Double = 0.0
)

// Data class for VAT detail display
private data class HistoryVatDisplayRow(
    val name: String,
    val quantity: Int,
    val totalPrice: Long,
    val vatRate: Double,
    val vatAmount: Long,
    val isTopping: Boolean = false
)

/**
 * Dialog hiển thị chi tiết VAT cho từng món trong lịch sử đơn hàng
 * Bao gồm cả toppings được parse từ notes field
 */
@Composable
private fun HistoryVatDetailDialog(
    orderItems: List<OrderItemEntity>,
    subtotal: Long,
    discountAmount: Long,
    surchargeAmount: Long = 0,
    surchargesJson: String? = null,
    totalVatAmount: Long,
    onDismiss: () -> Unit
) {
    // Tính tỷ lệ còn lại sau giảm giá (VAT tính trên giá sau giảm - chỉ áp dụng cho items, không áp dụng cho surcharges)
    val afterDiscountRatio = if (subtotal > 0) {
        ((subtotal - discountAmount).toDouble() / subtotal).coerceIn(0.0, 1.0)
    } else 1.0

    // VAT rate mặc định cho phụ thu (8%)
    val surchargeVatRate = 8.0

    // Helper function to parse variants/toppings from notes field
    fun parseVariantsFromNotes(notes: String?, itemVatRate: Double): List<Pair<String, Long>> {
        if (notes.isNullOrBlank()) return emptyList()

        val variants = mutableListOf<Pair<String, Long>>()
        // Remove user note part if present (after " | ")
        val variantsPart = notes.split(" | ").firstOrNull()?.trim() ?: return emptyList()

        // Split by comma
        val parts = variantsPart.split(",").map { it.trim() }

        for (part in parts) {
            if (part.isEmpty()) continue

            // Extract price if present: "...something (+10000)" pattern
            val priceMatch = Regex("""\(\+(\d+)\)""").find(part)
            val price = priceMatch?.groupValues?.get(1)?.toLongOrNull() ?: 0L

            // Determine name based on format
            val name: String
            val isTopping: Boolean

            if (part.startsWith("+")) {
                // Topping format: "+ ToppingName (+price)"
                isTopping = true
                name = part.removePrefix("+").trim()
                    .replace(Regex("""\s*\(\+\d+\)"""), "").trim()
            } else if (part.contains(":")) {
                // Option format: "GroupName: Value (+price)"
                isTopping = false
                val colonParts = part.split(":").map { it.trim() }
                name = if (colonParts.size >= 2) {
                    colonParts[1].replace(Regex("""\s*\(\+\d+\)"""), "").trim()
                } else {
                    part.replace(Regex("""\s*\(\+\d+\)"""), "").trim()
                }
            } else {
                // Unknown format, skip if no price
                continue
            }

            if (name.isNotEmpty() && price > 0) {
                variants.add(Pair(name, price))
            }
        }
        return variants
    }

    // Build flat list: main items + their toppings with VAT (sau giảm giá)
    val vatRows = remember(orderItems, afterDiscountRatio, surchargeAmount, surchargesJson) {
        buildList {
            // Only process active (non-cancelled, non-combo-child) items
            orderItems.filter { it.status != "cancelled" && !it.isComboChild }.forEach { item ->
                // Parse toppings from notes
                val toppings = parseVariantsFromNotes(item.notes, item.vatRate)
                val toppingsTotal = toppings.sumOf { it.second }

                // Calculate main item price (total price minus toppings)
                val actualUnitPrice = (item.totalPrice / item.quantity).toLong()
                val mainUnitPrice = (actualUnitPrice - toppingsTotal).coerceAtLeast(0L)
                val mainPrice = mainUnitPrice * item.quantity

                // VAT của món chính (giá sau giảm giá)
                // Làm tròn priceBeforeVat trước để đồng nhất với tất cả các màn hình
                val mainPriceAfterDiscount = (mainPrice * afterDiscountRatio).toLong()
                val mainVat = if (item.vatRate > 0 && mainPriceAfterDiscount > 0) {
                    val priceBeforeVat = (mainPriceAfterDiscount / (1 + item.vatRate / 100.0)).toLong()
                    mainPriceAfterDiscount - priceBeforeVat
                } else 0L

                // Chỉ hiển thị món chính nếu có giá > 0
                if (mainPriceAfterDiscount > 0) {
                    add(HistoryVatDisplayRow(
                        name = item.productName,
                        quantity = item.quantity,
                        totalPrice = mainPriceAfterDiscount,
                        vatRate = item.vatRate,
                        vatAmount = mainVat,
                        isTopping = false
                    ))
                }

                // VAT của từng topping (cũng tính sau giảm giá)
                // Làm tròn priceBeforeVat trước để đồng nhất
                toppings.forEach { (toppingName, toppingPrice) ->
                    val toppingTotal = toppingPrice * item.quantity
                    val toppingAfterDiscount = (toppingTotal * afterDiscountRatio).toLong()
                    val toppingVat = if (item.vatRate > 0 && toppingAfterDiscount > 0) {
                        val priceBeforeVat = (toppingAfterDiscount / (1 + item.vatRate / 100.0)).toLong()
                        toppingAfterDiscount - priceBeforeVat
                    } else 0L

                    // Chỉ hiển thị topping nếu có giá > 0
                    if (toppingAfterDiscount > 0) {
                        add(HistoryVatDisplayRow(
                            name = toppingName,
                            quantity = item.quantity,
                            totalPrice = toppingAfterDiscount,
                            vatRate = item.vatRate,
                            vatAmount = toppingVat,
                            isTopping = true
                        ))
                    }
                }
            }

            // Thêm VAT của từng phụ thu riêng biệt (surcharges không bị giảm giá)
            // Parse từ surchargesJson nếu có, nếu không thì fallback về tổng
            if (surchargeAmount > 0) {
                // Try to parse individual surcharges from JSON
                val parsedSurcharges: List<SurchargeDisplayItem> = try {
                    if (!surchargesJson.isNullOrEmpty()) {
                        val type = object : TypeToken<List<Map<String, Any>>>() {}.type
                        val surchargesList: List<Map<String, Any>> = Gson().fromJson(surchargesJson, type)
                        surchargesList.map { map ->
                            SurchargeDisplayItem(
                                id = map["id"] as? String ?: "",
                                name = map["name"] as? String ?: "Phụ thu",
                                amount = (map["amount"] as? Double) ?: 0.0,
                                quantity = (map["quantity"] as? Double)?.toInt() ?: 1,
                                vatRate = (map["vatRate"] as? Double) ?: 8.0
                            )
                        }
                    } else emptyList()
                } catch (e: Exception) {
                    emptyList()
                }

                if (parsedSurcharges.isNotEmpty()) {
                    // Hiển thị từng phụ thu riêng biệt
                    parsedSurcharges.forEach { surcharge ->
                        val surchargeTotal = (surcharge.amount * surcharge.quantity).toLong()
                        val vatRate = if (surcharge.vatRate > 0) surcharge.vatRate else surchargeVatRate
                        val surchargeVat = if (vatRate > 0) {
                            val priceBeforeVat = (surchargeTotal / (1 + vatRate / 100.0)).toLong()
                            surchargeTotal - priceBeforeVat
                        } else 0L

                        add(HistoryVatDisplayRow(
                            name = "⊕ ${surcharge.name}",
                            quantity = surcharge.quantity,
                            totalPrice = surchargeTotal,
                            vatRate = vatRate,
                            vatAmount = surchargeVat,
                            isTopping = false
                        ))
                    }
                } else {
                    // Fallback: hiển thị tổng phụ thu nếu không có chi tiết
                    val surchargeVat = if (surchargeVatRate > 0) {
                        val priceBeforeVat = (surchargeAmount / (1 + surchargeVatRate / 100.0)).toLong()
                        surchargeAmount - priceBeforeVat
                    } else 0L

                    add(HistoryVatDisplayRow(
                        name = "⊕ Phụ thu",
                        quantity = 1,
                        totalPrice = surchargeAmount,
                        vatRate = surchargeVatRate,
                        vatAmount = surchargeVat,
                        isTopping = false
                    ))
                }
            }
        }
    }

    // Tính tổng VAT bằng cách cộng từ vatRows (khớp chính xác với các items hiển thị)
    val calculatedTotalVat = remember(vatRows) {
        vatRows.sumOf { it.vatAmount }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Chi tiết VAT",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng", modifier = Modifier.size(20.dp))
                    }
                }

                // Giải thích công thức
                Text(
                    "* VAT đã bao gồm trong giá bán",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                    fontStyle = FontStyle.Italic
                )
                Text(
                    "* Công thức: VAT = Giá - (Giá ÷ (1 + VAT%))",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                    fontStyle = FontStyle.Italic
                )
                if (discountAmount > 0) {
                    Text(
                        "* Giá đã trừ giảm giá (tỷ lệ ${String.format("%.1f", afterDiscountRatio * 100)}%)",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline,
                        fontStyle = FontStyle.Italic
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))

                // Header row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Món", fontWeight = FontWeight.Medium, fontSize = 12.sp, modifier = Modifier.weight(1f))
                    Text("Giá", fontWeight = FontWeight.Medium, fontSize = 12.sp, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                    Text("VAT %", fontWeight = FontWeight.Medium, fontSize = 12.sp, modifier = Modifier.width(50.dp), textAlign = TextAlign.End)
                    Text("Tiền VAT", fontWeight = FontWeight.Medium, fontSize = 12.sp, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                }

                Spacer(modifier = Modifier.height(4.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))

                // Items list
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(vatRows.size) { index ->
                        val row = vatRows[index]

                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = if (row.isTopping) 16.dp else 0.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        if (row.isTopping) "+ ${row.name}" else row.name,
                                        fontSize = if (row.isTopping) 11.sp else 12.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        color = if (row.isTopping) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.onSurface
                                    )
                                    if (!row.isTopping) {
                                        Text(
                                            "x${row.quantity}",
                                            fontSize = 10.sp,
                                            color = MaterialTheme.colorScheme.outline
                                        )
                                    }
                                }
                                Text(
                                    formatCurrency(row.totalPrice),
                                    fontSize = if (row.isTopping) 10.sp else 11.sp,
                                    modifier = Modifier.width(80.dp),
                                    textAlign = TextAlign.End
                                )
                                Text(
                                    if (row.vatRate > 0) "${row.vatRate.toInt()}%" else "-",
                                    fontSize = if (row.isTopping) 10.sp else 11.sp,
                                    modifier = Modifier.width(50.dp),
                                    textAlign = TextAlign.End,
                                    color = if (row.vatRate > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                                )
                                Text(
                                    if (row.vatAmount > 0) formatCurrency(row.vatAmount) else "-",
                                    fontSize = if (row.isTopping) 10.sp else 11.sp,
                                    fontWeight = if (row.vatAmount > 0) FontWeight.Medium else FontWeight.Normal,
                                    modifier = Modifier.width(80.dp),
                                    textAlign = TextAlign.End,
                                    color = if (row.vatAmount > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                                )
                            }
                            // Hiển thị công thức tính
                            if (row.vatRate > 0) {
                                val vatMultiplier = String.format("%.2f", 1 + row.vatRate / 100)
                                Text(
                                    "= ${formatCurrencyShort(row.totalPrice)} - (${formatCurrencyShort(row.totalPrice)} ÷ $vatMultiplier) = ${formatCurrencyShort(row.vatAmount)}",
                                    fontSize = 9.sp,
                                    color = MaterialTheme.colorScheme.outline,
                                    fontStyle = FontStyle.Italic,
                                    modifier = Modifier.padding(start = if (row.isTopping) 24.dp else 8.dp, top = 2.dp)
                                )
                            }

                            // Divider giữa các món chính (không phải sau topping)
                            val nextRow = vatRows.getOrNull(index + 1)
                            if (nextRow != null && !nextRow.isTopping) {
                                Spacer(modifier = Modifier.height(4.dp))
                                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))

                // Tổng VAT - cộng chính xác từ các món hiển thị trong dialog
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "Tổng VAT:",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        formatCurrency(calculatedTotalVat),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Close button
                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("Đóng")
                }
            }
        }
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
    val sdf = SimpleDateFormat("HH:mm dd/MM", Locale.getDefault()).apply {
        timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
    }
    return sdf.format(Date(timestamp))
}

private fun formatTimeOnly(timestamp: Long): String {
    val sdf = SimpleDateFormat("HH:mm", Locale.getDefault()).apply {
        timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
    }
    return sdf.format(Date(timestamp))
}

private fun formatDateShort(timestamp: Long): String {
    val sdf = SimpleDateFormat("dd/MM", Locale.getDefault()).apply {
        timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
    }
    return sdf.format(Date(timestamp))
}

private fun formatDateTime(timestamp: Long): String {
    val sdf = SimpleDateFormat("HH:mm - dd/MM/yyyy", Locale.getDefault()).apply {
        timeZone = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
    }
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
