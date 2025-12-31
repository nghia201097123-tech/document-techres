---
sidebar_position: 4
---

# Order App

Order App là ứng dụng cho nhân viên phục vụ, hoạt động ở 2 chế độ: **Standalone** (quán nhỏ) và **Client** (quán lớn).

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Nền tảng | React Native (Android + iOS) |
| Users | Nhân viên phục vụ |
| Mục đích | Order món cho khách |

:::warning Quan trọng
Order App là **1 app duy nhất** với 2 chế độ, **KHÔNG tách thành 2 app riêng**.
:::

## Chế độ Standalone

### Khi nào sử dụng

- Quán nhỏ, 1-2 nhân viên
- Không có máy POS
- Quán cafe, trà sữa, xe đẩy

### Đặc điểm

| Đặc điểm | Giá trị |
|----------|---------|
| Database | Có SQLite local |
| Thanh toán | Trực tiếp trên app |
| In ấn | Bluetooth |
| Sync | Trực tiếp lên Cloud |

### Chức năng

- ✅ Quản lý menu, bàn trực tiếp trên app
- ✅ Tạo order, thanh toán ngay trên app
- ✅ In bill qua Bluetooth (máy in mini)
- ✅ Chốt ca, xem báo cáo
- ✅ Sync lên Cloud khi có mạng

### Giao diện

```
┌─────────────────────────────────┐
│  ORDER APP (Standalone)         │
│  ☕ Quán ABC                     │
├─────────────────────────────────┤
│                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │  1  │ │  2  │ │  3  │       │
│  │     │ │ 🔴  │ │     │       │
│  └─────┘ └─────┘ └─────┘       │
│                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │  4  │ │  5  │ │  6  │       │
│  │     │ │ 🔴  │ │     │       │
│  └─────┘ └─────┘ └─────┘       │
│                                 │
├─────────────────────────────────┤
│ [Bàn] [Menu] [Đơn] [Báo cáo]   │
└─────────────────────────────────┘
```

---

## Chế độ Client

### Khi nào sử dụng

- Quán lớn, nhiều nhân viên
- Có máy POS thu ngân
- Nhà hàng, quán ăn lớn

### Đặc điểm

| Đặc điểm | Giá trị |
|----------|---------|
| Database | **KHÔNG CÓ** - chỉ giữ state trong RAM |
| Thanh toán | Trên POS |
| In ấn | Qua POS |
| Sync | Qua POS |

### Chức năng

- ✅ Kết nối WebSocket đến POS Thu ngân
- ✅ Xem danh sách bàn và trạng thái
- ✅ Tạo order mới cho bàn
- ✅ Thêm/sửa/xóa món trong order
- ✅ Gọi thanh toán
- ✅ Chuyển bàn, gộp bàn
- ❌ Không thanh toán trực tiếp
- ❌ Không in bill
- ❌ Không xem báo cáo

### Giao diện

```
┌─────────────────────────────────┐
│  ORDER APP (Client)             │
│  🟢 Đã kết nối POS              │
├─────────────────────────────────┤
│                                 │
│  Tầng 1:                        │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │  1  │ │  2  │ │  3  │       │
│  │     │ │ 🔴  │ │     │       │
│  └─────┘ └─────┘ └─────┘       │
│                                 │
│  Tầng 2:                        │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │  4  │ │  5  │ │  6  │       │
│  │     │ │ 🔴  │ │ 🟡  │       │
│  └─────┘ └─────┘ └─────┘       │
│                                 │
├─────────────────────────────────┤
│ Chọn bàn để xem/tạo order      │
└─────────────────────────────────┘
```

---

## So sánh 2 chế độ

| Tính năng | Standalone | Client |
|-----------|------------|--------|
| Xem menu | ✅ Local DB | ✅ Từ POS |
| Tạo order | ✅ Lưu local | ✅ Gửi POS |
| Thanh toán | ✅ Trên app | ❌ Trên POS |
| In bill | ✅ Bluetooth | ❌ POS in |
| In bếp | ✅ Bluetooth | ❌ POS in |
| Báo cáo | ✅ Trên app | ❌ Trên POS |
| Chốt ca | ✅ Trên app | ❌ Trên POS |
| Quản lý menu | ✅ Trên app | ❌ Dashboard |
| Sync Cloud | ✅ Trực tiếp | ❌ Qua POS |

---

## Flow chọn chế độ

```
Mở app lần đầu
        │
        ▼
"Bạn sử dụng mô hình nào?"
        │
        ├── [Quán nhỏ - Tự quản lý]
        │   │
        │   ▼
        │   Standalone Mode
        │   │
        │   ▼
        │   Nhập thông tin quán
        │   │
        │   ▼
        │   Tạo DB local → Sử dụng
        │
        └── [Quán lớn - Có máy POS]
            │
            ▼
            Client Mode
            │
            ▼
            Tìm POS (UDP Discovery)
            │
            ▼
            Chọn POS → Kết nối → Sử dụng
```

---

## Flow order món (Client Mode)

```
Nhân viên mở app
        │
        ▼
Xem danh sách bàn (realtime từ POS)
        │
        ▼
Chọn bàn 5 (đang trống)
        │
        ▼
Hiển thị menu
        │
        ▼
Thêm món:
├── 2x Cà phê sữa
├── 1x Bánh mì
└── 1x Nước cam
        │
        ▼
Bấm "Xác nhận"
        │
        ▼
Gửi đến POS qua WebSocket
        │
        ▼
POS lưu vào SQLite
        │
        ▼
POS broadcast cập nhật
        │
        ▼
Tất cả Order App thấy Bàn 5 đã có khách
        │
        ▼
POS tự động in tem bếp
```

---

## Chuyển đổi chế độ

Khi quán phát triển và cần nâng cấp:

```
Đang dùng Standalone
        │
        ▼
Vào Settings → "Chuyển sang chế độ Client"
        │
        ▼
App tìm POS trong mạng
        │
        ▼
Chọn POS → Kết nối
        │
        ▼
Data cũ trên Standalone → Sync lên Cloud
        │
        ▼
POS tải data từ Cloud
        │
        ▼
Hoạt động như Client
```

---

## Xử lý mất kết nối (Client Mode)

```
Mất kết nối WebSocket
        │
        ▼
Hiển thị banner cảnh báo
"Mất kết nối với máy thu ngân"
        │
        ▼
Queue các action của user (nếu có)
        │
        ▼
Auto reconnect mỗi 3 giây
        │
        ▼
Kết nối lại thành công
        │
        ▼
Nhận full state mới từ POS
        │
        ▼
Replay queued actions
        │
        ▼
Ẩn banner cảnh báo
```

---

## Notifications

| Sự kiện | Notification |
|---------|--------------|
| Món sẵn sàng | "🍽️ Bàn 5: Cà phê sữa đã sẵn sàng" |
| Bàn yêu cầu thanh toán | "💳 Bàn 12 yêu cầu thanh toán" |
| Order mới từ NV khác | "📝 Bàn 3: Order mới được tạo" |
| Mất kết nối | "⚠️ Mất kết nối với POS" |
