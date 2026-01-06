---
sidebar_position: 4
---

# API Dashboard

API Dashboard là service phục vụ **Web Dashboard** - dành cho chủ quán quản lý 1 tenant cụ thể.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Framework** | NestJS + TypeORM |
| **Database** | PostgreSQL |
| **Port** | 3002 |
| **Authentication** | JWT Bearer Token (với tenant_id) |
| **Base URL** | `/api/v1` |

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API DASHBOARD                                     │
│                               :3002                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                         MODULES                                    │    │
│   ├───────────────────────────────────────────────────────────────────┤    │
│   │                                                                   │    │
│   │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │    │
│   │   │  Auth   │ │Products │ │Categor- │ │  Staff  │ │  Areas  │   │    │
│   │   │         │ │         │ │  ies    │ │         │ │         │   │    │
│   │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │    │
│   │                                                                   │    │
│   │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │    │
│   │   │ Tables  │ │ Kitchen │ │Depart-  │ │ Reports │ │Settings │   │    │
│   │   │         │ │         │ │ ments   │ │         │ │         │   │    │
│   │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │    │
│   │                                                                   │    │
│   │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │    │
│   │   │Vouchers │ │ Coupons │ │ Units   │ │Integra- │               │    │
│   │   │         │ │         │ │         │ │ tions   │               │    │
│   │   └─────────┘ └─────────┘ └─────────┘ └─────────┘               │    │
│   │                                                                   │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│   ⚠️ Tất cả queries đều có điều kiện WHERE tenant_id = ?                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Multi-Tenant Data Isolation

**Quan trọng:** Tất cả data trong API Dashboard đều được isolate theo `tenant_id`.

```typescript
// Middleware extract tenant_id từ JWT
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Missing tenant_id');
    }
    req.tenantId = tenantId;
    next();
  }
}

// Service tự động filter theo tenant
async findAll(tenantId: string): Promise<Product[]> {
  return this.productRepository.find({
    where: { tenantId }
  });
}
```

---

## Authentication

### POST /api/v1/auth/login

Đăng nhập Web Dashboard.

**Request:**
```json
{
  "tenantId": "abcfood",
  "email": "owner@abcfood.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "owner@abcfood.com",
    "name": "Nguyen Van A",
    "role": "owner",
    "tenantId": "abcfood",
    "branchId": "uuid"
  }
}
```

---

## Dashboard

### GET /api/v1/dashboard/stats

Thống kê tổng quan.

**Response:**
```json
{
  "revenue": {
    "today": 5000000,
    "week": 35000000,
    "month": 150000000,
    "growth": 12.5
  },
  "orders": {
    "today": 50,
    "completed": 45,
    "cancelled": 5
  },
  "products": {
    "total": 120,
    "active": 100,
    "outOfStock": 5
  },
  "staff": {
    "total": 15,
    "active": 12
  }
}
```

---

## Products (Sản phẩm)

### GET /api/v1/products

Danh sách sản phẩm.

**Query Parameters:**
| Param | Type | Mô tả |
|-------|------|-------|
| `page` | number | Trang |
| `limit` | number | Số items/trang |
| `search` | string | Tìm kiếm |
| `categoryId` | UUID | Filter theo danh mục |
| `productType` | string | FOOD / BEVERAGE / COMBO / EXTRA / TOPPING |
| `status` | string | active / inactive / out_of_stock |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "code": "CF001",
      "name": "Cà phê sữa",
      "description": "Cà phê phin pha sữa đặc",
      "price": 29000,
      "categoryId": "uuid",
      "categoryName": "Cà phê",
      "productType": "BEVERAGE",
      "imageUrl": "https://...",
      "unit": "ly",
      "vatRate": 10,
      "isActive": true,
      "displayOrder": 1
    }
  ],
  "pagination": {...}
}
```

### POST /api/v1/products

Tạo sản phẩm mới.

**Request:**
```json
{
  "code": "CF002",
  "name": "Cà phê đen",
  "description": "Cà phê phin đen nguyên chất",
  "price": 25000,
  "categoryId": "uuid",
  "productType": "BEVERAGE",
  "imageUrl": "https://...",
  "unit": "ly",
  "vatRate": 10,
  "displayOrder": 2
}
```

### GET /api/v1/products/:id

Chi tiết sản phẩm.

### PATCH /api/v1/products/:id

Cập nhật sản phẩm.

### DELETE /api/v1/products/:id

Xóa sản phẩm.

### PATCH /api/v1/products/:id/toggle-status

Tắt/Bật sản phẩm.

### POST /api/v1/products/bulk-update

Cập nhật hàng loạt (bulk).

**Request:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "updates": {
    "isActive": false
  }
}
```

### POST /api/v1/products/bulk-delete

Xóa hàng loạt.

**Request:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Categories (Danh mục)

### GET /api/v1/categories

Danh sách danh mục.

### POST /api/v1/categories

Tạo danh mục.

**Request:**
```json
{
  "name": "Cà phê",
  "imageUrl": "https://...",
  "displayOrder": 1
}
```

### PATCH /api/v1/categories/:id

Cập nhật danh mục.

### DELETE /api/v1/categories/:id

Xóa danh mục.

### PATCH /api/v1/categories/reorder

Sắp xếp lại thứ tự.

**Request:**
```json
{
  "orders": [
    { "id": "uuid1", "displayOrder": 1 },
    { "id": "uuid2", "displayOrder": 2 }
  ]
}
```

---

## Staff (Nhân viên)

### GET /api/v1/staff

Danh sách nhân viên.

**Query Parameters:**
| Param | Type | Mô tả |
|-------|------|-------|
| `branchId` | UUID | Filter theo chi nhánh |
| `departmentId` | UUID | Filter theo phòng ban |
| `role` | string | owner / manager / cashier / waiter / kitchen |

### POST /api/v1/staff

Tạo nhân viên mới.

**Request:**
```json
{
  "name": "Nguyen Van B",
  "phone": "0901234567",
  "email": "nvb@example.com",
  "avatarUrl": "https://...",
  "branchId": "uuid",
  "departmentId": "uuid",
  "role": "cashier",
  "pinCode": "1234"
}
```

### GET /api/v1/staff/:id

Chi tiết nhân viên.

### PATCH /api/v1/staff/:id

Cập nhật nhân viên.

### DELETE /api/v1/staff/:id

Xóa nhân viên.

### PATCH /api/v1/staff/:id/toggle-status

Tắt/Bật nhân viên.

### POST /api/v1/staff/bulk-create

Tạo hàng loạt.

**Request:**
```json
{
  "staff": [
    { "name": "NV1", "phone": "0901...", "role": "waiter" },
    { "name": "NV2", "phone": "0902...", "role": "waiter" }
  ]
}
```

### POST /api/v1/staff/bulk-delete

Xóa hàng loạt.

---

## Departments (Phòng ban)

### GET /api/v1/departments

Danh sách phòng ban (hierarchical).

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Quản lý",
      "parentId": null,
      "children": [
        {
          "id": "uuid2",
          "name": "Thu ngân",
          "parentId": "uuid"
        }
      ]
    }
  ]
}
```

### POST /api/v1/departments

Tạo phòng ban.

**Request:**
```json
{
  "name": "Phục vụ",
  "parentId": "uuid",
  "description": "Nhân viên phục vụ"
}
```

### PATCH /api/v1/departments/:id

Cập nhật phòng ban.

### DELETE /api/v1/departments/:id

Xóa phòng ban.

---

## Areas (Khu vực)

### GET /api/v1/areas

Danh sách khu vực.

### POST /api/v1/areas

Tạo khu vực.

**Request:**
```json
{
  "name": "Tầng 1",
  "branchId": "uuid",
  "displayOrder": 1
}
```

### PATCH /api/v1/areas/:id

Cập nhật khu vực.

### DELETE /api/v1/areas/:id

Xóa khu vực.

---

## Tables (Bàn)

### GET /api/v1/tables

Danh sách bàn.

**Query Parameters:**
| Param | Type | Mô tả |
|-------|------|-------|
| `areaId` | UUID | Filter theo khu vực |
| `status` | string | available / occupied / reserved |

### POST /api/v1/tables

Tạo bàn.

**Request:**
```json
{
  "name": "Bàn 1",
  "areaId": "uuid",
  "capacity": 4,
  "displayOrder": 1
}
```

### PATCH /api/v1/tables/:id

Cập nhật bàn.

### DELETE /api/v1/tables/:id

Xóa bàn.

### POST /api/v1/tables/bulk-create

Tạo hàng loạt bàn.

**Request:**
```json
{
  "areaId": "uuid",
  "prefix": "Bàn",
  "startNumber": 1,
  "count": 10,
  "capacity": 4
}
```

---

## Kitchen (Bếp)

### GET /api/v1/kitchen/printers

Danh sách máy in bếp.

### POST /api/v1/kitchen/printers

Cấu hình máy in.

**Request:**
```json
{
  "name": "Máy in bếp 1",
  "type": "KITCHEN",
  "connectionType": "LAN",
  "ipAddress": "192.168.1.100",
  "port": 9100
}
```

### PATCH /api/v1/kitchen/printers/:id

Cập nhật máy in.

### DELETE /api/v1/kitchen/printers/:id

Xóa máy in.

### GET /api/v1/kitchen/product-assignments

Danh sách gán sản phẩm cho máy in.

### POST /api/v1/kitchen/product-assignments

Gán sản phẩm cho máy in.

**Request:**
```json
{
  "printerId": "uuid",
  "productIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Integrations (Tích hợp)

### Food Partners

#### GET /api/v1/integrations/food-partners

Danh sách kết nối đối tác giao đồ ăn.

**Response:**
```json
{
  "partners": [
    {
      "id": "shopee",
      "name": "Shopee Food",
      "connected": true,
      "storeId": "12345",
      "lastSync": "2025-01-06T10:00:00.000Z"
    },
    {
      "id": "grab",
      "name": "Grab Food",
      "connected": false
    },
    {
      "id": "bfood",
      "name": "BFood",
      "connected": false
    }
  ]
}
```

#### POST /api/v1/integrations/food-partners/:partnerId/connect

Kết nối đối tác.

#### DELETE /api/v1/integrations/food-partners/:partnerId/disconnect

Ngắt kết nối.

### VietQR

#### GET /api/v1/integrations/vietqr/accounts

Danh sách tài khoản ngân hàng VietQR.

#### POST /api/v1/integrations/vietqr/accounts

Thêm tài khoản ngân hàng.

**Request:**
```json
{
  "bankCode": "VCB",
  "accountNumber": "1234567890",
  "accountName": "NGUYEN VAN A",
  "isDefault": true
}
```

### E-Invoice

#### GET /api/v1/integrations/einvoice/config

Cấu hình hóa đơn điện tử.

#### POST /api/v1/integrations/einvoice/config

Cập nhật cấu hình.

**Request:**
```json
{
  "provider": "VIETTEL",
  "apiKey": "xxx",
  "apiSecret": "xxx",
  "taxCode": "0123456789",
  "templateCode": "1/001"
}
```

**Supported providers:**
- VIETTEL
- VNPT
- BKAV
- FPT
- MISA
- VINA
- SOFTDREAM

---

## Settings (Cài đặt)

### GET /api/v1/settings/company

Thông tin công ty.

### PATCH /api/v1/settings/company

Cập nhật thông tin công ty.

### GET /api/v1/settings/payment-methods

Danh sách phương thức thanh toán.

### PATCH /api/v1/settings/payment-methods

Cập nhật phương thức thanh toán.

**Request:**
```json
{
  "methods": [
    { "code": "CASH", "name": "Tiền mặt", "enabled": true },
    { "code": "CARD", "name": "Thẻ", "enabled": true },
    { "code": "TRANSFER", "name": "Chuyển khoản", "enabled": true },
    { "code": "VIETQR", "name": "VietQR", "enabled": true }
  ]
}
```

---

## Reports (Báo cáo)

### GET /api/v1/reports/revenue

Báo cáo doanh thu.

**Query Parameters:**
| Param | Type | Mô tả |
|-------|------|-------|
| `from` | date | Từ ngày |
| `to` | date | Đến ngày |
| `groupBy` | string | day / week / month |
| `branchId` | UUID | Filter theo chi nhánh |

### GET /api/v1/reports/products

Báo cáo sản phẩm bán chạy.

### GET /api/v1/reports/orders

Báo cáo đơn hàng.

### GET /api/v1/reports/staff

Báo cáo nhân viên.

---

## Vouchers & Coupons

### GET /api/v1/vouchers

Danh sách voucher.

### POST /api/v1/vouchers

Tạo voucher.

**Request:**
```json
{
  "code": "SALE50",
  "name": "Giảm 50%",
  "type": "PERCENT",
  "value": 50,
  "maxDiscount": 100000,
  "minOrderValue": 200000,
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "usageLimit": 100
}
```

### GET /api/v1/coupons

Danh sách coupon.

### POST /api/v1/coupons

Tạo coupon.

---

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=fnbpos_dashboard

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3002
NODE_ENV=production

# Upload Service
UPLOAD_SERVICE_URL=http://localhost:3003

# Integration APIs
SHOPEE_API_URL=https://api.shopee.com
GRAB_API_URL=https://api.grab.com
```

---

## Error Codes

| Code | HTTP Status | Mô tả |
|------|-------------|-------|
| `TENANT_NOT_FOUND` | 404 | Tenant không tồn tại |
| `PRODUCT_NOT_FOUND` | 404 | Sản phẩm không tồn tại |
| `CATEGORY_NOT_FOUND` | 404 | Danh mục không tồn tại |
| `STAFF_NOT_FOUND` | 404 | Nhân viên không tồn tại |
| `TABLE_NOT_FOUND` | 404 | Bàn không tồn tại |
| `DUPLICATE_CODE` | 409 | Mã đã tồn tại |
| `TENANT_MISMATCH` | 403 | Không có quyền truy cập data của tenant khác |
