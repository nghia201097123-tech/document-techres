---
sidebar_position: 5
---

# Hiển thị trên CCB (CCB Display)

Chi tiết về giao diện và trải nghiệm người dùng khi quản lý đơn hàng food platform trên CCB Android.

## Tổng quan

CCB (Cash Control Box) là thiết bị Android chạy ứng dụng quản lý bán hàng. Food Order Screen là màn hình chuyên dụng để quản lý đơn hàng từ các food platform.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CCB Android App                                                         │
│  ├── Home Screen                                                         │
│  ├── Order Screen (POS orders)                                           │
│  ├── Table Screen                                                        │
│  ├── ★ Food Order Screen ← Đơn hàng từ food platforms                   │
│  ├── Kitchen Screen                                                      │
│  └── Settings                                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## UI Layout

### Food Order Screen

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  🍔 Đơn hàng Food App                               [⟳] [⚙️]    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ [Mới (5)] [Đang xử lý (3)] [Hoàn thành] [Đã hủy]                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ [Tất cả] [🟢 Grab (3)] [🟠 Shopee (2)] [🔵 BeFood (3)]          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ ┌─────────────────────────────────────────────────────────────┐ │    │
│  │ │ 🟢 GRAB    #GR12345                         10 phút trước   │ │    │
│  │ │                                                             │ │    │
│  │ │ 👤 Nguyễn Văn A                           📞 0901234567    │ │    │
│  │ │                                                             │ │    │
│  │ │ 📦 2x Cà phê sữa đá, 1x Bánh mì thịt                       │ │    │
│  │ │                                                             │ │    │
│  │ │ 💰 95,000đ                                    [COD]         │ │    │
│  │ │                                                             │ │    │
│  │ │ [Xác nhận]                              [Từ chối]           │ │    │
│  │ └─────────────────────────────────────────────────────────────┘ │    │
│  │                                                                 │    │
│  │ ┌─────────────────────────────────────────────────────────────┐ │    │
│  │ │ 🟠 SHOPEE  #SF98765                          5 phút trước   │ │    │
│  │ │                                                             │ │    │
│  │ │ 👤 Trần Thị B                             📞 0987654321    │ │    │
│  │ │ 🚗 Tài xế: Lê Văn C (0912345678)                           │ │    │
│  │ │                                                             │ │    │
│  │ │ 📦 1x Combo gia đình                                       │ │    │
│  │ │                                                             │ │    │
│  │ │ 💰 250,000đ                                 [Đã TT]         │ │    │
│  │ │                                                             │ │    │
│  │ │ [Đang giao...]                                              │ │    │
│  │ └─────────────────────────────────────────────────────────────┘ │    │
│  │                                                                 │    │
│  │ ┌─────────────────────────────────────────────────────────────┐ │    │
│  │ │ ... more orders ...                                         │ │    │
│  │ └─────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Jetpack Compose Implementation

### FoodOrderScreen.kt

```kotlin
@Composable
fun FoodOrderScreen(
    viewModel: FoodOrderViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {}
) {
    val orders by viewModel.orders.collectAsStateWithLifecycle()
    val isPolling by viewModel.isPolling.collectAsStateWithLifecycle()
    val selectedStatus by viewModel.selectedStatus.collectAsStateWithLifecycle()
    val selectedPlatform by viewModel.selectedPlatform.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            FoodOrderTopBar(
                isPolling = isPolling,
                onRefresh = { viewModel.manualRefresh() },
                onSettings = { /* Navigate to settings */ }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Status tabs
            StatusFilterTabs(
                selectedStatus = selectedStatus,
                orderCounts = viewModel.orderCounts,
                onStatusSelected = { viewModel.setStatusFilter(it) }
            )

            // Platform filter chips
            PlatformFilterChips(
                selectedPlatform = selectedPlatform,
                platformCounts = viewModel.platformCounts,
                onPlatformSelected = { viewModel.setPlatformFilter(it) }
            )

            // Order list
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(
                    items = orders,
                    key = { it.id }
                ) { order ->
                    FoodOrderCard(
                        order = order,
                        onAccept = { viewModel.acceptOrder(order) },
                        onReject = { viewModel.rejectOrder(order) },
                        onStartPreparing = { viewModel.startPreparing(order) },
                        onMarkReady = { viewModel.markReady(order) },
                        onComplete = { viewModel.completeOrder(order) },
                        onClick = { viewModel.showOrderDetail(order) }
                    )
                }
            }
        }
    }
}
```

### Status Filter Tabs

```kotlin
@Composable
fun StatusFilterTabs(
    selectedStatus: FoodOrderStatus?,
    orderCounts: Map<FoodOrderStatus, Int>,
    onStatusSelected: (FoodOrderStatus?) -> Unit
) {
    val statuses = listOf(
        null to "Tất cả",
        FoodOrderStatus.NEW to "Mới",
        FoodOrderStatus.ACCEPTED to "Đã nhận",
        FoodOrderStatus.PREPARING to "Đang làm",
        FoodOrderStatus.READY to "Sẵn sàng",
        FoodOrderStatus.DELIVERING to "Đang giao",
        FoodOrderStatus.COMPLETED to "Hoàn thành",
        FoodOrderStatus.CANCELLED to "Đã hủy",
    )

    ScrollableTabRow(
        selectedTabIndex = statuses.indexOfFirst { it.first == selectedStatus },
        modifier = Modifier.fillMaxWidth(),
        edgePadding = 16.dp
    ) {
        statuses.forEach { (status, label) ->
            val count = if (status == null) {
                orderCounts.values.sum()
            } else {
                orderCounts[status] ?: 0
            }

            Tab(
                selected = selectedStatus == status,
                onClick = { onStatusSelected(status) },
                text = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(label)
                        if (count > 0) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Badge(
                                containerColor = if (status == FoodOrderStatus.NEW) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    MaterialTheme.colorScheme.secondary
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
```

### Platform Filter Chips

```kotlin
@Composable
fun PlatformFilterChips(
    selectedPlatform: FoodPlatform?,
    platformCounts: Map<FoodPlatform, Int>,
    onPlatformSelected: (FoodPlatform?) -> Unit
) {
    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            FilterChip(
                selected = selectedPlatform == null,
                onClick = { onPlatformSelected(null) },
                label = { Text("Tất cả") }
            )
        }

        items(FoodPlatform.values().toList()) { platform ->
            val count = platformCounts[platform] ?: 0

            FilterChip(
                selected = selectedPlatform == platform,
                onClick = { onPlatformSelected(platform) },
                label = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(
                                    color = platform.color,
                                    shape = CircleShape
                                )
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(platform.displayName)
                        if (count > 0) {
                            Text(" ($count)")
                        }
                    }
                }
            )
        }
    }
}
```

### Food Order Card

```kotlin
@Composable
fun FoodOrderCard(
    order: FoodOrder,
    onAccept: () -> Unit,
    onReject: () -> Unit,
    onStartPreparing: () -> Unit,
    onMarkReady: () -> Unit,
    onComplete: () -> Unit,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Platform badge
                PlatformBadge(platform = order.platform)

                // Order code
                Text(
                    text = order.orderCode,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                // Time ago
                Text(
                    text = order.createdAt.timeAgo(),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Customer info
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(order.customerName, style = MaterialTheme.typography.bodyMedium)
                Spacer(modifier = Modifier.weight(1f))
                Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(order.customerPhone, style = MaterialTheme.typography.bodyMedium)
            }

            // Driver info (if assigned)
            if (order.driverName != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.DirectionsCar, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "Tài xế: ${order.driverName}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = order.driverPhone ?: "",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Items summary
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Inventory, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = order.items.joinToString(", ") {
                        "${it.quantity}x ${it.productName}"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Footer: Amount + Payment status + Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Amount
                Text(
                    text = order.totalAmount.formatCurrency(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                // Payment badge
                PaymentBadge(isPaid = order.isPaid)

                Spacer(modifier = Modifier.weight(1f))

                // Action buttons based on status
                OrderActionButtons(
                    status = order.status,
                    onAccept = onAccept,
                    onReject = onReject,
                    onStartPreparing = onStartPreparing,
                    onMarkReady = onMarkReady,
                    onComplete = onComplete
                )
            }
        }
    }
}
```

### Action Buttons

```kotlin
@Composable
fun OrderActionButtons(
    status: FoodOrderStatus,
    onAccept: () -> Unit,
    onReject: () -> Unit,
    onStartPreparing: () -> Unit,
    onMarkReady: () -> Unit,
    onComplete: () -> Unit
) {
    when (status) {
        FoodOrderStatus.NEW -> {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = onReject,
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Từ chối")
                }
                Button(onClick = onAccept) {
                    Text("Xác nhận")
                }
            }
        }

        FoodOrderStatus.ACCEPTED -> {
            Button(onClick = onStartPreparing) {
                Text("Bắt đầu làm")
            }
        }

        FoodOrderStatus.PREPARING -> {
            Button(onClick = onMarkReady) {
                Text("Đã xong")
            }
        }

        FoodOrderStatus.READY -> {
            Text(
                text = "Chờ tài xế...",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.secondary
            )
        }

        FoodOrderStatus.DELIVERING -> {
            Button(onClick = onComplete) {
                Text("Hoàn thành")
            }
        }

        FoodOrderStatus.COMPLETED -> {
            Text(
                text = "✓ Đã giao",
                color = Color(0xFF4CAF50)
            )
        }

        FoodOrderStatus.CANCELLED -> {
            Text(
                text = "✗ Đã hủy",
                color = MaterialTheme.colorScheme.error
            )
        }
    }
}
```

## Order Detail Dialog

```kotlin
@Composable
fun OrderDetailDialog(
    order: FoodOrder,
    onDismiss: () -> Unit,
    onAction: (OrderAction) -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header with platform color
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(order.platform.color)
                        .padding(16.dp)
                ) {
                    Column {
                        Text(
                            text = order.orderCode,
                            style = MaterialTheme.typography.headlineSmall,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = order.platform.displayName,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }

                // Scrollable content
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Status
                    item {
                        SectionCard(title = "Trạng thái") {
                            OrderStatusChip(status = order.status)
                        }
                    }

                    // Customer info
                    item {
                        SectionCard(title = "Thông tin khách hàng") {
                            InfoRow(label = "Tên", value = order.customerName)
                            InfoRow(label = "SĐT", value = order.customerPhone)
                            if (order.customerAddress != null) {
                                InfoRow(label = "Địa chỉ", value = order.customerAddress)
                            }
                            if (order.customerNote != null) {
                                InfoRow(label = "Ghi chú", value = order.customerNote)
                            }
                        }
                    }

                    // Driver info
                    if (order.driverName != null) {
                        item {
                            SectionCard(title = "Tài xế") {
                                InfoRow(label = "Tên", value = order.driverName)
                                InfoRow(label = "SĐT", value = order.driverPhone ?: "-")
                                if (order.estimatedDeliveryTime != null) {
                                    InfoRow(label = "Dự kiến", value = order.estimatedDeliveryTime)
                                }
                            }
                        }
                    }

                    // Items
                    item {
                        SectionCard(title = "Chi tiết đơn hàng") {
                            order.items.forEach { item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "${item.quantity}x ${item.productName}",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        if (item.options != null) {
                                            Text(
                                                text = item.options,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                        if (item.note != null) {
                                            Text(
                                                text = "📝 ${item.note}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.secondary
                                            )
                                        }
                                    }
                                    Text(
                                        text = item.totalPrice.formatCurrency(),
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                            }

                            Divider(modifier = Modifier.padding(vertical = 8.dp))

                            // Payment breakdown
                            InfoRow(label = "Tạm tính", value = order.subtotal.formatCurrency())
                            InfoRow(label = "Phí giao hàng", value = order.deliveryFee.formatCurrency())
                            if (order.platformFee > 0) {
                                InfoRow(label = "Phí dịch vụ", value = order.platformFee.formatCurrency())
                            }
                            if (order.discount > 0) {
                                InfoRow(
                                    label = "Giảm giá",
                                    value = "-${order.discount.formatCurrency()}",
                                    valueColor = Color(0xFF4CAF50)
                                )
                            }

                            Divider(modifier = Modifier.padding(vertical = 8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "Tổng cộng",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = order.totalAmount.formatCurrency(),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }

                            // Payment method
                            Row(
                                modifier = Modifier.padding(top = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Thanh toán: ")
                                Text(
                                    text = order.paymentMethod ?: "COD",
                                    fontWeight = FontWeight.Medium
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                PaymentBadge(isPaid = order.isPaid)
                            }
                        }
                    }

                    // Timeline
                    item {
                        SectionCard(title = "Lịch sử") {
                            OrderTimeline(order = order)
                        }
                    }
                }

                // Bottom actions
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shadowElevation = 8.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            modifier = Modifier.weight(1f),
                            onClick = onDismiss
                        ) {
                            Text("Đóng")
                        }

                        // Context-aware action button
                        when (order.status) {
                            FoodOrderStatus.NEW -> {
                                Button(
                                    modifier = Modifier.weight(1f),
                                    onClick = { onAction(OrderAction.Accept) }
                                ) {
                                    Text("Xác nhận đơn")
                                }
                            }
                            FoodOrderStatus.ACCEPTED -> {
                                Button(
                                    modifier = Modifier.weight(1f),
                                    onClick = { onAction(OrderAction.StartPreparing) }
                                ) {
                                    Text("Bắt đầu làm")
                                }
                            }
                            FoodOrderStatus.PREPARING -> {
                                Button(
                                    modifier = Modifier.weight(1f),
                                    onClick = { onAction(OrderAction.MarkReady) }
                                ) {
                                    Text("Đã xong")
                                }
                            }
                            else -> {}
                        }
                    }
                }
            }
        }
    }
}
```

## Notifications

### New Order Notification

```kotlin
class FoodOrderNotificationManager @Inject constructor(
    private val context: Context
) {
    private val notificationManager = context.getSystemService<NotificationManager>()

    fun showNewOrderNotification(order: FoodOrder) {
        val notification = NotificationCompat.Builder(context, CHANNEL_FOOD_ORDERS)
            .setSmallIcon(R.drawable.ic_food_order)
            .setContentTitle("Đơn hàng mới - ${order.platform.displayName}")
            .setContentText("${order.orderCode}: ${order.items.size} món - ${order.totalAmount.formatCurrency()}")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 500, 200, 500))
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            .setContentIntent(createPendingIntent(order))
            .build()

        notificationManager?.notify(order.id.hashCode(), notification)
    }

    fun playNewOrderSound() {
        val mediaPlayer = MediaPlayer.create(context, R.raw.new_order_sound)
        mediaPlayer.setOnCompletionListener { it.release() }
        mediaPlayer.start()
    }
}
```

### Sound & Vibration Settings

```kotlin
// User preferences for notifications
data class FoodOrderNotificationSettings(
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
    val repeatSoundForNewOrders: Boolean = true,
    val repeatIntervalSeconds: Int = 30,
    val autoAcceptWhenDriverAssigned: Boolean = false,
)
```

## Color Scheme

```kotlin
// Platform colors
enum class FoodPlatform(
    val displayName: String,
    val color: Color
) {
    GRAB_FOOD("GrabFood", Color(0xFF00B14F)),      // Grab Green
    SHOPEE_FOOD("ShopeeFood", Color(0xFFEE4D2D)), // Shopee Orange
    BE_FOOD("BeFood", Color(0xFF00A8E8)),          // Be Blue
    GO_FOOD("GoFood", Color(0xFFE31837)),          // GoJek Red
}

// Status colors
enum class FoodOrderStatus(
    val displayName: String,
    val color: Color,
    val backgroundColor: Color
) {
    NEW("Mới", Color.White, Color(0xFFFF9800)),           // Orange
    ACCEPTED("Đã nhận", Color.White, Color(0xFF2196F3)), // Blue
    PREPARING("Đang làm", Color.White, Color(0xFF9C27B0)), // Purple
    READY("Sẵn sàng", Color.White, Color(0xFF4CAF50)),   // Green
    DELIVERING("Đang giao", Color.White, Color(0xFF00BCD4)), // Cyan
    COMPLETED("Hoàn thành", Color(0xFF4CAF50), Color(0xFFE8F5E9)), // Light Green
    CANCELLED("Đã hủy", Color.White, Color(0xFFF44336)), // Red
}
```

## Accessibility

```kotlin
// Content descriptions for screen readers
@Composable
fun AccessibleFoodOrderCard(order: FoodOrder) {
    Card(
        modifier = Modifier.semantics {
            contentDescription = buildString {
                append("Đơn hàng ${order.orderCode} từ ${order.platform.displayName}. ")
                append("Khách hàng ${order.customerName}. ")
                append("${order.items.size} món, tổng ${order.totalAmount.formatCurrency()}. ")
                append("Trạng thái: ${order.status.displayName}. ")
                if (order.driverName != null) {
                    append("Tài xế ${order.driverName}. ")
                }
            }
        }
    ) {
        // Card content
    }
}
```

## Performance Optimization

### Lazy Loading

```kotlin
// Only render visible items
LazyColumn {
    items(
        items = orders,
        key = { it.id } // Stable keys for efficient updates
    ) { order ->
        FoodOrderCard(order = order)
    }
}
```

### Image Caching

```kotlin
// Cache platform logos
@Composable
fun PlatformLogo(platform: FoodPlatform) {
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(platform.logoUrl)
            .memoryCacheKey(platform.name)
            .diskCacheKey(platform.name)
            .build(),
        contentDescription = platform.displayName
    )
}
```

## Tiếp theo

- [Auto-confirm và in bill](./auto-confirm-print.md) - Tự động hóa xử lý đơn hàng
