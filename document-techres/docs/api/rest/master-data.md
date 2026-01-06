---
sidebar_position: 7
---

# API Master Data

API Master Data là service chuyên dùng để **đồng bộ dữ liệu master** từ cloud xuống các ứng dụng POS (CCB App, Order App) chạy offline.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Framework** | NestJS + TypeORM |
| **Database** | PostgreSQL |
| **Authentication** | JWT Bearer Token |
| **Base URL** | `/api/v1` |
| **Documentation** | `/api/docs` (Swagger) |

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                     API MASTER DATA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐│
│  │   Auth Module       │    │   Sync Module                   ││
│  │   /api/v1/auth      │    │   /api/v1/sync                  ││
│  │   - login           │    │   - full                        ││
│  │   - verify-pin      │    │   - incremental                 ││
│  └─────────────────────┘    └─────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL Database                      ││
│  │  branches | categories | products | areas | tables | staff  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
             │
             │ REST API
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CCB App / Order App                       │
│                         (Offline-First)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Cấu trúc Project

```
api-master-data/
├── src/
│   ├── main.ts                          # Entry point
│   ├── app.module.ts                    # Root module
│   ├── entities/                        # TypeORM entities
│   │   ├── branch.entity.ts
│   │   ├── category.entity.ts
│   │   ├── product.entity.ts
│   │   ├── area.entity.ts
│   │   ├── table.entity.ts
│   │   ├── staff.entity.ts
│   │   ├── device.entity.ts
│   │   └── index.ts
│   └── modules/
│       ├── auth/                        # Authentication module
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── jwt.strategy.ts
│       │   └── dto/
│       │       └── auth.dto.ts
│       └── sync/                        # Sync module
│           ├── sync.module.ts
│           ├── sync.controller.ts
│           ├── sync.service.ts
│           └── dto/
│               └── sync.dto.ts
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env.example
```

---

## Authentication

### POST /api/v1/auth/login

Đăng nhập thiết bị bằng mã cửa hàng. Thiết bị chỉ cần đăng nhập 1 lần duy nhất.

**Request:**
```json
{
  "storeCode": "STORE001",
  "deviceId": "device-uuid-123",
  "deviceName": "POS Thu ngân 1",
  "deviceType": "android",
  "appVersion": "1.0.0"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "branchId": "550e8400-e29b-41d4-a716-446655440000",
  "branchName": "Chi nhánh Quận 1",
  "brandName": "Café ABC",
  "deviceId": "device-uuid-123"
}
```

**Response (404):**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy cửa hàng với mã này"
}
```

### POST /api/v1/auth/verify-pin

Xác thực nhân viên bằng mã PIN. Yêu cầu Bearer token.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "pinCode": "1234"
}
```

**Response (200):**
```json
{
  "staffId": "550e8400-e29b-41d4-a716-446655440001",
  "staffName": "Nguyễn Văn A",
  "staffCode": "NV001",
  "role": "cashier",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Mã PIN không đúng"
}
```

---

## Sync

### GET /api/v1/sync/full

Lấy toàn bộ master data của chi nhánh. Sử dụng khi app mở lần đầu hoặc cần sync lại toàn bộ.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "categories": [
    {
      "id": "cat-001",
      "name": "Cà phê",
      "displayOrder": 1,
      "imageUrl": "https://example.com/coffee.jpg",
      "isActive": true,
      "version": 1,
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "products": [
    {
      "id": "prod-001",
      "categoryId": "cat-001",
      "code": "CF001",
      "name": "Cà phê sữa",
      "description": "Cà phê phin pha sữa đặc",
      "price": 29000,
      "imageUrl": "https://example.com/caphe-sua.jpg",
      "unit": "ly",
      "vatRate": 10,
      "isActive": true,
      "displayOrder": 1,
      "version": 1,
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "areas": [
    {
      "id": "area-001",
      "name": "Tầng 1",
      "displayOrder": 1,
      "isActive": true,
      "version": 1,
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "tables": [
    {
      "id": "table-001",
      "areaId": "area-001",
      "name": "Bàn 1",
      "capacity": 4,
      "status": "available",
      "displayOrder": 1,
      "isActive": true,
      "version": 1,
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "staff": [
    {
      "id": "staff-001",
      "code": "NV001",
      "name": "Nguyễn Văn A",
      "phone": "0901234567",
      "pinCode": "1234",
      "role": "cashier",
      "avatarUrl": "https://example.com/avatar.jpg",
      "isActive": true,
      "version": 1,
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "syncedAt": "2025-01-06T10:30:00.000Z"
}
```

### GET /api/v1/sync/incremental

Lấy dữ liệu thay đổi từ thời điểm nhất định. Sử dụng để sync nhanh hơn.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `since` | ISO Date | Yes | Thời điểm sync lần trước |

**Example:**
```
GET /api/v1/sync/incremental?since=2025-01-06T10:00:00.000Z
```

**Response (200):**
```json
{
  "categories": [...],
  "products": [...],
  "areas": [...],
  "tables": [...],
  "staff": [...],
  "deletedIds": {
    "categories": ["cat-deleted-001"],
    "products": ["prod-deleted-001"],
    "areas": [],
    "tables": [],
    "staff": []
  },
  "syncedAt": "2025-01-06T10:30:00.000Z"
}
```

---

## Data Models

### Category

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | string | Tên danh mục |
| `displayOrder` | int | Thứ tự hiển thị |
| `imageUrl` | string | URL ảnh danh mục |
| `isActive` | boolean | Trạng thái hoạt động |
| `version` | int | Phiên bản (cho sync) |
| `updatedAt` | ISO Date | Thời gian cập nhật |

### Product

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `categoryId` | UUID | ID danh mục |
| `code` | string | Mã sản phẩm |
| `name` | string | Tên sản phẩm |
| `description` | string | Mô tả |
| `price` | decimal | Giá bán |
| `imageUrl` | string | URL ảnh |
| `unit` | string | Đơn vị tính |
| `vatRate` | decimal | Thuế VAT (%) |
| `isActive` | boolean | Trạng thái hoạt động |
| `displayOrder` | int | Thứ tự hiển thị |
| `version` | int | Phiên bản |
| `updatedAt` | ISO Date | Thời gian cập nhật |

### Area

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | string | Tên khu vực |
| `displayOrder` | int | Thứ tự hiển thị |
| `isActive` | boolean | Trạng thái hoạt động |
| `version` | int | Phiên bản |
| `updatedAt` | ISO Date | Thời gian cập nhật |

### Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `areaId` | UUID | ID khu vực |
| `name` | string | Tên bàn |
| `capacity` | int | Sức chứa |
| `status` | string | Trạng thái (available/occupied/reserved) |
| `displayOrder` | int | Thứ tự hiển thị |
| `isActive` | boolean | Trạng thái hoạt động |
| `version` | int | Phiên bản |
| `updatedAt` | ISO Date | Thời gian cập nhật |

### Staff

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `code` | string | Mã nhân viên |
| `name` | string | Tên nhân viên |
| `phone` | string | Số điện thoại |
| `pinCode` | string | Mã PIN (4-6 số) |
| `role` | string | Vai trò (cashier/waiter/manager) |
| `avatarUrl` | string | URL ảnh đại diện |
| `isActive` | boolean | Trạng thái hoạt động |
| `version` | int | Phiên bản |
| `updatedAt` | ISO Date | Thời gian cập nhật |

---

## Luồng Sync

### Full Sync (Lần đầu)

```
┌─────────────┐                           ┌─────────────────────┐
│  CCB App    │                           │  API Master Data    │
│             │  1. Login với storeCode    │                     │
│             │ ───────────────────────▶  │                     │
│             │ ◀───────────────────────  │  accessToken        │
│             │                           │                     │
│             │  2. GET /sync/full         │                     │
│             │ ───────────────────────▶  │                     │
│             │ ◀───────────────────────  │  FullSyncResponse   │
│             │                           │                     │
│  ┌────────────────────────────────────┐ │                     │
│  │ SQLite Database                    │ │                     │
│  │ DELETE old data                    │ │                     │
│  │ INSERT new data                    │ │                     │
│  │ Save syncedAt                      │ │                     │
│  └────────────────────────────────────┘ │                     │
└─────────────┘                           └─────────────────────┘
```

### Incremental Sync (Các lần sau)

```
┌─────────────┐                           ┌─────────────────────┐
│  CCB App    │                           │  API Master Data    │
│             │  GET /sync/incremental     │                     │
│             │  ?since={lastSyncedAt}     │                     │
│             │ ───────────────────────▶  │                     │
│             │ ◀───────────────────────  │  IncrementalResponse│
│             │                           │                     │
│  ┌────────────────────────────────────┐ │                     │
│  │ SQLite Database                    │ │                     │
│  │ UPSERT changed records             │ │                     │
│  │ DELETE removed records             │ │                     │
│  │ Update syncedAt                    │ │                     │
│  └────────────────────────────────────┘ │                     │
└─────────────┘                           └─────────────────────┘
```

---

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=techres_master

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=3000
```

---

## Cài đặt và chạy

```bash
# Clone và cài đặt dependencies
cd api-master-data
npm install

# Cấu hình environment
cp .env.example .env
# Sửa các giá trị trong .env

# Chạy development
npm run start:dev

# Build production
npm run build
npm run start:prod
```

---

## Swagger Documentation

Truy cập `/api/docs` để xem Swagger UI với đầy đủ documentation và có thể test API trực tiếp.

```
http://localhost:3000/api/docs
```
