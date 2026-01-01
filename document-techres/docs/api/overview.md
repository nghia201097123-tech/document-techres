---
sidebar_position: 1
---

# Tổng quan API

Hệ thống có 2 loại API: **REST API** (Cloud Server) và **Local API** (CCB).

## Kiến trúc API

```
┌─────────────────────────────────────────────────────────────────┐
│                      REST API (Cloud)                           │
│                   https://api.fnbpos.com                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /admin/*      → Web Admin (Super Admin)                        │
│  /dashboard/*  → Web Dashboard (Chủ quán)                       │
│  /pos/*        → CCB/Order App (Sync)                           │
│  /customer/*   → Customer App                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Local API (CCB)                            │
│                   http://192.168.1.x:8080                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /api/*        → REST endpoints cho Order App                   │
│  WebSocket     → Realtime events                                │
│  UDP:9999      → Discovery broadcast                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication

### REST API (Cloud)

Sử dụng **JWT Token**:

```bash
# Login
POST /auth/login
{
  "email": "owner@example.com",
  "password": "xxx"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2...",
  "expiresIn": 3600
}

# Sử dụng
GET /dashboard/menu
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
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

### REST API

| Tier | Limit |
|------|-------|
| Basic | 100 requests/phút |
| Pro | 1000 requests/phút |
| Enterprise | Không giới hạn |

### Local API

Không giới hạn (trong mạng LAN).

## Versioning

```
https://api.fnbpos.com/v1/...
```

Hiện tại chỉ có v1. Khi có breaking changes sẽ tạo v2.
