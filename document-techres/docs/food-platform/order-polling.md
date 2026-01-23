---
sidebar_position: 3
---

# Polling đơn hàng (Order Polling)

Chi tiết về cơ chế polling đơn hàng từ các food platform về hệ thống TechRes.

## Tổng quan

CCB (Cash Control Box) sẽ **chủ động gọi API** xuống `api-dashboard` mỗi **5 giây** (configurable) để lấy đơn hàng mới từ các food platform.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CCB (Android)                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  PollingService                                                  │    │
│  │  ├── Interval: 5 giây (configurable: 5-60s)                      │    │
│  │  ├── Chỉ chạy khi có ít nhất 1 account CONNECTED                 │    │
│  │  └── Pause khi app ở background                                  │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
│                                 │                                        │
│                        GET /food-orders/poll                             │
│                                 │                                        │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API-DASHBOARD                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  FoodOrderPollingService                                         │    │
│  │                                                                  │    │
│  │  1. Xác định branch từ request                                   │    │
│  │  2. Lấy tất cả CONNECTED accounts của branch                     │    │
│  │  3. Polling song song đến từng platform                          │    │
│  │  4. So sánh và lưu vào DB                                        │    │
│  │  5. Trả về newOrders + updatedOrders                             │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Polling Flow Chi Tiết

### Step 1: CCB gọi API

```typescript
// CCB Android - FoodOrderRepository.kt
class FoodOrderRepository @Inject constructor(
    private val api: FoodOrderApi,
    private val db: FoodOrderDao,
) {
    suspend fun pollOrders(): PollOrdersResponse {
        return api.pollOrders(
            branchId = SessionManager.branchId,
            lastPollAt = getLastPollTimestamp()
        )
    }

    private fun getLastPollTimestamp(): Long? {
        return db.getLastPollAt() // Unix timestamp
    }
}
```

### Step 2: API-Dashboard xử lý

```typescript
// api-dashboard/src/modules/food-orders/food-orders.controller.ts
@Get('poll')
async pollOrders(
  @Query('branchId') branchId: number,
  @Query('lastPollAt') lastPollAt?: number,
) {
  return this.foodOrdersService.pollOrders(branchId, lastPollAt);
}
```

### Step 3: Xác định accounts cần poll

```typescript
// food-orders.service.ts
async pollOrders(branchId: number, lastPollAt?: number) {
  // 1. Lấy tất cả accounts CONNECTED của branch
  const accounts = await this.foodPlatformAccountRepo.find({
    where: {
      branchId,
      status: 'connected',
      isActive: true,
    },
  });

  if (accounts.length === 0) {
    return { newOrders: [], updatedOrders: [], message: 'No connected accounts' };
  }

  // 2. Polling song song
  const results = await Promise.allSettled(
    accounts.map(account => this.pollFromPlatform(account, lastPollAt))
  );

  // 3. Aggregate results
  const allOrders = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // 4. Sync to database và phân loại
  const { newOrders, updatedOrders } = await this.syncOrdersToDb(allOrders, branchId);

  return { newOrders, updatedOrders };
}
```

### Step 4: Polling từng platform

```typescript
// food-orders.service.ts
async pollFromPlatform(
  account: FoodPlatformAccount,
  lastPollAt?: number
): Promise<RawFoodOrder[]> {
  // Refresh token nếu cần
  await this.refreshTokenIfNeeded(account);

  // Gọi API tương ứng với platform
  switch (account.platform) {
    case 'grab':
      return this.pollFromGrab(account, lastPollAt);
    case 'shopee_food':
      return this.pollFromShopeeFood(account, lastPollAt);
    case 'befood':
      return this.pollFromBeFood(account, lastPollAt);
    default:
      throw new Error(`Unknown platform: ${account.platform}`);
  }
}
```

## Platform API Integration

### GrabFood API

```typescript
async pollFromGrab(account: FoodPlatformAccount, since?: number): Promise<RawFoodOrder[]> {
  const url = `${GRAB_API_BASE}/merchant/v2/orders`;

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${account.accessToken}`,
      'X-Merchant-ID': account.externalMerchantId,
    },
    params: {
      status: 'new,accepted,preparing,ready,delivering',
      updatedSince: since ? new Date(since).toISOString() : undefined,
      limit: 50,
    },
  });

  // Transform Grab format -> TechRes format
  return response.data.orders.map(order => this.transformGrabOrder(order, account));
}

private transformGrabOrder(grabOrder: GrabOrder, account: FoodPlatformAccount): RawFoodOrder {
  return {
    externalOrderId: grabOrder.orderID,
    orderCode: `#GR${grabOrder.shortOrderNumber}`,
    platform: 'grab',
    accountId: account.id,
    branchId: account.branchId,

    status: this.mapGrabStatus(grabOrder.state),

    customerName: grabOrder.receiver.name,
    customerPhone: grabOrder.receiver.phone,
    customerAddress: grabOrder.receiver.address.fullAddress,
    customerNote: grabOrder.specialInstruction,

    items: grabOrder.items.map(item => ({
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.price.value,
      totalPrice: item.totalPrice.value,
      note: item.specialInstruction,
      options: item.modifiers?.map(m => m.name).join(', '),
    })),

    subtotal: grabOrder.price.subtotal.value,
    deliveryFee: grabOrder.price.deliveryFee.value,
    platformFee: grabOrder.price.serviceFee?.value || 0,
    discount: grabOrder.price.discount?.value || 0,
    totalAmount: grabOrder.price.total.value,

    isPaid: grabOrder.paymentType !== 'CASH',
    paymentMethod: grabOrder.paymentType,

    driverName: grabOrder.driver?.name,
    driverPhone: grabOrder.driver?.phone,
    estimatedDeliveryTime: grabOrder.estimatedPickupTime,

    createdAt: new Date(grabOrder.createdAt),
    platformUpdatedAt: new Date(grabOrder.updatedAt),
  };
}

private mapGrabStatus(grabState: string): FoodOrderStatus {
  const statusMap = {
    'NEW': 'new',
    'ACCEPTED': 'accepted',
    'PREPARING': 'preparing',
    'READY_FOR_PICKUP': 'ready',
    'DRIVER_ASSIGNED': 'delivering',
    'DRIVER_ARRIVED': 'delivering',
    'PICKED_UP': 'delivering',
    'DELIVERED': 'completed',
    'CANCELLED': 'cancelled',
  };
  return statusMap[grabState] || 'new';
}
```

### ShopeeFood API

```typescript
async pollFromShopeeFood(account: FoodPlatformAccount, since?: number): Promise<RawFoodOrder[]> {
  const url = `${SHOPEE_FOOD_API_BASE}/api/v4/merchant/orders`;

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${account.accessToken}`,
    },
    params: {
      shop_id: account.externalMerchantId,
      time_from: since ? Math.floor(since / 1000) : undefined,
      time_to: Math.floor(Date.now() / 1000),
      page_size: 50,
    },
  });

  return response.data.orders.map(order => this.transformShopeeOrder(order, account));
}

private transformShopeeOrder(shopeeOrder: ShopeeOrder, account: FoodPlatformAccount): RawFoodOrder {
  return {
    externalOrderId: shopeeOrder.order_id.toString(),
    orderCode: `#SF${shopeeOrder.order_code}`,
    platform: 'shopee_food',
    accountId: account.id,
    branchId: account.branchId,

    status: this.mapShopeeStatus(shopeeOrder.status),

    customerName: shopeeOrder.buyer_info.name,
    customerPhone: shopeeOrder.buyer_info.phone,
    customerAddress: shopeeOrder.delivery_info.address,
    customerNote: shopeeOrder.note,

    items: shopeeOrder.items.map(item => ({
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
      note: item.note,
      options: item.options?.map(o => o.name).join(', '),
    })),

    subtotal: shopeeOrder.subtotal,
    deliveryFee: shopeeOrder.delivery_fee,
    platformFee: shopeeOrder.service_fee || 0,
    discount: shopeeOrder.discount || 0,
    totalAmount: shopeeOrder.total,

    isPaid: shopeeOrder.payment_method !== 'COD',
    paymentMethod: shopeeOrder.payment_method,

    driverName: shopeeOrder.shipper?.name,
    driverPhone: shopeeOrder.shipper?.phone,
    estimatedDeliveryTime: shopeeOrder.estimated_delivery_time,

    createdAt: new Date(shopeeOrder.create_time * 1000),
    platformUpdatedAt: new Date(shopeeOrder.update_time * 1000),
  };
}
```

### BeFood API

```typescript
async pollFromBeFood(account: FoodPlatformAccount, since?: number): Promise<RawFoodOrder[]> {
  const url = `${BEFOOD_API_BASE}/merchant/orders`;

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${account.accessToken}`,
      'X-Store-ID': account.externalMerchantId,
    },
    params: {
      from_time: since ? new Date(since).toISOString() : undefined,
      status: 'PENDING,CONFIRMED,PREPARING,READY,DELIVERING',
    },
  });

  return response.data.data.map(order => this.transformBeFoodOrder(order, account));
}
```

## Parallel Polling Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  API-DASHBOARD receives poll request                                     │
│  Branch ID: 1                                                            │
│  Connected accounts: [Grab #1, Grab #2, Shopee #1, BeFood #1]           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Promise.allSettled([                                                    │
│    pollFromGrab(account1),      ─────┐                                   │
│    pollFromGrab(account2),      ─────┼──── Parallel execution            │
│    pollFromShopeeFood(account3),─────┤                                   │
│    pollFromBeFood(account4),    ─────┘                                   │
│  ])                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Grab API       │    │  ShopeeFood API  │    │   BeFood API     │
│   ~200ms         │    │   ~300ms         │    │   ~250ms         │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         │ 5 orders              │ 3 orders              │ 2 orders
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Total: 10 orders       │
                    │  (aggregated)           │
                    └─────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Sync to PostgreSQL     │
                    │  ├── 4 new orders       │
                    │  └── 6 updated orders   │
                    └─────────────────────────┘
```

## Polling Interval Configuration

### Per-Account Configuration

```typescript
interface PollConfig {
  pollIntervalSeconds: number;  // 5-60 giây
  maxPollRetries: number;       // Số lần retry khi lỗi
  pollTimeoutMs: number;        // Timeout cho mỗi request
}

// Default values
const DEFAULT_POLL_CONFIG: PollConfig = {
  pollIntervalSeconds: 30,
  maxPollRetries: 3,
  pollTimeoutMs: 10000, // 10 giây
};
```

### Dynamic Interval

```typescript
// Điều chỉnh interval dựa trên traffic
function calculateOptimalInterval(account: FoodPlatformAccount): number {
  const hour = new Date().getHours();

  // Giờ cao điểm (11-13h, 18-21h): poll nhanh hơn
  const isPeakHour = (hour >= 11 && hour <= 13) || (hour >= 18 && hour <= 21);

  if (isPeakHour) {
    return 5; // 5 giây
  }

  // Giờ thấp điểm: poll chậm hơn
  return 30; // 30 giây
}
```

## Error Handling

### Retry Strategy

```typescript
async function pollWithRetry(
  account: FoodPlatformAccount,
  maxRetries: number = 3
): Promise<RawFoodOrder[]> {
  const delays = [1000, 2000, 4000]; // Exponential backoff

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await pollFromPlatform(account);
    } catch (error) {
      // Không retry cho lỗi authentication
      if (error.status === 401 || error.status === 403) {
        await handleAuthError(account, error);
        throw error;
      }

      // Retry cho network errors
      if (attempt < maxRetries) {
        await sleep(delays[attempt]);
        continue;
      }

      // Max retries reached
      await updateAccountError(account, error);
      throw error;
    }
  }
}

async function handleAuthError(account: FoodPlatformAccount, error: Error) {
  await this.foodPlatformAccountRepo.update(account.id, {
    status: 'disconnected',
    isActive: false,
    lastError: `Auth failed: ${error.message}`,
    errorCount: account.errorCount + 1,
  });

  // Notify user
  await this.notificationService.send({
    branchId: account.branchId,
    type: 'FOOD_PLATFORM_DISCONNECTED',
    title: `${account.platform} đã ngắt kết nối`,
    message: 'Vui lòng đăng nhập lại để tiếp tục nhận đơn',
  });
}
```

### Circuit Breaker Pattern

```typescript
class PlatformCircuitBreaker {
  private failures: Map<string, number> = new Map();
  private lastFailure: Map<string, Date> = new Map();

  private readonly THRESHOLD = 5;        // Số lần fail trước khi mở circuit
  private readonly TIMEOUT_MS = 60000;   // 1 phút trước khi thử lại

  isOpen(accountId: string): boolean {
    const failures = this.failures.get(accountId) || 0;
    const lastFail = this.lastFailure.get(accountId);

    if (failures >= this.THRESHOLD) {
      // Circuit đang mở, kiểm tra timeout
      if (lastFail && Date.now() - lastFail.getTime() < this.TIMEOUT_MS) {
        return true; // Vẫn trong thời gian chờ
      }
      // Reset sau timeout
      this.reset(accountId);
    }

    return false;
  }

  recordFailure(accountId: string) {
    const current = this.failures.get(accountId) || 0;
    this.failures.set(accountId, current + 1);
    this.lastFailure.set(accountId, new Date());
  }

  recordSuccess(accountId: string) {
    this.reset(accountId);
  }

  private reset(accountId: string) {
    this.failures.delete(accountId);
    this.lastFailure.delete(accountId);
  }
}
```

## API Response Format

### Poll Response

```typescript
interface PollOrdersResponse {
  success: boolean;

  // Đơn hàng mới (chưa có trong DB)
  newOrders: FoodOrder[];

  // Đơn hàng đã cập nhật (có thay đổi từ lần poll trước)
  updatedOrders: FoodOrder[];

  // Metadata
  meta: {
    pollTimestamp: number;      // Unix timestamp
    accountsPolled: number;     // Số accounts đã poll
    totalOrdersFetched: number; // Tổng orders từ platforms
    processingTimeMs: number;   // Thời gian xử lý
  };

  // Errors (nếu có accounts bị lỗi)
  errors?: {
    accountId: string;
    platform: string;
    message: string;
  }[];
}
```

### Example Response

```json
{
  "success": true,
  "newOrders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "orderCode": "#GR12345",
      "platform": "grab",
      "status": "new",
      "customerName": "Nguyễn Văn A",
      "customerPhone": "0901234567",
      "items": [
        {
          "productName": "Cà phê sữa đá",
          "quantity": 2,
          "unitPrice": 25000,
          "totalPrice": 50000
        }
      ],
      "totalAmount": 65000,
      "createdAt": "2024-01-23T10:30:00Z"
    }
  ],
  "updatedOrders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "orderCode": "#SF98765",
      "platform": "shopee_food",
      "status": "delivering",
      "driverName": "Trần Văn B",
      "driverPhone": "0987654321",
      "previousStatus": "ready"
    }
  ],
  "meta": {
    "pollTimestamp": 1706003400000,
    "accountsPolled": 3,
    "totalOrdersFetched": 15,
    "processingTimeMs": 450
  }
}
```

## CCB Polling Implementation

### ViewModel

```kotlin
// FoodOrderViewModel.kt
@HiltViewModel
class FoodOrderViewModel @Inject constructor(
    private val repository: FoodOrderRepository,
) : ViewModel() {

    private val _orders = MutableStateFlow<List<FoodOrder>>(emptyList())
    val orders: StateFlow<List<FoodOrder>> = _orders.asStateFlow()

    private val _isPolling = MutableStateFlow(false)
    val isPolling: StateFlow<Boolean> = _isPolling.asStateFlow()

    private var pollingJob: Job? = null

    fun startPolling(intervalMs: Long = 5000) {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (isActive) {
                pollOrders()
                delay(intervalMs)
            }
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    private suspend fun pollOrders() {
        _isPolling.value = true
        try {
            val response = repository.pollOrders()

            // Xử lý đơn mới
            response.newOrders.forEach { order ->
                showNewOrderNotification(order)
                playSound(R.raw.new_order_sound)
            }

            // Cập nhật state
            _orders.value = mergeOrders(_orders.value, response)

        } catch (e: Exception) {
            // Log error, không crash
            Log.e("FoodOrder", "Poll failed", e)
        } finally {
            _isPolling.value = false
        }
    }

    private fun mergeOrders(
        existing: List<FoodOrder>,
        response: PollOrdersResponse
    ): List<FoodOrder> {
        val orderMap = existing.associateBy { it.id }.toMutableMap()

        // Add new orders
        response.newOrders.forEach { order ->
            orderMap[order.id] = order
        }

        // Update existing orders
        response.updatedOrders.forEach { update ->
            orderMap[update.id]?.let { existing ->
                orderMap[update.id] = existing.copy(
                    status = update.status,
                    driverName = update.driverName,
                    driverPhone = update.driverPhone,
                )
            }
        }

        return orderMap.values.sortedByDescending { it.createdAt }
    }
}
```

### Lifecycle-aware Polling

```kotlin
// FoodOrderScreen.kt
@Composable
fun FoodOrderScreen(
    viewModel: FoodOrderViewModel = hiltViewModel()
) {
    val lifecycleOwner = LocalLifecycleOwner.current

    // Start/stop polling based on lifecycle
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> viewModel.startPolling()
                Lifecycle.Event.ON_PAUSE -> viewModel.stopPolling()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            viewModel.stopPolling()
        }
    }

    // UI...
}
```

## Performance Optimization

### 1. Delta Polling (Incremental)

Chỉ lấy orders thay đổi từ lần poll trước:

```typescript
// Gửi lastPollAt để chỉ lấy orders mới/updated
GET /food-orders/poll?branchId=1&lastPollAt=1706003400000
```

### 2. Connection Pooling

```typescript
// Sử dụng HTTP agent với connection pooling
const httpAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
});

const axiosInstance = axios.create({
  httpAgent,
  timeout: 10000,
});
```

### 3. Response Compression

```typescript
// Enable gzip compression
const response = await axios.get(url, {
  headers: {
    'Accept-Encoding': 'gzip, deflate',
  },
});
```

### 4. Caching

```typescript
// Cache kết quả trong thời gian ngắn để tránh duplicate processing
const CACHE_TTL = 2000; // 2 giây

async function pollWithCache(branchId: number) {
  const cacheKey = `poll:${branchId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const result = await doPoll(branchId);
  await redis.setex(cacheKey, CACHE_TTL / 1000, JSON.stringify(result));

  return result;
}
```

## Monitoring & Metrics

```typescript
// Metrics to track
interface PollingMetrics {
  pollCount: number;              // Số lần poll
  averageLatencyMs: number;       // Latency trung bình
  errorRate: number;              // Tỷ lệ lỗi
  ordersPerPoll: number;          // Số orders trung bình/poll
  activeAccountsCount: number;    // Số accounts đang active
}

// Log metrics mỗi phút
setInterval(async () => {
  const metrics = await gatherMetrics();
  logger.info('Polling metrics', metrics);

  // Alert nếu error rate cao
  if (metrics.errorRate > 0.1) { // > 10%
    alertService.send('High polling error rate', metrics);
  }
}, 60000);
```

## Tiếp theo

- [Sync và lưu dữ liệu](./order-sync.md) - Logic so sánh và lưu DB
