---
sidebar_position: 1
---

# Authentication

Xác thực cho REST API trên Cloud Server.

## Login

### Admin Login

```http
POST /admin/auth/login
```

**Request:**
```json
{
  "email": "admin@fnbpos.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2...",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "admin@fnbpos.com",
      "name": "Admin",
      "role": "super_admin"
    }
  }
}
```

### Dashboard Login

```http
POST /dashboard/auth/login
```

**Request:**
```json
{
  "email": "owner@restaurant.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2...",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "owner@restaurant.com",
      "name": "Owner",
      "role": "owner",
      "storeId": "store-uuid"
    }
  }
}
```

### POS Login (Staff)

```http
POST /pos/auth/login
```

**Request:**
```json
{
  "storeId": "store-uuid",
  "pinCode": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400,
    "user": {
      "id": "uuid",
      "name": "Nhân viên A",
      "role": "cashier",
      "storeId": "store-uuid"
    }
  }
}
```

## Refresh Token

```http
POST /auth/refresh
```

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "expiresIn": 3600
  }
}
```

## Logout

```http
POST /auth/logout
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

## Sử dụng Token

Thêm vào header của mỗi request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Đổi mật khẩu

```http
PUT /auth/change-password
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password",
  "confirmPassword": "new-password"
}
```

## Reset mật khẩu

### Yêu cầu reset

```http
POST /auth/forgot-password
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

### Thực hiện reset

```http
POST /auth/reset-password
```

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "new-password",
  "confirmPassword": "new-password"
}
```

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token không hợp lệ hoặc đã hết hạn"
  }
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền truy cập"
  }
}
```

## Token Structure

JWT Token chứa:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "owner",
  "storeId": "store-uuid",
  "iat": 1704067200,
  "exp": 1704070800
}
```
