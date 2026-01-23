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

## Phân chia nhiệm vụ các App

| App | Nhiệm vụ chính |
|-----|---------------|
| **Web Admin** | Tạo cổng liên kết (ports), cấu hình API credentials cho từng platform |
| **Web Dashboard** | Liên kết tài khoản, gán chi nhánh ↔ cửa hàng, gán món ăn, bật/tắt cổng |
| **CCB** | Liên kết tài khoản, poll đơn 5s, auto xác nhận, in bill, hoàn tất đơn, lưu hóa đơn local |

```
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│    WEB-ADMIN      │  │   WEB-DASHBOARD   │  │       CCB         │
│   (Quản trị)      │  │   (Chi nhánh)     │  │    (Tại quán)     │
├───────────────────┤  ├───────────────────┤  ├───────────────────┤
│ • Tạo cổng liên   │  │ • Liên kết tài    │  │ • Poll đơn hàng   │
│   kết (ports)     │  │   khoản merchant  │  │   mỗi 5 giây      │
│ • Cấu hình API    │  │ • Gán chi nhánh   │  │ • Auto xác nhận   │
│                   │  │   ↔ cửa hàng      │  │ • In bill giao    │
│                   │  │ • Gán món ăn      │  │ • Hoàn tất đơn    │
│                   │  │ • Bật/tắt cổng    │  │ • Lưu hóa đơn     │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

**Chi tiết**: [Phân chia nhiệm vụ các App](./app-responsibilities.md)

## Khái niệm quan trọng

### Mapping giữa Merchant và TechRes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MERCHANT (Food Platform)        TECHRES               │
│                                                                          │
│  Merchant Account                                 TechRes Tenant         │
│  (Đăng nhập GrabFood)                            (Công ty ABC)           │
│                                                                          │
│  ├── Store A (Quận 1)        ←── mapping ──→     Branch 1 (CN Quận 1)   │
│  ├── Store B (Quận 3)        ←── mapping ──→     Branch 2 (CN Quận 3)   │
│  └── Store C (Thủ Đức)       ←── mapping ──→     Branch 3 (CN Thủ Đức)  │
│                                                                          │
│  Menu Items (Platform)                           Menu Items (TechRes)    │
│  ├── M001: Cà phê sữa        ←── mapping ──→     SP001: Cà phê sữa      │
│  ├── M002: Bánh mì           ←── mapping ──→     SP002: Bánh mì         │
│  └── ...                                         ...                     │
│                                                                          │
│  (Product mapping sẽ phát triển sau để xuất định lượng)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Tại sao cần mapping?**
- Một tài khoản merchant quản lý **nhiều cửa hàng** trên platform
- Một tenant TechRes có **nhiều chi nhánh**
- CCB của chi nhánh A chỉ được lấy đơn của store đã map với chi nhánh A

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FOOD PLATFORMS                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                       │
│  │  GrabFood   │  │ ShopeeFood  │  │   BeFood    │                       │
│  │  (Stores)   │  │  (Stores)   │  │  (Stores)   │                       │
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
│  │  │   Account    │  │    Store     │  │      Order Sync          │  │  │
│  │  │   Manager    │  │   Mapping    │  │      Service             │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                      PostgreSQL                                     │  │
│  │  ├── food_platform_accounts (credentials, tokens)                   │  │
│  │  ├── food_platform_store_mappings (store ↔ branch)                  │  │
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

### Flow 1: Liên kết tài khoản + Mapping cửa hàng

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
Gọi API lấy danh sách cửa hàng của merchant
        │
        ▼
Hiển thị UI mapping: Store (Platform) ↔ Branch (TechRes)
        │
        ▼
Lưu store mappings vào food_platform_store_mappings
        │
        ▼
Account status = CONNECTED
```

**Chi tiết**:
- [Liên kết tài khoản](./account-linking.md)
- [Mapping cửa hàng](./store-mapping.md)

### Flow 2: Polling đơn hàng (với Store Filter)

```
CCB Chi nhánh A gọi API mỗi 5 giây
        │
        ▼
API-Dashboard query: "Chi nhánh A mapped với stores nào?"
        │
        ▼
Tìm thấy: Store GR-001 (Grab), Store SF-001 (Shopee)
        │
        ▼
Polling song song đến từng store đã mapping
(Chỉ lấy đơn của stores này, không lấy stores khác)
        │
        ▼
So sánh với DB để xác định đơn mới / đơn cập nhật
        │
        ▼
Lưu vào PostgreSQL
        │
        ▼
Trả kết quả về CCB Chi nhánh A
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

  // Status
  status: AccountStatus;         // PENDING | CONNECTING | CONNECTED | ERROR
  isActive: boolean;

  // Polling config
  pollIntervalSeconds: number;   // Default: 30
  errorCount: number;
  lastError?: string;
}
```

### FoodPlatformStoreMapping

```typescript
interface FoodPlatformStoreMapping {
  id: string;                      // UUID
  accountId: string;               // FK to FoodPlatformAccount
  tenantId: string;

  // Merchant store info (from platform)
  externalStoreId: string;         // Store ID trên platform (GR-001)
  externalStoreName: string;       // "Cà phê TechRes Quận 1"
  externalStoreAddress?: string;
  isStoreActive: boolean;          // Trạng thái trên platform

  // TechRes branch mapping
  branchId: number;                // FK to branches
  branchName?: string;             // Cache tên chi nhánh

  // Status
  isActive: boolean;               // Bật/tắt mapping
  lastSyncedAt?: Date;             // Lần cuối sync store info
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
| **Store Mapping Logic** | ⚠️ TODO | High |
| **food_platform_store_mappings Table** | ⚠️ TODO | High |
| **Polling Service (with Store Filter)** | ⚠️ TODO | High |
| **Order Sync Logic** | ⚠️ TODO | High |
| **food_orders Table** | ⚠️ TODO | High |
| **Auto-confirm Logic** | ⚠️ TODO | Medium |
| **Auto-print Bill** | ⚠️ TODO | Medium |
| **Product Mapping** | 📋 Future | Low |

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

1. [Phân chia nhiệm vụ các App](./app-responsibilities.md) - Web Admin, Web Dashboard, CCB
2. [Liên kết tài khoản](./account-linking.md) - Chi tiết flow đăng nhập
3. [Mapping cửa hàng](./store-mapping.md) - Mapping store ↔ branch
4. [Mapping sản phẩm](./product-mapping.md) - Mapping món ăn (Future)
5. [Polling đơn hàng](./order-polling.md) - Cơ chế polling 5s với store filter
6. [Sync và lưu dữ liệu](./order-sync.md) - Logic so sánh và lưu DB
7. [Hiển thị trên CCB](./ccb-display.md) - UI và UX trên CCB
8. [Auto-confirm và in bill](./auto-confirm-print.md) - Tự động hóa
