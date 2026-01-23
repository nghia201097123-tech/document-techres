---
sidebar_position: 1
---

# Tổng quan Food Platform Integration

Hệ thống tích hợp các nền tảng giao đồ ăn (GrabFood, ShopeeFood, BeFood) vào TechRes POS để quản lý đơn hàng tập trung.

## Mục tiêu

- **Quản lý tập trung**: Tất cả đơn hàng từ các platform hiển thị trên một giao diện duy nhất
- **Tự động hóa**: Tự động xác nhận đơn, in bill khi có tài xế
- **Realtime**: Cập nhật trạng thái đơn hàng theo thời gian thực
- **Offline support**: CCB vẫn hoạt động khi mất mạng internet

## Các platform hỗ trợ

| Platform | Auth Type | Status |
|----------|-----------|--------|
| **GrabFood** | Username/Password | Planned |
| **ShopeeFood** | Phone OTP | Planned |
| **BeFood** | Username/Password | Planned |
| **GoFood** | TBD | Future |

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FOOD PLATFORMS                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                       │
│  │  GrabFood   │  │ ShopeeFood  │  │   BeFood    │                       │
│  │  Merchant   │  │  Merchant   │  │  Merchant   │                       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                       │
│         │                │                │                              │
│         └────────────────┼────────────────┘                              │
│                          │                                               │
│                   Merchant APIs                                          │
│                          │                                               │
└──────────────────────────┼───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      API-DASHBOARD                                        │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    Food Platform Service                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │   Account    │  │   Polling    │  │      Order Sync          │  │  │
│  │  │   Manager    │  │   Service    │  │      Service             │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                      PostgreSQL                                     │  │
│  │  ├── food_platform_accounts (credentials, tokens)                   │  │
│  │  └── food_orders (đơn hàng từ platforms)                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                           │
                           │ REST API + WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           CCB (Android)                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    Food Order Screen                                │  │
│  │  ├── Hiển thị đơn hàng theo platform                                │  │
│  │  ├── Filter theo trạng thái (Mới, Đang xử lý, Hoàn thành)           │  │
│  │  ├── Auto-confirm khi có tài xế                                     │  │
│  │  └── Auto-print bill                                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                      SQLite (Local)                                 │  │
│  │  └── food_orders (cache local)                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

## Business Flow tổng quan

### Flow 1: Liên kết tài khoản

```
User trên CCB/Dashboard
        │
        ▼
Nhập thông tin đăng nhập (username/password hoặc OTP)
        │
        ▼
API-Dashboard gọi Merchant API để authenticate
        │
        ▼
Lưu token + credentials vào PostgreSQL
        │
        ▼
Account status = CONNECTED
```

**Chi tiết**: [Liên kết tài khoản](./account-linking.md)

### Flow 2: Polling đơn hàng

```
CCB gọi API mỗi 5 giây (configurable)
        │
        ▼
API-Dashboard xác định các accounts đã liên kết của branch
        │
        ▼
Polling song song đến từng platform (Grab, Shopee, BeFood)
        │
        ▼
So sánh với DB để xác định đơn mới / đơn cập nhật
        │
        ▼
Lưu vào PostgreSQL
        │
        ▼
Trả kết quả về CCB
```

**Chi tiết**: [Polling đơn hàng](./order-polling.md)

### Flow 3: Sync và lưu dữ liệu

```
Nhận orders từ platform APIs
        │
        ▼
Transform data sang format chuẩn (FoodOrder)
        │
        ▼
Kiểm tra order_code trong DB
        │
        ├── Không tồn tại → INSERT (đơn mới)
        │
        └── Đã tồn tại → So sánh changes → UPDATE nếu có thay đổi
```

**Chi tiết**: [Sync và lưu dữ liệu](./order-sync.md)

### Flow 4: Hiển thị trên CCB

```
Nhận response từ API (newOrders, updatedOrders)
        │
        ▼
Cập nhật UI state
        │
        ▼
Hiển thị trên FoodOrderScreen
        │
        ├── Filter by status (Mới, Đang xử lý, Hoàn thành)
        │
        └── Filter by platform (Grab, Shopee, BeFood, Tất cả)
```

**Chi tiết**: [Hiển thị trên CCB](./ccb-display.md)

### Flow 5: Auto-confirm và in bill

```
Khi đơn hàng có driver_info (driverName, driverPhone)
        │
        ▼
Kiểm tra cấu hình auto_confirm_enabled
        │
        ├── Enabled → Tự động xác nhận đơn trên platform
        │
        └── Kiểm tra auto_print_enabled
                │
                └── Enabled → In bill giao hàng
```

**Chi tiết**: [Auto-confirm và in bill](./auto-confirm-print.md)

## Data Models

### FoodPlatformAccount

```typescript
interface FoodPlatformAccount {
  id: string;                    // UUID
  tenantId: string;              // Multi-tenant support
  branchId: number;              // Chi nhánh
  platform: FoodPlatformType;    // GRAB | SHOPEE_FOOD | BEFOOD

  // Authentication
  authType: AuthType;            // USERNAME_PASSWORD | PHONE_OTP
  username?: string;             // Encrypted
  password?: string;             // Encrypted
  phoneNumber?: string;          // For OTP

  // Tokens
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;

  // Store info
  externalMerchantId?: string;   // ID trên platform
  externalStoreName?: string;    // Tên cửa hàng

  // Status
  status: AccountStatus;         // PENDING | CONNECTING | CONNECTED | ERROR
  isActive: boolean;

  // Polling config
  pollIntervalSeconds: number;   // Default: 30
  lastPollAt?: Date;
  nextPollAt?: Date;
  errorCount: number;
  lastError?: string;
}
```

### FoodOrder

```typescript
interface FoodOrder {
  id: string;                    // UUID
  orderCode: string;             // #GR12345, #SF98765
  platform: FoodPlatformType;
  branchId: number;

  // Status
  status: FoodOrderStatus;       // NEW | ACCEPTED | PREPARING | READY | DELIVERING | COMPLETED | CANCELLED

  // Customer
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerNote?: string;

  // Items
  items: FoodOrderItem[];

  // Payment
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  totalAmount: number;
  isPaid: boolean;
  paymentMethod?: string;        // GrabPay, COD, ShopeePay

  // Driver
  driverName?: string;
  driverPhone?: string;
  estimatedDeliveryTime?: string;

  // Timestamps
  createdAt: Date;
  acceptedAt?: Date;
  preparedAt?: Date;
  completedAt?: Date;

  // Sync
  isNew: boolean;                // Flag cho đơn mới
  isUpdated: boolean;            // Flag cho đơn cập nhật
  lastSyncAt: Date;
}
```

## Enums

### FoodPlatformType

```typescript
enum FoodPlatformType {
  GRAB = 'grab',
  SHOPEE_FOOD = 'shopee_food',
  BEFOOD = 'befood',
}
```

### FoodOrderStatus

```typescript
enum FoodOrderStatus {
  NEW = 'new',              // Đơn mới, chờ xác nhận
  ACCEPTED = 'accepted',    // Đã xác nhận
  PREPARING = 'preparing',  // Đang chuẩn bị
  READY = 'ready',          // Sẵn sàng giao
  DELIVERING = 'delivering',// Đang giao (có tài xế)
  COMPLETED = 'completed',  // Hoàn thành
  CANCELLED = 'cancelled',  // Đã hủy
}
```

### AccountStatus

```typescript
enum AccountStatus {
  PENDING = 'pending',          // Chờ đăng nhập
  CONNECTING = 'connecting',    // Đang xác thực (OTP flow)
  CONNECTED = 'connected',      // Đã kết nối thành công
  DISCONNECTED = 'disconnected',// Ngắt kết nối
  ERROR = 'error',              // Lỗi xác thực
}
```

## Trạng thái Implementation

| Component | Status | Priority |
|-----------|--------|----------|
| FoodPlatformAccount Entity | ✅ Done | - |
| Login APIs (structure) | ✅ Done | - |
| CCB FoodOrderScreen UI | ✅ Done | - |
| **Merchant API Integration** | ⚠️ TODO | High |
| **Polling Service** | ⚠️ TODO | High |
| **Order Sync Logic** | ⚠️ TODO | High |
| **food_orders Table** | ⚠️ TODO | High |
| **Auto-confirm Logic** | ⚠️ TODO | Medium |
| **Auto-print Bill** | ⚠️ TODO | Medium |

## Files tham khảo

```
Backend:
├── api-dashboard/src/modules/food-platforms/
│   ├── food-platforms.controller.ts
│   ├── food-platforms.service.ts
│   └── dto/
│
├── api-dashboard/src/database/entities/
│   └── food-platform-account.entity.ts
│
Mobile (CCB):
├── ccb-android/app/src/main/java/com/techres/ccb/
│   ├── presentation/screens/foodorder/
│   │   ├── FoodOrderScreen.kt
│   │   └── FoodOrderViewModel.kt
│   └── domain/model/
│       └── FoodOrderModels.kt
│
Frontend:
├── web-dashboard/src/app/(dashboard)/settings/food-platforms/
│   └── page.tsx
└── web-dashboard/src/services/
    └── food-platform-service.ts
```

## Tiếp theo

1. [Liên kết tài khoản](./account-linking.md) - Chi tiết flow đăng nhập
2. [Polling đơn hàng](./order-polling.md) - Cơ chế polling 5s
3. [Sync và lưu dữ liệu](./order-sync.md) - Logic so sánh và lưu DB
4. [Hiển thị trên CCB](./ccb-display.md) - UI và UX trên CCB
5. [Auto-confirm và in bill](./auto-confirm-print.md) - Tự động hóa
