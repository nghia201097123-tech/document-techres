---
sidebar_position: 1
---

# Tổng quan kiến trúc

Hệ thống FNB POS được thiết kế theo kiến trúc **Offline-First** với 3 mô hình triển khai phù hợp với các quy mô quán khác nhau.

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEB ADMIN (Super Admin)                    │
│                    Quản lý toàn bộ hệ thống                     │
├─────────────────────────────────────────────────────────────────┤
│  • Tạo nhà hàng/quán mới                                        │
│  • Tạo tài khoản Owner cho từng quán                            │
│  • Quản lý gói dịch vụ, billing, thanh toán                     │
│  • Xem thống kê toàn hệ thống (tất cả quán)                     │
│  • Hỗ trợ khách hàng, xử lý sự cố                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Tạo quán + cấp tài khoản
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WEB DASHBOARD (Chủ quán/Owner)                │
│                     Quản lý 1 quán cụ thể                       │
├─────────────────────────────────────────────────────────────────┤
│  • Đăng nhập bằng tài khoản được Web Admin cấp                  │
│  • Xây dựng menu, giá, danh mục                                 │
│  • Quản lý bàn, khu vực                                         │
│  • Tạo tài khoản nhân viên (thu ngân, phục vụ)                  │
│  • Xem báo cáo doanh thu, thống kê                              │
│  • Cấu hình quán (máy in, thiết bị, thanh toán)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Sync data xuống thiết bị
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CỬA HÀNG (Offline-First)                      │
│         Chọn 1 trong 3 mô hình phù hợp quy mô                   │
└─────────────────────────────────────────────────────────────────┘
```

## 3 Mô hình triển khai

### Mô hình 1: Order Only (Quán rất nhỏ)

```
┌─────────────────────────────────────────────────────────────────┐
│                      CỬA HÀNG                                   │
├─────────────────────────────────────────────────────────────────┤
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              ORDER APP (Standalone Mode)                 │   │
│   │                   Kotlin / Android                       │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │  • SQLite Local (tự quản lý dữ liệu)                    │   │
│   │  • Tạo order, thanh toán ngay trên app                  │   │
│   │  • In bill qua Bluetooth (máy in mini)                  │   │
│   │  • Sync lên Cloud khi có mạng                           │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Mô hình 2: CCB Only (Quán nhỏ có quầy)

```
┌─────────────────────────────────────────────────────────────────┐
│                      CỬA HÀNG                                   │
├─────────────────────────────────────────────────────────────────┤
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   CCB APP (Standalone)                   │   │
│   │           Kotlin/Android hoặc .NET/Windows               │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │  • SQLite Local (tự quản lý dữ liệu)                    │   │
│   │  • Thu ngân tự order và thanh toán                      │   │
│   │  • In bill qua USB/Bluetooth/LAN                        │   │
│   │  • Sync lên Cloud khi có mạng                           │   │
│   └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│              ┌─────────────┼─────────────┐                      │
│              ▼             ▼             ▼                      │
│      ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│      │ Máy in Bill│ │ Máy in Bếp│ │ Máy in Bar │               │
│      └────────────┘ └────────────┘ └────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Mô hình 3: Full System (Quán lớn)

```
┌─────────────────────────────────────────────────────────────────┐
│                      CỬA HÀNG (LAN/WIFI)                        │
├─────────────────────────────────────────────────────────────────┤
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              LOCAL SERVER (Trung tâm)                    │   │
│   │              .NET / ASP.NET Core / Windows               │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │  • SQLite hoặc SQL Server Local                         │   │
│   │  • REST API + WebSocket Server (SignalR)                │   │
│   │  • Print Queue (quản lý lệnh in)                        │   │
│   │  • UDP Broadcast (Discovery)                            │   │
│   │  • Sync lên Cloud khi có mạng                           │   │
│   └────────────────────────┬────────────────────────────────┘   │
│                            │                                    │
│   ┌────────────────────────┼────────────────────────────────┐   │
│   │                        │                                │   │
│   ▼                        ▼                                ▼   │
│ ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│ │  CCB App     │    │  CCB App     │    │    Order App     │   │
│ │  (Thu ngân)  │    │  (Bếp/Bar)   │    │    (Nhân viên)   │   │
│ └──────────────┘    └──────────────┘    └──────────────────┘   │
│          Tất cả kết nối vào LOCAL SERVER qua LAN                │
└─────────────────────────────────────────────────────────────────┘
```

## Nguyên tắc thiết kế

### 1. Offline-First
- Mọi tính năng core phải hoạt động không cần internet
- Database local (SQLite) là **Source of Truth** trong cửa hàng
- Sync dữ liệu lên cloud khi có mạng

### 2. Single Source of Truth

| Mô hình | Source of Truth | Ghi chú |
|---------|-----------------|---------|
| Order Only | SQLite trên Order App | App tự quản lý |
| CCB Only | SQLite trên CCB App | App tự quản lý |
| Full System | SQLite trên Local Server | Tất cả client kết nối vào |

### 3. Graceful Degradation
- Tính năng online bị disable khi offline, không crash
- User thấy rõ đang ở chế độ nào
- Queue các action cần online để xử lý sau

### 4. Idempotent Operations
- Mọi sync operation đều idempotent
- UUID cho mọi record, không dùng auto-increment
- Có thể retry sync nhiều lần không gây duplicate

## Phân quyền hệ thống

| Hệ thống | Role | Quyền |
|----------|------|-------|
| **Web Admin** | Super Admin | Tạo quán, quản lý billing, xem tất cả quán |
| **Web Admin** | Support | Hỗ trợ khách hàng, xem thông tin quán (không sửa) |
| **Web Dashboard** | Owner | Toàn quyền với quán của mình |
| **Web Dashboard** | Manager | Quản lý menu, nhân viên, xem báo cáo (không xóa quán) |
| **CCB App** | Cashier | Thu ngân, thanh toán, chốt ca |
| **Order App** | Staff | Order món, phục vụ, xem trạng thái |

## Flow tạo quán mới

```
Super Admin đăng nhập Web Admin
        │
        ▼
Tạo nhà hàng mới:
├── Nhập: Tên quán, địa chỉ, SĐT, email owner
├── Chọn gói dịch vụ (Basic, Pro, Enterprise)
├── Chọn mô hình sử dụng (Order Only / CCB Only / Full System)
├── Hệ thống tự động:
│   ├── Tạo store_id (UUID)
│   ├── Tạo tài khoản Owner (email + password tạm)
│   └── Tạo database schema cho quán
└── Gửi email thông tin đăng nhập cho Owner
        │
        ▼
Owner nhận email → Đăng nhập Web Dashboard
        │
        ▼
Đổi password → Bắt đầu xây dựng dữ liệu:
├── Tạo danh mục, sản phẩm, giá
├── Tạo khu vực, bàn
├── Tạo tài khoản nhân viên (PIN code)
└── Cấu hình máy in, thiết bị
        │
        ▼
Nhân viên đăng nhập CCB/Order App:
├── Nhập store_id hoặc scan QR quán
├── Đăng nhập bằng PIN hoặc tài khoản
├── App sync data từ server
└── Sẵn sàng bán hàng
```

## Yêu cầu kỹ thuật

### Hardware tối thiểu

| Thành phần | Yêu cầu tối thiểu | Khuyến nghị |
|------------|-------------------|-------------|
| Local Server | RAM 4GB, SSD 128GB | RAM 8GB, SSD 256GB |
| CCB App (Windows) | RAM 4GB | RAM 8GB |
| CCB App (Android) | RAM 2GB | RAM 4GB |
| Order App | RAM 2GB | RAM 3GB |

### Network

- WiFi/LAN cho kết nối nội bộ (Mô hình 3)
- Internet cho sync lên cloud (không bắt buộc realtime)
- Khuyến nghị: Router WiFi riêng cho hệ thống POS

### Cấu hình máy cho Local Server

| Số connection | RAM tối thiểu | Khuyến nghị |
|---------------|---------------|-------------|
| 10-15 | 2GB | 4GB |
| 15-30 | 4GB | 8GB |
| 30+ | 8GB | 16GB |
