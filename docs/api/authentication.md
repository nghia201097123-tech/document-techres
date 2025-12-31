---
sidebar_position: 3
---

# Authentication

Hướng dẫn xác thực API.

## Phương thức xác thực

TechRes API hỗ trợ các phương thức xác thực sau:

1. **Bearer Token** - Được khuyến nghị
2. **API Key** - Cho server-to-server

## Bearer Token

### Lấy Access Token

```http
POST /auth/login
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 3600
  }
}
```

### Sử dụng Token

Thêm token vào header của mỗi request:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.techres.example.com/v1/users
```

### Refresh Token

Khi access token hết hạn:

```http
POST /auth/refresh
```

**Request:**

```json
{
  "refreshToken": "your-refresh-token"
}
```

## API Key

Dùng cho server-to-server communication:

```bash
curl -X GET \
  -H "X-API-Key: YOUR_API_KEY" \
  https://api.techres.example.com/v1/users
```

### Tạo API Key

1. Đăng nhập vào Dashboard
2. Vào Settings > API Keys
3. Click "Create New Key"
4. Copy và lưu trữ an toàn

:::danger Bảo mật
- Không bao giờ share API key
- Không commit API key vào source code
- Rotate API keys định kỳ
:::

## Xử lý lỗi xác thực

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

**Giải pháp:** Refresh token hoặc đăng nhập lại.

### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền truy cập resource này"
  }
}
```

**Giải pháp:** Kiểm tra quyền của user hoặc liên hệ admin.
