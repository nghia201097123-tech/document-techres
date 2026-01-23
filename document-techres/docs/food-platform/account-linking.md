---
sidebar_position: 2
---

# Liên kết tài khoản (Account Linking)

Chi tiết về quy trình liên kết tài khoản merchant từ các food platform vào hệ thống TechRes.

## Tổng quan

Mỗi chi nhánh có thể liên kết **nhiều tài khoản** từ **nhiều platform** khác nhau:

```
Chi nhánh A
├── GrabFood Account #1 (Cửa hàng chính)
├── GrabFood Account #2 (Cửa hàng phụ)
├── ShopeeFood Account #1
└── BeFood Account #1

Chi nhánh B
├── GrabFood Account #1
└── ShopeeFood Account #1
```

## Các loại Authentication

### 1. Username/Password (Grab, BeFood)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 1: User nhập thông tin                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Platform: [GrabFood ▼]                                          │    │
│  │  Username: [merchant@example.com          ]                      │    │
│  │  Password: [••••••••••••                  ]                      │    │
│  │                                                                  │    │
│  │  [Liên kết tài khoản]                                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 2: API-Dashboard xử lý                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  POST /food-platforms/{id}/login                                 │    │
│  │  Body: { username, password }                                    │    │
│  │                                                                  │    │
│  │  1. Validate input                                               │    │
│  │  2. Encrypt password                                             │    │
│  │  3. Save to DB (status = CONNECTING)                             │    │
│  │  4. Call Merchant API để authenticate                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 3: Gọi Merchant API (Platform)                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  POST https://api.grab.com/merchant/v1/auth/login                │    │
│  │  Body: { username, password, client_id, client_secret }          │    │
│  │                                                                  │    │
│  │  Response (Success):                                             │    │
│  │  {                                                               │    │
│  │    "access_token": "eyJhbGciOiJIUzI1NiIs...",                    │    │
│  │    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2...",                 │    │
│  │    "expires_in": 3600,                                           │    │
│  │    "merchant_id": "GR-VN-123456",                                │    │
│  │    "store_name": "Cà phê TechRes Q1"                             │    │
│  │  }                                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 4: Lưu kết quả vào DB                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  UPDATE food_platform_accounts SET                               │    │
│  │    access_token = 'eyJhbGciOiJIUzI1NiIs...',                     │    │
│  │    refresh_token = 'dGhpcyBpcyBhIHJlZnJlc2...',                  │    │
│  │    token_expires_at = NOW() + INTERVAL '1 hour',                 │    │
│  │    external_merchant_id = 'GR-VN-123456',                        │    │
│  │    external_store_name = 'Cà phê TechRes Q1',                    │    │
│  │    status = 'connected',                                         │    │
│  │    is_active = true,                                             │    │
│  │    error_count = 0                                               │    │
│  │  WHERE id = ?                                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Phone OTP (ShopeeFood)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 1: Yêu cầu OTP                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Platform: [ShopeeFood ▼]                                        │    │
│  │  Số điện thoại: [0901234567                ]                     │    │
│  │                                                                  │    │
│  │  [Gửi mã OTP]                                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  API: POST /food-platforms/{id}/request-otp                              │
│  Body: { phoneNumber: "0901234567" }                                     │
│                                                                          │
│  Backend:                                                                │
│  1. Save phoneNumber to account                                          │
│  2. Generate otpSessionId (UUID)                                         │
│  3. Set otpExpiresAt = NOW() + 5 minutes                                 │
│  4. Call ShopeeFood API to send OTP                                      │
│  5. Return { success: true, message: "OTP đã gửi", expiresIn: 300 }      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 2: Xác thực OTP                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Mã OTP: [1 2 3 4 5 6]                                           │    │
│  │                                                                  │    │
│  │  [Xác nhận]                                                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  API: POST /food-platforms/{id}/verify-otp                               │
│  Body: { otp: "123456" }                                                 │
│                                                                          │
│  Backend:                                                                │
│  1. Check otpExpiresAt > NOW() (chưa hết hạn)                            │
│  2. Call ShopeeFood API verify OTP                                       │
│  3. Get list of stores associated with phone                             │
│  4. Return { success: true, stores: [...] }                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 3: Chọn cửa hàng                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Chọn cửa hàng để liên kết:                                      │    │
│  │                                                                  │    │
│  │  ○ Cà phê TechRes Q1 (SF-123456)                                 │    │
│  │  ● Cà phê TechRes Q3 (SF-789012)                                 │    │
│  │  ○ Cà phê TechRes Thủ Đức (SF-345678)                            │    │
│  │                                                                  │    │
│  │  [Liên kết cửa hàng đã chọn]                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  API: POST /food-platforms/{id}/select-store                             │
│  Body: { merchantId: "SF-789012", storeName: "Cà phê TechRes Q3" }       │
│                                                                          │
│  Backend:                                                                │
│  1. Save externalMerchantId, externalStoreName                           │
│  2. Save access_token from ShopeeFood                                    │
│  3. Set status = 'connected'                                             │
│  4. Return { success: true, accountId }                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Tạo account mới

```http
POST /api/food-platforms
Content-Type: application/json
Authorization: Bearer {token}

{
  "branchId": 1,
  "platform": "grab",
  "authType": "username_password",
  "displayName": "GrabFood Q1"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "branchId": 1,
  "platform": "grab",
  "authType": "username_password",
  "status": "pending",
  "isActive": false,
  "pollIntervalSeconds": 30
}
```

### Login với Username/Password

```http
POST /api/food-platforms/{id}/login
Content-Type: application/json
Authorization: Bearer {token}

{
  "username": "merchant@example.com",
  "password": "securepassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "accountId": "550e8400-e29b-41d4-a716-446655440000",
  "storeName": "Cà phê TechRes Q1",
  "merchantId": "GR-VN-123456"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Tên đăng nhập hoặc mật khẩu không đúng",
  "errorCode": "INVALID_CREDENTIALS"
}
```

### Request OTP

```http
POST /api/food-platforms/{id}/request-otp
Content-Type: application/json
Authorization: Bearer {token}

{
  "phoneNumber": "0901234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mã OTP đã được gửi đến số 0901234567",
  "expiresIn": 300
}
```

### Verify OTP

```http
POST /api/food-platforms/{id}/verify-otp
Content-Type: application/json
Authorization: Bearer {token}

{
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "stores": [
    {
      "merchantId": "SF-123456",
      "storeName": "Cà phê TechRes Q1",
      "address": "123 Nguyễn Huệ, Q1"
    },
    {
      "merchantId": "SF-789012",
      "storeName": "Cà phê TechRes Q3",
      "address": "456 Võ Văn Tần, Q3"
    }
  ]
}
```

### Select Store

```http
POST /api/food-platforms/{id}/select-store
Content-Type: application/json
Authorization: Bearer {token}

{
  "merchantId": "SF-789012",
  "storeName": "Cà phê TechRes Q3"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Liên kết cửa hàng thành công",
  "accountId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Database Schema

### food_platform_accounts

```sql
CREATE TABLE food_platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL,
  branch_id INTEGER NOT NULL,

  -- Platform info
  platform VARCHAR(20) NOT NULL,  -- grab, shopee_food, befood
  auth_type VARCHAR(20) NOT NULL, -- username_password, phone_otp
  display_name VARCHAR(100),

  -- Credentials (encrypted)
  username VARCHAR(255),
  password VARCHAR(255),
  phone_number VARCHAR(20),

  -- OTP session
  otp_session_id VARCHAR(100),
  otp_expires_at TIMESTAMP,

  -- Tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- External store info
  external_merchant_id VARCHAR(100),
  external_store_name VARCHAR(255),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Polling config
  poll_interval_seconds INTEGER NOT NULL DEFAULT 30,
  last_poll_at TIMESTAMP,
  next_poll_at TIMESTAMP,

  -- Error tracking
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Indexes
CREATE INDEX idx_food_platform_accounts_branch ON food_platform_accounts(branch_id);
CREATE INDEX idx_food_platform_accounts_status ON food_platform_accounts(status);
CREATE INDEX idx_food_platform_accounts_next_poll ON food_platform_accounts(next_poll_at);
```

## Status Transitions

```
                                    ┌─────────────────┐
                                    │     PENDING     │
                                    │  (Chờ đăng nhập) │
                                    └────────┬────────┘
                                             │
                                    POST /login hoặc /request-otp
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   CONNECTING    │
                                    │ (Đang xác thực) │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           Auth thành công           Auth thất bại             Timeout/Cancel
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
           │    CONNECTED    │      │      ERROR      │      │     PENDING     │
           │  (Đã kết nối)   │      │   (Lỗi auth)    │      │  (Quay lại)     │
           └────────┬────────┘      └─────────────────┘      └─────────────────┘
                    │
                    │ Token expired / User disconnect
                    │
                    ▼
           ┌─────────────────┐
           │  DISCONNECTED   │
           │ (Ngắt kết nối)  │
           └─────────────────┘
```

## Token Refresh

Tokens từ các platform thường có thời hạn ngắn (1-24h). Hệ thống cần tự động refresh:

```typescript
// Pseudo code cho token refresh
async function refreshTokenIfNeeded(account: FoodPlatformAccount) {
  // Kiểm tra token sắp hết hạn (còn < 5 phút)
  const expiresIn = account.tokenExpiresAt.getTime() - Date.now();

  if (expiresIn < 5 * 60 * 1000) { // < 5 phút
    try {
      const newTokens = await platformApi.refreshToken(
        account.platform,
        account.refreshToken
      );

      await updateAccount(account.id, {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
        errorCount: 0,
      });

      return true;
    } catch (error) {
      await updateAccount(account.id, {
        status: 'disconnected',
        errorCount: account.errorCount + 1,
        lastError: error.message,
      });

      // Notify user to re-login
      await notifyUser(account.branchId, 'TOKEN_EXPIRED', account.platform);

      return false;
    }
  }

  return true;
}
```

## Security Considerations

### 1. Mã hóa Credentials

```typescript
// Sử dụng AES-256-GCM để mã hóa
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.FOOD_PLATFORM_ENCRYPTION_KEY; // 32 bytes

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 2. Rate Limiting

```typescript
// Giới hạn số lần login thất bại
const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMinutes: 15,
  lockoutMinutes: 30,
};

async function checkRateLimit(accountId: string): Promise<boolean> {
  const key = `login_attempts:${accountId}`;
  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, LOGIN_RATE_LIMIT.windowMinutes * 60);
  }

  if (attempts > LOGIN_RATE_LIMIT.maxAttempts) {
    // Lock account
    await redis.set(`locked:${accountId}`, '1', 'EX', LOGIN_RATE_LIMIT.lockoutMinutes * 60);
    return false;
  }

  return true;
}
```

### 3. Audit Logging

```typescript
// Log mọi hoạt động liên quan đến credentials
async function auditLog(event: AuditEvent) {
  await db.insert('audit_logs', {
    id: uuid(),
    event_type: event.type,       // LOGIN, LOGOUT, TOKEN_REFRESH, etc.
    account_id: event.accountId,
    user_id: event.userId,
    ip_address: event.ipAddress,
    user_agent: event.userAgent,
    status: event.status,         // SUCCESS, FAILED
    error_message: event.error,
    metadata: JSON.stringify(event.metadata),
    created_at: new Date(),
  });
}
```

## Error Handling

### Common Errors

| Error Code | Description | User Action |
|------------|-------------|-------------|
| `INVALID_CREDENTIALS` | Sai username/password | Kiểm tra lại thông tin |
| `ACCOUNT_LOCKED` | Tài khoản bị khóa trên platform | Liên hệ platform support |
| `OTP_EXPIRED` | Mã OTP hết hạn | Yêu cầu OTP mới |
| `OTP_INVALID` | Mã OTP không đúng | Nhập lại mã OTP |
| `RATE_LIMITED` | Quá nhiều lần thử | Chờ 30 phút |
| `PLATFORM_ERROR` | Lỗi từ platform API | Thử lại sau |
| `TOKEN_EXPIRED` | Token hết hạn | Đăng nhập lại |

### Retry Strategy

```typescript
async function loginWithRetry(accountId: string, credentials: LoginDto) {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 giây

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await doLogin(accountId, credentials);
    } catch (error) {
      // Không retry cho lỗi credentials
      if (error.code === 'INVALID_CREDENTIALS' || error.code === 'ACCOUNT_LOCKED') {
        throw error;
      }

      // Retry cho network errors
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}
```

## UI/UX Guidelines

### Loading States

```
┌─────────────────────────────────────────┐
│  [●] Đang kết nối đến GrabFood...       │
│                                         │
│  ████████████░░░░░░░░  60%              │
│                                         │
│  Vui lòng không đóng ứng dụng           │
└─────────────────────────────────────────┘
```

### Success State

```
┌─────────────────────────────────────────┐
│  ✓ Liên kết thành công!                 │
│                                         │
│  Cửa hàng: Cà phê TechRes Q1            │
│  Mã merchant: GR-VN-123456              │
│                                         │
│  [Đóng]                                 │
└─────────────────────────────────────────┘
```

### Error State

```
┌─────────────────────────────────────────┐
│  ✗ Không thể kết nối                    │
│                                         │
│  Lỗi: Tên đăng nhập hoặc mật khẩu       │
│  không chính xác.                       │
│                                         │
│  [Thử lại]  [Hủy]                       │
└─────────────────────────────────────────┘
```

## Tiếp theo

- [Polling đơn hàng](./order-polling.md) - Cơ chế lấy đơn hàng từ platform
