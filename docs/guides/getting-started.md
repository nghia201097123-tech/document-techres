---
sidebar_position: 1
---

# Bắt đầu nhanh

Hướng dẫn bắt đầu với FNB POS System.

## Yêu cầu hệ thống

### Development

| Tool | Version |
|------|---------|
| Node.js | >= 18.0 |
| npm/yarn/pnpm | Latest |
| React Native CLI | Latest |
| Android Studio | Latest |
| Xcode | Latest (macOS) |

### Production

| Thiết bị | Yêu cầu |
|----------|---------|
| CCB (POS) | Android 8+ / Windows 10+ |
| Order App | Android 8+ / iOS 13+ |
| RAM (CCB) | >= 4GB cho 30 connections |

## Clone repository

```bash
git clone https://github.com/your-org/fnb-system.git
cd fnb-system
```

## Cài đặt dependencies

```bash
# Sử dụng pnpm (recommended)
pnpm install

# Hoặc npm
npm install

# Hoặc yarn
yarn install
```

## Cấu trúc project

```
fnb-system/
├── packages/
│   └── shared/          # Code dùng chung
├── apps/
│   ├── web-admin/       # Super Admin
│   ├── web-dashboard/   # Chủ quán
│   ├── order/           # Order App
│   ├── ccb/             # POS
│   └── customer/        # App khách hàng
└── server/              # Backend API
```

## Chạy development

### 1. Chạy Server

```bash
# Terminal 1
cd server
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`.

### 2. Chạy Web Dashboard

```bash
# Terminal 2
cd apps/web-dashboard
npm run dev
```

Dashboard sẽ chạy tại `http://localhost:3001`.

### 3. Chạy CCB (Android)

```bash
# Terminal 3
cd apps/ccb
npm run android
```

### 4. Chạy Order App (Android)

```bash
# Terminal 4
cd apps/order
npm run android
```

## Tạo dữ liệu mẫu

```bash
cd server
npm run seed
```

Lệnh này sẽ tạo:
- 1 quán mẫu
- Danh mục và sản phẩm
- Khu vực và bàn
- Nhân viên với PIN code

## Đăng nhập

### Web Dashboard

- Email: `owner@demo.com`
- Password: `Demo@123`

### CCB/Order App

- Store ID: `demo-store`
- PIN: `1234`

## Các bước tiếp theo

1. [Thiết lập môi trường phát triển](/docs/guides/setup-development)
2. [Tìm hiểu kiến trúc](/docs/architecture/overview)
3. [Tham khảo API](/docs/api/overview)
