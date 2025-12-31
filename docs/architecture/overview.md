---
sidebar_position: 1
---

# Tổng quan kiến trúc

Hệ thống FNB POS được thiết kế theo kiến trúc **Offline-First** với CCB App đóng vai trò là **Local Server** trong cửa hàng.

## Mô hình quán lớn (Có POS)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD/SERVER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐         ┌─────────────────────────────┐   │
│   │   Web Dashboard │         │        REST API +           │   │
│   │   (Quản lý)     │────────►│        PostgreSQL           │   │
│   └─────────────────┘         └──────────────┬──────────────┘   │
│                                              │                  │
│   Chức năng:                                 │ Sync cuối ngày   │
│   • Tạo menu, giá                            │ hoặc có mạng     │
│   • Quản lý bàn, khu vực                     │                  │
│   • Báo cáo tổng hợp                         │                  │
│   • Quản lý nhân viên                        │                  │
│                                              │                  │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CỬA HÀNG (LAN/WIFI)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              POS THU NGÂN (CCB Master)                   │   │
│   │                 Windows + Android                        │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │  • SQLite (Local DB) - Source of Truth trong cửa hàng   │   │
│   │  • Socket Server (WebSocket cho tất cả clients)         │   │
│   │  • UDP Broadcast (Discovery)                            │   │
│   │  • Print Queue (Quản lý lệnh in)                        │   │
│   │  • Thanh toán, in bill khách                            │   │
│   │  • Sync dữ liệu lên Cloud Server                        │   │
│   └────────────────────────┬────────────────────────────────┘   │
│                            │                                    │
│              WebSocket (Realtime trong LAN)                     │
│                            │                                    │
│   ┌────────────────────────┼────────────────────────────────┐   │
│   │                        │                                │   │
│   ▼                        ▼                                ▼   │
│ ┌──────────────┐    ┌────────────┐    ┌────────────────────┐   │
│ │ POS BẾP/BAR  │    │ Order App  │    │    Order App       │   │
│ │ (CCB Client) │    │ (NV 1)     │    │    (NV 2, 3...)    │   │
│ ├──────────────┤    │ Client Mode│    │    Client Mode     │   │
│ │ • Hiển thị   │    └────────────┘    └────────────────────┘   │
│ │   món chờ    │                                                │
│ │ • In tem bếp │                                                │
│ │ • Đánh dấu   │                                                │
│ │   hoàn thành │                                                │
│ └──────────────┘                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Mô hình quán nhỏ (Không có POS)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD/SERVER                            │
├─────────────────────────────────────────────────────────────────┤
│   ┌─────────────────┐         ┌─────────────────────────────┐   │
│   │   Web Dashboard │         │        REST API +           │   │
│   │   (Quản lý)     │────────►│        PostgreSQL           │   │
│   └─────────────────┘         └──────────────┬──────────────┘   │
│                                              │ Sync khi có mạng │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CỬA HÀNG                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │           ORDER APP (Standalone Mode)                    │   │
│   │              Android / iOS                               │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │  • SQLite Local (tự quản lý dữ liệu)                    │   │
│   │  • Tạo order, thanh toán ngay trên app                  │   │
│   │  • In bill qua Bluetooth (máy in mini)                  │   │
│   │  • Chốt ca, báo cáo                                     │   │
│   │  • Sync lên Cloud khi có mạng                           │   │
│   └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│                    ┌──────────────┐                             │
│                    │ Máy in mini  │                             │
│                    │ (Bluetooth)  │                             │
│                    └──────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Nguyên tắc thiết kế

### 1. Offline-First
- Mọi tính năng core phải hoạt động không cần internet
- CCB là **Source of Truth** trong cửa hàng
- Sync dữ liệu lên cloud khi có mạng

### 2. Single Source of Truth
- CCB giữ SQLite database làm nguồn dữ liệu chính
- Order App (Client Mode) không có database, chỉ lấy data từ CCB
- Tránh conflict bằng cách chỉ có 1 nơi ghi data

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

### Hardware tối thiểu cho CCB
- **RAM 4GB**: Cho ~30 connections đồng thời
- **RAM 2GB**: Chỉ nên dùng cho 10-15 connections
- **Storage**: Tối thiểu 1GB trống cho database

### Network
- WiFi/LAN cho kết nối nội bộ
- Internet cho sync lên cloud (không bắt buộc realtime)
