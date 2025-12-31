---
sidebar_position: 1
---

# Web Admin

Web Admin là ứng dụng dành cho **Super Admin** để quản lý toàn bộ hệ thống FNB POS.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Nền tảng | React/Next.js |
| Users | Super Admin, Support |
| Mục đích | Quản lý tất cả các quán, billing, hỗ trợ |

## Chức năng chính

### 1. Quản lý Stores (Quán)

- Tạo quán mới
- Xem danh sách tất cả quán
- Chỉnh sửa thông tin quán
- Khóa/mở khóa quán
- Xóa quán (soft delete)

### 2. Quản lý Owners

- Tạo tài khoản Owner cho từng quán
- Reset password
- Khóa/mở khóa tài khoản

### 3. Billing & Subscriptions

- Quản lý gói dịch vụ (Basic, Pro, Enterprise)
- Xem lịch sử thanh toán
- Gia hạn gói dịch vụ
- Xử lý các trường hợp quá hạn

### 4. Support

- Xem và xử lý tickets hỗ trợ
- Liên hệ với chủ quán
- Ghi chú xử lý sự cố

### 5. Analytics

- Thống kê số lượng quán
- Doanh thu theo thời gian
- Tỷ lệ tăng trưởng
- Các metrics quan trọng

## Phân quyền

| Role | Quyền |
|------|-------|
| Super Admin | Toàn quyền: tạo/sửa/xóa quán, billing, analytics |
| Support | Chỉ xem thông tin, xử lý tickets (không sửa dữ liệu) |

## Flow tạo quán mới

```
Super Admin đăng nhập
        │
        ▼
Vào menu "Stores" → "Tạo mới"
        │
        ▼
Nhập thông tin:
├── Tên quán
├── Địa chỉ
├── SĐT
├── Email owner
├── Chọn gói dịch vụ
        │
        ▼
Bấm "Tạo quán"
        │
        ▼
Hệ thống tự động:
├── Tạo store_id (UUID)
├── Tạo tài khoản Owner
├── Gửi email thông tin đăng nhập
        │
        ▼
Hiển thị thông tin quán mới tạo
```

## Màn hình chính

### Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD                                           [Admin ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Tổng quán   │  │ Quán active │  │ Doanh thu   │              │
│  │    156      │  │    142      │  │  2.5 tỷ     │              │
│  │   +12%      │  │   +8%       │  │   +15%      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Biểu đồ tăng trưởng                                      │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Quán mới đăng ký gần đây:                                      │
│  • Quán A - 2 giờ trước                                         │
│  • Quán B - 5 giờ trước                                         │
│  • Quán C - 1 ngày trước                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quản lý Stores

```
┌─────────────────────────────────────────────────────────────────┐
│  STORES                                    [+ Tạo quán mới]     │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Tìm kiếm...                    [Lọc: Tất cả ▼]              │
├─────────────────────────────────────────────────────────────────┤
│  │ Tên quán      │ Owner          │ Gói    │ Trạng thái │      │
│  ├───────────────┼────────────────┼────────┼────────────┼──────┤
│  │ Café ABC      │ nguyen@...     │ Pro    │ ● Active   │ ⋮    │
│  │ Nhà hàng XYZ  │ tran@...       │ Enter. │ ● Active   │ ⋮    │
│  │ Trà sữa 123   │ le@...         │ Basic  │ ○ Expired  │ ⋮    │
│  └───────────────┴────────────────┴────────┴────────────┴──────┘
│                                                                 │
│  Hiển thị 1-10 của 156 quán                    [< 1 2 3 ... >]  │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/stores` | Danh sách quán |
| POST | `/admin/stores` | Tạo quán mới |
| GET | `/admin/stores/:id` | Chi tiết quán |
| PUT | `/admin/stores/:id` | Cập nhật quán |
| DELETE | `/admin/stores/:id` | Xóa quán |
| POST | `/admin/stores/:id/suspend` | Khóa quán |
| POST | `/admin/stores/:id/activate` | Mở khóa quán |
| GET | `/admin/owners` | Danh sách owners |
| POST | `/admin/owners` | Tạo owner |
| GET | `/admin/billing` | Lịch sử billing |
| GET | `/admin/analytics` | Thống kê |

## Bảo mật

- Xác thực bằng JWT token
- Session timeout sau 30 phút không hoạt động
- 2FA cho Super Admin
- Audit log cho mọi thao tác quan trọng
