---
sidebar_position: 2
---

# Web Dashboard

Web Dashboard là ứng dụng dành cho **Chủ quán (Owner)** để quản lý 1 quán cụ thể.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Nền tảng | React/Next.js |
| Users | Owner, Manager |
| Mục đích | Quản lý menu, bàn, nhân viên, xem báo cáo |

## Đăng nhập

Owner đăng nhập bằng tài khoản được Web Admin cấp:

```
1. Nhận email từ Web Admin chứa:
   - Link đăng nhập
   - Email/Username
   - Password tạm

2. Đăng nhập lần đầu → Bắt buộc đổi password

3. Bắt đầu thiết lập quán
```

## Chức năng chính

### 1. Dashboard

- Doanh thu hôm nay/tuần/tháng
- Số đơn hàng
- Món bán chạy
- Biểu đồ theo thời gian

### 2. Quản lý Menu

#### Danh mục
- Tạo/sửa/xóa danh mục
- Sắp xếp thứ tự
- Ẩn/hiện danh mục

#### Sản phẩm
- Tạo/sửa/xóa sản phẩm
- Đặt giá
- Upload hình ảnh
- Đánh dấu hết hàng
- Gắn vào danh mục

### 3. Quản lý Bàn

#### Khu vực
- Tạo khu vực (Tầng 1, Tầng 2, Sân vườn...)
- Sắp xếp thứ tự

#### Bàn
- Tạo/sửa/xóa bàn
- Đặt sức chứa
- Gắn vào khu vực

### 4. Quản lý Nhân viên

- Tạo tài khoản nhân viên
- Đặt PIN code (đăng nhập nhanh trên POS)
- Phân quyền: Cashier, Staff, Kitchen
- Khóa/mở khóa tài khoản

### 5. Báo cáo

- Doanh thu theo ngày/tuần/tháng
- Doanh thu theo sản phẩm
- Doanh thu theo nhân viên
- Báo cáo ca làm việc
- Export Excel/PDF

### 6. Cài đặt

- Thông tin quán
- Cấu hình máy in
- Cấu hình thanh toán
- Thuế, phí dịch vụ

## Phân quyền

| Role | Quyền |
|------|-------|
| Owner | Toàn quyền |
| Manager | Quản lý menu, nhân viên, xem báo cáo (không xóa quán, không xem billing) |

## Màn hình chính

### Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  ☕ CAFÉ ABC                                        [Owner ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Hôm nay: 15/01/2024                                            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Doanh thu   │  │ Số đơn      │  │ TB/đơn      │              │
│  │ 5,250,000đ  │  │    45       │  │  116,667đ   │              │
│  │   +23%      │  │   +15%      │  │   +7%       │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  Top 5 món bán chạy:                                            │
│  1. Cà phê sữa đá (52)                                          │
│  2. Trà đào (38)                                                │
│  3. Bánh mì (25)                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quản lý Menu

```
┌─────────────────────────────────────────────────────────────────┐
│  MENU                                      [+ Thêm sản phẩm]    │
├─────────────────────────────────────────────────────────────────┤
│  Danh mục:  [Tất cả ▼]        🔍 Tìm kiếm...                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ [Hình]  │  │ [Hình]  │  │ [Hình]  │  │ [Hình]  │            │
│  │ Cà phê  │  │ Cà phê  │  │ Trà đào │  │ Trà sữa │            │
│  │ sữa đá  │  │ đen     │  │         │  │         │            │
│  │ 29,000đ │  │ 25,000đ │  │ 35,000đ │  │ 32,000đ │            │
│  │ [Sửa]   │  │ [Sửa]   │  │ [Sửa]   │  │ [Sửa]   │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quản lý Bàn

```
┌─────────────────────────────────────────────────────────────────┐
│  QUẢN LÝ BÀN                                  [+ Thêm bàn]      │
├─────────────────────────────────────────────────────────────────┤
│  Khu vực: [Tầng 1 ▼]                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐          │
│  │  1  │  │  2  │  │  3  │  │  4  │  │  5  │  │  6  │          │
│  │ 4ng │  │ 4ng │  │ 2ng │  │ 6ng │  │ 4ng │  │ 4ng │          │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘          │
│                                                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐                                      │
│  │  7  │  │  8  │  │  9  │                                      │
│  │ 4ng │  │ 4ng │  │ 8ng │                                      │
│  └─────┘  └─────┘  └─────┘                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Sync với POS

Khi thay đổi trên Dashboard:

```
Owner thay đổi giá sản phẩm
        │
        ▼
Lưu vào PostgreSQL (Server)
        │
        ▼
Đánh dấu có thay đổi mới
        │
        ▼
CCB kiểm tra định kỳ hoặc nhận notification
        │
        ▼
CCB tải về thay đổi mới
        │
        ▼
Cập nhật SQLite local
        │
        ▼
Broadcast đến tất cả Order App
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/dashboard/stats` | Thống kê tổng quan |
| GET | `/categories` | Danh sách danh mục |
| POST | `/categories` | Tạo danh mục |
| GET | `/products` | Danh sách sản phẩm |
| POST | `/products` | Tạo sản phẩm |
| GET | `/areas` | Danh sách khu vực |
| GET | `/tables` | Danh sách bàn |
| GET | `/staff` | Danh sách nhân viên |
| GET | `/reports/revenue` | Báo cáo doanh thu |
| GET | `/settings` | Cấu hình quán |
