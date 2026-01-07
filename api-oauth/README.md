# API OAuth

Authentication microservice cho hệ thống FNB POS.

## Tính năng

- **Login/Register** - Đăng nhập/Đăng ký cho Admin và Tenant users
- **JWT Tokens** - Access Token (15m) + Refresh Token (7d)
- **2FA (TOTP)** - Two-Factor Authentication với Google Authenticator
- **Session Management** - Quản lý sessions đăng nhập
- **Password Reset** - Quên mật khẩu, đổi mật khẩu
- **Audit Logging** - Ghi log tất cả authentication events

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL + TypeORM
- **Authentication:** Passport.js + JWT
- **2FA:** otplib (TOTP)

## Cài đặt

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure database in .env
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=postgres
# DB_DATABASE=fnbpos_oauth

# Run migrations (optional)
npm run migration:run

# Start development server
npm run start:dev
```

## API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/v1/auth/login` | POST | Đăng nhập |
| `/api/v1/auth/register` | POST | Đăng ký |
| `/api/v1/auth/refresh` | POST | Refresh token |
| `/api/v1/auth/logout` | POST | Đăng xuất |
| `/api/v1/auth/verify` | POST | Verify token |
| `/api/v1/auth/profile` | GET | Get user profile |
| `/api/v1/auth/change-password` | POST | Đổi mật khẩu |
| `/api/v1/auth/forgot-password` | POST | Quên mật khẩu |
| `/api/v1/auth/reset-password` | POST | Reset mật khẩu |
| `/api/v1/auth/2fa/setup` | POST | Setup 2FA |
| `/api/v1/auth/2fa/enable` | POST | Bật 2FA |
| `/api/v1/auth/2fa/disable` | POST | Tắt 2FA |
| `/api/v1/auth/sessions` | GET | Danh sách sessions |
| `/api/v1/auth/sessions/:id` | DELETE | Revoke session |

## Environment Variables

```bash
# Server
PORT=3005
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=fnbpos_oauth

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# 2FA
TWO_FACTOR_APP_NAME=FNB_POS
```

## Security Features

- Account lockout sau 5 lần đăng nhập sai (30 phút)
- Password requirements: 8+ ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt
- Audit log cho tất cả authentication events
- IP và User-Agent tracking

## User Types

| Type | Mô tả | Use Case |
|------|-------|----------|
| **ADMIN** | Super Admin, Support | Web Admin |
| **TENANT** | Owner, Manager, Staff | Web Dashboard, Mobile Apps |

## API Documentation

Swagger UI available at: `http://localhost:3005/api/docs`

## License

UNLICENSED
