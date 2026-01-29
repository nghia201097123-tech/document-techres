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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
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

    // Bottom sheet state for history (completed + cancelled)
    var showHistorySheet by remember { mutableStateOf(false) }

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

    // Filter orders by status for Kanban columns
    val newOrders = uiState.orders.filter { it.status == FoodOrderStatus.NEW }
    val processingOrders = uiState.orders.filter { it.status == FoodOrderStatus.PREPARING }
    val historyOrders = uiState.orders.filter {
        it.status == FoodOrderStatus.COMPLETED || it.status == FoodOrderStatus.CANCELLED
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
                            "${newOrders.size + processingOrders.size} đơn đang xử lý",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                onBack = onBack,
                actions = {
                    // New orders badge
                    if (newOrders.isNotEmpty()) {
                        Badge(
                            containerColor = Color(0xFFFF5722),
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Text("${newOrders.size} mới")
                        }
                    }
                    // History button
                    if (historyOrders.isNotEmpty()) {
                        IconButton(onClick = { showHistorySheet = true }) {
                            BadgedBox(
                                badge = {
                                    Badge(containerColor = Color.Gray) {
                                        Text("${historyOrders.size}")
                                    }
                                }
                            ) {
                                Icon(Icons.Default.History, contentDescription = "Lịch sử")
                            }
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
            // Platform Filter
            PlatformFilterRow(
                selectedPlatform = uiState.selectedPlatform,
                onPlatformSelected = { viewModel.setPlatformFilter(it) }
            )

            // Main Content: Kanban 2-column layout
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Left Column: NEW orders
                    OrderColumn(
                        title = "Đơn mới",
                        count = newOrders.size,
                        headerColor = Color(0xFFFF5722),
                        orders = newOrders,
                        emptyMessage = "Không có đơn mới",
                        modifier = Modifier.weight(1f),
                        onOrderClick = { viewModel.selectOrder(it) },
                        onAccept = { viewModel.acceptOrder(it.id) },
                        onCancel = { viewModel.cancelOrder(it.id) },
                        onComplete = null // Not applicable for new orders
                    )

                    // Right Column: PROCESSING orders
                    OrderColumn(
                        title = "Đang xử lý",
                        count = processingOrders.size,
                        headerColor = Color(0xFF2196F3),
                        orders = processingOrders,
                        emptyMessage = "Không có đơn đang xử lý",
                        modifier = Modifier.weight(1f),
                        onOrderClick = { viewModel.selectOrder(it) },
                        onAccept = null, // Not applicable for processing orders
                        onCancel = { viewModel.cancelOrder(it.id) },
                        onComplete = { viewModel.completeOrder(it.id) }
                    )
                }
            }
        }

        // Order Detail Dialog
        if (uiState.showOrderDetail && uiState.selectedOrder != null) {
            OrderDetailDialog(
                order = uiState.selectedOrder!!,
                onDismiss = { viewModel.hideOrderDetail() },
                onAccept = { viewModel.acceptOrder(it) },
                onComplete = { viewModel.completeOrder(it) },
                onCancel = { viewModel.cancelOrder(it) }
            )
        }

        // History Bottom Sheet
        if (showHistorySheet) {
            HistoryBottomSheet(
                orders = historyOrders,
                onDismiss = { showHistorySheet = false },
                onOrderClick = { viewModel.selectOrder(it) }
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
            .padding(horizontal = 16.dp, vertical = 8.dp),
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
fun OrderColumn(
    title: String,
    count: Int,
    headerColor: Color,
    orders: List<FoodAppOrder>,
    emptyMessage: String,
    modifier: Modifier = Modifier,
    onOrderClick: (FoodAppOrder) -> Unit,
    onAccept: ((FoodAppOrder) -> Unit)?,
    onCancel: ((FoodAppOrder) -> Unit)?,
    onComplete: ((FoodAppOrder) -> Unit)?
) {
    Card(
        modifier = modifier.fillMaxHeight(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        )
    ) {
        Column {
            // Column Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(headerColor)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Badge(
                    containerColor = Color.White.copy(alpha = 0.9f)
                ) {
                    Text(
                        count.toString(),
                        color = headerColor,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Orders List
            if (orders.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Inbox,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            emptyMessage,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(orders, key = { it.id }) { order ->
                        KanbanOrderCard(
                            order = order,
                            onClick = { onOrderClick(order) },
                            onAccept = onAccept?.let { { it(order) } },
                            onCancel = onCancel?.let { { it(order) } },
                            onComplete = onComplete?.let { { it(order) } }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun KanbanOrderCard(
    order: FoodAppOrder,
    onClick: () -> Unit,
    onAccept: (() -> Unit)?,
    onCancel: (() -> Unit)?,
    onComplete: (() -> Unit)?
) {
    val hasNote = !order.customerNote.isNullOrEmpty()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            // Header: Platform + Time
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Platform badge
                Box(
                    modifier = Modifier
                        .background(
                            Color(order.platform.color).copy(alpha = 0.15f),
                            RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Text(order.platform.icon, fontSize = 10.sp)
                        Text(
                            order.platform.shortName,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color(order.platform.color),
                            fontSize = 10.sp
                        )
                    }
                }

                // Time ago
                Text(
                    formatTimeAgo(order.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                    fontSize = 10.sp
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Order code + Total
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    order.orderCode,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    formatCurrency(order.totalAmount),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            // Customer info
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    order.customerName,
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    fontSize = 11.sp
                )
            }

            // Phone
            if (order.customerPhone.isNotEmpty()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Phone,
                        contentDescription = null,
                        modifier = Modifier.size(10.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        order.customerPhone,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 10.sp
                    )
                }
            }

            // Customer Note - PROMINENT DISPLAY
            if (hasNote) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Color(0xFFFFE0B2),
                            RoundedCornerShape(6.dp)
                        )
                        .border(
                            1.dp,
                            Color(0xFFFF6F00),
                            RoundedCornerShape(6.dp)
                        )
                        .padding(8.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = Color(0xFFE65100)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Column {
                        Text(
                            "GHI CHÚ",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFE65100),
                            fontSize = 9.sp
                        )
                        Text(
                            order.customerNote ?: "",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFBF360C),
                            fontWeight = FontWeight.Medium,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            // Driver info with Avatar
            if (order.driverName != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Color(0xFF4CAF50).copy(alpha = 0.1f),
                            RoundedCornerShape(6.dp)
                        )
                        .padding(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Driver avatar
                    if (order.driverAvatar != null) {
                        AsyncImage(
                            model = order.driverAvatar,
                            contentDescription = "Driver avatar",
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .border(1.dp, Color(0xFF4CAF50), CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .background(Color(0xFF4CAF50).copy(alpha = 0.2f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.DeliveryDining,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = Color(0xFF4CAF50)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            order.driverName ?: "",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF2E7D32),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            fontSize = 11.sp
                        )
                        order.driverPhone?.let { phone ->
                            Text(
                                phone,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF4CAF50),
                                fontSize = 9.sp
                            )
                        }
                    }
                }
            }

            // Items count
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "${order.items.size} món",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
                fontSize = 10.sp
            )

            // Action buttons
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Cancel button
                onCancel?.let {
                    OutlinedButton(
                        onClick = it,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        ),
                        contentPadding = PaddingValues(vertical = 4.dp),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text("Huỷ", fontSize = 11.sp)
                    }
                }

                // Accept button (for NEW orders)
                onAccept?.let {
                    Button(
                        onClick = it,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                        contentPadding = PaddingValues(vertical = 4.dp),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text("Xác nhận", fontSize = 11.sp)
                    }
                }

                // Complete button (for PROCESSING orders)
                onComplete?.let {
                    Button(
                        onClick = it,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                        contentPadding = PaddingValues(vertical = 4.dp),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text("Hoàn tất", fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryBottomSheet(
    orders: List<FoodAppOrder>,
    onDismiss: () -> Unit,
    onOrderClick: (FoodAppOrder) -> Unit
) {
    val completedOrders = orders.filter { it.status == FoodOrderStatus.COMPLETED }
    val cancelledOrders = orders.filter { it.status == FoodOrderStatus.CANCELLED }
    var selectedTab by remember { mutableIntStateOf(0) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.7f)
        ) {
            // Tabs
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text("Hoàn thành")
                            if (completedOrders.isNotEmpty()) {
                                Badge(containerColor = Color(0xFF4CAF50)) {
                                    Text(completedOrders.size.toString())
                                }
                            }
                        }
                    }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text("Đã huỷ")
                            if (cancelledOrders.isNotEmpty()) {
                                Badge(containerColor = Color(0xFFF44336)) {
                                    Text(cancelledOrders.size.toString())
                                }
                            }
                        }
                    }
                )
            }

            // Orders list
            val displayOrders = if (selectedTab == 0) completedOrders else cancelledOrders
            if (displayOrders.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        if (selectedTab == 0) "Không có đơn hoàn thành" else "Không có đơn đã huỷ",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(displayOrders, key = { it.id }) { order ->
                        HistoryOrderCard(
                            order = order,
                            onClick = { onOrderClick(order) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun HistoryOrderCard(
    order: FoodAppOrder,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Platform
                    Text(order.platform.icon, fontSize = 14.sp)
                    Text(
                        order.orderCode,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    // Status badge
                    StatusBadge(status = order.status, isCompact = true)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    order.customerName,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    formatDateTime(order.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
            Text(
                formatCurrency(order.totalAmount),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
fun FilterTabRow(
    selectedFilter: FoodOrderFilter,
    allCount: Int,
    newCount: Int,
    processingCount: Int,
    completedCount: Int,
    cancelledCount: Int,
    onFilterSelected: (FoodOrderFilter) -> Unit
) {
    ScrollableTabRow(
        selectedTabIndex = FoodOrderFilter.entries.indexOf(selectedFilter),
        containerColor = MaterialTheme.colorScheme.surface,
        edgePadding = 16.dp
    ) {
        FoodOrderFilter.entries.forEach { filter ->
            val count = when (filter) {
                FoodOrderFilter.ALL -> allCount
                FoodOrderFilter.NEW -> newCount
                FoodOrderFilter.PROCESSING -> processingCount
                FoodOrderFilter.COMPLETED -> completedCount
                FoodOrderFilter.CANCELLED -> cancelledCount
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
                        if (count > 0) {
                            Badge(
                                containerColor = when (filter) {
                                    FoodOrderFilter.ALL -> Color(0xFF757575)
                                    FoodOrderFilter.NEW -> Color(0xFFFF5722)
                                    FoodOrderFilter.PROCESSING -> Color(0xFF2196F3)
                                    FoodOrderFilter.COMPLETED -> Color(0xFF4CAF50)
                                    FoodOrderFilter.CANCELLED -> Color(0xFFF44336)
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
fun GridColumnSelector(
    gridColumns: Int,
    onGridColumnsChanged: (Int) -> Unit
) {
    val columnOptions = listOf(2, 3, 4, 5)

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            Icons.Default.GridView,
            contentDescription = "Grid",
            modifier = Modifier.size(16.dp),
            tint = Color.Gray
        )
        columnOptions.forEach { cols ->
            FilterChip(
                selected = gridColumns == cols,
                onClick = { onGridColumnsChanged(cols) },
                label = { Text("$cols", fontSize = 11.sp) },
                modifier = Modifier.height(28.dp),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF1976D2),
                    selectedLabelColor = Color.White
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
    onComplete: () -> Unit,
    onCancel: () -> Unit,
    gridColumns: Int = 3
) {
    // Compact mode for more columns
    val isCompact = gridColumns >= 4
    val isUltraCompact = gridColumns >= 5
    val cardPadding = if (isCompact) 10.dp else 16.dp
    val statusColor = Color(order.status.color)

    // Check if order has note
    val hasNote = !order.customerNote.isNullOrEmpty()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(modifier = Modifier.padding(cardPadding)) {
            // Header: Platform badge + Note indicator + Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Platform badge + Note indicator
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Platform badge
                    Box(
                        modifier = Modifier
                            .background(
                                Color(order.platform.color).copy(alpha = 0.15f),
                                RoundedCornerShape(6.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(order.platform.icon, fontSize = if (isCompact) 10.sp else 12.sp)
                            if (!isUltraCompact) {
                                Text(
                                    order.platform.shortName,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(order.platform.color)
                                )
                            }
                        }
                    }

                    // Note indicator - always visible if has note
                    if (hasNote) {
                        Box(
                            modifier = Modifier
                                .background(
                                    Color(0xFFFF8F00).copy(alpha = 0.15f),
                                    RoundedCornerShape(4.dp)
                                )
                                .padding(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = "Có ghi chú",
                                modifier = Modifier.size(if (isUltraCompact) 12.dp else 14.dp),
                                tint = Color(0xFFFF8F00)
                            )
                        }
                    }
                }

                // Status badge
                StatusBadge(status = order.status, isCompact = isCompact)
            }

            Spacer(modifier = Modifier.height(if (isCompact) 6.dp else 8.dp))

            // Order code
            Text(
                order.orderCode,
                style = if (isCompact) MaterialTheme.typography.titleSmall else MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // Customer info - ALWAYS show (priority: name + phone)
            Spacer(modifier = Modifier.height(4.dp))
            // Customer name
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(if (isUltraCompact) 12.dp else 14.dp),
                    tint = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    order.customerName,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    fontSize = if (isUltraCompact) 11.sp else 12.sp
                )
            }
            // Customer phone - ALWAYS show
            if (order.customerPhone.isNotEmpty()) {
                Spacer(modifier = Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Phone,
                        contentDescription = null,
                        modifier = Modifier.size(if (isUltraCompact) 10.dp else 12.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        order.customerPhone,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        fontSize = if (isUltraCompact) 10.sp else 11.sp
                    )
                }
            }
            // Customer note - hide in ultra compact mode
            if (!isUltraCompact) {
                order.customerNote?.let { note ->
                    if (note.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    Color(0xFFFFF8E1),
                                    RoundedCornerShape(4.dp)
                                )
                                .padding(horizontal = 6.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = Color(0xFFFF8F00)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                note,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFFE65100),
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                fontSize = 10.sp
                            )
                        }
                    }
                }
            }

            // Driver info - ALWAYS show if driver assigned (priority display)
            if (order.driverName != null) {
                Spacer(modifier = Modifier.height(if (isUltraCompact) 4.dp else 6.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Color(0xFF4CAF50).copy(alpha = 0.1f),
                            RoundedCornerShape(if (isUltraCompact) 4.dp else 6.dp)
                        )
                        .padding(if (isUltraCompact) 4.dp else 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Driver avatar - show smaller in ultraCompact
                    val avatarSize = if (isUltraCompact) 20.dp else 24.dp
                    if (order.driverAvatar != null) {
                        AsyncImage(
                            model = order.driverAvatar,
                            contentDescription = "Driver avatar",
                            modifier = Modifier
                                .size(avatarSize)
                                .clip(CircleShape)
                                .border(1.dp, Color(0xFF4CAF50), CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(avatarSize)
                                .background(Color(0xFF4CAF50).copy(alpha = 0.2f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.DeliveryDining,
                                contentDescription = null,
                                modifier = Modifier.size(if (isUltraCompact) 12.dp else 16.dp),
                                tint = Color(0xFF4CAF50)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(if (isUltraCompact) 4.dp else 6.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            order.driverName ?: "",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF2E7D32),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            fontSize = if (isUltraCompact) 10.sp else 11.sp
                        )
                        // Driver phone number - ALWAYS show
                        order.driverPhone?.let { phone ->
                            Text(
                                phone,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF4CAF50),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                fontSize = if (isUltraCompact) 9.sp else 10.sp
                            )
                        }
                        // Order content message - hide in ultraCompact
                        if (!isUltraCompact) {
                            order.orderContentMessage?.let { message ->
                                Text(
                                    message,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF388E3C),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }
            }

            // Items summary (only if not ultra compact)
            if (!isUltraCompact) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    "${order.items.size} món",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(if (isCompact) 8.dp else 12.dp))

            // Footer: Total + Time
            Column {
                Text(
                    formatCurrency(order.totalAmount),
                    style = if (isCompact) MaterialTheme.typography.titleSmall else MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(10.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        formatTimeAgo(order.createdAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline,
                        fontSize = 10.sp
                    )
                    if (!order.isPaid) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Badge(
                            containerColor = Color(0xFFFFF3E0),
                            modifier = Modifier.height(16.dp)
                        ) {
                            Text("COD", color = Color(0xFFE65100), fontSize = 8.sp)
                        }
                    }
                }
            }

            // Action buttons - TechRes simplified flow: NEW -> PREPARING -> COMPLETED/CANCELLED
            Spacer(modifier = Modifier.height(if (isCompact) 8.dp else 12.dp))
            when (order.status) {
                FoodOrderStatus.NEW -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(if (isCompact) 4.dp else 8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onCancel,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.error
                            ),
                            contentPadding = PaddingValues(vertical = if (isCompact) 4.dp else 6.dp)
                        ) {
                            Text("Huỷ", fontSize = if (isCompact) 10.sp else 11.sp)
                        }
                        Button(
                            onClick = onAccept,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                            contentPadding = PaddingValues(vertical = if (isCompact) 4.dp else 6.dp)
                        ) {
                            Text("Xác nhận", fontSize = if (isCompact) 10.sp else 11.sp)
                        }
                    }
                }
                FoodOrderStatus.PREPARING -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(if (isCompact) 4.dp else 8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onCancel,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.error
                            ),
                            contentPadding = PaddingValues(vertical = if (isCompact) 4.dp else 6.dp)
                        ) {
                            Text("Huỷ", fontSize = if (isCompact) 10.sp else 11.sp)
                        }
                        Button(
                            onClick = onComplete,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                            contentPadding = PaddingValues(vertical = if (isCompact) 4.dp else 6.dp)
                        ) {
                            Text("Hoàn tất", fontSize = if (isCompact) 10.sp else 11.sp)
                        }
                    }
                }
                else -> {}
            }
        }
    }
}

@Composable
fun StatusBadge(status: FoodOrderStatus, isCompact: Boolean = false) {
    Box(
        modifier = Modifier
            .background(
                Color(status.color).copy(alpha = 0.15f),
                RoundedCornerShape(4.dp)
            )
            .padding(horizontal = if (isCompact) 6.dp else 8.dp, vertical = if (isCompact) 2.dp else 4.dp)
    ) {
        Text(
            status.displayName,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = Color(status.color),
            fontSize = if (isCompact) 10.sp else 12.sp
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
                            order.customerNote?.let { note ->
                                if (note.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(
                                                Color(0xFFFFF3E0),
                                                RoundedCornerShape(8.dp)
                                            )
                                            .padding(12.dp),
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Icon(
                                            Icons.Default.Warning,
                                            contentDescription = null,
                                            modifier = Modifier.size(20.dp),
                                            tint = Color(0xFFFF6F00)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(
                                                "GHI CHÚ ĐƠN HÀNG",
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFFE65100)
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                note,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = Color(0xFFBF360C),
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Driver Info (if assigned)
                    if (order.driverName != null) {
                        item {
                            DetailSection(title = "Tài xế") {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Driver avatar
                                    if (order.driverAvatar != null) {
                                        AsyncImage(
                                            model = order.driverAvatar,
                                            contentDescription = "Driver avatar",
                                            modifier = Modifier
                                                .size(56.dp)
                                                .clip(CircleShape)
                                                .border(2.dp, Color(0xFF4CAF50), CircleShape),
                                            contentScale = ContentScale.Crop
                                        )
                                    } else {
                                        Box(
                                            modifier = Modifier
                                                .size(56.dp)
                                                .background(Color(0xFF4CAF50).copy(alpha = 0.2f), CircleShape),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Default.DeliveryDining,
                                                contentDescription = null,
                                                modifier = Modifier.size(32.dp),
                                                tint = Color(0xFF4CAF50)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            order.driverName ?: "",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                        order.driverPhone?.let { phone ->
                                            Text(
                                                phone,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                        }
                                        order.orderContentMessage?.let { message ->
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                message,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = Color(0xFF4CAF50),
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                    }
                                    order.driverPhone?.let {
                                        IconButton(
                                            onClick = { /* TODO: Call driver */ }
                                        ) {
                                            Icon(
                                                Icons.Default.Phone,
                                                contentDescription = "Gọi tài xế",
                                                tint = Color(0xFF4CAF50)
                                            )
                                        }
                                    }
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
                    // TechRes simplified flow: NEW -> PREPARING -> COMPLETED/CANCELLED
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
                                Text("Huỷ đơn")
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
                                Text("Xác nhận")
                            }
                        }
                        FoodOrderStatus.PREPARING -> {
                            OutlinedButton(
                                onClick = { onCancel(order.id); onDismiss() },
                                modifier = Modifier.weight(0.4f),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = MaterialTheme.colorScheme.error
                                )
                            ) {
                                Text("Huỷ")
                            }
                            Button(
                                onClick = { onComplete(order.id); onDismiss() },
                                modifier = Modifier.weight(0.6f),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF4CAF50)
                                )
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Hoàn tất")
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

// Short format for compact cards: 61k, 146k, 1.2M
fun formatCurrencyShort(amount: Long): String {
    return when {
        amount >= 1_000_000 -> String.format("%.1fM", amount / 1_000_000.0).replace(".0M", "M")
        amount >= 1_000 -> "${amount / 1000}k"
        else -> "${amount}đ"
    }
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

// Short format for compact cards: 2m, 7h, 1d
fun formatTimeAgoShort(timestamp: Long): String {
    val diff = System.currentTimeMillis() - timestamp
    val minutes = diff / (1000 * 60)
    val hours = minutes / 60

    return when {
        minutes < 1 -> "now"
        minutes < 60 -> "${minutes}m"
        hours < 24 -> "${hours}h"
        else -> "${hours / 24}d"
    }
}

fun formatDateTime(timestamp: Long): String {
    val sdf = SimpleDateFormat("HH:mm dd/MM", Locale.getDefault()).apply {
        timeZone = java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
    }
    return sdf.format(Date(timestamp))
}
