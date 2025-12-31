---
sidebar_position: 2
---

# Mô hình kinh doanh

Hệ thống FNB POS hỗ trợ **3 mô hình kinh doanh** phù hợp với các quy mô quán khác nhau.

## Tổng quan 3 mô hình

| Tiêu chí | Order Only | CCB Only | Full System |
|----------|------------|----------|-------------|
| **Quy mô** | 1 người | 1-3 người | 4+ người |
| **Thiết bị** | 1 điện thoại | 1 máy POS | Server + nhiều thiết bị |
| **Database** | SQLite trên điện thoại | SQLite trên POS | SQLite/SQL Server trên Server |
| **Kết nối** | Không cần LAN | Không cần LAN | Cần LAN/WiFi |
| **In ấn** | Bluetooth | USB/Bluetooth/LAN | Tập trung qua Server |
| **Chi phí** | Thấp | Trung bình | Cao |
| **Mở rộng** | Không | Hạn chế | Linh hoạt |

---

## Mô hình 1: Order Only (Quán rất nhỏ)

### Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD SERVER                            │
│                    (Sync khi có internet)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CỬA HÀNG                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              ORDER APP (Standalone Mode)                 │   │
│   │                   Kotlin / Android                       │   │
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

### Đặc điểm

- 1 người vừa order vừa thu ngân
- Không cần mạng LAN
- In qua Bluetooth
- **Phù hợp**: xe đẩy, quán vỉa hè, 1 người bán

### Tính năng Order App (Standalone)

| Tính năng | Có/Không | Mô tả |
|-----------|----------|-------|
| Xem/quản lý menu | ✅ | Local DB |
| Tạo order | ✅ | Lưu local |
| Thanh toán | ✅ | Trên app |
| In bill | ✅ | Bluetooth |
| In bếp | ✅ | Bluetooth |
| Báo cáo | ✅ | Trên app |
| Chốt ca | ✅ | Trên app |
| Sync Cloud | ✅ | Trực tiếp |

---

## Mô hình 2: CCB Only (Quán nhỏ có quầy)

### Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD SERVER                            │
│                    (Sync khi có internet)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CỬA HÀNG                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   CCB APP (Standalone)                   │   │
│   │           Kotlin/Android hoặc .NET/Windows               │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │  • SQLite Local (tự quản lý dữ liệu)                    │   │
│   │  • Thu ngân tự order và thanh toán                      │   │
│   │  • In bill qua USB/Bluetooth/LAN                        │   │
│   │  • Chốt ca, báo cáo                                     │   │
│   │  • Sync lên Cloud khi có mạng                           │   │
│   └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│              ┌─────────────┼─────────────┐                      │
│              ▼             ▼             ▼                      │
│      ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│      │ Máy in Bill│ │ Máy in Bếp│ │ Máy in Bar │               │
│      └────────────┘ └────────────┘ └────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Đặc điểm

- Thu ngân ngồi 1 chỗ, khách đến quầy order
- Không cần app Order riêng
- Có thể có nhiều máy in (bếp, bar, bill)
- **Phù hợp**: quán cafe, trà sữa, fast food nhỏ

### Tính năng CCB App (Standalone)

| Tính năng | Có/Không | Mô tả |
|-----------|----------|-------|
| Xem/quản lý menu | ✅ | Local DB |
| Tạo order | ✅ | Trực tiếp |
| Thanh toán | ✅ | Trên app |
| In bill | ✅ | USB/Bluetooth/LAN |
| In bếp/bar | ✅ | USB/Bluetooth/LAN |
| Báo cáo | ✅ | Trên app |
| Chốt ca | ✅ | Trên app |
| Sync Cloud | ✅ | Trực tiếp |

---

## Mô hình 3: Full System (Quán lớn)

### Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD SERVER                            │
│                    (Sync khi có internet)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CỬA HÀNG (LAN/WIFI)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
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
│              WebSocket + HTTP (Realtime trong LAN)              │
│                            │                                    │
│   ┌────────────────────────┼────────────────────────────────┐   │
│   │                        │                                │   │
│   ▼                        ▼                                ▼   │
│ ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│ │  CCB App     │    │  CCB App     │    │    Order App     │   │
│ │  (Thu ngân)  │    │  (Bếp/Bar)   │    │    (Nhân viên)   │   │
│ │  .NET/Win    │    │  Kotlin/And  │    │    Kotlin/And    │   │
│ │  hoặc Kotlin │    │  hoặc .NET   │    │                  │   │
│ ├──────────────┤    ├──────────────┤    ├──────────────────┤   │
│ │ • Thanh toán │    │ • Xem món    │    │ • Xem bàn        │   │
│ │ • In bill    │    │ • In tem     │    │ • Gọi món        │   │
│ │ • Chốt ca    │    │ • Đánh dấu   │    │ • Chuyển bàn     │   │
│ │ • Báo cáo    │    │   hoàn thành │    │ • Gọi thanh toán │   │
│ └──────────────┘    └──────────────┘    └──────────────────┘   │
│                                                                 │
│          Tất cả kết nối vào LOCAL SERVER qua LAN                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Đặc điểm

- Local Server chạy trên máy Windows là trung tâm
- CCB và Order App đều là client, kết nối vào Server
- Không phụ thuộc internet
- **Phù hợp**: nhà hàng, quán lớn, nhiều nhân viên

### Vai trò Local Server

| Chức năng | Mô tả |
|-----------|-------|
| REST API | Cung cấp API cho tất cả client |
| WebSocket Server | SignalR cho realtime communication |
| Database | SQLite hoặc SQL Server LocalDB |
| Print Queue | Quản lý lệnh in tập trung |
| UDP Broadcast | Discovery cho các client |
| Cloud Sync | Đồng bộ dữ liệu lên cloud |

### Chế độ hoạt động của các App

| App | Chế độ | Database | Kết nối |
|-----|--------|----------|---------|
| CCB Thu ngân | Client | Không có DB | Kết nối Local Server |
| CCB Bếp/Bar | Client | Không có DB | Kết nối Local Server |
| Order App | Client | Không có DB | Kết nối Local Server |

### Tính năng Order App (Client Mode)

| Tính năng | Có/Không | Mô tả |
|-----------|----------|-------|
| Xem menu | ✅ | Từ Server |
| Tạo order | ✅ | Gửi Server |
| Thanh toán | ❌ | Trên CCB |
| In bill | ❌ | Server in |
| In bếp | ❌ | Server in |
| Báo cáo | ❌ | Trên CCB/Web |
| Chốt ca | ❌ | Trên CCB |
| Sync Cloud | ❌ | Qua Server |

---

## Chọn mô hình phù hợp

### Khi nào chọn Order Only?

- Quán 1 người (chủ tự bán)
- Không có quầy thu ngân cố định
- Di động nhiều (xe đẩy, food truck)
- Ngân sách hạn chế

### Khi nào chọn CCB Only?

- Quán có quầy thu ngân
- 1-3 nhân viên
- Khách đến quầy order
- Không cần nhân viên phục vụ bàn

### Khi nào chọn Full System?

- Quán lớn, nhiều bàn
- 4+ nhân viên
- Có nhân viên phục vụ bàn
- Cần bếp/bar riêng
- Cần quản lý tập trung

---

## Chuyển đổi giữa các mô hình

### Order Only → CCB Only

```
Quán phát triển, cần quầy thu ngân
        │
        ▼
Mua máy POS, cài CCB App (Standalone)
        │
        ▼
Order App sync lên Cloud → CCB tải về
        │
        ▼
Ngừng dùng Order App Standalone
```

### CCB Only → Full System

```
Quán phát triển, cần nhiều nhân viên
        │
        ▼
Cài Local Server trên Windows
        │
        ▼
CCB App chuyển sang Client Mode
        │
        ▼
Thêm Order App cho nhân viên
        │
        ▼
Thêm CCB App Bếp/Bar nếu cần
```

### Lưu ý khi chuyển đổi

1. **Backup dữ liệu** trước khi chuyển
2. **Sync đầy đủ** lên cloud
3. **Import dữ liệu** vào hệ thống mới
4. **Kiểm tra** menu, bàn, nhân viên đầy đủ
5. **Training** nhân viên sử dụng hệ thống mới

---

## Gói dịch vụ

| Gói | Mô hình | Số thiết bị | Tính năng | Giá |
|-----|---------|-------------|-----------|-----|
| **Basic** | Order Only | 1 | Standalone mode | Miễn phí |
| **Pro** | CCB Only | 1 POS + 3 máy in | Full features | 299k/tháng |
| **Enterprise** | Full System | Không giới hạn | Full + API access | Liên hệ |
