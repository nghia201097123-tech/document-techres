---
sidebar_position: 5
---

# Customer App

Customer App là ứng dụng dành cho khách hàng, chỉ hoạt động khi có kết nối internet.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Nền tảng | React Native hoặc Web |
| Users | Khách hàng |
| Yêu cầu | **Online only** |

## Chức năng chính

### 1. Xem điểm tích lũy

- Số điểm hiện có
- Quy đổi điểm ra tiền
- Điểm sắp hết hạn

### 2. Lịch sử mua hàng

- Danh sách đơn hàng đã thanh toán
- Chi tiết từng đơn
- Lọc theo ngày, quán

### 3. QR Code sử dụng điểm

- Tạo QR để thu ngân scan
- QR có thời hạn 5 phút
- Hiển thị số điểm có thể dùng

### 4. Thông báo khuyến mãi

- Nhận push notification
- Danh sách khuyến mãi đang chạy
- Điều kiện áp dụng

## Giao diện

### Màn hình chính

```
┌─────────────────────────────────┐
│  FNB REWARDS                    │
│  Xin chào, Nguyễn Văn A        │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐│
│  │     ĐIỂM TÍCH LŨY           ││
│  │                             ││
│  │        1,250                ││
│  │        điểm                 ││
│  │                             ││
│  │   = 125,000đ giảm giá       ││
│  │                             ││
│  │     [TẠO QR DÙNG ĐIỂM]      ││
│  └─────────────────────────────┘│
│                                 │
│  Khuyến mãi hot:               │
│  🎉 Giảm 20% thứ 2 hàng tuần   │
│  🎂 Sinh nhật tặng 500 điểm    │
│                                 │
├─────────────────────────────────┤
│ [🏠 Home] [📋 Lịch sử] [👤 Tôi]│
└─────────────────────────────────┘
```

### QR Code

```
┌─────────────────────────────────┐
│  DÙNG ĐIỂM                      │
├─────────────────────────────────┤
│                                 │
│  Đưa mã này cho thu ngân:       │
│                                 │
│  ┌─────────────────────────────┐│
│  │                             ││
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓          ││
│  │      ▓          ▓          ││
│  │      ▓  QR CODE ▓          ││
│  │      ▓          ▓          ││
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓          ││
│  │                             ││
│  └─────────────────────────────┘│
│                                 │
│  Mã hết hạn sau: 4:32           │
│                                 │
│  Điểm có thể dùng: 1,250        │
│  Giá trị: 125,000đ              │
│                                 │
└─────────────────────────────────┘
```

## Flow sử dụng điểm

```
Khách mở Customer App
        │
        ▼
Bấm "Tạo QR dùng điểm"
        │
        ▼
App gọi API tạo QR code
        │
        ▼
Server tạo mã QR (có thời hạn 5 phút)
        │
        ▼
Khách đưa QR cho thu ngân
        │
        ▼
Thu ngân scan QR trên CCB
        │
        ▼
CCB gọi API verify + hold điểm
        │
        ▼
Áp dụng giảm giá vào đơn
        │
        ▼
Thanh toán thành công
        │
        ▼
Server trừ điểm chính thức
        │
        ▼
App cập nhật số điểm còn lại
```

## Tích điểm

Điểm được tích tự động khi khách thanh toán:

```
Khách thanh toán đơn 500,000đ
        │
        ▼
CCB gửi thông tin lên Server
        │
        ▼
Server tính điểm: 500,000 / 10,000 = 50 điểm
        │
        ▼
Cộng vào tài khoản khách
        │
        ▼
Gửi push notification
"Bạn vừa được cộng 50 điểm!"
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/customer/profile` | Thông tin khách hàng |
| GET | `/customer/points` | Số điểm hiện có |
| GET | `/customer/orders` | Lịch sử đơn hàng |
| POST | `/customer/qr-code` | Tạo QR dùng điểm |
| GET | `/customer/promotions` | Danh sách khuyến mãi |

## Đăng ký/Đăng nhập

### Đăng ký

1. Nhập số điện thoại
2. Nhận OTP qua SMS
3. Xác nhận OTP
4. Nhập tên (tùy chọn)
5. Hoàn thành

### Đăng nhập

1. Nhập số điện thoại
2. Nhận OTP
3. Xác nhận → Vào app

## Lưu ý

:::info Online only
Customer App **bắt buộc phải có internet** để hoạt động vì:
- Điểm được lưu trên server
- QR code cần verify realtime
- Lịch sử đồng bộ từ tất cả quán
:::

:::tip Tích hợp với POS
Khi khách không có app, thu ngân có thể:
1. Nhập SĐT khách vào CCB
2. Hệ thống tự tìm và tích điểm
3. Hoặc tạo tài khoản mới nếu chưa có
:::
