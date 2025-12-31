---
sidebar_position: 4
---

# Order App

Order App là ứng dụng cho nhân viên phục vụ, hoạt động ở 2 chế độ: **Standalone** (Mô hình Order Only) và **Client** (Mô hình Full System).

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Nền tảng** | Kotlin (Native Android) |
| **Users** | Nhân viên phục vụ |
| **Mục đích** | Order món cho khách |

:::info Quan trọng
Order App là **1 app duy nhất** với 2 chế độ, **KHÔNG tách thành 2 app riêng**.
:::

## Chế độ hoạt động

| Mô hình | Chế độ | Database | Kết nối |
|---------|--------|----------|---------|
| Order Only | Standalone | SQLite local | Trực tiếp Cloud |
| Full System | Client | Không có DB | Kết nối Local Server |

---

## Standalone Mode (Mô hình Order Only)

### Khi nào sử dụng

- Quán rất nhỏ, 1 người
- Không có máy POS
- Xe đẩy, quán vỉa hè

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
- ✅ In tem bếp qua Bluetooth
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

## Client Mode (Mô hình Full System)

### Khi nào sử dụng

- Quán lớn với Local Server
- Nhiều nhân viên
- Nhà hàng, quán ăn lớn

### Đặc điểm

| Đặc điểm | Giá trị |
|----------|---------|
| Database | **KHÔNG CÓ** - chỉ giữ state trong RAM |
| Thanh toán | Trên CCB |
| In ấn | Qua Local Server |
| Sync | Qua Local Server |

### Chức năng

- ✅ Kết nối WebSocket (SignalR) đến Local Server
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
│  🟢 Đã kết nối Server           │
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
| Xem menu | ✅ Local DB | ✅ Từ Server |
| Tạo order | ✅ Lưu local | ✅ Gửi Server |
| Thanh toán | ✅ Trên app | ❌ Trên CCB |
| In bill | ✅ Bluetooth | ❌ Server in |
| In bếp | ✅ Bluetooth | ❌ Server in |
| Báo cáo | ✅ Trên app | ❌ Trên CCB/Web |
| Chốt ca | ✅ Trên app | ❌ Trên CCB |
| Quản lý menu | ✅ Trên app | ❌ Dashboard |
| Sync Cloud | ✅ Trực tiếp | ❌ Qua Server |

---

## Cấu trúc Project (Kotlin)

```
order-app/
├── app/src/main/
│   ├── java/.../
│   │   ├── di/                # Dependency Injection (Hilt/Koin)
│   │   ├── data/
│   │   │   ├── local/         # SQLite, Room Database
│   │   │   ├── remote/        # API Client (Retrofit)
│   │   │   └── repository/
│   │   ├── domain/
│   │   │   ├── model/
│   │   │   └── usecase/
│   │   ├── presentation/
│   │   │   ├── screens/
│   │   │   └── viewmodel/
│   │   ├── mode/
│   │   │   ├── standalone/    # Chế độ Standalone (có DB)
│   │   │   └── client/        # Chế độ Client (kết nối Server)
│   │   ├── sync/              # Cloud sync service
│   │   ├── printer/           # Bluetooth printer service
│   │   └── websocket/         # SignalR client
│   └── res/
└── build.gradle.kts
```

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| Ngôn ngữ | Kotlin |
| UI | Jetpack Compose |
| Architecture | MVVM + Clean Architecture |
| DI | Hilt |
| Database | Room (SQLite) |
| Network | Retrofit + OkHttp |
| WebSocket | OkHttp WebSocket / SignalR |
| Bluetooth Print | android-bluetooth-library |
| State Management | StateFlow / LiveData |

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
        │   Nhập thông tin quán (hoặc scan QR)
        │   │
        │   ▼
        │   Tạo DB local → Sync từ Cloud → Sử dụng
        │
        └── [Quán lớn - Có Local Server]
            │
            ▼
            Client Mode
            │
            ▼
            Tìm Server (UDP Discovery)
            │
            ▼
            Chọn Server → Đăng nhập → Sử dụng
```

---

## Flow order món (Client Mode)

```
Nhân viên mở app
        │
        ▼
Xem danh sách bàn (realtime từ Server)
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
Gửi đến Server qua WebSocket
        │
        ▼
Server lưu vào SQLite
        │
        ▼
Server broadcast cập nhật
        │
        ▼
Tất cả Order App thấy Bàn 5 đã có khách
        │
        ▼
Server gửi lệnh in tem bếp
```

---

## Discovery (Tìm Local Server)

### UDP Broadcast

```
Local Server khởi động
     │
     ▼
Start UDP Broadcast (port 9999)
Gửi mỗi 2 giây: { type: "LOCAL_SERVER", name: "Quán ABC", ip: "192.168.1.100", port: 8080 }
     │
     ▼
Order App mở → Listen port 9999 → Nhận broadcast → Hiển thị danh sách
     │
     ▼
User chọn Server → Kết nối SignalR
```

### Phương án backup

- **QR Code:** Server hiển thị QR chứa IP, Order App scan
- **Nhập thủ công:** User nhập IP của Server

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
App tìm Server trong mạng
        │
        ▼
Chọn Server → Đăng nhập
        │
        ▼
Data cũ trên Standalone → Sync lên Cloud
        │
        ▼
Server tải data từ Cloud
        │
        ▼
Hoạt động như Client
```

---

## Xử lý mất kết nối (Client Mode)

```
Mất kết nối SignalR
        │
        ▼
Hiển thị banner cảnh báo
"Mất kết nối với Server"
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
Nhận full state mới từ Server
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
| Món sẵn sàng | "Bàn 5: Cà phê sữa đã sẵn sàng" |
| Bàn yêu cầu thanh toán | "Bàn 12 yêu cầu thanh toán" |
| Order mới từ NV khác | "Bàn 3: Order mới được tạo" |
| Mất kết nối | "Mất kết nối với Server" |

---

## Yêu cầu phần cứng

| Cấu hình | Tối thiểu | Khuyến nghị |
|----------|-----------|-------------|
| RAM | 2GB | 3GB |
| Storage | 500MB trống | 1GB trống |
| Android | 8.0+ | 11+ |
| Bluetooth | 4.0 (cho in ấn) | 5.0 |
