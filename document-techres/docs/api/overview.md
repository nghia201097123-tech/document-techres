---
sidebar_position: 1
---

# Tổng quan API

Hệ thống có nhiều API services phục vụ các mục đích khác nhau.

## Kiến trúc API

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUD API SERVICES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │   API Gateway   │  ← Entry point cho tất cả requests                   │
│   │   :3000         │                                                       │
│   └────────┬────────┘                                                       │
│            │                                                                │
│   ┌────────┼────────────────┬──────────────────┬──────────────────┐        │
│   │        │                │                  │                  │        │
│   ▼        ▼                ▼                  ▼                  ▼        │
│ ┌──────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐ ┌────────────┐        │
│ │Admin │ │Dashboard │ │  Upload   │ │ Master Data │ │  Customer  │        │
│ │:3001 │ │  :3002   │ │  :3003    │ │   :3004     │ │   :3005    │        │
│ └──────┘ └──────────┘ └───────────┘ └─────────────┘ └────────────┘        │
│    │          │            │              │               │                │
│    │          │            │              │               │                │
│    ▼          ▼            ▼              ▼               ▼                │
│ ┌──────────────────────────────────────────────────────────────────┐      │
│ │                      PostgreSQL Database                          │      │
│ └──────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOCAL API (CCB App)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                    CCB App (Local Server)                        │      │
│   │                    http://192.168.1.x:8080                       │      │
│   ├─────────────────────────────────────────────────────────────────┤      │
│   │                                                                 │      │
│   │  /api/*     → REST endpoints cho Order App                      │      │
│   │  WebSocket  → Realtime events (SignalR)                         │      │
│   │  UDP:9999   → Discovery broadcast                               │      │
│   │                                                                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Danh sách API Services

| Service | Port | Mô tả | Documentation |
|---------|------|-------|---------------|
| **API Gateway** | 3000 | Entry point, routing, proxy | [api-gateway.md](./rest/api-gateway.md) |
| **API Admin** | 3001 | Quản lý tenant, company, brand, branch | [api-admin.md](./rest/api-admin.md) |
| **API Dashboard** | 3002 | Quản lý menu, staff, tables cho tenant | [api-dashboard.md](./rest/api-dashboard.md) |
| **API Upload** | 3003 | Upload files, images, MinIO storage | [api-upload.md](./rest/api-upload.md) |
| **API Master Data** | 3004 | Sync master data cho POS offline | [master-data.md](./rest/master-data.md) |
| **Local API** | 8080 | REST + WebSocket trên CCB App | [local/endpoints.md](./local/endpoints.md) |

## Authentication

### API Admin / Dashboard

Sử dụng **JWT Token**:

```bash
# Login
POST /api/v1/auth/login
{
  "tenantId": "abcfood",  # Chỉ cần cho Dashboard
  "email": "owner@example.com",
  "password": "xxx"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "name": "Nguyen Van A",
    "role": "owner"
  }
}

# Sử dụng
GET /api/v1/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### API Master Data (Device Auth)

```bash
# Device Login
POST /api/v1/auth/login
{
  "storeCode": "STORE001",
  "deviceId": "device-uuid-123",
  "deviceName": "POS Thu ngân 1"
}

# Verify PIN
POST /api/v1/auth/verify-pin
Authorization: Bearer <token>
{
  "pinCode": "1234"
}
```

### Local API (CCB)

Sử dụng **PIN Code** hoặc **Session**:

```bash
# Login bằng PIN
POST /auth/login
{
  "pinCode": "1234"
}

# Response
{
  "token": "session-token",
  "user": { "id": "xxx", "name": "NV A", "role": "staff" }
}
```

## Response Format

### Success

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success"
}
```

### Success with Pagination

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Yêu cầu không hợp lệ",
    "details": {}
  }
}
```

## HTTP Status Codes

| Code | Mô tả |
|------|-------|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 400 | Request không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không có quyền |
| 404 | Không tìm thấy |
| 409 | Conflict |
| 422 | Validation error |
| 500 | Lỗi server |

## Rate Limiting

### Cloud API

| Tier | Limit |
|------|-------|
| Basic | 100 requests/phút |
| Pro | 1000 requests/phút |
| Enterprise | Không giới hạn |

### Local API

Không giới hạn (trong mạng LAN).

## Versioning

```
/api/v1/...
```

Hiện tại chỉ có v1. Khi có breaking changes sẽ tạo v2.

## Multi-Tenant

Tất cả API Dashboard đều yêu cầu xác định tenant:

```bash
# Option 1: Trong JWT token (recommended)
# tenant_id được lưu trong payload khi login

# Option 2: Trong header
X-Tenant-ID: abcfood

# Option 3: Trong query param
GET /products?tenant_id=abcfood
```

## CORS

API Gateway đã cấu hình CORS cho các domain:

- `*.fnbpos.com`
- `localhost:*` (development)

## Health Check

Tất cả services đều có endpoint health check:

```bash
GET /health
# Response
{
  "status": "ok",
  "timestamp": "2025-01-06T10:00:00.000Z",
  "version": "1.0.0"
}
```
