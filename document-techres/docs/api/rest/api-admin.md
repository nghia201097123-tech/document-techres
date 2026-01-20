---
sidebar_position: 3
---

# API Admin

API Admin là service quản lý **Super Admin** - quản lý toàn bộ tenant, company, brand, branch trong hệ thống SaaS.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Framework** | NestJS + TypeORM |
| **Database** | PostgreSQL |
| **Port** | 3001 |
| **Authentication** | JWT Bearer Token |
| **Base URL** | `/api/v1` |

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API ADMIN                                       │
│                               :3001                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                         MODULES                                    │    │
│   ├───────────────────────────────────────────────────────────────────┤    │
│   │                                                                   │    │
│   │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │    │
│   │   │  Auth   │ │Companies│ │ Brands  │ │Branches │ │Packages │   │    │
│   │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │    │
│   │                                                                   │    │
│   │   ┌─────────┐ ┌─────────┐ ┌─────────┐                           │    │
│   │   │Permiss- │ │ Trans.  │ │ Admin   │                           │    │
│   │   │  ions   │ │Category │ │ Users   │                           │    │
│   │   └─────────┘ └─────────┘ └─────────┘                           │    │
│   │                                                                   │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                      PostgreSQL Database                           │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Cấu trúc Project

```
api-admin/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── entities/
│   │   ├── company.entity.ts
│   │   ├── brand.entity.ts
│   │   ├── branch.entity.ts
│   │   ├── package.entity.ts
│   │   ├── permission.entity.ts
│   │   ├── permission-group.entity.ts
│   │   ├── transaction-category.entity.ts
│   │   └── admin-user.entity.ts
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   └── jwt.strategy.ts
│       ├── companies/
│       │   ├── companies.module.ts
│       │   ├── companies.controller.ts
│       │   ├── companies.service.ts
│       │   └── dto/
│       ├── brands/
│       ├── branches/
│       ├── packages/
│       ├── permissions/
│       ├── transaction-categories/
│       └── admin-users/
├── package.json
└── .env
```

---

## Authentication

### POST /api/v1/auth/login

Đăng nhập Admin.

**Request:**
```json
{
  "email": "admin@fnbpos.com",
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
    "email": "admin@fnbpos.com",
    "name": "Super Admin",
    "role": "super_admin"
  }
}
```

### POST /api/v1/auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2..."
}
```

### POST /api/v1/auth/change-password

Đổi mật khẩu.

**Request:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword123"
}
```

---

## Companies

### GET /api/v1/companies

Danh sách công ty với pagination và filter.

**Query Parameters:**
| Param | Type | Default | Mô tả |
|-------|------|---------|-------|
| `page` | number | 1 | Trang hiện tại |
| `limit` | number | 20 | Số items/trang |
| `search` | string | | Tìm theo tên, mã |
| `status` | string | | active / inactive |
| `plan` | string | | Gói subscription |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "ABC Food",
      "code": "abcfood",
      "logoUrl": "https://...",
      "taxCode": "0123456789",
      "subscriptionPlan": "STANDARD",
      "brandsCount": 2,
      "branchesCount": 5,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### POST /api/v1/companies/wizard

Tạo công ty mới với Wizard 4 bước (Company + Brand + Branch + Owner).

**Request:**
```json
{
  "company": {
    "name": "ABC Food Company",
    "code": "abcfood",
    "logoUrl": "https://...",
    "taxCode": "0123456789",
    "address": "123 Nguyen Van Linh, Q7, HCM",
    "phone": "0901234567",
    "email": "info@abcfood.com",
    "representative": "Nguyen Van A",
    "subscriptionPlan": "STANDARD",
    "maxBranches": 10,
    "maxUsers": 50
  },
  "brand": {
    "name": "ABC Coffee",
    "code": "abccoffee",
    "logoUrl": "https://...",
    "description": "Chuỗi cà phê ABC",
    "businessModel": "CCB_ONLY"
  },
  "branch": {
    "name": "ABC Coffee - Quận 1",
    "code": "abccoffee-q1",
    "address": "100 Le Loi, Q1, HCM",
    "phone": "0281234567",
    "openTime": "07:00",
    "closeTime": "22:00",
    "maxConnections": 5
  },
  "owner": {
    "name": "Nguyen Van A",
    "email": "owner@abcfood.com",
    "phone": "0901234567"
  }
}
```

**Response (201):**
```json
{
  "company": {
    "id": "uuid",
    "name": "ABC Food Company",
    "code": "abcfood"
  },
  "brand": {
    "id": "uuid",
    "name": "ABC Coffee",
    "code": "abccoffee"
  },
  "branch": {
    "id": "uuid",
    "name": "ABC Coffee - Quận 1",
    "code": "abccoffee-q1"
  },
  "owner": {
    "id": "uuid",
    "email": "owner@abcfood.com",
    "temporaryPassword": "Abc@12345"
  }
}
```

### POST /api/v1/companies/quick-create

Tạo nhanh công ty với thông tin tối thiểu.

**Request:**
```json
{
  "name": "XYZ Food",
  "code": "xyzfood",
  "email": "admin@xyzfood.com",
  "subscriptionPlan": "BASIC"
}
```

### POST /api/v1/companies/:id/clone

Clone công ty.

**Request:**
```json
{
  "newCode": "newcompany",
  "newName": "New Company",
  "cloneOptions": {
    "brands": true,
    "branches": true,
    "settings": true,
    "menu": false
  }
}
```

### GET /api/v1/companies/:id

Chi tiết công ty.

### GET /api/v1/companies/by-code/:code

Tìm công ty theo tenant code.

### PATCH /api/v1/companies/:id

Cập nhật công ty.

### DELETE /api/v1/companies/:id

Xóa công ty (soft delete).

### PATCH /api/v1/companies/:id/toggle-status

Tắt/Bật công ty.

---

## Brands

### GET /api/v1/brands

Danh sách thương hiệu.

**Query Parameters:**
| Param | Type | Mô tả |
|-------|------|-------|
| `companyId` | UUID | Filter theo company |
| `businessModel` | string | ORDER_ONLY / CCB_ONLY / FULL_SYSTEM |

### POST /api/v1/brands

Tạo thương hiệu.

**Request:**
```json
{
  "companyId": "uuid",
  "name": "Coffee Brand",
  "code": "coffeebrand",
  "logoUrl": "https://...",
  "description": "Mô tả thương hiệu",
  "businessModel": "CCB_ONLY"
}
```

### GET /api/v1/brands/:id

Chi tiết thương hiệu.

### PATCH /api/v1/brands/:id

Cập nhật thương hiệu.

### DELETE /api/v1/brands/:id

Xóa thương hiệu.

### PATCH /api/v1/brands/:id/toggle-status

Tắt/Bật thương hiệu.

---

## Branches

### GET /api/v1/branches

Danh sách chi nhánh.

**Query Parameters:**
| Param | Type | Mô tả |
|-------|------|-------|
| `brandId` | UUID | Filter theo brand |
| `companyId` | UUID | Filter theo company |
| `packageId` | UUID | Filter theo package |

### POST /api/v1/branches

Tạo chi nhánh.

**Request:**
```json
{
  "brandId": "uuid",
  "name": "Chi nhánh Quận 1",
  "code": "branch-q1",
  "logoUrl": "https://...",
  "address": "123 Nguyen Hue, Q1",
  "phone": "0281234567",
  "email": "q1@brand.com",
  "manager": "Nguyen Van B",
  "businessModel": "CCB_ONLY",
  "openTime": "07:00",
  "closeTime": "22:00",
  "maxConnections": 5,
  "packageId": "uuid"
}
```

### GET /api/v1/branches/:id

Chi tiết chi nhánh.

### PATCH /api/v1/branches/:id

Cập nhật chi nhánh.

### DELETE /api/v1/branches/:id

Xóa chi nhánh.

### PATCH /api/v1/branches/:id/toggle-status

Tắt/Bật chi nhánh.

### PATCH /api/v1/branches/:id/assign-package

Gán gói cho chi nhánh.

**Request:**
```json
{
  "packageId": "uuid"
}
```

---

## Packages

### GET /api/v1/packages

Danh sách gói dịch vụ.

### POST /api/v1/packages

Tạo gói mới.

**Request:**
```json
{
  "name": "Standard Package",
  "code": "STANDARD",
  "maxConnections": 10,
  "maxBranches": 5,
  "monthlyPrice": 500000,
  "yearlyPrice": 5000000,
  "features": {
    "multiPrinter": true,
    "cloudSync": true,
    "reports": ["daily", "weekly", "monthly"],
    "integrations": ["vietqr", "einvoice"]
  }
}
```

### GET /api/v1/packages/:id

Chi tiết gói.

### PATCH /api/v1/packages/:id

Cập nhật gói.

### DELETE /api/v1/packages/:id

Xóa gói.

### PATCH /api/v1/packages/:id/toggle-status

Tắt/Bật gói.

### GET /api/v1/packages/:id/branches

Danh sách chi nhánh đang sử dụng gói.

---

## Permissions

### GET /api/v1/permissions/groups

Danh sách nhóm quyền.

### POST /api/v1/permissions/groups

Tạo nhóm quyền.

**Request:**
```json
{
  "name": "Manager Group",
  "code": "manager",
  "description": "Quyền cho Manager"
}
```

### PATCH /api/v1/permissions/groups/:id

Cập nhật nhóm quyền.

### DELETE /api/v1/permissions/groups/:id

Xóa nhóm quyền.

### GET /api/v1/permissions

Danh sách quyền.

### GET /api/v1/permissions/by-module

Danh sách quyền được nhóm theo module.

**Response:**
```json
{
  "modules": [
    {
      "name": "menu",
      "label": "Quản lý Menu",
      "permissions": [
        { "id": "uuid", "code": "menu.view", "name": "Xem menu" },
        { "id": "uuid", "code": "menu.create", "name": "Tạo sản phẩm" },
        { "id": "uuid", "code": "menu.edit", "name": "Sửa sản phẩm" },
        { "id": "uuid", "code": "menu.delete", "name": "Xóa sản phẩm" }
      ]
    },
    {
      "name": "staff",
      "label": "Quản lý Nhân viên",
      "permissions": [...]
    }
  ]
}
```

### POST /api/v1/permissions

Tạo quyền mới.

**Request:**
```json
{
  "groupId": "uuid",
  "name": "Xem báo cáo",
  "code": "reports.view",
  "module": "reports",
  "description": "Quyền xem báo cáo doanh thu"
}
```

### PATCH /api/v1/permissions/:id

Cập nhật quyền.

### DELETE /api/v1/permissions/:id

Xóa quyền.

---

## Transaction Categories

### GET /api/v1/transaction-categories

Danh sách hạng mục thu/chi.

**Query Parameters:**
| Param | Type | Mô tả |
|-------|------|-------|
| `type` | string | INCOME / EXPENSE |
| `tenantId` | string | Filter theo tenant (null = system) |

### POST /api/v1/transaction-categories

Tạo hạng mục.

**Request:**
```json
{
  "name": "Mua nguyên liệu",
  "type": "EXPENSE",
  "tenantId": null,
  "isSystem": false
}
```

### PATCH /api/v1/transaction-categories/:id

Cập nhật hạng mục.

### DELETE /api/v1/transaction-categories/:id

Xóa hạng mục (không xóa được hạng mục system).

### PATCH /api/v1/transaction-categories/:id/toggle-status

Tắt/Bật hạng mục.

### POST /api/v1/transaction-categories/seed

Seed hạng mục mặc định cho tenant.

**Request:**
```json
{
  "tenantId": "abcfood"
}
```

---

## Admin Users

### GET /api/v1/admin-users

Danh sách admin users.

### POST /api/v1/admin-users

Tạo admin user.

**Request:**
```json
{
  "email": "support@fnbpos.com",
  "name": "Support User",
  "password": "password123",
  "role": "support"
}
```

### GET /api/v1/admin-users/:id

Chi tiết admin user.

### PATCH /api/v1/admin-users/:id

Cập nhật admin user.

### DELETE /api/v1/admin-users/:id

Xóa admin user.

### POST /api/v1/admin-users/:id/change-password

Đổi mật khẩu admin user.

**Request:**
```json
{
  "newPassword": "newPassword123"
}
```

### PATCH /api/v1/admin-users/:id/toggle-status

Khóa/mở khóa admin user.

---

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=fnbpos_admin

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=30d
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=production

# Upload Service
UPLOAD_SERVICE_URL=http://localhost:3003

# Email (for sending credentials)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@fnbpos.com
SMTP_PASS=password
```

---

## Error Codes

| Code | HTTP Status | Mô tả |
|------|-------------|-------|
| `COMPANY_NOT_FOUND` | 404 | Không tìm thấy công ty |
| `COMPANY_CODE_EXISTS` | 409 | Mã công ty đã tồn tại |
| `BRAND_NOT_FOUND` | 404 | Không tìm thấy thương hiệu |
| `BRANCH_NOT_FOUND` | 404 | Không tìm thấy chi nhánh |
| `PACKAGE_NOT_FOUND` | 404 | Không tìm thấy gói |
| `PERMISSION_DENIED` | 403 | Không có quyền thực hiện |
| `INVALID_CREDENTIALS` | 401 | Email hoặc mật khẩu không đúng |
| `SYSTEM_CATEGORY_DELETE` | 400 | Không thể xóa hạng mục hệ thống |
