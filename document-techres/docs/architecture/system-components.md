---
sidebar_position: 3
---

# Các thành phần hệ thống

Mô tả chi tiết vai trò và chức năng của từng thành phần trong hệ thống.

## 1. Web Admin (Super Admin)

**Vai trò:** Quản lý toàn bộ hệ thống - dành cho team vận hành

**Nền tảng:** React/Next.js

### Chức năng chính

- Tạo nhà hàng/quán mới
- Tạo tài khoản Owner cho từng quán
- Quản lý gói dịch vụ (Basic, Pro, Enterprise)
- Quản lý billing, thanh toán, gia hạn
- Xem thống kê toàn hệ thống
- Hỗ trợ khách hàng, xử lý sự cố
- Khóa/mở khóa quán khi cần

### Các màn hình chính

| Màn hình | Mô tả |
|----------|-------|
| Dashboard | Tổng quan: số quán, doanh thu, growth |
| Stores | Danh sách quán, tạo mới, chi tiết |
| Users | Quản lý tài khoản owner |
| Billing | Gói dịch vụ, thanh toán |
| Support | Tickets hỗ trợ |
| Analytics | Thống kê chi tiết |

---

## 2. Web Dashboard (Chủ quán)

**Vai trò:** Quản lý 1 quán cụ thể - dành cho chủ quán

**Nền tảng:** React/Next.js

**Đăng nhập:** Bằng tài khoản do Web Admin cấp

### Chức năng chính

- Quản lý menu, giá, danh mục
- Quản lý bàn, khu vực
- Tạo tài khoản nhân viên (Cashier, Staff)
- Cấu hình máy in, thiết bị
- Xem báo cáo doanh thu
- Quản lý khách hàng, điểm thưởng
- Cấu hình thanh toán

### Các màn hình chính

| Màn hình | Mô tả |
|----------|-------|
| Dashboard | Doanh thu hôm nay, tuần, tháng |
| Menu | Danh mục, sản phẩm, giá |
| Tables | Khu vực, bàn, sức chứa |
| Staff | Nhân viên, phân quyền |
| Reports | Báo cáo chi tiết |
| Settings | Cấu hình quán, máy in |

---

## 3. CCB App - Thu ngân (Master)

**Vai trò kép:**
1. **Ứng dụng thu ngân:** Giao diện cho nhân viên thu ngân thao tác
2. **Local API Server:** Cung cấp API cho Order App và POS Bếp/Bar

**Nền tảng:** React Native (Android + Windows)

**Database:** SQLite - là **Source of Truth** cho toàn bộ cửa hàng

### Chức năng chính

- Nhận và quản lý order từ Order App
- Thanh toán đơn hàng
- In bill cho khách
- Quản lý Print Queue
- Chốt ca làm việc
- Xem báo cáo doanh thu
- Sync dữ liệu lên Cloud Server

### Services chạy ngầm

```
┌─────────────────────────────────────────┐
│            CCB App (Master)              │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   SQLite    │  │  HTTP Server    │   │
│  │   Database  │  │  (REST API)     │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │  WebSocket  │  │  UDP Broadcast  │   │
│  │   Server    │  │  (Discovery)    │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Print Queue │  │  Cloud Sync     │   │
│  │  Service    │  │   Service       │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 4. CCB App - Bếp/Bar (Client)

**Vai trò:** Màn hình hiển thị cho bếp/bar

**Nền tảng:** React Native (Android + Windows)

**Database:** **KHÔNG CÓ** - chỉ nhận data từ POS Thu ngân qua WebSocket

### Chức năng chính

- Hiển thị danh sách món cần làm
- Phát âm thanh khi có món mới
- In tem bếp/bar
- Đánh dấu "Đang làm", "Hoàn thành"
- Thông báo món đã sẵn sàng

### Giao diện

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÀN HÌNH BẾP                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ BÀN 5       │  │ BÀN 12      │  │ BÀN 3       │              │
│  │ 10:30 AM    │  │ 10:32 AM    │  │ 10:35 AM    │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ 2x Phở bò   │  │ 1x Cơm gà   │  │ 3x Bún chả  │              │
│  │ 1x Nem      │  │ 2x Gỏi cuốn │  │             │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ [ĐANG LÀM]  │  │  [BẮT ĐẦU]  │  │  [BẮT ĐẦU]  │              │
│  │ [HOÀN THÀNH]│  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  Tổng: 5 đơn chờ | 2 đang làm | Hôm nay: 45 đơn hoàn thành     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Order App (2 chế độ)

**QUAN TRỌNG:** Order App là 1 app duy nhất với 2 chế độ, **KHÔNG tách thành 2 app riêng**.

**Nền tảng:** React Native (Android + iOS)

### Chế độ Standalone (Quán nhỏ)

**Khi nào dùng:** Quán nhỏ, 1-2 nhân viên, không có máy POS

**Database:** Có SQLite local

**Chức năng:**
- Quản lý menu, bàn trực tiếp trên app
- Tạo order, thanh toán ngay trên app
- In bill qua Bluetooth
- Chốt ca, xem báo cáo
- Sync lên Cloud khi có mạng

### Chế độ Client (Quán lớn)

**Khi nào dùng:** Quán lớn, có máy POS thu ngân

**Database:** **KHÔNG CÓ** - chỉ giữ state trong RAM

**Chức năng:**
- Kết nối WebSocket đến POS Thu ngân
- Xem danh sách bàn và trạng thái
- Tạo order mới cho bàn
- Thêm/sửa/xóa món trong order
- Gọi thanh toán
- Chuyển bàn, gộp bàn

### Flow chọn chế độ

```
Mở app lần đầu
        │
        ▼
"Bạn sử dụng mô hình nào?"
        │
        ├── [Quán nhỏ - Tự quản lý]
        │   └── Standalone Mode
        │       └── Nhập thông tin quán → Tạo DB local → Sử dụng
        │
        └── [Quán lớn - Có máy POS]
            └── Client Mode
                └── Tìm POS (UDP/QR) → Kết nối → Sử dụng
```

---

## 6. API Master Data

**Vai trò:** Service đồng bộ dữ liệu master từ cloud xuống các ứng dụng POS

**Nền tảng:** NestJS + TypeORM + PostgreSQL

### Chức năng chính

- Xác thực thiết bị bằng mã cửa hàng
- Xác thực nhân viên bằng mã PIN
- Đồng bộ dữ liệu master (categories, products, areas, tables, staff)
- Hỗ trợ full sync và incremental sync

### Kiến trúc

```
┌─────────────────────────────────────────┐
│         API Master Data                 │
│           (NestJS)                      │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Auth Module │  │  Sync Module    │   │
│  │ - login     │  │  - full sync    │   │
│  │ - verify-pin│  │  - incremental  │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │          PostgreSQL                 ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/v1/auth/login` | POST | Đăng nhập thiết bị |
| `/api/v1/auth/verify-pin` | POST | Xác thực mã PIN |
| `/api/v1/sync/full` | GET | Full sync master data |
| `/api/v1/sync/incremental` | GET | Incremental sync |

---

## 7. API OAuth

**Vai trò:** Service Authentication tập trung cho toàn bộ hệ thống

**Nền tảng:** NestJS + TypeORM + PostgreSQL

### Chức năng chính

- Đăng nhập/Đăng ký cho Admin và Tenant users
- Quản lý JWT Access Token và Refresh Token
- Two-Factor Authentication (2FA) với TOTP
- Quản lý Sessions
- Password Reset
- Audit Logging

### Kiến trúc

```
┌─────────────────────────────────────────┐
│            API OAuth                     │
│            (NestJS)                      │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Auth Module │  │ Sessions Module │   │
│  │ - login     │  │ - list sessions │   │
│  │ - register  │  │ - revoke        │   │
│  │ - logout    │  │                 │   │
│  │ - refresh   │  │                 │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ 2FA Module  │  │ Password Module │   │
│  │ - setup     │  │ - change        │   │
│  │ - enable    │  │ - forgot        │   │
│  │ - disable   │  │ - reset         │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │          PostgreSQL                 ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### User Types

| Type | Mô tả | Use Case |
|------|-------|----------|
| **ADMIN** | Super Admin, Support | Web Admin |
| **TENANT** | Owner, Manager, Staff | Web Dashboard, Mobile Apps |

### Token Management

| Token | Expiration | Mô tả |
|-------|------------|-------|
| **Access Token** | 15 phút | Short-lived, cho API calls |
| **Refresh Token** | 7 ngày | Long-lived, để refresh |

### API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/v1/auth/login` | POST | Đăng nhập |
| `/api/v1/auth/register` | POST | Đăng ký |
| `/api/v1/auth/refresh` | POST | Refresh token |
| `/api/v1/auth/logout` | POST | Đăng xuất |
| `/api/v1/auth/2fa/setup` | POST | Setup 2FA |
| `/api/v1/auth/2fa/enable` | POST | Bật 2FA |
| `/api/v1/auth/2fa/disable` | POST | Tắt 2FA |
| `/api/v1/auth/change-password` | POST | Đổi mật khẩu |
| `/api/v1/auth/forgot-password` | POST | Quên mật khẩu |
| `/api/v1/auth/reset-password` | POST | Reset mật khẩu |
| `/api/v1/auth/sessions` | GET | Danh sách sessions |
| `/api/v1/auth/sessions/:id` | DELETE | Revoke session |
| `/api/v1/auth/verify` | POST | Verify token (cho services khác) |

### Security Features

- Account lockout sau 5 lần đăng nhập sai (30 phút)
- Password requirements: 8+ ký tự, 1 hoa, 1 thường, 1 số, 1 đặc biệt
- Audit log cho tất cả authentication events
- IP và User-Agent tracking

---

## 8. Customer App

**Vai trò:** App cho khách hàng - chỉ chạy **Online**

**Nền tảng:** React Native hoặc Web

### Chức năng chính

- Xem điểm tích lũy
- Xem lịch sử mua hàng
- Tạo QR code để sử dụng điểm tại quầy
- Nhận thông báo khuyến mãi
