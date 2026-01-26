# TechRes Food Platform - Microservices Architecture

## 📋 Tổng quan

Hệ thống được tách thành 2 microservices riêng biệt để tối ưu hiệu năng và khả năng mở rộng.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CCB ANDROID APP                                    │
│                         Poll mỗi 15s + WebSocket realtime                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                     │                                    │
              GET /orders/:branchId              WebSocket /orders
              POST /trigger-poll/:branchId              │
                     │                                    │
                     ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY (Nginx/Kong)                              │
└──────────────────────────────────────────────────────────────────────────────────┘
                     │                                    │
         ┌───────────┴──────────┐              ┌─────────┴─────────┐
         ▼                      ▼              ▼                   ▼
┌─────────────────────┐  ┌─────────────────────────────────────────────────────────┐
│  MICROSERVICE 1     │  │                MICROSERVICE 2                           │
│  (Account Service)  │  │            (Order Worker Service)                       │
│  Port: 3001         │  │            Port: 3002                                   │
│                     │  │                                                         │
│  Chức năng:         │  │  Chức năng:                                            │
│  • Link account     │  │  • Poll orders từ platforms (Piscina Workers)          │
│  • Reconnect        │  │  • Save orders to database                             │
│  • Get branches     │  │  • Push realtime via WebSocket                         │
│  • Get menu         │  │  • Cache với Redis                                     │
│  • Disconnect       │  │                                                         │
│  • Token management │  │  Workers:                                               │
│                     │  │  • GrabWorker (pool: 2-10 threads)                     │
└─────────────────────┘  │  • ShopeeWorker (pool: 2-10 threads)                   │
         │               │  • BeFoodWorker (pool: 2-10 threads)                   │
         │               └─────────────────────────────────────────────────────────┘
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
│   • food_platform_accounts (MS1 write, MS2 read)                                │
│   • food_orders (MS2 write)                                                     │
│   • food_order_items                                                            │
│   • food_platform_store_mappings                                                │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Microservice 1: Account Service (Port 3001)

### Chức năng
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/accounts/link` | POST | Liên kết tài khoản Grab/Shopee/BeFood |
| `/accounts/:id/reconnect` | POST | Kết nối lại khi token hết hạn |
| `/accounts/:id` | GET | Lấy thông tin account |
| `/accounts/:id` | DELETE | Ngắt kết nối account |
| `/branches/:branchId/accounts` | GET | Lấy danh sách accounts của branch |
| `/stores/:accountId` | GET | Lấy danh sách cửa hàng |
| `/menu/:accountId` | GET | Lấy menu từ platform |

### Cấu trúc thư mục
```
api-account-service/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── modules/
│   │   ├── accounts/           # Account management
│   │   ├── stores/             # Store/branch management
│   │   ├── menu/               # Menu synchronization
│   │   └── connectors/         # Platform connectors (login, OTP)
│   └── database/
│       └── entities/
└── package.json
```

---

## 🚀 Microservice 2: Order Worker Service (Port 3002)

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
│   │   └── connectors/         # (Reserved)
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
CCB App → API Gateway → Order Worker
                              │
                              ├─ Check Redis cache
                              │   └─ Cache hit → Return immediately (<50ms)
                              │
                              └─ Cache miss → Query DB → Cache → Return
```

### 2. CCB App gọi POST /trigger-poll/:branchId (khi cần refresh)
```
CCB App → API Gateway → Order Worker
                              │
                              ├─ Acquire lock (Redis)
                              │
                              ├─ Get all accounts of branch
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
Order Worker (sau khi save)
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

### 1. Account Service
```bash
cd api-account-service
npm install
npm run start:dev
# Runs on port 3001
```

### 2. Order Worker Service
```bash
cd api-order-worker
npm install
npm run build         # Build NestJS + Workers
npm run start:dev
# Runs on port 3002
```

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=food_platform

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Ports
PORT=3001  # Account Service
PORT=3002  # Order Worker
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
