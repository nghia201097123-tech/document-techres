---
sidebar_position: 1
---

# Tổng quan kiến trúc

Hệ thống FNB POS được thiết kế theo kiến trúc **Offline-First** và mô hình **SaaS Multi-Tenant** với 3 mô hình triển khai phù hợp với các quy mô quán khác nhau.

## Kiến trúc tổng quan

### Kiến trúc kết nối Database

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KIẾN TRÚC KẾT NỐI                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐                                                  │
│   │  Web Admin  │────────┐                                         │
│   │  (Next.js)  │        │                                         │
│   │ NO DATABASE │        │                                         │
│   └─────────────┘        │                                         │
│                          │ HTTP API                                │
│   ┌─────────────┐        │     ┌─────────────┐   ┌───────────────┐│
│   │ API Gateway │────────┼────▶│  API Admin  │──▶│  PostgreSQL   ││
│   │  (NestJS)   │        │     │  (NestJS)   │   │   Database    ││
│   │ NO DATABASE │        │     │  DATABASE   │   │               ││
│   └─────────────┘        │     └─────────────┘   └───────────────┘│
│                          │                                         │
│   ┌─────────────┐        │                                         │
│   │Web Dashboard│────────┘                                         │
│   │  (Next.js)  │                                                  │
│   │ NO DATABASE │                                                  │
│   └─────────────┘                                                  │
│                                                                     │
│   ⚠️ LƯU Ý QUAN TRỌNG:                                              │
│   • Chỉ API Admin mới kết nối trực tiếp đến database PostgreSQL    │
│   • Web Admin và API Gateway KHÔNG kết nối database                 │
│   • Web Admin gọi API, API Gateway chỉ làm proxy/routing           │
│   • Tất cả dữ liệu trên Web Admin là dữ liệu thật từ database      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Luồng dữ liệu

```
┌─────────────┐     HTTP      ┌─────────────┐     HTTP      ┌─────────────┐
│  Web Admin  │ ────────────▶ │ API Gateway │ ────────────▶ │  API Admin  │
│  (Next.js)  │               │  (NestJS)   │               │  (NestJS)   │
│             │               │             │               │     │       │
│ • Hiển thị  │               │ • Routing   │               │     │ SQL   │
│ • Forms     │               │ • Auth      │               │     ▼       │
│ • State     │               │ • Rate Limit│               │ ┌─────────┐│
│             │               │             │               │ │PostgreSQL│
└─────────────┘               └─────────────┘               │ │ Database ││
                                                            │ └─────────┘│
                                                            └─────────────┘
```

### Phân tầng hệ thống (Multi-Tenant)

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEB ADMIN (Super Admin)                    │
│                 Quản lý toàn bộ SaaS Platform                   │
├─────────────────────────────────────────────────────────────────┤
│  • Quản lý Tenant/Công ty (tạo tenant mới = tạo công ty mới)   │
│  • Wizard 3 bước: Công ty → Thương hiệu → Chi nhánh            │
│  • Quản lý Gói App Food (số cổng kết nối, giá)                 │
│  • Quản lý Quyền (nhóm quyền, danh sách quyền)                 │
│  • Quản lý Hạng mục Thu/Chi                                     │
│  • Dữ liệu thật từ database qua API                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Tạo tenant/công ty/thương hiệu/chi nhánh
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WEB DASHBOARD (Chủ quán/Owner)                │
│                     Quản lý 1 tenant cụ thể                     │
├─────────────────────────────────────────────────────────────────┤
│  • Đăng nhập: Tenant ID + Username + Password                  │
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

## Multi-Tenant Architecture

Xem chi tiết tại [Multi-Tenant Architecture](/docs/architecture/multi-tenant).

### Cấu trúc phân cấp

```
TENANT (tenant_id) ← Cấp cao nhất, đại diện cho 1 khách hàng SaaS
    │
    └── CÔNG TY (Company)
            │
            ├── THƯƠNG HIỆU 1 (Brand)
            │       ├── Chi nhánh A (Branch)
            │       ├── Chi nhánh B
            │       └── Chi nhánh C
            │
            └── THƯƠNG HIỆU 2 (Brand)
                    ├── Chi nhánh D
                    └── Chi nhánh E
```

### Quy tắc Tenant ID

| Quy tắc | Mô tả |
|---------|-------|
| **Tenant = Company** | Mỗi tenant là 1 công ty, `tenant_id` = `company.code` |
| **Data Isolation** | Mọi query đều có điều kiện `WHERE tenant_id = ?` |
| **Row-Level Security** | PostgreSQL RLS đảm bảo không truy cập chéo tenant |
| **Tenant Context** | Mọi request đều phải xác định tenant từ đầu |

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

### 5. Multi-Tenant Data Isolation
- Mọi dữ liệu có `tenant_id`
- Row-Level Security trong PostgreSQL
- Không truy cập chéo tenant

## Phân quyền hệ thống

| Hệ thống | Role | Quyền |
|----------|------|-------|
| **Web Admin** | Super Admin | Quản lý tất cả tenant, tạo công ty mới |
| **Web Admin** | Support | Hỗ trợ khách hàng, xem thông tin (không sửa) |
| **Web Dashboard** | Owner | Toàn quyền với tenant của mình |
| **Web Dashboard** | Manager | Quản lý menu, nhân viên, xem báo cáo |
| **CCB App** | Cashier | Thu ngân, thanh toán, chốt ca |
| **Order App** | Staff | Order món, phục vụ, xem trạng thái |

## Flow tạo Tenant mới (Wizard 3 bước bắt buộc)

```
Super Admin đăng nhập Web Admin
        │
        ▼
Tạo Tenant mới - Wizard 3 bước:
│
├── BƯỚC 1: Thông tin Công ty
│   ├── Tên công ty, Mã công ty (Tenant ID)
│   ├── Logo công ty
│   ├── MST, địa chỉ, SĐT, email
│   └── Gói dịch vụ
│
├── BƯỚC 2: Thương hiệu đầu tiên (BẮT BUỘC)
│   ├── Tên, Mã thương hiệu
│   ├── Logo thương hiệu
│   └── Mô hình kinh doanh
│
└── BƯỚC 3: Chi nhánh đầu tiên (BẮT BUỘC)
    ├── Tên, Mã chi nhánh
    ├── Logo chi nhánh (mặc định dùng logo thương hiệu)
    ├── Địa chỉ, SĐT
    └── Mô hình sử dụng
        │
        ▼
Hệ thống tự động:
├── Tạo company với code = tenant_id
├── Tạo brand với tenant_id
├── Tạo branch với tenant_id
├── Tạo tài khoản Owner (username + password tạm)
└── Gửi email thông tin đăng nhập
        │
        ▼
Owner đăng nhập Web Dashboard → Sẵn sàng sử dụng
```

**Lưu ý quan trọng:**
- **Không thể tạo công ty mà không có thương hiệu và chi nhánh**
- Wizard phải hoàn thành cả 3 bước mới lưu được
- Tất cả thực hiện trong 1 transaction để đảm bảo tính toàn vẹn

## Logo cho mọi cấp

| Entity | Field | Mô tả |
|--------|-------|-------|
| **Company** | `logoUrl` | Logo công ty |
| **Brand** | `logoUrl` | Logo thương hiệu |
| **Branch** | `logoUrl` | Logo chi nhánh (mặc định dùng logo thương hiệu) |
| **Staff** | `avatarUrl` | Ảnh đại diện nhân viên |

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
