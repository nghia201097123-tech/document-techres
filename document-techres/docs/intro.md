---
sidebar_position: 1
slug: /
---

# Giới thiệu FNB POS System

Chào mừng bạn đến với tài liệu kỹ thuật của **Hệ thống POS F&B Offline-First** - giải pháp quản lý bán hàng toàn diện cho ngành F&B theo mô hình **SaaS Multi-Tenant**.

## Tổng quan

FNB POS System là hệ thống bán hàng được thiết kế với cơ chế **Offline-First**, hỗ trợ **3 mô hình kinh doanh** và cấu trúc phân cấp **Tenant → Công ty → Thương hiệu → Chi nhánh**.

## Mô hình SaaS Multi-Tenant

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SAAS PLATFORM                                │
│                    (Single Database Instance)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐             │
│   │  TENANT A   │   │  TENANT B   │   │  TENANT C   │   ...       │
│   │  (Công ty A)│   │  (Công ty B)│   │  (Công ty C)│             │
│   │             │   │             │   │             │             │
│   │ tenant_id:  │   │ tenant_id:  │   │ tenant_id:  │             │
│   │ [mã cty A]  │   │ [mã cty B]  │   │ [mã cty C]  │             │
│   └─────────────┘   └─────────────┘   └─────────────┘             │
│                                                                     │
│   Đặc điểm:                                                        │
│   • Shared Database (cùng database, phân biệt bằng tenant_id)      │
│   • Shared Application (cùng codebase, cùng infrastructure)        │
│   • Data Isolation (dữ liệu được cô lập theo tenant)              │
│   • Scalable (dễ mở rộng khi thêm tenant mới)                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

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

**Lưu ý quan trọng:**
- Mỗi Tenant = 1 Công ty (quan hệ 1:1)
- `tenant_id` = `company.code` (mã viết tắt công ty)
- Tất cả dữ liệu đều có `tenant_id` để phân biệt

## Cơ chế Tenant ID

| Nguyên tắc | Mô tả |
|------------|-------|
| **Tenant = Company** | Mỗi tenant là 1 công ty, `tenant_id` = `company.code` |
| **Data Isolation** | Mọi query đều có điều kiện `WHERE tenant_id = ?` |
| **Row-Level Security** | PostgreSQL RLS đảm bảo không truy cập chéo tenant |
| **Tenant Context** | Mọi request đều phải xác định tenant từ đầu |

### Cách xác định Tenant

| Nguồn | Cách lấy tenant_id | Mô tả |
|-------|-------------------|-------|
| **Web Dashboard Login** | Input từ user | Nhập mã công ty ở màn hình login |
| **API Request** | Header `X-Tenant-ID` | `X-Tenant-ID: [mã công ty]` |
| **POS/Order App** | Lưu local sau khi login | Stored trong SQLite |
| **Subdomain** (tùy chọn) | Parse từ URL | `[tenant].pos.vn` → `[tenant]` |

## 3 Mô hình kinh doanh

| Mô hình | Đối tượng | Thiết bị | Mô tả |
|---------|-----------|----------|-------|
| **Mô hình 1: Order Only** | Quán rất nhỏ, 1 người | Chỉ điện thoại (Order App) | App Order chạy độc lập, có SQLite, tự thanh toán, in Bluetooth |
| **Mô hình 2: CCB Only** | Quán nhỏ, có quầy thu ngân | Chỉ máy POS (CCB App) | App CCB chạy độc lập, có SQLite, thu ngân tự order và thanh toán |
| **Mô hình 3: Full System** | Quán lớn, nhiều nhân viên | Order + CCB + Local Server | Server chạy trên Windows làm trung tâm, CCB và Order kết nối vào |

## Gói dịch vụ (SaaS Subscription)

| Gói | Số cổng kết nối | Giá/tháng | Mô tả |
|-----|-----------------|-----------|-------|
| Basic | 3 | X VNĐ | 1 CCB + 2 Order App |
| Standard | 10 | Y VNĐ | 2 CCB + 8 Order App |
| Premium | 30 | Z VNĐ | 5 CCB + 25 Order App |
| Enterprise | Unlimited | Thỏa thuận | Không giới hạn |

## Các thành phần hệ thống

| Thành phần | Nền tảng | Vai trò |
|------------|----------|---------|
| **Web Admin** | React/Next.js | Super Admin - Quản lý tenant, công ty, gói dịch vụ, quyền |
| **Web Dashboard** | React/Next.js | Chủ quán - Quản lý nhân sự, menu, bàn, bếp, ca, HĐĐT |
| **API Admin** | NestJS | Backend API kết nối database PostgreSQL |
| **API Gateway** | NestJS | Proxy/routing, không kết nối database |
| **API Master Data** | NestJS | Đồng bộ dữ liệu master xuống CCB/Order App |
| **Local Server** | .NET trên Windows | API Server local cho mô hình Full System |
| **CCB App (Thu ngân)** | Kotlin/Android hoặc .NET/Windows | Thu ngân, thanh toán, in bill |
| **CCB App (Bếp/Bar)** | Kotlin/Android hoặc .NET/Windows | Hiển thị món, in tem, đánh dấu hoàn thành |
| **Order App** | Kotlin/Android | Nhân viên order món |
| **Customer App** | Kotlin hoặc Web | Khách hàng xem điểm, lịch sử |

## Kiến trúc hệ thống

### Kết nối Database

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
│   LƯU Ý: Chỉ API Admin mới kết nối trực tiếp đến database          │
│          Web Admin và API Gateway gọi API, không kết nối database   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Phân tầng hệ thống (Multi-Tenant)

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEB ADMIN (Super Admin)                    │
│                 Quản lý toàn bộ SaaS Platform                   │
├─────────────────────────────────────────────────────────────────┤
│  • Quản lý Tenant/Công ty (tạo tenant mới = tạo công ty mới)   │
│  • Quản lý Thương hiệu (thêm, sửa, tắt/bật)                    │
│  • Quản lý Chi nhánh (thêm, sửa, tắt/bật)                      │
│  • Quản lý Hạng mục Thu/Chi                                     │
│  • Quản lý Gói App Food (số cổng kết nối, giá)                 │
│  • Quản lý Quyền (nhóm quyền, danh sách quyền)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Tạo tenant/công ty/thương hiệu/chi nhánh
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WEB DASHBOARD (Chủ quán/Owner)                │
│              Quản lý trong phạm vi Tenant của mình              │
├─────────────────────────────────────────────────────────────────┤
│  • Đăng nhập: Tenant ID (mã công ty) + Username + Password     │
│  • Chỉ xem/sửa dữ liệu thuộc tenant của mình                   │
│  • Quản lý Nhân sự (nhân viên, bộ phận, gán quyền)             │
│  • Xây dựng dữ liệu bán hàng (món, danh mục, bàn, coupon...)   │
│  • Xây dựng dữ liệu bếp (bếp, gán món vào bếp)                 │
│  • Quản lý Ca thu ngân, Đơn hàng                                │
│  • Quản lý Hóa đơn điện tử (7 đối tác)                         │
│  • Thiết lập Công ty/Thương hiệu/Chi nhánh                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Sync data xuống thiết bị (cùng tenant)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CỬA HÀNG (Offline-First)                      │
│         Chọn 1 trong 3 mô hình phù hợp quy mô                   │
└─────────────────────────────────────────────────────────────────┘
```

## Phân quyền hệ thống (Multi-Tenant)

| Hệ thống | Role | Phạm vi | Quyền |
|----------|------|---------|-------|
| **Web Admin** | Super Admin | Toàn platform | Quản lý tất cả tenant, công ty, gói dịch vụ |
| **Web Admin** | Support | Toàn platform | Hỗ trợ khách hàng, xem thông tin (không sửa) |
| **Web Dashboard** | Owner | Trong tenant | Toàn quyền với tenant của mình |
| **Web Dashboard** | Manager | Trong tenant | Quản lý theo quyền được gán |
| **CCB App** | Cashier | Trong tenant | Thu ngân, thanh toán, chốt ca |
| **Order App** | Staff | Trong tenant | Order món, phục vụ, xem trạng thái |

## Phạm vi quản lý dữ liệu (theo Tenant)

| Cấp | Dữ liệu quản lý | Tenant Scope |
|-----|-----------------|--------------|
| **Tenant/Công ty** | Bộ phận (có cấp bậc cha-con), Thiết lập công ty | Có tenant_id |
| **Thương hiệu** | Món ăn, Danh mục, Đơn vị, Ghi chú món, Lý do hủy, Coupon | Có tenant_id |
| **Chi nhánh** | Nhân viên, Khu vực, Bàn, Bếp, Gán món-bếp, Món tăng giá, Ca, Đơn hàng, HĐĐT | Có tenant_id |

## Tổng hợp tính năng hệ thống

| Module | Web Admin | Web Dashboard | CCB App | Order App |
|--------|-----------|---------------|---------|-----------|
| Quản lý Công ty | Wizard 3 bước | - | - | - |
| Quản lý Thương hiệu | CRUD | Thiết lập | - | - |
| Quản lý Chi nhánh | CRUD | Thiết lập | - | - |
| Quản lý Quyền | CRUD | Gán quyền | - | - |
| Quản lý Gói | CRUD | - | - | - |
| Quản lý Nhân viên | - | CRUD | - | - |
| Quản lý Menu | - | CRUD | Xem | Xem |
| Quản lý Bàn | - | CRUD | Xem | Xem |
| Quản lý Bếp | - | CRUD | Xem | - |
| Quản lý Ca | - | Xem | CRUD | - |
| Quản lý HĐĐT | - | CRUD | Xuất | - |
| Order | - | - | CRUD | CRUD |
| Thanh toán | - | - | CRUD | CRUD* |
| Báo cáo | Hệ thống | Chi nhánh | Ca | - |

> *Thanh toán trên Order App chỉ có ở Mô hình 1 (Order Only)

## Flow tạo Tenant mới (Wizard 3 bước bắt buộc)

```
Super Admin đăng nhập Web Admin
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│              TẠO CÔNG TY MỚI - WIZARD 3 BƯỚC BẮT BUỘC              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   BƯỚC 1: THÔNG TIN CÔNG TY                                        │
│   ├── Tên công ty: [Nhập tên công ty]                              │
│   ├── Tenant ID (Mã công ty): [Nhập mã công ty]                    │
│   ├── Logo công ty: [Upload]                                       │
│   ├── MST, địa chỉ, SĐT, email...                                  │
│   └── Gói dịch vụ: [Chọn gói]                                      │
│                        │                                            │
│                        ▼                                            │
│   BƯỚC 2: THƯƠNG HIỆU ĐẦU TIÊN (Bắt buộc)                         │
│   ├── Tên thương hiệu: [Nhập tên thương hiệu]                      │
│   ├── Logo thương hiệu: [Upload]                                   │
│   └── Mô tả: [Nhập mô tả]                                          │
│                        │                                            │
│                        ▼                                            │
│   BƯỚC 3: CHI NHÁNH ĐẦU TIÊN (Bắt buộc)                           │
│   ├── Tên chi nhánh: [Nhập tên chi nhánh]                          │
│   ├── Logo chi nhánh: [Mặc định logo thương hiệu]                  │
│   ├── Địa chỉ: [Nhập địa chỉ]                                      │
│   ├── Mô hình: [Chọn mô hình]                                      │
│   └── Tài khoản Owner tự động tạo                                  │
│                                                                     │
│   [Quay lại]                              [Hoàn tất & Tạo Tenant]  │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
Hệ thống tự động:
├── Tạo company với code = tenant_id
├── Tạo brand với tenant_id
├── Tạo branch với tenant_id
├── Tạo tài khoản Owner (username + password tạm)
└── Gửi email thông tin đăng nhập cho Owner
        │
        ▼
Owner nhận email → Đăng nhập Web Dashboard
├── Nhập: Tenant ID + Username + Password
├── Tenant context được set cho toàn bộ session
└── Sẵn sàng quản lý quán
```

**Lưu ý quan trọng:**
- **Không thể tạo công ty mà không có thương hiệu và chi nhánh**
- Wizard phải hoàn thành cả 3 bước mới lưu được
- Sau khi tạo xong, có thể thêm thương hiệu/chi nhánh khác từ menu riêng

## Tính năng chính

### Offline-First
- Mọi tính năng core hoạt động không cần internet
- Tự động đồng bộ khi có mạng
- Xử lý conflict thông minh

### Multi-Tenant SaaS
- Dữ liệu được phân tách hoàn toàn theo tenant
- Tenant context xác định từ đầu mọi request
- Row-Level Security bảo vệ dữ liệu

### Logo cho mọi cấp
- Công ty có logo riêng
- Thương hiệu có logo riêng
- Chi nhánh có logo (mặc định dùng logo thương hiệu)
- Nhân viên có avatar

### Gói dịch vụ linh hoạt
- Giới hạn kết nối theo gói
- Nâng cấp/hạ cấp dễ dàng
- Theo dõi lịch sử mua gói

### Đa thiết bị
- Hỗ trợ Android và Windows
- Kết nối qua mạng LAN/WiFi
- Auto-discovery thiết bị (UDP Broadcast)

### Hệ thống in ấn
- In bill, tem bếp/bar
- Hỗ trợ Bluetooth, USB, WiFi/LAN
- Print Queue đảm bảo không miss lệnh in

## Bắt đầu nhanh

1. **[Tổng quan kiến trúc](/docs/architecture/overview)** - Hiểu cách hệ thống hoạt động
2. **[3 Mô hình kinh doanh](/docs/architecture/business-models)** - Chọn mô hình phù hợp
3. **[Multi-Tenant Architecture](/docs/architecture/multi-tenant)** - Hiểu cơ chế tenant
4. **[Hướng dẫn cài đặt](/docs/guides/getting-started)** - Thiết lập môi trường phát triển
5. **[API Reference](/docs/api/overview)** - Tài liệu API chi tiết

## Công nghệ sử dụng

| Thành phần | Công nghệ | Nền tảng |
|------------|-----------|----------|
| **Order App** | Kotlin (Native Android) | Android |
| **CCB App (Android)** | Kotlin + Jetpack Compose + Hilt + Room | Android |
| **CCB App (Windows)** | .NET (WPF/WinForms) | Windows |
| **Local Server** | .NET (ASP.NET Core) | Windows |
| **Web Admin** | React/Next.js | Web |
| **Web Dashboard** | React/Next.js | Web |
| **API Admin** | NestJS + TypeORM | Cloud |
| **API Gateway** | NestJS | Cloud |
| **API Master Data** | NestJS + TypeORM + JWT | Cloud |
| **Cloud Server** | .NET (ASP.NET Core) | Cloud |
| **Database Server** | PostgreSQL | Cloud |
| **Local Database** | SQLite (Room) | Local |
| **WebSocket** | SignalR | All |
| **Print** | ESC/POS Protocol | All |
