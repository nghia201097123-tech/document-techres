# TechRes Food Platform - Microservices Architecture

## 📋 Tổng quan

Hệ thống gồm 2 microservices để tối ưu hiệu năng và khả năng mở rộng:
- **api-app-food** (đã có): Quản lý tài khoản, liên kết platforms, menu
- **api-order-worker** (mới): Poll đơn hàng với Piscina workers, realtime WebSocket

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CCB ANDROID APP                                    │
│                         Poll mỗi 15s + WebSocket realtime                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
             GET /orders/:branchId              WebSocket /orders
             POST /trigger-poll/:branchId              │
             POST /accounts/link                       │
                    │                                    │
                    ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY (Nginx/Kong)                              │
└──────────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
        ┌───────────┴──────────┐              ┌─────────┴─────────┐
        ▼                      ▼              ▼                   ▼
┌─────────────────────┐  ┌─────────────────────────────────────────────────────────┐
│  api-app-food       │  │              api-order-worker                           │
│  (Đã có - Giữ nguyên)│  │              (Mới - Thêm mới)                          │
│  Port: 3001         │  │              Port: 3002                                 │
│                     │  │                                                         │
│  Chức năng:         │  │  Chức năng:                                            │
│  • Link account     │  │  • Poll orders từ platforms (Piscina Workers)          │
│  • Reconnect        │  │  • Save orders to database                             │
│  • Get branches     │  │  • Push realtime via WebSocket                         │
│  • Get menu         │  │  • Cache với Redis                                     │
│  • Disconnect       │  │                                                         │
│  • Token management │  │  Workers:                                               │
│                     │  │  • GrabWorker (pool: 2-10 threads)                     │
│  ❌ BỎ: Gọi lấy đơn │  │  • ShopeeWorker (pool: 2-10 threads)                   │
│     từ merchant     │  │  • BeFoodWorker (pool: 2-10 threads)                   │
└─────────────────────┘  └─────────────────────────────────────────────────────────┘
        │                              │                    │
        │                              │                    │
        ▼                              ▼                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                    REDIS                                         │
│   • Cache: orders:branch:{id} (TTL 10s)                                         │
│   • Pub/Sub: branch:{id}:new-orders                                             │
│   • Lock: poll-lock:branch:{id}                                                 │
│   • Queue: Bull jobs                                                            │
└──────────────────────────────────────────────────────────────────────────────────┘
        │                              │                    │
        └──────────────────────────────┼────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           POSTGRESQL DATABASE                                    │
│   • food_platform_accounts (api-app-food write, api-order-worker read)          │
│   • food_orders (api-order-worker write)                                        │
│   • food_order_items                                                            │
│   • food_platform_store_mappings                                                │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ api-app-food (Đã có - Port 3001)

### Chức năng giữ nguyên
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/accounts/link` | POST | Liên kết tài khoản Grab/Shopee/BeFood |
| `/accounts/:id/reconnect` | POST | Kết nối lại khi token hết hạn |
| `/accounts/:id` | GET | Lấy thông tin account |
| `/accounts/:id` | DELETE | Ngắt kết nối account |
| `/branches/:branchId/accounts` | GET | Lấy danh sách accounts của branch |
| `/stores/:accountId` | GET | Lấy danh sách cửa hàng |
| `/menu/:accountId` | GET | Lấy menu từ platform |

### ❌ Cần bỏ
- Tất cả logic gọi đến merchant API để lấy đơn hàng
- Endpoints liên quan đến polling orders trực tiếp

### Cấu trúc (giữ nguyên)
```
api-app-food/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── modules/
│   │   ├── accounts/           # Account management ✅
│   │   ├── stores/             # Store/branch management ✅
│   │   ├── menu/               # Menu synchronization ✅
│   │   └── connectors/         # Platform connectors (login, OTP) ✅
│   │       ├── grab/
│   │       ├── shopee/
│   │       └── befood/
│   └── database/
│       └── entities/
└── package.json
```

---

## 🚀 api-order-worker (Mới - Port 3002)

### Chức năng
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/orders/:branchId` | GET | Lấy orders từ cache/DB (nhanh) |
| `/orders/trigger-poll/:branchId` | POST | Trigger poll từ platforms |
| `/orders/health/stats` | GET | Worker pool statistics |
| `WS /orders` | WebSocket | Realtime push notifications |

### Cấu trúc thư mục
```
api-order-worker/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── modules/
│   │   ├── orders/             # Order API + WebSocket Gateway
│   │   ├── workers/            # Piscina Worker Manager
│   │   ├── queue/              # Bull Queue for background jobs
│   │   └── connectors/         # Platform order fetching
│   │       ├── grab/
│   │       ├── shopee/
│   │       └── befood/
│   ├── workers/                # Piscina worker files
│   │   ├── grab-poll.worker.ts
│   │   ├── shopee-poll.worker.ts
│   │   └── befood-poll.worker.ts
│   └── database/
│       └── entities/
├── tsconfig.json
├── tsconfig.workers.json       # Separate config for workers
└── package.json
```

### Piscina Workers
Workers chạy trong thread pool riêng biệt, không block main thread:

```typescript
// Worker Manager khởi tạo 3 pools
this.grabPool = new Piscina({
  filename: 'workers/grab-poll.worker.js',
  minThreads: 2,
  maxThreads: 10,
  idleTimeout: 60000,
});

// Poll song song tất cả accounts
const results = await Promise.all([
  this.grabPool.run(grabAccount),
  this.shopeePool.run(shopeeAccount),
  this.beFoodPool.run(beFoodAccount),
]);
```

---

## 📡 Flow xử lý đơn hàng

### 1. CCB App gọi GET /orders/:branchId (mỗi 15s)
```
CCB App → API Gateway → api-order-worker
                              │
                              ├─ Check Redis cache
                              │   └─ Cache hit → Return immediately (<50ms)
                              │
                              └─ Cache miss → Query DB → Cache → Return
```

### 2. CCB App gọi POST /trigger-poll/:branchId (khi cần refresh)
```
CCB App → API Gateway → api-order-worker
                              │
                              ├─ Acquire lock (Redis)
                              │
                              ├─ Get all accounts of branch (từ DB)
                              │
                              ├─ Poll parallel via Piscina:
                              │   ├─ GrabWorker.run(account1)
                              │   ├─ ShopeeWorker.run(account2)
                              │   └─ BeFoodWorker.run(account3)
                              │
                              ├─ Save orders to DB
                              │
                              ├─ Invalidate cache
                              │
                              ├─ Publish to Redis Pub/Sub (if new orders)
                              │
                              └─ Release lock
```

### 3. Realtime push khi có đơn mới
```
api-order-worker (sau khi save)
       │
       ├─ redis.publish('branch:123:new-orders', orders)
       │
       └─ WebSocket Gateway (subscriber)
              │
              └─ server.to('branch:123').emit('newOrders', orders)
                     │
                     └─ CCB App (WebSocket client)
```

---

## ⚡ So sánh hiệu năng

| Metric | Kiến trúc cũ | Kiến trúc mới |
|--------|-------------|---------------|
| Platform API calls/s | 6,667 (100k users) | ~200 (1/account/5s) |
| Backend latency | 500-2000ms | <50ms (cache hit) |
| Database ops/s | 33,000 | ~1,000 |
| Threads blocked | Main thread | Worker threads only |
| Scalability | Single instance | Horizontal scaling |

---

## 🔧 Cài đặt & Chạy

### 1. api-app-food (đã có)
```bash
cd api-app-food
npm install
npm run start:dev
# Runs on port 3001
```

### 2. api-order-worker (mới)
```bash
cd api-order-worker
npm install
npm run build         # Build NestJS + Workers
npm run start:dev
# Runs on port 3002
```

---

## 📊 Monitoring

### Worker Pool Stats
```bash
GET /api/v1/orders/health/stats

Response:
{
  "workers": {
    "grab": {
      "completed": 1234,
      "waiting": 0,
      "threads": 5,
      "runTime": 150
    },
    "shopee": { ... },
    "befood": { ... }
  }
}
```

### WebSocket Connected Clients
```bash
# In OrdersGateway
getConnectedClientsCount(branchId): number
getAllConnectedBranches(): Record<string, number>
```

---

## 🔒 TechRes Order Flow

```
Đơn mới (NEW) → [Xác nhận] → Đang xử lý (PREPARING) → [Hoàn tất/Huỷ] → COMPLETED/CANCELLED
```

**Quy tắc:**
- Đơn mới lấy về luôn có status = NEW
- Chỉ sync COMPLETED/CANCELLED từ platform
- Không sync trạng thái trung gian (PREPARING, READY) từ platform
- TechRes staff quyết định chuyển NEW → PREPARING

---

## 📝 Notes

1. **BeFood**: Order polling chưa implement (cần API documentation)
2. **Piscina Workers**: Compile riêng với `tsconfig.workers.json`
3. **Redis**: Required cho cache, pub/sub, và Bull queue
4. **WebSocket**: Namespace `/orders`, clients join room `branch:{id}`
5. **api-app-food**: Giữ nguyên code hiện tại, chỉ bỏ phần gọi lấy đơn hàng từ merchant
