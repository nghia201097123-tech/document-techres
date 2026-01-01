---
sidebar_position: 5
---

# Cấu trúc Monorepo

Hệ thống được tổ chức theo cấu trúc monorepo để tối đa hóa việc chia sẻ code giữa các ứng dụng.

## Tổng quan cấu trúc

```
fnb-system/
├── packages/
│   └── shared/                    # Code dùng chung (70-80%)
│       ├── api/                   # API client, WebSocket client
│       ├── business/              # Business logic (tính tiền, validate...)
│       ├── hooks/                 # Custom React hooks
│       ├── types/                 # TypeScript interfaces/types
│       ├── constants/             # Constants, enums
│       └── utils/                 # Helper functions
│
├── apps/
│   ├── web-admin/                 # React/Next.js - Super Admin
│   ├── web-dashboard/             # React/Next.js - Chủ quán
│   ├── order/                     # React Native - Order App
│   ├── ccb/                       # React Native - POS
│   └── customer/                  # App khách hàng
│
└── server/                        # Backend API
```

## Chi tiết từng package

### packages/shared

Code dùng chung cho tất cả các ứng dụng:

```
packages/shared/
├── api/
│   ├── client.ts               # Axios/fetch wrapper
│   ├── endpoints.ts            # API endpoints
│   └── websocket.ts            # WebSocket client
│
├── business/
│   ├── order.ts                # Tính tiền, discount
│   ├── validation.ts           # Validate input
│   └── formatters.ts           # Format tiền, ngày
│
├── hooks/
│   ├── useOrder.ts
│   ├── useTable.ts
│   └── useAuth.ts
│
├── types/
│   ├── order.ts
│   ├── product.ts
│   ├── table.ts
│   └── user.ts
│
├── constants/
│   ├── status.ts
│   └── config.ts
│
└── utils/
    ├── uuid.ts
    ├── date.ts
    └── currency.ts
```

### apps/web-admin

```
apps/web-admin/
└── src/
    ├── pages/
    │   ├── stores/              # Quản lý quán (CRUD)
    │   ├── users/               # Quản lý tài khoản owner
    │   ├── billing/             # Gói dịch vụ, thanh toán
    │   ├── support/             # Hỗ trợ khách hàng
    │   └── analytics/           # Thống kê toàn hệ thống
    └── components/
```

### apps/web-dashboard

```
apps/web-dashboard/
└── src/
    ├── pages/
    │   ├── menu/                # Quản lý menu, danh mục
    │   ├── tables/              # Quản lý bàn, khu vực
    │   ├── staff/               # Quản lý nhân viên
    │   ├── reports/             # Báo cáo doanh thu
    │   └── settings/            # Cấu hình quán
    └── components/
```

### apps/order

```
apps/order/
└── src/
    ├── modes/
    │   ├── standalone/          # Code riêng cho Standalone Mode
    │   │   ├── database/        # SQLite local
    │   │   ├── sync/            # Cloud sync
    │   │   ├── printer/         # In Bluetooth trực tiếp
    │   │   └── screens/         # Màn thanh toán, báo cáo
    │   │
    │   └── client/              # Code riêng cho Client Mode
    │       ├── connection/      # WebSocket đến POS
    │       └── screens/         # UI đơn giản hơn
    │
    ├── shared/                  # Code dùng chung cả 2 modes
    │   ├── screens/             # Màn order, menu, bàn
    │   └── components/
    │
    ├── store/                   # State management
    └── App.tsx                  # Switch mode
```

### apps/ccb

```
apps/ccb/
└── src/
    ├── modes/
    │   ├── cashier/             # Chế độ Thu ngân (Master)
    │   │   ├── database/        # SQLite
    │   │   ├── server/          # Local HTTP + WebSocket Server
    │   │   ├── sync/            # Cloud sync
    │   │   └── screens/         # Thanh toán, báo cáo
    │   │
    │   └── kitchen/             # Chế độ Bếp/Bar (Client)
    │       ├── connection/      # WebSocket đến Thu ngân
    │       └── screens/         # Hiển thị món, đánh dấu done
    │
    ├── printer/                 # Print service (dùng chung)
    └── shared/                  # Components dùng chung
```

### server

```
server/
├── src/
│   ├── modules/
│   │   ├── admin/               # APIs cho Web Admin
│   │   │   ├── stores/          # CRUD quán
│   │   │   ├── owners/          # CRUD tài khoản owner
│   │   │   └── billing/         # Gói dịch vụ
│   │   │
│   │   ├── dashboard/           # APIs cho Web Dashboard
│   │   │   ├── menu/
│   │   │   ├── tables/
│   │   │   ├── staff/
│   │   │   └── reports/
│   │   │
│   │   ├── pos/                 # APIs cho CCB/Order App
│   │   │   ├── sync/
│   │   │   ├── orders/
│   │   │   └── auth/
│   │   │
│   │   └── customer/            # APIs cho Customer App
│   │
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication
│   │   ├── store-context.ts     # Xác định store_id từ request
│   │   └── role-guard.ts        # Phân quyền theo role
│   │
│   └── services/
│
└── prisma/                      # Database schema (PostgreSQL)
```

## Ưu điểm cấu trúc Monorepo

### 1. Chia sẻ code
- 70-80% business logic dùng chung
- Types/interfaces consistent
- Không duplicate code

### 2. Quản lý dễ dàng
- 1 repo cho toàn bộ hệ thống
- Atomic commits
- Dễ refactor

### 3. Development experience
- Hot reload across packages
- Shared tooling (ESLint, Prettier)
- Consistent code style

## Công cụ quản lý Monorepo

Khuyến nghị sử dụng:

- **Turborepo** hoặc **Nx** - Build system
- **pnpm** hoặc **yarn workspaces** - Package manager
- **TypeScript project references** - Type checking

## Scripts chung

```json
{
  "scripts": {
    "dev:admin": "turbo run dev --filter=web-admin",
    "dev:dashboard": "turbo run dev --filter=web-dashboard",
    "dev:order": "turbo run dev --filter=order",
    "dev:ccb": "turbo run dev --filter=ccb",
    "dev:server": "turbo run dev --filter=server",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```
