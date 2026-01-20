---
sidebar_position: 6
---

# API OAuth

API OAuth là service **Authentication/Authorization** tập trung cho toàn bộ hệ thống FNB POS.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Framework** | NestJS + TypeORM |
| **Database** | PostgreSQL |
| **Port** | 3005 |
| **Authentication** | JWT Bearer Token |
| **Base URL** | `/api/v1` |

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│   │ Web Admin   │     │Web Dashboard│     │ Mobile Apps │                  │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                  │
│          │                   │                   │                          │
│          └───────────────────┼───────────────────┘                          │
│                              │                                              │
│                              ▼                                              │
│                    ┌─────────────────┐                                     │
│                    │   API Gateway   │                                     │
│                    │     :3000       │                                     │
│                    └────────┬────────┘                                     │
│                             │                                              │
│              /api/auth/* ───┼───────────────────────────┐                  │
│                             │                           │                  │
│   ┌─────────────────────────┼─────────────────────┐     │                  │
│   │                         │                     │     ▼                  │
│   ▼                         ▼                     ▼   ┌─────────────────┐  │
│ ┌──────┐              ┌──────────┐           ┌──────┐ │   API OAuth     │  │
│ │Admin │              │Dashboard │           │Upload│ │     :3005       │  │
│ │:3001 │              │  :3002   │           │:3003 │ ├─────────────────┤  │
│ └──────┘              └──────────┘           └──────┘ │ • Login         │  │
│                                                       │ • Register      │  │
│                                                       │ • Refresh Token │  │
│                                                       │ • 2FA           │  │
│                                                       │ • Sessions      │  │
│                                                       │ • Password Reset│  │
│                                                       └─────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| **Login/Register** | Đăng nhập/Đăng ký cho Admin và Tenant users |
| **JWT Tokens** | Access Token (15 phút) + Refresh Token (7 ngày) |
| **2FA (TOTP)** | Xác thực 2 yếu tố với Google Authenticator |
| **Session Management** | Quản lý sessions đăng nhập |
| **Password Reset** | Quên mật khẩu, đổi mật khẩu |
| **Audit Logs** | Ghi nhận tất cả hoạt động authentication |
| **Account Lockout** | Tự động khóa sau 5 lần đăng nhập sai |

---

## User Types

API OAuth hỗ trợ 2 loại users:

| Type | Mô tả | Use Case |
|------|-------|----------|
| **ADMIN** | Super Admin, Support | Web Admin |
| **TENANT** | Owner, Manager, Staff | Web Dashboard, Mobile Apps |

### User Roles

```
ADMIN Users:
├── super_admin - Toàn quyền hệ thống
└── support - Hỗ trợ khách hàng

TENANT Users:
├── owner - Chủ quán
├── manager - Quản lý
├── cashier - Thu ngân
├── waiter - Phục vụ
├── kitchen - Bếp
└── staff - Nhân viên
```

---

## Authentication Flow

### Login Flow

```
┌──────────┐                    ┌───────────┐                    ┌──────────┐
│  Client  │                    │ API OAuth │                    │ Database │
└────┬─────┘                    └─────┬─────┘                    └────┬─────┘
     │                                │                               │
     │  POST /auth/login              │                               │
     │  {email, password, tenantId}   │                               │
     │───────────────────────────────▶│                               │
     │                                │                               │
     │                                │  Find user by email+tenantId  │
     │                                │──────────────────────────────▶│
     │                                │                               │
     │                                │◀──────────────────────────────│
     │                                │                               │
     │                                │  Verify password (bcrypt)     │
     │                                │                               │
     │                                │  Check 2FA enabled?           │
     │                                │                               │
     │  {requiresTwoFactor: true}     │  ◀── If 2FA enabled           │
     │◀───────────────────────────────│                               │
     │                                │                               │
     │  POST /auth/login              │                               │
     │  {email, password, 2faCode}    │                               │
     │───────────────────────────────▶│                               │
     │                                │                               │
     │                                │  Verify TOTP code             │
     │                                │                               │
     │                                │  Generate JWT tokens          │
     │                                │                               │
     │                                │  Save refresh token           │
     │                                │──────────────────────────────▶│
     │                                │                               │
     │                                │  Create session               │
     │                                │──────────────────────────────▶│
     │                                │                               │
     │                                │  Log audit                    │
     │                                │──────────────────────────────▶│
     │                                │                               │
     │  {accessToken, refreshToken,   │                               │
     │   expiresIn, user}             │                               │
     │◀───────────────────────────────│                               │
     │                                │                               │
```

### Token Refresh Flow

```
┌──────────┐                    ┌───────────┐                    ┌──────────┐
│  Client  │                    │ API OAuth │                    │ Database │
└────┬─────┘                    └─────┬─────┘                    └────┬─────┘
     │                                │                               │
     │  Access Token expired          │                               │
     │                                │                               │
     │  POST /auth/refresh            │                               │
     │  {refreshToken}                │                               │
     │───────────────────────────────▶│                               │
     │                                │                               │
     │                                │  Find valid refresh token     │
     │                                │──────────────────────────────▶│
     │                                │                               │
     │                                │  Revoke old refresh token     │
     │                                │──────────────────────────────▶│
     │                                │                               │
     │                                │  Generate new tokens          │
     │                                │                               │
     │                                │  Save new refresh token       │
     │                                │──────────────────────────────▶│
     │                                │                               │
     │  {accessToken, refreshToken,   │                               │
     │   expiresIn}                   │                               │
     │◀───────────────────────────────│                               │
     │                                │                               │
```

---

## API Endpoints

### Authentication

#### POST /api/v1/auth/login

Đăng nhập user.

**Request:**
```json
{
  "tenantId": "abcfood",
  "email": "owner@abcfood.com",
  "password": "Password123!",
  "twoFactorCode": "123456"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "uuid",
    "email": "owner@abcfood.com",
    "name": "Nguyen Van A",
    "role": "owner",
    "tenantId": "abcfood",
    "branchId": "uuid",
    "isTwoFactorEnabled": true
  }
}
```

**Response khi cần 2FA (200):**
```json
{
  "accessToken": "",
  "refreshToken": "",
  "expiresIn": 0,
  "tokenType": "Bearer",
  "user": null,
  "requiresTwoFactor": true
}
```

#### POST /api/v1/auth/register

Đăng ký user mới.

**Request:**
```json
{
  "tenantId": "abcfood",
  "email": "newuser@abcfood.com",
  "password": "Password123!",
  "name": "Nguyen Van B",
  "phone": "0901234567"
}
```

#### POST /api/v1/auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "new-access-token...",
  "refreshToken": "new-refresh-token...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

#### POST /api/v1/auth/logout

Đăng xuất (revoke tokens).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `204 No Content`

#### POST /api/v1/auth/verify

Verify access token (cho các services khác gọi để validate).

**Request:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "valid": true,
  "payload": {
    "sub": "user-uuid",
    "email": "owner@abcfood.com",
    "tenantId": "abcfood",
    "branchId": "uuid",
    "role": "owner",
    "userType": "tenant"
  }
}
```

---

### Password Management

#### POST /api/v1/auth/change-password

Đổi mật khẩu (cần đăng nhập).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response:** `204 No Content`

#### POST /api/v1/auth/forgot-password

Yêu cầu reset password.

**Request:**
```json
{
  "email": "owner@abcfood.com",
  "tenantId": "abcfood"
}
```

**Response:** `204 No Content`

#### POST /api/v1/auth/reset-password

Reset password với token.

**Request:**
```json
{
  "token": "reset-token-uuid",
  "newPassword": "NewPassword789!"
}
```

**Response:** `204 No Content`

---

### Two-Factor Authentication (2FA)

#### POST /api/v1/auth/2fa/setup

Bắt đầu setup 2FA - lấy QR code.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,...",
  "otpauthUrl": "otpauth://totp/FNB_POS:owner@abcfood.com?secret=JBSWY3DPEHPK3PXP&issuer=FNB_POS"
}
```

#### POST /api/v1/auth/2fa/enable

Xác nhận và bật 2FA.

**Request:**
```json
{
  "code": "123456"
}
```

**Response:** `204 No Content`

#### POST /api/v1/auth/2fa/disable

Tắt 2FA.

**Request:**
```json
{
  "code": "123456"
}
```

**Response:** `204 No Content`

---

### Session Management

#### GET /api/v1/auth/sessions

Lấy danh sách sessions đang active.

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "deviceName": "Chrome on Windows",
      "deviceType": "desktop",
      "ipAddress": "192.168.1.100",
      "location": "Ho Chi Minh City, VN",
      "lastActivityAt": "2025-01-06T10:00:00.000Z",
      "createdAt": "2025-01-06T08:00:00.000Z",
      "isCurrentSession": true
    },
    {
      "id": "session-uuid-2",
      "deviceName": "Safari on iPhone",
      "deviceType": "mobile",
      "ipAddress": "192.168.1.101",
      "lastActivityAt": "2025-01-05T18:00:00.000Z",
      "createdAt": "2025-01-05T10:00:00.000Z",
      "isCurrentSession": false
    }
  ]
}
```

#### DELETE /api/v1/auth/sessions/:sessionId

Revoke một session cụ thể.

**Response:** `204 No Content`

---

### User Profile

#### GET /api/v1/auth/profile

Lấy thông tin user hiện tại.

**Response (200):**
```json
{
  "id": "user-uuid",
  "email": "owner@abcfood.com",
  "name": "Nguyen Van A",
  "phone": "0901234567",
  "avatarUrl": "https://...",
  "role": "owner",
  "userType": "tenant",
  "tenantId": "abcfood",
  "branchId": "branch-uuid",
  "isTwoFactorEnabled": true,
  "isEmailVerified": true,
  "lastLoginAt": "2025-01-06T08:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## JWT Token Structure

### Access Token Payload

```json
{
  "sub": "user-uuid",
  "email": "owner@abcfood.com",
  "tenantId": "abcfood",
  "branchId": "branch-uuid",
  "role": "owner",
  "userType": "tenant",
  "iat": 1704520800,
  "exp": 1704521700
}
```

### Token Expiration

| Token Type | Expiration | Mô tả |
|------------|------------|-------|
| **Access Token** | 15 phút | Short-lived, dùng cho API calls |
| **Refresh Token** | 7 ngày | Long-lived, dùng để lấy access token mới |

---

## Security Features

### Account Lockout

- **Sau 5 lần** đăng nhập sai → Khóa tài khoản 30 phút
- Reset counter sau đăng nhập thành công

### Password Requirements

- Tối thiểu 8 ký tự
- Ít nhất 1 chữ HOA
- Ít nhất 1 chữ thường
- Ít nhất 1 số
- Ít nhất 1 ký tự đặc biệt (@$!%*?&)

### Audit Logging

Tất cả các action được ghi log:

| Action | Mô tả |
|--------|-------|
| `login` | Đăng nhập thành công |
| `login_failed` | Đăng nhập thất bại |
| `logout` | Đăng xuất |
| `password_change` | Đổi mật khẩu |
| `password_reset_request` | Yêu cầu reset password |
| `password_reset_complete` | Reset password thành công |
| `two_factor_enable` | Bật 2FA |
| `two_factor_disable` | Tắt 2FA |
| `token_refresh` | Refresh token |
| `session_revoke` | Revoke session |
| `account_locked` | Tài khoản bị khóa |

---

## Database Schema

### Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    user_type VARCHAR(20) DEFAULT 'tenant',
    role VARCHAR(50) DEFAULT 'staff',
    branch_id UUID,
    is_two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(50),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
```

### Refresh Tokens

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    user_agent VARCHAR(255),
    ip_address VARCHAR(50),
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

### Sessions

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token VARCHAR(500) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    user_agent VARCHAR(255),
    ip_address VARCHAR(50),
    location VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
```

### Password Resets

```sql
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_resets_token ON password_resets(token);
```

### Audit Logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email VARCHAR(255),
    tenant_id VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    metadata JSONB,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

## Environment Variables

```bash
# Server
PORT=3005
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=fnbpos_oauth

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=30d
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# 2FA
TWO_FACTOR_APP_NAME=FNB_POS

# Password Reset
PASSWORD_RESET_EXPIRES_IN=3600000

# CORS
CORS_ORIGINS=https://admin.fnbpos.com,https://dashboard.fnbpos.com

# Email (for password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@fnbpos.com
SMTP_PASS=password
SMTP_FROM=noreply@fnbpos.com
```

---

## Integration với các Services khác

### API Gateway Configuration

```typescript
// api-gateway routing
routes: [
  { path: '/api/auth', target: 'http://api-oauth:3005' },
  { path: '/api/admin', target: 'http://api-admin:3001' },
  { path: '/api/dashboard', target: 'http://api-dashboard:3002' },
]
```

### Verify Token từ service khác

```typescript
// Từ api-admin hoặc api-dashboard
async verifyToken(accessToken: string) {
  const response = await fetch('http://api-oauth:3005/api/v1/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken }),
  });

  const { valid, payload } = await response.json();

  if (!valid) {
    throw new UnauthorizedException();
  }

  return payload;
}
```

---

## Error Codes

| Code | HTTP Status | Mô tả |
|------|-------------|-------|
| `INVALID_CREDENTIALS` | 401 | Email hoặc password không đúng |
| `ACCOUNT_DISABLED` | 401 | Tài khoản đã bị vô hiệu hóa |
| `ACCOUNT_LOCKED` | 401 | Tài khoản đang bị khóa |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token không hợp lệ |
| `INVALID_2FA_CODE` | 401 | Mã 2FA không đúng |
| `EMAIL_EXISTS` | 409 | Email đã được đăng ký |
| `INVALID_RESET_TOKEN` | 400 | Token reset password không hợp lệ |
| `2FA_NOT_SETUP` | 400 | 2FA chưa được setup |
| `2FA_NOT_ENABLED` | 400 | 2FA chưa được bật |
| `SESSION_NOT_FOUND` | 404 | Session không tồn tại |
