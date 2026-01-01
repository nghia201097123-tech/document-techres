---
sidebar_position: 1
slug: /
---

# Giới thiệu FNB POS System

Chào mừng bạn đến với tài liệu kỹ thuật của **Hệ thống POS F&B Offline-First** - giải pháp quản lý bán hàng toàn diện cho ngành F&B.

## Tổng quan

FNB POS System là hệ thống bán hàng được thiết kế với cơ chế **Offline-First**, hỗ trợ **3 mô hình kinh doanh** và cấu trúc phân cấp **Công ty → Thương hiệu → Chi nhánh**.

### Cấu trúc phân cấp

```
CÔNG TY (Company)
    │
    ├── THƯƠNG HIỆU 1 (Brand)
    │       │
    │       ├── Chi nhánh 1.1 (Branch)
    │       ├── Chi nhánh 1.2 (Branch)
    │       └── Chi nhánh 1.3 (Branch)
    │
    └── THƯƠNG HIỆU 2 (Brand)
            │
            ├── Chi nhánh 2.1 (Branch)
            └── Chi nhánh 2.2 (Branch)
```

### 3 Mô hình kinh doanh

| Mô hình | Đối tượng | Thiết bị | Mô tả |
|---------|-----------|----------|-------|
| **Mô hình 1: Order Only** | Quán rất nhỏ, 1 người | Chỉ điện thoại (Order App) | App Order chạy độc lập, có SQLite, tự thanh toán, in Bluetooth |
| **Mô hình 2: CCB Only** | Quán nhỏ, có quầy thu ngân | Chỉ máy POS (CCB App) | App CCB chạy độc lập, có SQLite, thu ngân tự order và thanh toán |
| **Mô hình 3: Full System** | Quán lớn, nhiều nhân viên | Order + CCB + Local Server | Server chạy trên Windows làm trung tâm, CCB và Order kết nối vào |

### Gói dịch vụ (Packages)

| Gói | Kết nối tối đa | Phù hợp |
|-----|----------------|---------|
| **Basic** | 3 connections | Quán nhỏ, 1-2 người |
| **Standard** | 10 connections | Quán vừa, 3-5 người |
| **Premium** | 30 connections | Quán lớn, nhiều nhân viên |
| **Enterprise** | Unlimited | Chuỗi, franchise |

## Các thành phần hệ thống

| Thành phần | Nền tảng | Vai trò |
|------------|----------|---------|
| **Web Admin** | React/Next.js | Super Admin - Quản lý Công ty, Thương hiệu, Gói dịch vụ, Hạng mục thu/chi |
| **Web Dashboard** | React/Next.js | Chủ quán - Quản lý Chi nhánh, menu, bàn, nhân viên, xem báo cáo |
| **Local Server** | .NET trên Windows | API Server local cho mô hình Full System |
| **CCB App (Thu ngân)** | Kotlin/Android hoặc .NET/Windows | Thu ngân, thanh toán, in bill |
| **CCB App (Bếp/Bar)** | Kotlin/Android hoặc .NET/Windows | Hiển thị món, in tem, đánh dấu hoàn thành |
| **Order App** | Kotlin/Android | Nhân viên order món |
| **Customer App** | Kotlin hoặc Web | Khách hàng xem điểm, lịch sử |

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEB ADMIN (Super Admin)                    │
│                    Quản lý toàn bộ hệ thống                     │
├─────────────────────────────────────────────────────────────────┤
│  • Quản lý Công ty (Companies)                                  │
│  • Quản lý Thương hiệu (Brands)                                 │
│  • Quản lý Gói App Food (Packages)                              │
│  • Quản lý Hạng mục Thu/Chi (Transaction Categories)            │
│  • Tạo tài khoản Owner                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Tạo công ty + cấp tài khoản
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WEB DASHBOARD (Chủ quán/Owner)                │
│                     Quản lý Công ty của mình                    │
├─────────────────────────────────────────────────────────────────┤
│  • Tạo/quản lý Thương hiệu                                      │
│  • Tạo/quản lý Chi nhánh                                        │
│  • Xây dựng menu, giá, danh mục                                 │
│  • Quản lý bàn, khu vực                                         │
│  • Tạo tài khoản nhân viên (thu ngân, phục vụ)                  │
│  • Xem báo cáo doanh thu, thống kê                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Sync data xuống thiết bị
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CHI NHÁNH (Offline-First)                     │
│         Chọn 1 trong 3 mô hình phù hợp quy mô                   │
└─────────────────────────────────────────────────────────────────┘
```

## Phân quyền hệ thống

| Hệ thống | Role | Quyền |
|----------|------|-------|
| **Web Admin** | Super Admin | Toàn quyền quản lý hệ thống |
| **Web Admin** | Support | Hỗ trợ khách hàng, xem thông tin (không sửa) |
| **Web Dashboard** | Owner | Toàn quyền với chi nhánh của mình |
| **Web Dashboard** | Manager | Quản lý theo quyền được gán |
| **CCB App** | Cashier | Thu ngân, thanh toán, chốt ca |
| **Order App** | Staff | Order món, phục vụ, xem trạng thái |

## Phạm vi quản lý dữ liệu

| Cấp | Dữ liệu quản lý |
|-----|-----------------|
| **Công ty** | Bộ phận (có cấp bậc cha-con), Thiết lập công ty |
| **Thương hiệu** | Món ăn, Danh mục, Đơn vị, Ghi chú món, Lý do hủy, Coupon |
| **Chi nhánh** | Nhân viên, Khu vực, Bàn, Bếp, Gán món-bếp, Món tăng giá, Ca, Đơn hàng, HĐĐT |

## Tổng hợp tính năng hệ thống

| Module | Web Admin | Web Dashboard | CCB App | Order App |
|--------|-----------|---------------|---------|-----------|
| Quản lý Công ty | ✅ | ❌ | ❌ | ❌ |
| Quản lý Thương hiệu | ✅ | Thiết lập | ❌ | ❌ |
| Quản lý Chi nhánh | ✅ | Thiết lập | ❌ | ❌ |
| Quản lý Quyền | ✅ | Gán quyền | ❌ | ❌ |
| Quản lý Gói | ✅ | ❌ | ❌ | ❌ |
| Quản lý Nhân viên | ❌ | ✅ | ❌ | ❌ |
| Quản lý Menu | ❌ | ✅ | Xem | Xem |
| Quản lý Bàn | ❌ | ✅ | Xem | Xem |
| Quản lý Bếp | ❌ | ✅ | Xem | ❌ |
| Quản lý Ca | ❌ | Xem | ✅ | ❌ |
| Quản lý HĐĐT | ❌ | ✅ | Xuất | ❌ |
| Order | ❌ | ❌ | ✅ | ✅ |
| Thanh toán | ❌ | ❌ | ✅ | ✅* |
| Báo cáo | Hệ thống | Chi nhánh | Ca | ❌ |

> *Thanh toán trên Order App chỉ có ở Mô hình 1 (Order Only)

## Tính năng chính

### Offline-First
- Mọi tính năng core hoạt động không cần internet
- Tự động đồng bộ khi có mạng
- Xử lý conflict thông minh

### Cấu trúc phân cấp
- Công ty có thể có nhiều Thương hiệu
- Mỗi Thương hiệu có thể có nhiều Chi nhánh
- Quản lý tập trung, báo cáo theo cấp

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

### Quản lý tập trung
- Web Admin quản lý tất cả Công ty
- Web Dashboard cho từng chủ quán
- Báo cáo doanh thu realtime

## Bắt đầu nhanh

1. **[Tổng quan kiến trúc](/docs/architecture/overview)** - Hiểu cách hệ thống hoạt động
2. **[3 Mô hình kinh doanh](/docs/architecture/business-models)** - Chọn mô hình phù hợp
3. **[Hướng dẫn cài đặt](/docs/guides/getting-started)** - Thiết lập môi trường phát triển
4. **[API Reference](/docs/api/overview)** - Tài liệu API chi tiết

## Công nghệ sử dụng

| Thành phần | Công nghệ | Nền tảng |
|------------|-----------|----------|
| **Order App** | Kotlin (Native Android) | Android |
| **CCB App (Android)** | Kotlin (Native Android) | Android |
| **CCB App (Windows)** | .NET (WPF/WinForms) | Windows |
| **Local Server** | .NET (ASP.NET Core) | Windows |
| **Web Admin** | React/Next.js | Web |
| **Web Dashboard** | React/Next.js | Web |
| **Cloud Server** | .NET (ASP.NET Core) | Cloud |
| **Database Server** | PostgreSQL | Cloud |
| **Local Database** | SQLite | Local |
| **WebSocket** | SignalR | All |
| **Print** | ESC/POS Protocol | All |
