# TechRes Food Platform - Microservices Architecture

## 📋 Tổng quan

Hệ thống gồm 2 microservices:
- **api-app-food** (đã có): API chính cho App, quản lý tài khoản, đọc DB, WebSocket với App
- **api-order-worker** (mới): Worker xử lý gọi merchant APIs để lấy đơn hàng

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CCB ANDROID APP                                    │
│                         REST API + WebSocket realtime                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │                           ▲
                    │ REST API                  │ WebSocket (new orders)
                    │ GET /orders/:branchId     │
                    │ POST /orders/trigger-poll │
                    ▼                           │
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          api-app-food (Port 3001)                                │
│                                                                                  │
│  Chức năng:                                                                      │
│  ✅ Link/Reconnect accounts                                                      │
│  ✅ Get branches, menu                                                           │
│  ✅ Token management                                                             │
│  ✅ GET orders từ DB → trả về App                                               │
│  ✅ WebSocket Gateway → push realtime cho App                                   │
│  ✅ Trigger poll → gửi message cho api-order-worker                             │
│  ❌ KHÔNG gọi trực tiếp merchant APIs để lấy đơn                                │
└──────────────────────────────────────────────────────────────────────────────────┘
        │                           ▲                           │
        │ Redis Pub/Sub             │ Redis Pub/Sub             │
        │ "trigger-poll:branch:123" │ "new-orders:branch:123"   │
        ▼                           │                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                    REDIS                                         │
│   • Pub/Sub: trigger-poll:branch:{id}  (api-app-food → api-order-worker)        │
│   • Pub/Sub: new-orders:branch:{id}    (api-order-worker → api-app-food)        │
│   • Cache: orders:branch:{id} (TTL 10s)                                         │
│   • Lock: poll-lock:branch:{id}                                                 │
└──────────────────────────────────────────────────────────────────────────────────┘
        │                           ▲
        │ Subscribe                 │ Publish
        │ "trigger-poll:*"          │ "new-orders:*"
        ▼                           │
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        api-order-worker (Port 3002)                              │
│                                                                                  │
│  Chức năng:                                                                      │
│  ✅ Subscribe Redis: nhận trigger từ api-app-food                               │
│  ✅ Poll orders từ Grab/Shopee/BeFood (Piscina Workers)                         │
│  ✅ Save orders to DB                                                            │
│  ✅ Publish Redis: thông báo có đơn mới cho api-app-food                        │
│  ✅ Invalidate cache khi có đơn mới                                             │
│                                                                                  │
│  Workers:                                                                        │
│  • GrabWorker (pool: 2-10 threads)                                              │
│  • ShopeeWorker (pool: 2-10 threads)                                            │
│  • BeFoodWorker (pool: 2-10 threads)                                            │
└──────────────────────────────────────────────────────────────────────────────────┘
        │                           │
        │ Read accounts             │ Write orders
        ▼                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           POSTGRESQL DATABASE                                    │
│   • food_platform_accounts (api-app-food write, api-order-worker read)          │
│   • food_orders (api-order-worker write, api-app-food read)                     │
│   • food_order_items                                                            │
│   • food_platform_store_mappings                                                │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📡 Flow chi tiết

### Flow 1: App lấy đơn hàng (GET /orders/:branchId)
```
┌─────────┐    GET /orders/123    ┌───────────────┐
│   App   │ ──────────────────────▶ │ api-app-food │
└─────────┘                        └───────────────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ Redis Cache │
                                   └─────────────┘
                                          │
                              Cache hit?  │
                         ┌────────────────┴────────────────┐
                         │ YES                             │ NO
                         ▼                                 ▼
                   Return cached                    Query PostgreSQL
                   orders (<10ms)                         │
                                                          ▼
                                                   Cache result
                                                          │
                                                          ▼
                                                   Return orders
```

### Flow 2: App trigger poll đơn mới (POST /orders/trigger-poll/:branchId)
```
┌─────────┐  POST /trigger-poll/123  ┌───────────────┐
│   App   │ ─────────────────────────▶│ api-app-food │
└─────────┘                           └───────────────┘
                                             │
                                             │ 1. Return immediately
                                             │    { status: "polling" }
     ┌───────────────────────────────────────┘
     │
     │ 2. Publish Redis
     │    "trigger-poll:branch:123"
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                            REDIS                                │
│   Channel: trigger-poll:branch:123                              │
│   Message: { branchId: 123, accounts: [...] }                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ 3. Subscribe receives message
     ▼
┌──────────────────────────────────────────────────────────────────┐
│                       api-order-worker                           │
│                                                                  │
│   4. Acquire lock (prevent duplicate polls)                      │
│                                                                  │
│   5. Poll parallel via Piscina:                                  │
│      ├─ GrabWorker.run(grabAccount)      ──▶ Grab API            │
│      ├─ ShopeeWorker.run(shopeeAccount)  ──▶ Shopee API          │
│      └─ BeFoodWorker.run(beFoodAccount)  ──▶ BeFood API          │
│                                                                  │
│   6. Transform & Save orders to DB                               │
│                                                                  │
│   7. Invalidate cache: DELETE orders:branch:123                  │
│                                                                  │
│   8. If new orders exist:                                        │
│      Publish "new-orders:branch:123" { orders: [...] }           │
│                                                                  │
│   9. Release lock                                                │
└──────────────────────────────────────────────────────────────────┘
     │
     │ 8. Publish Redis (if new orders)
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                            REDIS                                │
│   Channel: new-orders:branch:123                                │
│   Message: { orders: [...], count: 5 }                          │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Subscribe receives message
     ▼
┌───────────────┐                           ┌─────────┐
│ api-app-food  │ ────WebSocket push───────▶│   App   │
│               │    "newOrders" event      │         │
└───────────────┘                           └─────────┘
```

---

## 🏗️ api-app-food (Port 3001) - Chi tiết

### Endpoints
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/accounts/link` | POST | Liên kết tài khoản Grab/Shopee/BeFood |
| `/accounts/:id/reconnect` | POST | Kết nối lại khi token hết hạn |
| `/accounts/:id` | DELETE | Ngắt kết nối account |
| `/branches/:branchId/accounts` | GET | Lấy danh sách accounts của branch |
| `/menu/:accountId` | GET | Lấy menu từ platform |
| `/orders/:branchId` | GET | **Lấy orders từ cache/DB** |
| `/orders/trigger-poll/:branchId` | POST | **Trigger poll, gửi message cho worker** |
| `WS /orders` | WebSocket | **Push realtime khi có đơn mới** |

### Code cần thêm

#### 1. Redis Pub/Sub Service
```typescript
// src/modules/redis/redis-pubsub.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleInit {
  private publisher: Redis;
  private subscriber: Redis;

  async onModuleInit() {
    this.publisher = new Redis({
      host: process.env.CONFIG_REDIS_HOST,
      port: parseInt(process.env.CONFIG_REDIS_PORT),
    });

    this.subscriber = new Redis({
      host: process.env.CONFIG_REDIS_HOST,
      port: parseInt(process.env.CONFIG_REDIS_PORT),
    });
  }

  // Gửi trigger cho api-order-worker
  async triggerPoll(branchId: number, accounts: any[]) {
    const message = JSON.stringify({ branchId, accounts, timestamp: Date.now() });
    await this.publisher.publish(`trigger-poll:branch:${branchId}`, message);
  }

  // Subscribe nhận đơn mới từ api-order-worker
  async subscribeNewOrders(callback: (branchId: number, orders: any[]) => void) {
    await this.subscriber.psubscribe('new-orders:branch:*');

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      const branchId = parseInt(channel.split(':')[2]);
      const data = JSON.parse(message);
      callback(branchId, data.orders);
    });
  }
}
```

#### 2. WebSocket Gateway
```typescript
// src/modules/orders/orders.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

@WebSocketGateway({ namespace: '/orders', cors: true })
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private redisPubSub: RedisPubSubService) {
    // Subscribe nhận đơn mới từ api-order-worker
    this.redisPubSub.subscribeNewOrders((branchId, orders) => {
      this.server.to(`branch:${branchId}`).emit('newOrders', {
        branchId,
        orders,
        count: orders.length,
        timestamp: Date.now(),
      });
    });
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinBranch')
  handleJoinBranch(client: Socket, branchId: number) {
    client.join(`branch:${branchId}`);
    return { event: 'joined', branchId };
  }

  @SubscribeMessage('leaveBranch')
  handleLeaveBranch(client: Socket, branchId: number) {
    client.leave(`branch:${branchId}`);
    return { event: 'left', branchId };
  }
}
```

#### 3. Orders Controller (trigger poll)
```typescript
// src/modules/orders/orders.controller.ts
@Post('trigger-poll/:branchId')
async triggerPoll(@Param('branchId') branchId: number) {
  // Lấy accounts của branch
  const accounts = await this.accountsService.getAccountsByBranch(branchId);

  if (accounts.length === 0) {
    return { status: 'no_accounts', message: 'No linked accounts for this branch' };
  }

  // Gửi message cho api-order-worker qua Redis
  await this.redisPubSub.triggerPoll(branchId, accounts);

  return {
    status: 'polling',
    message: 'Poll request sent to worker',
    accountsCount: accounts.length,
  };
}
```

---

## 🚀 api-order-worker (Port 3002) - Chi tiết

### Chức năng
- **Không có REST API** (chỉ internal service)
- Subscribe Redis channel để nhận trigger từ api-app-food
- Poll orders từ merchant APIs bằng Piscina workers
- Save orders vào DB
- Publish kết quả về cho api-app-food

### Code cần thêm

#### 1. Redis Subscriber Service
```typescript
// src/modules/redis/redis-subscriber.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { WorkerManagerService } from '../workers/worker-manager.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class RedisSubscriberService implements OnModuleInit {
  private subscriber: Redis;
  private publisher: Redis;
  private lockClient: Redis;

  constructor(
    private workerManager: WorkerManagerService,
    private ordersService: OrdersService,
  ) {}

  async onModuleInit() {
    this.subscriber = new Redis({
      host: process.env.CONFIG_REDIS_HOST,
      port: parseInt(process.env.CONFIG_REDIS_PORT),
    });

    this.publisher = new Redis({
      host: process.env.CONFIG_REDIS_HOST,
      port: parseInt(process.env.CONFIG_REDIS_PORT),
    });

    this.lockClient = new Redis({
      host: process.env.CONFIG_REDIS_HOST,
      port: parseInt(process.env.CONFIG_REDIS_PORT),
    });

    // Subscribe to trigger-poll channels
    await this.subscriber.psubscribe('trigger-poll:branch:*');

    this.subscriber.on('pmessage', async (pattern, channel, message) => {
      const branchId = parseInt(channel.split(':')[2]);
      const data = JSON.parse(message);
      await this.handlePollTrigger(branchId, data.accounts);
    });

    console.log('✅ Redis subscriber ready - listening for poll triggers');
  }

  private async handlePollTrigger(branchId: number, accounts: any[]) {
    const lockKey = `poll-lock:branch:${branchId}`;

    // Try to acquire lock (10 seconds TTL)
    const lockAcquired = await this.lockClient.set(lockKey, '1', 'EX', 10, 'NX');

    if (!lockAcquired) {
      console.log(`⏳ Branch ${branchId} already being polled, skipping`);
      return;
    }

    try {
      console.log(`🔄 Polling orders for branch ${branchId} with ${accounts.length} accounts`);

      // Poll all platforms in parallel using Piscina workers
      const results = await this.workerManager.pollMultipleAccounts(accounts);

      // Flatten all orders
      const allOrders = results.flat();

      if (allOrders.length > 0) {
        // Save to database
        const savedOrders = await this.ordersService.saveOrders(branchId, allOrders);

        // Invalidate cache
        await this.publisher.del(`orders:branch:${branchId}`);

        // Publish new orders to api-app-food
        const newOrders = savedOrders.filter(o => o.isNew);
        if (newOrders.length > 0) {
          await this.publisher.publish(
            `new-orders:branch:${branchId}`,
            JSON.stringify({ orders: newOrders, count: newOrders.length })
          );
          console.log(`📤 Published ${newOrders.length} new orders for branch ${branchId}`);
        }
      }

      console.log(`✅ Completed polling for branch ${branchId}: ${allOrders.length} orders`);

    } finally {
      // Release lock
      await this.lockClient.del(lockKey);
    }
  }
}
```

#### 2. Worker Manager (Piscina)
```typescript
// src/modules/workers/worker-manager.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import Piscina from 'piscina';
import * as path from 'path';

@Injectable()
export class WorkerManagerService implements OnModuleInit {
  private grabPool: Piscina;
  private shopeePool: Piscina;
  private beFoodPool: Piscina;

  async onModuleInit() {
    const minThreads = parseInt(process.env.CONFIG_PISCINA_MIN_THREADS || '2');
    const maxThreads = parseInt(process.env.CONFIG_PISCINA_MAX_THREADS || '10');
    const idleTimeout = parseInt(process.env.CONFIG_PISCINA_IDLE_TIMEOUT_MS || '60000');

    this.grabPool = new Piscina({
      filename: path.join(__dirname, '../../workers/grab-poll.worker.js'),
      minThreads,
      maxThreads,
      idleTimeout,
    });

    this.shopeePool = new Piscina({
      filename: path.join(__dirname, '../../workers/shopee-poll.worker.js'),
      minThreads,
      maxThreads,
      idleTimeout,
    });

    this.beFoodPool = new Piscina({
      filename: path.join(__dirname, '../../workers/befood-poll.worker.js'),
      minThreads,
      maxThreads,
      idleTimeout,
    });

    console.log('✅ Piscina worker pools initialized');
  }

  async pollMultipleAccounts(accounts: any[]): Promise<any[][]> {
    const tasks = accounts.map(account => {
      switch (account.platform) {
        case 'GRAB':
          return this.grabPool.run(account);
        case 'SHOPEE_FOOD':
          return this.shopeePool.run(account);
        case 'BE_FOOD':
          return this.beFoodPool.run(account);
        default:
          return Promise.resolve([]);
      }
    });

    return Promise.all(tasks);
  }

  getStats() {
    return {
      grab: {
        completed: this.grabPool.completed,
        waiting: this.grabPool.queueSize,
        threads: this.grabPool.threads.length,
      },
      shopee: {
        completed: this.shopeePool.completed,
        waiting: this.shopeePool.queueSize,
        threads: this.shopeePool.threads.length,
      },
      befood: {
        completed: this.beFoodPool.completed,
        waiting: this.beFoodPool.queueSize,
        threads: this.beFoodPool.threads.length,
      },
    };
  }
}
```

---

## ⚡ So sánh hiệu năng

| Metric | Kiến trúc cũ | Kiến trúc mới |
|--------|-------------|---------------|
| App latency (GET orders) | 500-2000ms | <50ms (cache) |
| Merchant API calls | Mỗi request | Background worker |
| WebSocket push | Không có | Realtime khi có đơn mới |
| Threads blocked | Main thread | Worker threads only |
| Scalability | Single instance | Horizontal scaling |

---

## 🔧 Cài đặt

### 1. api-app-food (cập nhật)
```bash
cd api-app-food
npm install ioredis @nestjs/websockets @nestjs/platform-socket.io socket.io
npm run start:dev
# Port 3001
```

### 2. api-order-worker (mới)
```bash
cd api-order-worker
npm install
npm run build
npm run start:dev
# Port 3002
```

### 3. Redis (required)
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

---

## 🔒 TechRes Order Flow

```
Đơn mới (NEW) → [Xác nhận] → Đang xử lý (PREPARING) → [Hoàn tất/Huỷ] → COMPLETED/CANCELLED
```

**Quy tắc:**
- Đơn mới lấy về luôn có status = NEW
- Chỉ sync COMPLETED/CANCELLED từ platform
- TechRes staff quyết định chuyển NEW → PREPARING
