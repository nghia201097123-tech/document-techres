---
sidebar_position: 3
---

# CCB App (POS)

CCB App là ứng dụng POS đa năng, hoạt động ở 2 chế độ: **Thu ngân (Master)** và **Bếp/Bar (Client)**.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Nền tảng | React Native (Android + Windows) |
| Database | SQLite (chỉ ở chế độ Master) |
| Vai trò | Local API Server + Ứng dụng thu ngân |

## Chế độ Thu ngân (Master)

### Vai trò kép

1. **Ứng dụng thu ngân:** Giao diện cho nhân viên thu ngân thao tác
2. **Local API Server:** Cung cấp API cho Order App và POS Bếp/Bar

### Services chạy ngầm

```
┌─────────────────────────────────────────┐
│            CCB App (Master)              │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   SQLite    │  │  HTTP Server    │   │
│  │   Database  │  │  (REST API)     │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │  WebSocket  │  │  UDP Broadcast  │   │
│  │   Server    │  │  (Discovery)    │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Print Queue │  │  Cloud Sync     │   │
│  │  Service    │  │   Service       │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

### Chức năng chính

- Nhận và quản lý order từ Order App
- Thanh toán đơn hàng
- In bill cho khách
- Quản lý Print Queue (lệnh in cho bếp/bar)
- Chốt ca làm việc
- Xem báo cáo doanh thu
- Sync dữ liệu lên Cloud Server

### Giao diện Thu ngân

```
┌─────────────────────────────────────────────────────────────────┐
│  THU NGÂN - Café ABC                            NV: Nguyễn A    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────┐  ┌───────────────────────────┐ │
│  │ DANH SÁCH ĐƠN CHỜ           │  │ CHI TIẾT ĐƠN - BÀN 5      │ │
│  ├─────────────────────────────┤  ├───────────────────────────┤ │
│  │ ● Bàn 5  - 350,000đ    ◀   │  │ 2x Cà phê sữa   58,000đ  │ │
│  │ ○ Bàn 12 - 180,000đ        │  │ 1x Trà đào      35,000đ  │ │
│  │ ○ Bàn 3  - 420,000đ        │  │ 2x Bánh mì      50,000đ  │ │
│  │ ○ Bàn 8  - 95,000đ         │  │                           │ │
│  │                             │  ├───────────────────────────┤ │
│  │                             │  │ Tạm tính:       143,000đ │ │
│  │                             │  │ Giảm giá:             0đ │ │
│  │                             │  │ Tổng:           143,000đ │ │
│  │                             │  ├───────────────────────────┤ │
│  │                             │  │ [TIỀN MẶT] [CHUYỂN KHOẢN] │ │
│  │                             │  │      [THANH TOÁN]         │ │
│  └─────────────────────────────┘  └───────────────────────────┘ │
│                                                                 │
│  [Chốt ca]  [Báo cáo]  [Cài đặt]                   Ca: 08:00   │
└─────────────────────────────────────────────────────────────────┘
```

### Flow thanh toán

```
Đơn hàng được chọn
        │
        ▼
Kiểm tra chi tiết đơn
        │
        ▼
Áp dụng giảm giá (nếu có)
        │
        ├── Dùng điểm (cần online) ──┐
        │                             │
        ▼                             ▼
Chọn phương thức:             Gọi API hold điểm
├── Tiền mặt                         │
├── Chuyển khoản                     ▼
└── Thẻ                        Trừ vào tổng tiền
        │                             │
        ▼◀────────────────────────────┘
Bấm "Thanh toán"
        │
        ▼
Lưu order (status: completed)
        │
        ▼
In bill (tự động hoặc thủ công)
        │
        ▼
Cập nhật bàn (status: available)
        │
        ▼
Broadcast cập nhật đến Order App
```

---

## Chế độ Bếp/Bar (Client)

### Đặc điểm

- **Không có database** - chỉ nhận data qua WebSocket
- Kết nối đến CCB Master trong mạng LAN
- Hiển thị danh sách món cần làm

### Chức năng

- Hiển thị món cần làm theo thứ tự
- Phát âm thanh khi có món mới
- In tem bếp/bar
- Đánh dấu "Đang làm", "Hoàn thành"

### Giao diện

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÀN HÌNH BẾP                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ BÀN 5       │  │ BÀN 12      │  │ BÀN 3       │              │
│  │ 10:30 AM    │  │ 10:32 AM    │  │ 10:35 AM    │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ 2x Phở bò   │  │ 1x Cơm gà   │  │ 3x Bún chả  │              │
│  │ 1x Nem      │  │ 2x Gỏi cuốn │  │             │              │
│  │             │  │             │  │             │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ [ĐANG LÀM]  │  │  [BẮT ĐẦU]  │  │  [BẮT ĐẦU]  │              │
│  │ [HOÀN THÀNH]│  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  Tổng: 5 đơn chờ | 2 đang làm | Hôm nay: 45 đơn hoàn thành     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Trạng thái món

```
PENDING → PREPARING → READY → SERVED
   │          │         │        │
   │          │         │        └── Nhân viên đã mang ra
   │          │         └── Bếp làm xong
   │          └── Bếp đang làm
   └── Mới gọi, chờ bếp
```

---

## Discovery (Order App tìm CCB)

### UDP Broadcast

```
CCB App khởi động
     │
     ▼
Start UDP Broadcast (port 9999)
Gửi mỗi 2 giây: { type: "CCB_SERVER", name: "Quán ABC", ip: "192.168.1.100", port: 8080 }
     │
     ▼
Order App mở → Listen port 9999 → Nhận broadcast → Hiển thị danh sách CCB
     │
     ▼
User chọn CCB → Kết nối WebSocket
```

### Phương án backup

- **QR Code:** CCB hiển thị QR chứa IP, Order App scan
- **Nhập thủ công:** User nhập IP của CCB

---

## Yêu cầu phần cứng

| Cấu hình | Tối thiểu | Khuyến nghị |
|----------|-----------|-------------|
| RAM | 2GB (10-15 connections) | 4GB (30+ connections) |
| Storage | 1GB trống | 2GB trống |
| CPU | 4 cores | 8 cores |
| Network | WiFi/LAN | LAN có dây |

---

## Xử lý lỗi

### Mất kết nối internet

- Mọi tính năng offline vẫn hoạt động
- Hiện indicator "Offline mode"
- Queue sync data
- Tính năng cần online bị disable

### CCB crash/restart

- Order App tự động reconnect
- Data không mất (lưu trong SQLite)
- Print jobs pending được resume
