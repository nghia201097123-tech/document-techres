package com.techres.ccb.presentation.screens.foodorder

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.domain.model.*
import com.techres.ccb.presentation.components.PosTopAppBar
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FoodOrderScreen(
    viewModel: FoodOrderViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    // Snackbar for messages
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearSuccessMessage()
        }
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearErrorMessage()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            PosTopAppBar(
                title = {
                    Column {
                        Text(
                            "Đơn hàng App Food",
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "${uiState.orders.size} đơn hàng",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                onBack = onBack,
                actions = {
                    // New orders badge
                    if (uiState.newOrdersCount > 0) {
                        Badge(
                            containerColor = Color(0xFFFF5722),
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Text("${uiState.newOrdersCount} mới")
                        }
                    }
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Làm mới")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Filter Tabs
            FilterTabRow(
                selectedFilter = uiState.selectedFilter,
                newCount = uiState.newOrdersCount,
                processingCount = uiState.processingOrdersCount,
                onFilterSelected = { viewModel.setFilter(it) }
            )

            // Platform Filter
            PlatformFilterRow(
                selectedPlatform = uiState.selectedPlatform,
                onPlatformSelected = { viewModel.setPlatformFilter(it) }
            )

            // Orders List
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (uiState.orders.isEmpty()) {
                EmptyOrdersView()
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.orders, key = { it.id }) { order ->
                        FoodOrderCard(
                            order = order,
                            onClick = { viewModel.selectOrder(order) },
                            onAccept = { viewModel.acceptOrder(order.id) },
                            onStartPreparing = { viewModel.startPreparing(order.id) },
                            onMarkReady = { viewModel.markAsReady(order.id) },
                            onComplete = { viewModel.completeOrder(order.id) },
                            onCancel = { viewModel.cancelOrder(order.id) }
                        )
                    }
                }
            }
        }

        // Order Detail Dialog
        if (uiState.showOrderDetail && uiState.selectedOrder != null) {
            OrderDetailDialog(
                order = uiState.selectedOrder!!,
                onDismiss = { viewModel.hideOrderDetail() },
                onAccept = { viewModel.acceptOrder(it) },
                onStartPreparing = { viewModel.startPreparing(it) },
                onMarkReady = { viewModel.markAsReady(it) },
                onComplete = { viewModel.completeOrder(it) },
                onCancel = { viewModel.cancelOrder(it) }
            )
        }
    }
}

@Composable
fun FilterTabRow(
    selectedFilter: FoodOrderFilter,
    newCount: Int,
    processingCount: Int,
    onFilterSelected: (FoodOrderFilter) -> Unit
) {
    ScrollableTabRow(
        selectedTabIndex = FoodOrderFilter.entries.indexOf(selectedFilter),
        containerColor = MaterialTheme.colorScheme.surface,
        edgePadding = 16.dp
    ) {
        FoodOrderFilter.entries.forEach { filter ->
            val count = when (filter) {
                FoodOrderFilter.NEW -> newCount
                FoodOrderFilter.PROCESSING -> processingCount
                else -> null
            }

            Tab(
                selected = selectedFilter == filter,
                onClick = { onFilterSelected(filter) },
                text = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(filter.displayName)
                        if (count != null && count > 0) {
                            Badge(
                                containerColor = when (filter) {
                                    FoodOrderFilter.NEW -> Color(0xFFFF5722)
                                    FoodOrderFilter.PROCESSING -> Color(0xFF2196F3)
                                    else -> MaterialTheme.colorScheme.primary
                                }
                            ) {
                                Text(count.toString())
                            }
                        }
                    }
                }
            )
        }
    }
}

@Composable
fun PlatformFilterRow(
    selectedPlatform: FoodPlatform?,
    onPlatformSelected: (FoodPlatform?) -> Unit
) {
    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // All platforms option
        item {
            FilterChip(
                selected = selectedPlatform == null,
                onClick = { onPlatformSelected(null) },
                label = { Text("Tất cả") },
                leadingIcon = if (selectedPlatform == null) {
                    { Icon(Icons.Default.Check, contentDescription = null, Modifier.size(18.dp)) }
                } else null
            )
        }

        // Platform options
        items(FoodPlatform.entries.toTypedArray()) { platform ->
            FilterChip(
                selected = selectedPlatform == platform,
                onClick = { onPlatformSelected(platform) },
                label = { Text(platform.shortName) },
                leadingIcon = {
                    Text(platform.icon, fontSize = 14.sp)
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(platform.color).copy(alpha = 0.2f),
                    selectedLabelColor = Color(platform.color)
                )
            )
        }
    }
}

@Composable
fun FoodOrderCard(
    order: FoodAppOrder,
    onClick: () -> Unit,
    onAccept: () -> Unit,
    onStartPreparing: () -> Unit,
    onMarkReady: () -> Unit,
    onComplete: () -> Unit,
    onCancel: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header: Platform badge + Order code + Time
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Platform badge
                    Box(
                        modifier = Modifier
                            .background(
                                Color(order.platform.color).copy(alpha = 0.15f),
                                RoundedCornerShape(6.dp)
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(order.platform.icon, fontSize = 12.sp)
                            Text(
                                order.platform.shortName,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(order.platform.color)
                            )
                        }
                    }

                    // Order code
                    Text(
                        order.orderCode,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Status badge
                StatusBadge(status = order.status)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Customer info
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    order.customerName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.width(12.dp))
                Icon(
                    Icons.Default.Phone,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    order.customerPhone,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            // Items summary
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "${order.items.size} món: ${order.items.joinToString(", ") { "${it.quantity}x ${it.productName}" }}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Footer: Total + Time + Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        formatCurrency(order.totalAmount),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Schedule,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = MaterialTheme.colorScheme.outline
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            formatTimeAgo(order.createdAt),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                        if (!order.isPaid) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Badge(containerColor = Color(0xFFFFF3E0)) {
                                Text("COD", color = Color(0xFFE65100), fontSize = 10.sp)
                            }
                        }
                    }
                }

                // Quick action buttons based on status
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    when (order.status) {
                        FoodOrderStatus.NEW -> {
                            OutlinedButton(
                                onClick = onCancel,
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = MaterialTheme.colorScheme.error
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Text("Hủy", fontSize = 12.sp)
                            }
                            Button(
                                onClick = onAccept,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF4CAF50)
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Text("Nhận đơn", fontSize = 12.sp)
                            }
                        }
                        FoodOrderStatus.ACCEPTED -> {
                            Button(
                                onClick = onStartPreparing,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF9C27B0)
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Text("Bắt đầu làm", fontSize = 12.sp)
                            }
                        }
                        FoodOrderStatus.PREPARING -> {
                            Button(
                                onClick = onMarkReady,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF2196F3)
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Text("Sẵn sàng", fontSize = 12.sp)
                            }
                        }
                        FoodOrderStatus.READY, FoodOrderStatus.DELIVERING -> {
                            Button(
                                onClick = onComplete,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF4CAF50)
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Text("Hoàn thành", fontSize = 12.sp)
                            }
                        }
                        else -> {}
                    }
                }
            }
        }
    }
}

@Composable
fun StatusBadge(status: FoodOrderStatus) {
    Box(
        modifier = Modifier
            .background(
                Color(status.color).copy(alpha = 0.15f),
                RoundedCornerShape(4.dp)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            status.displayName,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = Color(status.color)
        )
    }
}

@Composable
fun EmptyOrdersView() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.Inbox,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.outline
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "Không có đơn hàng",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.outline
            )
            Text(
                "Đơn hàng mới sẽ hiển thị ở đây",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline
            )
        }
    }
}

@Composable
fun OrderDetailDialog(
    order: FoodAppOrder,
    onDismiss: () -> Unit,
    onAccept: (String) -> Unit,
    onStartPreparing: (String) -> Unit,
    onMarkReady: (String) -> Unit,
    onComplete: (String) -> Unit,
    onCancel: (String) -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.9f),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(order.platform.color))
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(order.platform.icon, fontSize = 24.sp)
                            Text(
                                order.platform.displayName,
                                style = MaterialTheme.typography.titleMedium,
                                color = Color.White
                            )
                        }
                        Text(
                            order.orderCode,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                    StatusBadge(status = order.status)
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(onClick = onDismiss) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Đóng",
                            tint = Color.White
                        )
                    }
                }

                // Content
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Customer Info Section
                    item {
                        DetailSection(title = "Thông tin khách hàng") {
                            DetailRow(
                                icon = Icons.Default.Person,
                                label = "Tên",
                                value = order.customerName
                            )
                            DetailRow(
                                icon = Icons.Default.Phone,
                                label = "SĐT",
                                value = order.customerPhone,
                                isLink = true
                            )
                            order.customerAddress?.let {
                                DetailRow(
                                    icon = Icons.Default.LocationOn,
                                    label = "Địa chỉ",
                                    value = it
                                )
                            }
                            order.customerNote?.let {
                                DetailRow(
                                    icon = Icons.Default.Note,
                                    label = "Ghi chú",
                                    value = it,
                                    valueColor = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }

                    // Driver Info (if assigned)
                    if (order.driverName != null) {
                        item {
                            DetailSection(title = "Tài xế") {
                                DetailRow(
                                    icon = Icons.Default.DeliveryDining,
                                    label = "Tên",
                                    value = order.driverName
                                )
                                order.driverPhone?.let {
                                    DetailRow(
                                        icon = Icons.Default.Phone,
                                        label = "SĐT",
                                        value = it,
                                        isLink = true
                                    )
                                }
                            }
                        }
                    }

                    // Order Items Section
                    item {
                        DetailSection(title = "Danh sách món (${order.items.size})") {
                            order.items.forEach { item ->
                                OrderItemRow(item = item)
                                if (item != order.items.last()) {
                                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                                }
                            }
                        }
                    }

                    // Payment Summary
                    item {
                        DetailSection(title = "Thanh toán") {
                            PaymentRow("Tạm tính", order.subtotal)
                            if (order.deliveryFee > 0) {
                                PaymentRow("Phí giao hàng", order.deliveryFee)
                            }
                            if (order.platformFee > 0) {
                                PaymentRow("Phí nền tảng", order.platformFee)
                            }
                            if (order.discount > 0) {
                                PaymentRow("Giảm giá", -order.discount, isDiscount = true)
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                            PaymentRow("Tổng cộng", order.totalAmount, isTotal = true)

                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    "Hình thức:",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (order.isPaid) {
                                        Icon(
                                            Icons.Default.CheckCircle,
                                            contentDescription = null,
                                            modifier = Modifier.size(16.dp),
                                            tint = Color(0xFF4CAF50)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                    }
                                    Text(
                                        order.paymentMethod ?: "Chưa xác định",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                        color = if (order.isPaid) Color(0xFF4CAF50) else Color(0xFFFF9800)
                                    )
                                }
                            }
                        }
                    }

                    // Timeline
                    item {
                        DetailSection(title = "Thời gian") {
                            TimelineRow("Đặt hàng", order.createdAt)
                            order.acceptedAt?.let { TimelineRow("Nhận đơn", it) }
                            order.preparedAt?.let { TimelineRow("Sẵn sàng", it) }
                            order.completedAt?.let { TimelineRow("Hoàn thành", it) }
                        }
                    }
                }

                // Action Buttons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    when (order.status) {
                        FoodOrderStatus.NEW -> {
                            OutlinedButton(
                                onClick = { onCancel(order.id); onDismiss() },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = MaterialTheme.colorScheme.error
                                )
                            ) {
                                Icon(Icons.Default.Cancel, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Hủy đơn")
                            }
                            Button(
                                onClick = { onAccept(order.id); onDismiss() },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF4CAF50)
                                )
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Nhận đơn")
                            }
                        }
                        FoodOrderStatus.ACCEPTED -> {
                            OutlinedButton(
                                onClick = { onCancel(order.id); onDismiss() },
                                modifier = Modifier.weight(0.4f),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = MaterialTheme.colorScheme.error
                                )
                            ) {
                                Text("Hủy")
                            }
                            Button(
                                onClick = { onStartPreparing(order.id); onDismiss() },
                                modifier = Modifier.weight(0.6f),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF9C27B0)
                                )
                            ) {
                                Icon(Icons.Default.Restaurant, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Bắt đầu làm")
                            }
                        }
                        FoodOrderStatus.PREPARING -> {
                            Button(
                                onClick = { onMarkReady(order.id); onDismiss() },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF2196F3)
                                )
                            ) {
                                Icon(Icons.Default.DoneAll, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Đã làm xong - Sẵn sàng giao")
                            }
                        }
                        FoodOrderStatus.READY, FoodOrderStatus.DELIVERING -> {
                            Button(
                                onClick = { onComplete(order.id); onDismiss() },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF4CAF50)
                                )
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Hoàn thành đơn hàng")
                            }
                        }
                        else -> {
                            OutlinedButton(
                                onClick = onDismiss,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Đóng")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DetailSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Column {
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                content()
            }
        }
    }
}

@Composable
fun DetailRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    isLink: Boolean = false,
    valueColor: Color = MaterialTheme.colorScheme.onSurface
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            icon,
            contentDescription = null,
            modifier = Modifier.size(18.dp),
            tint = MaterialTheme.colorScheme.outline
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            "$label: ",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.outline
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = if (isLink) MaterialTheme.colorScheme.primary else valueColor,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun OrderItemRow(item: FoodOrderItem) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Row {
                Text(
                    "${item.quantity}x ",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    item.productName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
            }
            item.options?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
            item.note?.let {
                Text(
                    "📝 $it",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
        Text(
            formatCurrency(item.totalPrice),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
fun PaymentRow(
    label: String,
    amount: Long,
    isDiscount: Boolean = false,
    isTotal: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = if (isTotal) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (isTotal) FontWeight.Bold else FontWeight.Normal
        )
        Text(
            if (isDiscount) "-${formatCurrency(-amount)}" else formatCurrency(amount),
            style = if (isTotal) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (isTotal) FontWeight.Bold else FontWeight.Medium,
            color = when {
                isDiscount -> Color(0xFF4CAF50)
                isTotal -> MaterialTheme.colorScheme.primary
                else -> MaterialTheme.colorScheme.onSurface
            }
        )
    }
}

@Composable
fun TimelineRow(label: String, timestamp: Long) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(MaterialTheme.colorScheme.primary, CircleShape)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
        Text(
            formatDateTime(timestamp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.outline
        )
    }
}

// Helper functions
fun formatCurrency(amount: Long): String {
    return String.format("%,d đ", amount).replace(",", ".")
}

fun formatTimeAgo(timestamp: Long): String {
    val diff = System.currentTimeMillis() - timestamp
    val minutes = diff / (1000 * 60)
    val hours = minutes / 60

    return when {
        minutes < 1 -> "Vừa xong"
        minutes < 60 -> "$minutes phút trước"
        hours < 24 -> "$hours giờ trước"
        else -> {
            val days = hours / 24
            "$days ngày trước"
        }
    }
}

fun formatDateTime(timestamp: Long): String {
    val sdf = SimpleDateFormat("HH:mm dd/MM", Locale.getDefault()).apply {
        timeZone = java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
    }
    return sdf.format(Date(timestamp))
}
