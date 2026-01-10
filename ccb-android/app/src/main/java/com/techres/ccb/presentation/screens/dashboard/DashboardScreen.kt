package com.techres.ccb.presentation.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.OrderItemEntity
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel(),
    onNavigateToSale: () -> Unit = {},
    onNavigateToSaleWithOrder: (orderId: String) -> Unit = {},
    onNavigateToFoodOrders: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    onNavigateToShift: () -> Unit = {},
    onNavigateToOrderHistory: () -> Unit = {},
    onSwitchStaff: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val coroutineScope = rememberCoroutineScope()
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp

    // Determine if we're on a phone (< 600dp) or tablet
    val isCompactScreen = screenWidthDp < 600

    var selectedTab by remember { mutableIntStateOf(0) }
    var gridColumns by remember { mutableIntStateOf(if (isCompactScreen) 2 else 4) }
    val currentTime = remember { SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()) }
    val currentDate = remember { SimpleDateFormat("EEEE, dd/MM", Locale("vi")).format(Date()) }

    // Order detail dialog state
    var showOrderDetailDialog by remember { mutableStateOf(false) }
    var selectedOrder by remember { mutableStateOf<PosOrder?>(null) }
    var orderItems by remember { mutableStateOf<List<OrderItemEntity>>(emptyList()) }
    var showCancelConfirmDialog by remember { mutableStateOf(false) }
    var showQuickPaymentDialog by remember { mutableStateOf(false) }
    var orderForPayment by remember { mutableStateOf<PosOrder?>(null) }

    // Logout dialog state
    var showLogoutConfirmDialog by remember { mutableStateOf(false) }
    var isLoggingOut by remember { mutableStateOf(false) }

    // Drawer state for mobile
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

    if (isCompactScreen) {
        // Mobile Layout with Navigation Drawer
        ModalNavigationDrawer(
            drawerState = drawerState,
            drawerContent = {
                ModalDrawerSheet(
                    modifier = Modifier.width(280.dp)
                ) {
                    MobileDrawerContent(
                        branchName = uiState.branchName,
                        staffName = uiState.staffName,
                        onNavigateToSale = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToSale()
                        },
                        onNavigateToFoodOrders = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToFoodOrders()
                        },
                        onNavigateToShift = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToShift()
                        },
                        onNavigateToOrderHistory = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToOrderHistory()
                        },
                        onNavigateToSettings = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToSettings()
                        },
                        onSwitchStaff = {
                            coroutineScope.launch { drawerState.close() }
                            onSwitchStaff()
                        },
                        onLogout = {
                            coroutineScope.launch { drawerState.close() }
                            showLogoutConfirmDialog = true
                        }
                    )
                }
            }
        ) {
            // Mobile Main Content
            MobileDashboardContent(
                uiState = uiState,
                selectedTab = selectedTab,
                onTabSelected = { selectedTab = it },
                gridColumns = gridColumns,
                onGridColumnsChanged = { gridColumns = it },
                currentTime = currentTime,
                currentDate = currentDate,
                onOpenDrawer = { coroutineScope.launch { drawerState.open() } },
                onNavigateToSale = onNavigateToSale,
                onOrderClick = { order ->
                    selectedOrder = order
                    coroutineScope.launch {
                        orderItems = viewModel.getOrderItems(order.id)
                        showOrderDetailDialog = true
                    }
                },
                onConfirmOrder = { viewModel.confirmPosOrder(it) },
                onCompleteOrder = { order ->
                    orderForPayment = order
                    showQuickPaymentDialog = true
                },
                isCompactScreen = true
            )
        }
    } else {
        // Tablet Layout with fixed sidebar
        Row(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF8F9FA))
        ) {
            // Left Sidebar
            DashboardSidebar(
                branchName = uiState.branchName,
                staffName = uiState.staffName,
                onNavigateToSale = onNavigateToSale,
                onNavigateToFoodOrders = onNavigateToFoodOrders,
                onNavigateToShift = onNavigateToShift,
                onNavigateToOrderHistory = onNavigateToOrderHistory,
                onNavigateToSettings = onNavigateToSettings,
                onSwitchStaff = onSwitchStaff,
                onLogout = { showLogoutConfirmDialog = true }
            )

            // Main Content
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            ) {
                // Top Header
                DashboardHeader(
                    currentTime = currentTime,
                    currentDate = currentDate,
                    todayRevenue = uiState.todayRevenue,
                    totalOrders = uiState.todayOrderCount,
                    pendingOrders = uiState.draftPosCount
                )

                // Stats Cards
                StatsCardsRow(
                    draftCount = uiState.draftPosCount,
                    confirmedCount = uiState.confirmedPosCount,
                    completedCount = uiState.todayOrderCount,
                    foodAppCount = uiState.foodAppOrderCount
                )

                // Tab Bar & Grid Controls
                OrdersTabBar(
                    selectedTab = selectedTab,
                    onTabSelected = { selectedTab = it },
                    posCount = uiState.posOrders.size,
                    appCount = uiState.foodAppOrderCount,
                    gridColumns = gridColumns,
                    onGridColumnsChanged = { gridColumns = it }
                )

                // Orders Grid
                Box(modifier = Modifier.weight(1f)) {
                    when {
                        uiState.isLoading -> {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator()
                            }
                        }
                        selectedTab == 0 -> {
                            if (uiState.posOrders.isEmpty()) {
                                EmptyOrdersState()
                            } else {
                                LazyVerticalGrid(
                                    columns = GridCells.Fixed(gridColumns),
                                    contentPadding = PaddingValues(16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    items(uiState.posOrders, key = { it.id }) { order ->
                                        OrderCard(
                                            order = order,
                                            onClick = {
                                                selectedOrder = order
                                                coroutineScope.launch {
                                                    orderItems = viewModel.getOrderItems(order.id)
                                                    showOrderDetailDialog = true
                                                }
                                            },
                                            onConfirm = { viewModel.confirmPosOrder(order.id) },
                                            onComplete = {
                                                orderForPayment = order
                                                showQuickPaymentDialog = true
                                            }
                                        )
                                    }
                                    // Bottom spacing
                                    item(span = { GridItemSpan(gridColumns) }) {
                                        Spacer(modifier = Modifier.height(80.dp))
                                    }
                                }
                            }
                        }
                        else -> {
                            EmptyOrdersState(
                                icon = Icons.Default.DeliveryDining,
                                message = "Đơn từ App",
                                subMessage = "Chưa có đơn hàng từ ứng dụng"
                            )
                        }
                    }

                    // FAB
                    FloatingActionButton(
                        onClick = onNavigateToSale,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(24.dp)
                            .size(64.dp),
                        containerColor = Color(0xFF4CAF50),
                        contentColor = Color.White,
                        shape = CircleShape
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Tạo đơn mới",
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
        }
    }

    // Order Detail Dialog
    if (showOrderDetailDialog && selectedOrder != null) {
        OrderDetailDialog(
            order = selectedOrder!!,
            orderItems = orderItems,
            onDismiss = {
                showOrderDetailDialog = false
                selectedOrder = null
                orderItems = emptyList()
            },
            onComplete = {
                orderForPayment = selectedOrder
                showQuickPaymentDialog = true
            },
            onCancel = {
                showCancelConfirmDialog = true
            },
            onAddItems = {
                onNavigateToSaleWithOrder(selectedOrder!!.id)
                showOrderDetailDialog = false
                selectedOrder = null
            }
        )
    }

    // Cancel Confirm Dialog
    if (showCancelConfirmDialog && selectedOrder != null) {
        AlertDialog(
            onDismissRequest = { showCancelConfirmDialog = false },
            icon = { Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFF44336)) },
            title = { Text("Xác nhận huỷ đơn") },
            text = { Text("Bạn có chắc chắn muốn huỷ đơn #${selectedOrder!!.orderNumber.toString().padStart(3, '0')}?") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.cancelPosOrder(selectedOrder!!.id)
                        showCancelConfirmDialog = false
                        showOrderDetailDialog = false
                        selectedOrder = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF44336))
                ) {
                    Text("Huỷ đơn")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showCancelConfirmDialog = false }) {
                    Text("Quay lại")
                }
            }
        )
    }

    // Quick Payment Dialog
    if (showQuickPaymentDialog && orderForPayment != null) {
        QuickPaymentDialog(
            order = orderForPayment!!,
            onDismiss = {
                showQuickPaymentDialog = false
                orderForPayment = null
            },
            onPaymentComplete = { paymentMethod ->
                viewModel.completePosOrder(orderForPayment!!.id)
                showQuickPaymentDialog = false
                orderForPayment = null
                // Also close detail dialog if open
                if (showOrderDetailDialog) {
                    showOrderDetailDialog = false
                    selectedOrder = null
                }
            }
        )
    }

    // Logout Confirmation Dialog
    if (showLogoutConfirmDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!isLoggingOut) showLogoutConfirmDialog = false
            },
            icon = {
                Icon(
                    Icons.Default.Logout,
                    contentDescription = null,
                    tint = Color(0xFFF44336),
                    modifier = Modifier.size(48.dp)
                )
            },
            title = {
                Text(
                    "Đăng xuất",
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                val activeOrdersCount = uiState.totalActiveOrders
                Column {
                    Text("Bạn có chắc chắn muốn đăng xuất khỏi thiết bị?")
                    Spacer(modifier = Modifier.height(8.dp))

                    if (activeOrdersCount > 0) {
                        Surface(
                            color = Color(0xFFE3F2FD),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Info,
                                    contentDescription = null,
                                    tint = Color(0xFF1976D2),
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(
                                        "Có $activeOrdersCount đơn hàng đang hoạt động",
                                        fontWeight = FontWeight.Medium,
                                        color = Color(0xFF1565C0),
                                        fontSize = 14.sp
                                    )
                                    Text(
                                        "Các đơn này sẽ được BÀN GIAO cho ca sau.",
                                        fontSize = 12.sp,
                                        color = Color(0xFF1976D2)
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    Text(
                        "Lưu ý: Dữ liệu danh mục, sản phẩm, bàn, nhân viên sẽ bị xóa. " +
                        "Đơn hàng đang hoạt động và lịch sử đơn hàng được giữ lại. " +
                        "Khi đăng nhập lại, hệ thống sẽ đồng bộ lại từ đầu.",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isLoggingOut = true
                        coroutineScope.launch {
                            // Do NOT cancel active orders - handover to next shift
                            val success = viewModel.performFullLogout(cancelActiveOrders = false)
                            if (success) {
                                showLogoutConfirmDialog = false
                                isLoggingOut = false
                                onLogout()
                            } else {
                                isLoggingOut = false
                            }
                        }
                    },
                    enabled = !isLoggingOut,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF44336))
                ) {
                    if (isLoggingOut) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Đang xóa dữ liệu...")
                    } else {
                        Icon(
                            Icons.Default.Logout,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Đăng xuất")
                    }
                }
            },
            dismissButton = {
                if (!isLoggingOut) {
                    OutlinedButton(onClick = { showLogoutConfirmDialog = false }) {
                        Text("Hủy")
                    }
                }
            }
        )
    }
}

/**
 * Mobile Drawer Content - Navigation menu for phone layout
 */
@Composable
private fun MobileDrawerContent(
    branchName: String,
    staffName: String,
    onNavigateToSale: () -> Unit,
    onNavigateToFoodOrders: () -> Unit,
    onNavigateToShift: () -> Unit,
    onNavigateToOrderHistory: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onSwitchStaff: () -> Unit,
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF1976D2),
                        Color(0xFF1565C0)
                    )
                )
            )
    ) {
        // Header
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            // Logo
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.Restaurant,
                    contentDescription = null,
                    modifier = Modifier.size(32.dp),
                    tint = Color.White
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = branchName.ifEmpty { "Chi nhánh" },
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
            Text(
                text = staffName.ifEmpty { "Nhân viên" },
                color = Color.White.copy(alpha = 0.8f),
                fontSize = 14.sp
            )
        }

        HorizontalDivider(color = Color.White.copy(alpha = 0.2f))

        // Navigation Items
        Spacer(modifier = Modifier.height(8.dp))
        DrawerNavItem(Icons.Default.PointOfSale, "Bán hàng", true, onNavigateToSale)
        DrawerNavItem(Icons.Default.DeliveryDining, "Đơn App", false, onNavigateToFoodOrders)
        DrawerNavItem(Icons.Default.TableBar, "Bàn", false, {})
        DrawerNavItem(Icons.Default.Schedule, "Ca làm", false, onNavigateToShift)
        DrawerNavItem(Icons.Default.History, "Lịch sử", false, onNavigateToOrderHistory)

        Spacer(modifier = Modifier.weight(1f))

        HorizontalDivider(color = Color.White.copy(alpha = 0.2f))
        Spacer(modifier = Modifier.height(8.dp))

        DrawerNavItem(Icons.Default.Settings, "Cài đặt", false, onNavigateToSettings)
        DrawerNavItem(Icons.Default.SwapHoriz, "Đổi nhân viên", false, onSwitchStaff)
        DrawerNavItem(Icons.Default.Logout, "Đăng xuất", false, onLogout, Color(0xFFFFCDD2))

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun DrawerNavItem(
    icon: ImageVector,
    label: String,
    isActive: Boolean,
    onClick: () -> Unit,
    tint: Color = Color.White
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(
                if (isActive) Color.White.copy(alpha = 0.2f) else Color.Transparent
            )
            .padding(horizontal = 24.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(24.dp),
            tint = tint
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = label,
            color = tint,
            fontSize = 16.sp,
            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal
        )
    }
}

/**
 * Mobile Dashboard Content - Main content area for phone layout
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MobileDashboardContent(
    uiState: DashboardUiState,
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    gridColumns: Int,
    onGridColumnsChanged: (Int) -> Unit,
    currentTime: String,
    currentDate: String,
    onOpenDrawer: () -> Unit,
    onNavigateToSale: () -> Unit,
    onOrderClick: (PosOrder) -> Unit,
    onConfirmOrder: (String) -> Unit,
    onCompleteOrder: (PosOrder) -> Unit,
    isCompactScreen: Boolean
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = currentTime,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1976D2)
                        )
                        Text(
                            text = currentDate,
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "Menu",
                            tint = Color(0xFF1976D2)
                        )
                    }
                },
                actions = {
                    // Revenue badge
                    Surface(
                        color = Color(0xFFE8F5E9),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.AttachMoney,
                                contentDescription = null,
                                tint = Color(0xFF4CAF50),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = formatCurrencyCompact(uiState.todayRevenue),
                                color = Color(0xFF4CAF50),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }
                    // Pending orders badge
                    if (uiState.draftPosCount > 0) {
                        Badge(
                            containerColor = Color(0xFFFF9800),
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Text(
                                text = "${uiState.draftPosCount}",
                                modifier = Modifier.padding(horizontal = 4.dp)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToSale,
                containerColor = Color(0xFF4CAF50),
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Tạo đơn mới")
            }
        },
        containerColor = Color(0xFFF8F9FA)
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Compact Stats Row (horizontal scroll)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CompactStatCard(
                    count = uiState.draftPosCount,
                    label = "Chờ xác nhận",
                    color = Color(0xFFFFF3E0),
                    iconColor = Color(0xFFFF9800)
                )
                CompactStatCard(
                    count = uiState.confirmedPosCount,
                    label = "Đã xác nhận",
                    color = Color(0xFFE3F2FD),
                    iconColor = Color(0xFF2196F3)
                )
                CompactStatCard(
                    count = uiState.todayOrderCount,
                    label = "Hoàn tất",
                    color = Color(0xFFE8F5E9),
                    iconColor = Color(0xFF4CAF50)
                )
                CompactStatCard(
                    count = uiState.foodAppOrderCount,
                    label = "Đơn App",
                    color = Color(0xFFFCE4EC),
                    iconColor = Color(0xFFE91E63)
                )
            }

            // Tab Bar
            OrdersTabBar(
                selectedTab = selectedTab,
                onTabSelected = onTabSelected,
                posCount = uiState.posOrders.size,
                appCount = uiState.foodAppOrderCount,
                gridColumns = gridColumns,
                onGridColumnsChanged = onGridColumnsChanged,
                isCompact = true
            )

            // Orders Grid
            Box(modifier = Modifier.weight(1f)) {
                when {
                    uiState.isLoading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    selectedTab == 0 -> {
                        if (uiState.posOrders.isEmpty()) {
                            EmptyOrdersState()
                        } else {
                            LazyVerticalGrid(
                                columns = GridCells.Fixed(gridColumns),
                                contentPadding = PaddingValues(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                items(uiState.posOrders, key = { it.id }) { order ->
                                    OrderCard(
                                        order = order,
                                        onClick = { onOrderClick(order) },
                                        onConfirm = { onConfirmOrder(order.id) },
                                        onComplete = { onCompleteOrder(order) },
                                        isCompact = true
                                    )
                                }
                                // Bottom spacing for FAB
                                item(span = { GridItemSpan(gridColumns) }) {
                                    Spacer(modifier = Modifier.height(80.dp))
                                }
                            }
                        }
                    }
                    else -> {
                        EmptyOrdersState(
                            icon = Icons.Default.DeliveryDining,
                            message = "Đơn từ App",
                            subMessage = "Chưa có đơn hàng từ ứng dụng"
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CompactStatCard(
    count: Int,
    label: String,
    color: Color,
    iconColor: Color
) {
    Surface(
        color = color,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = count.toString(),
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = iconColor
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                fontSize = 12.sp,
                color = Color.Gray
            )
        }
    }
}

private fun formatCurrencyCompact(amount: Double): String {
    return when {
        amount >= 1_000_000 -> "${String.format("%.1f", amount / 1_000_000)}tr"
        amount >= 1_000 -> "${String.format("%.0f", amount / 1_000)}k"
        else -> "${amount.toLong()}đ"
    }
}

@Composable
private fun DashboardSidebar(
    branchName: String,
    staffName: String,
    onNavigateToSale: () -> Unit,
    onNavigateToFoodOrders: () -> Unit,
    onNavigateToShift: () -> Unit,
    onNavigateToOrderHistory: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onSwitchStaff: () -> Unit,
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(80.dp)
            .fillMaxHeight()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF1976D2),
                        Color(0xFF1565C0)
                    )
                )
            )
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Logo
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Outlined.Restaurant,
                contentDescription = null,
                modifier = Modifier.size(28.dp),
                tint = Color.White
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Navigation Items
        SidebarNavItem(
            icon = Icons.Default.PointOfSale,
            label = "Bán hàng",
            isActive = true,
            onClick = onNavigateToSale
        )

        SidebarNavItem(
            icon = Icons.Default.DeliveryDining,
            label = "Đơn App",
            onClick = onNavigateToFoodOrders
        )

        SidebarNavItem(
            icon = Icons.Default.TableBar,
            label = "Bàn",
            onClick = {}
        )

        SidebarNavItem(
            icon = Icons.Default.Schedule,
            label = "Ca làm",
            onClick = onNavigateToShift
        )

        SidebarNavItem(
            icon = Icons.Default.History,
            label = "Lịch sử",
            onClick = onNavigateToOrderHistory
        )

        Spacer(modifier = Modifier.weight(1f))

        // Bottom Items
        SidebarNavItem(
            icon = Icons.Default.Settings,
            label = "Cai dat",
            onClick = onNavigateToSettings
        )

        // Switch Staff Button
        SidebarNavItem(
            icon = Icons.Default.SwapHoriz,
            label = "Doi NV",
            onClick = onSwitchStaff
        )

        // Logout Button
        SidebarNavItem(
            icon = Icons.Default.Logout,
            label = "Thoat",
            onClick = onLogout
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Staff Avatar with name initial
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            // Show staff initial
            val initial = staffName.split(" ")
                .mapNotNull { it.firstOrNull()?.uppercaseChar() }
                .lastOrNull()?.toString() ?: "?"
            Text(
                text = initial,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
    }
}

@Composable
private fun SidebarNavItem(
    icon: ImageVector,
    label: String,
    isActive: Boolean = false,
    badge: Int? = null,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .padding(vertical = 4.dp)
            .size(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isActive) Color.White.copy(alpha = 0.2f)
                else Color.Transparent
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    modifier = Modifier.size(22.dp),
                    tint = Color.White
                )
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
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = label,
                fontSize = 9.sp,
                color = Color.White.copy(alpha = 0.9f),
                maxLines = 1
            )
        }
    }
}

@Composable
private fun DashboardHeader(
    currentTime: String,
    currentDate: String,
    todayRevenue: Long,
    totalOrders: Int,
    pendingOrders: Int
) {
    Surface(
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left: Time & Date
            Column {
                Text(
                    text = currentTime,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1976D2)
                )
                Text(
                    text = currentDate,
                    fontSize = 14.sp,
                    color = Color.Gray
                )
            }

            // Right: Stats
            Row(
                horizontalArrangement = Arrangement.spacedBy(32.dp)
            ) {
                HeaderStat(
                    label = "Doanh thu hôm nay",
                    value = formatCurrency(todayRevenue),
                    color = Color(0xFF4CAF50)
                )
                HeaderStat(
                    label = "Tổng đơn",
                    value = totalOrders.toString(),
                    color = Color(0xFF2196F3)
                )
                HeaderStat(
                    label = "Đang chờ",
                    value = pendingOrders.toString(),
                    color = Color(0xFFFF9800)
                )
            }
        }
    }
}

@Composable
private fun HeaderStat(
    label: String,
    value: String,
    color: Color
) {
    Column(horizontalAlignment = Alignment.End) {
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

@Composable
private fun StatsCardsRow(
    draftCount: Int,
    confirmedCount: Int,
    completedCount: Int,
    foodAppCount: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.Edit,
            label = "Chờ xác nhận",
            count = draftCount,
            color = Color(0xFFFF9800)
        )
        StatCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.CheckCircle,
            label = "Đã xác nhận",
            count = confirmedCount,
            color = Color(0xFF2196F3)
        )
        StatCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.Done,
            label = "Hoàn tất",
            count = completedCount,
            color = Color(0xFF4CAF50)
        )
        StatCard(
            modifier = Modifier.weight(1f),
            icon = Icons.Default.DeliveryDining,
            label = "Đơn App",
            count = foodAppCount,
            color = Color(0xFFE91E63)
        )
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    count: Int,
    color: Color
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = color
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = count.toString(),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
                Text(
                    text = label,
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }
        }
    }
}

@Composable
private fun OrdersTabBar(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    posCount: Int,
    appCount: Int,
    gridColumns: Int,
    onGridColumnsChanged: (Int) -> Unit,
    isCompact: Boolean = false
) {
    val columnOptions = if (isCompact) listOf(1, 2, 3) else listOf(3, 4, 5, 6)

    Surface(color = Color.White) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = if (isCompact) 12.dp else 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tabs
            Row(
                horizontalArrangement = Arrangement.spacedBy(if (isCompact) 4.dp else 8.dp)
            ) {
                TabChip(
                    label = "Đơn Quầy",
                    count = posCount,
                    isSelected = selectedTab == 0,
                    color = Color(0xFF1976D2),
                    onClick = { onTabSelected(0) },
                    isCompact = isCompact
                )
                TabChip(
                    label = "Đơn App",
                    count = appCount,
                    isSelected = selectedTab == 1,
                    color = Color(0xFFE91E63),
                    onClick = { onTabSelected(1) },
                    isCompact = isCompact
                )
            }

            // Grid Column Selector
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.GridView,
                    contentDescription = null,
                    modifier = Modifier.size(if (isCompact) 16.dp else 18.dp),
                    tint = Color.Gray
                )
                columnOptions.forEach { cols ->
                    FilterChip(
                        selected = gridColumns == cols,
                        onClick = { onGridColumnsChanged(cols) },
                        label = { Text("$cols", fontSize = if (isCompact) 11.sp else 12.sp) },
                        modifier = Modifier.height(if (isCompact) 28.dp else 32.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF1976D2),
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun TabChip(
    label: String,
    count: Int,
    isSelected: Boolean,
    color: Color,
    onClick: () -> Unit,
    isCompact: Boolean = false
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) color else Color.Transparent,
        border = if (!isSelected) ButtonDefaults.outlinedButtonBorder else null
    ) {
        Row(
            modifier = Modifier.padding(
                horizontal = if (isCompact) 12.dp else 16.dp,
                vertical = if (isCompact) 6.dp else 8.dp
            ),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                fontSize = if (isCompact) 12.sp else 14.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (isSelected) Color.White else Color.Gray
            )
            Spacer(modifier = Modifier.width(if (isCompact) 4.dp else 8.dp))
            Badge(
                containerColor = if (isSelected) Color.White.copy(alpha = 0.2f) else color.copy(alpha = 0.1f)
            ) {
                Text(
                    text = count.toString(),
                    fontSize = if (isCompact) 10.sp else 11.sp,
                    color = if (isSelected) Color.White else color
                )
            }
        }
    }
}

@Composable
private fun OrderCard(
    order: PosOrder,
    onClick: () -> Unit = {},
    onConfirm: () -> Unit = {},
    onComplete: () -> Unit = {},
    isCompact: Boolean = false
) {
    val statusColor = Color(order.status.color)

    // Calculate wait time
    val waitMinutes = remember(order.createdAt) {
        ((System.currentTimeMillis() - order.createdAt) / 60000).toInt()
    }
    val isUrgent = waitMinutes > 15
    val borderColor = if (isUrgent) Color(0xFFF44336) else statusColor

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(if (isCompact) 0.85f else 0.9f)
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(if (isCompact) 10.dp else 12.dp),
        border = if (isUrgent) androidx.compose.foundation.BorderStroke(2.dp, borderColor) else null
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Status bar at top
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (isCompact) 4.dp else 6.dp)
                    .background(statusColor)
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(if (isCompact) 8.dp else 10.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Header: Order number + Wait time
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Order number badge
                    Box(
                        modifier = Modifier
                            .background(statusColor, RoundedCornerShape(if (isCompact) 4.dp else 6.dp))
                            .padding(horizontal = if (isCompact) 6.dp else 8.dp, vertical = if (isCompact) 2.dp else 3.dp)
                    ) {
                        Text(
                            text = "#${order.orderNumber.toString().padStart(3, '0')}",
                            fontSize = if (isCompact) 11.sp else 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                    // Wait time indicator
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .background(
                                if (isUrgent) Color(0xFFFFEBEE) else Color(0xFFF5F5F5),
                                RoundedCornerShape(4.dp)
                            )
                            .padding(horizontal = if (isCompact) 4.dp else 6.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Schedule,
                            contentDescription = null,
                            modifier = Modifier.size(if (isCompact) 10.dp else 12.dp),
                            tint = if (isUrgent) Color(0xFFF44336) else Color.Gray
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = "${waitMinutes}p",
                            fontSize = if (isCompact) 9.sp else 11.sp,
                            fontWeight = if (isUrgent) FontWeight.Bold else FontWeight.Normal,
                            color = if (isUrgent) Color(0xFFF44336) else Color.Gray
                        )
                    }
                }

                // Center: Table + Items + Total
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // Table name - Large
                    Text(
                        text = order.tableName ?: "Mang đi",
                        fontSize = if (isCompact) 14.sp else 18.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        color = Color(0xFF212121),
                        maxLines = 1
                    )
                    Spacer(modifier = Modifier.height(if (isCompact) 2.dp else 4.dp))
                    // Items count
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Restaurant,
                            contentDescription = null,
                            modifier = Modifier.size(if (isCompact) 12.dp else 14.dp),
                            tint = Color.Gray
                        )
                        Spacer(modifier = Modifier.width(if (isCompact) 2.dp else 4.dp))
                        Text(
                            text = "${order.itemCount} món",
                            fontSize = if (isCompact) 11.sp else 13.sp,
                            color = Color.Gray
                        )
                    }
                    Spacer(modifier = Modifier.height(if (isCompact) 4.dp else 6.dp))
                    // Total amount - Prominent
                    Text(
                        text = formatCurrency(order.totalAmount),
                        fontSize = if (isCompact) 13.sp else 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1976D2)
                    )
                }

                // Footer: Quick action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(if (isCompact) 4.dp else 8.dp)
                ) {
                    if (order.status == PosOrderStatus.DRAFT) {
                        // Draft order: Show confirm button
                        Button(
                            onClick = onConfirm,
                            modifier = Modifier
                                .weight(1f)
                                .height(if (isCompact) 32.dp else 36.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFFF9800)
                            ),
                            contentPadding = PaddingValues(horizontal = if (isCompact) 4.dp else 8.dp)
                        ) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                modifier = Modifier.size(if (isCompact) 14.dp else 16.dp)
                            )
                            if (!isCompact) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Xác nhận", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    } else {
                        // Confirmed order: Show complete button (payment)
                        Button(
                            onClick = onComplete,
                            modifier = Modifier
                                .weight(1f)
                                .height(if (isCompact) 32.dp else 36.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF4CAF50)
                            ),
                            contentPadding = PaddingValues(horizontal = if (isCompact) 4.dp else 8.dp)
                        ) {
                            Icon(
                                Icons.Default.Payment,
                                contentDescription = null,
                                modifier = Modifier.size(if (isCompact) 14.dp else 16.dp)
                            )
                            if (!isCompact) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Thanh toán", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyOrdersState(
    icon: ImageVector = Icons.Default.Storefront,
    message: String = "Chưa có đơn hàng",
    subMessage: String = "Nhấn + để tạo đơn mới"
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFE3F2FD)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = Color(0xFF1976D2)
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = message,
                fontSize = 18.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF424242)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subMessage,
                fontSize = 14.sp,
                color = Color.Gray
            )
        }
    }
}

@Composable
private fun QuickPaymentDialog(
    order: PosOrder,
    onDismiss: () -> Unit,
    onPaymentComplete: (paymentMethod: String) -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.7f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Icon(
                    imageVector = Icons.Default.Payment,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = Color(0xFF4CAF50)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Thanh toán",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Đơn #${order.orderNumber.toString().padStart(3, '0')} • ${order.tableName ?: "Mang đi"}",
                    fontSize = 14.sp,
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Total amount - Large
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFE8F5E9), RoundedCornerShape(12.dp))
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Tổng tiền",
                            fontSize = 14.sp,
                            color = Color(0xFF388E3C)
                        )
                        Text(
                            text = formatCurrency(order.totalAmount),
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF2E7D32)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Payment method buttons - Large touch targets
                Text(
                    text = "Chọn phương thức thanh toán",
                    fontSize = 14.sp,
                    color = Color.Gray,
                    modifier = Modifier.align(Alignment.Start)
                )
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Cash payment
                    PaymentMethodButton(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Money,
                        label = "Tiền mặt",
                        color = Color(0xFF4CAF50),
                        onClick = { onPaymentComplete("cash") }
                    )

                    // Card payment
                    PaymentMethodButton(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.CreditCard,
                        label = "Thẻ",
                        color = Color(0xFF2196F3),
                        onClick = { onPaymentComplete("card") }
                    )

                    // Transfer payment
                    PaymentMethodButton(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.QrCode,
                        label = "Chuyển khoản",
                        color = Color(0xFF9C27B0),
                        onClick = { onPaymentComplete("transfer") }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Cancel button
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Huỷ", color = Color.Gray)
                }
            }
        }
    }
}

@Composable
private fun PaymentMethodButton(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .aspectRatio(0.85f)
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                modifier = Modifier.size(32.dp),
                tint = color
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = label,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = color,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun OrderDetailDialog(
    order: PosOrder,
    orderItems: List<OrderItemEntity>,
    onDismiss: () -> Unit,
    onComplete: () -> Unit,
    onCancel: () -> Unit,
    onAddItems: () -> Unit
) {
    val statusColor = Color(order.status.color)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .fillMaxHeight(0.8f),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(statusColor)
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Đơn #${order.orderNumber.toString().padStart(3, '0')}",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = order.tableName ?: "Mang đi",
                            fontSize = 14.sp,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Đóng",
                            tint = Color.White
                        )
                    }
                }

                // Order Status
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = when (order.status) {
                                PosOrderStatus.DRAFT -> Icons.Default.Edit
                                PosOrderStatus.CONFIRMED -> Icons.Default.CheckCircle
                                PosOrderStatus.COMPLETED -> Icons.Default.Done
                            },
                            contentDescription = null,
                            tint = statusColor,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = order.status.displayName,
                            fontWeight = FontWeight.Medium,
                            color = statusColor
                        )
                    }
                    Text(
                        text = formatTime(order.createdAt),
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                }

                HorizontalDivider()

                // Order Items - filter out combo children (they're shown under their parent)
                val parentItems = orderItems.filter { !it.isComboChild }
                val comboChildrenMap = orderItems.filter { it.isComboChild }.groupBy { it.comboParentId }

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    item {
                        Text(
                            text = "Danh sách món (${parentItems.size})",
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(vertical = 12.dp)
                        )
                    }

                    items(parentItems) { item ->
                        val comboChildren = if (item.isComboParent) comboChildrenMap[item.id] ?: emptyList() else emptyList()
                        OrderItemRow(item, comboChildren)
                        HorizontalDivider(color = Color.Gray.copy(alpha = 0.2f))
                    }

                    if (orderItems.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Chưa có món",
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                }

                // Total
                HorizontalDivider()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Tổng cộng:",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = formatCurrency(order.totalAmount),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1976D2)
                    )
                }

                // Actions
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF5F5F5))
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Cancel button
                    OutlinedButton(
                        onClick = onCancel,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color(0xFFF44336)
                        )
                    ) {
                        Icon(Icons.Default.Cancel, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Huỷ đơn")
                    }

                    // Add items button
                    OutlinedButton(
                        onClick = onAddItems,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color(0xFF2196F3)
                        )
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Thêm món")
                    }

                    // Complete button
                    Button(
                        onClick = onComplete,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50)
                        )
                    ) {
                        Icon(Icons.Default.Done, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Hoàn tất")
                    }
                }
            }
        }
    }
}

/**
 * Order item row - Grab style layout
 * Layout:
 * [Qty Badge] [Product Name]        [Price]
 *             [Base Price]
 *               • Topping 1         +10.000đ
 *               • Topping 2         +20.000đ
 *             [Combo] Bao gồm:
 *               • Child 1           x2
 *               • Child 2           x1
 */
@Composable
private fun OrderItemRow(item: OrderItemEntity, comboChildren: List<OrderItemEntity> = emptyList()) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp)
    ) {
        // Row 1: Quantity badge + Product name + Total Price
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
                        .size(24.dp)
                        .background(Color(0xFFE3F2FD), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = item.quantity.toString(),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1976D2)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                // Product name only
                Text(
                    text = item.productName,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp
                )
            }
            Text(
                text = formatCurrency(item.totalPrice.toLong()),
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1976D2)
            )
        }

        // Row 2: Base price (indented under product name)
        Text(
            text = formatCurrency(item.unitPrice.toLong()),
            fontSize = 13.sp,
            color = Color.Gray,
            modifier = Modifier.padding(start = 36.dp, top = 2.dp)
        )

        // Row 3: Variants/Toppings - Grab style with prices
        if (!item.notes.isNullOrBlank()) {
            // Split by " | " to separate variants from user note
            val parts = item.notes.split(" | ")
            val variantsPart = parts.firstOrNull() ?: ""
            val userNote = parts.getOrNull(1)

            // Parse variants (format: "Kiwi:10000, Size S:10000" or "Kiwi, Size S")
            val variants = variantsPart.split(",").map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("Ghi chú:") }
            if (variants.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 36.dp, top = 6.dp)
                ) {
                    variants.forEach { variant ->
                        // Parse "Name:Price" format
                        val colonIndex = variant.lastIndexOf(":")
                        val name = if (colonIndex > 0) variant.substring(0, colonIndex) else variant
                        val price = if (colonIndex > 0) variant.substring(colonIndex + 1).toLongOrNull() ?: 0L else 0L

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
                                    text = name,
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

            // Show user note if exists
            if (userNote != null && userNote.isNotEmpty()) {
                Text(
                    text = userNote,
                    fontSize = 13.sp,
                    color = Color(0xFF1976D2),
                    fontStyle = FontStyle.Italic,
                    modifier = Modifier.padding(start = 36.dp, top = 4.dp)
                )
            }
        }

        // Show combo children if this is a combo parent
        if (comboChildren.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 36.dp, top = 8.dp)
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

private fun formatCurrency(amount: Long): String {
    return String.format("%,d đ", amount).replace(",", ".")
}

private fun formatCompactCurrency(amount: Long): String {
    return when {
        amount >= 1_000_000 -> String.format("%.1fM", amount / 1_000_000.0)
        amount >= 1_000 -> "${amount / 1_000}K"
        else -> "${amount}đ"
    }
}

private fun formatTime(timestamp: Long): String {
    val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
    return sdf.format(Date(timestamp))
}
