---
sidebar_position: 2
---

# Mô hình kinh doanh

Hệ thống hỗ trợ 2 mô hình kinh doanh khác nhau, phù hợp với quy mô của từng quán.

## Mô hình 1: Quán nhỏ

### Đặc điểm
- 1-2 nhân viên
- Quán cafe, trà sữa, xe đẩy
- Không gian nhỏ, không cần nhiều thiết bị

### Thiết bị sử dụng
- **Chỉ 1 điện thoại** chạy Order App ở chế độ **Standalone**
- Máy in Bluetooth mini (tùy chọn)

### Luồng hoạt động

```
Khách đến quán
      │
      ▼
Nhân viên mở Order App (Standalone Mode)
      │
      ▼
Chọn món, thêm vào order
      │
      ▼
Thanh toán ngay trên app
      │
      ▼
In bill (Bluetooth) hoặc không in
      │
      ▼
Tự làm món và phục vụ
```

### Tính năng Standalone Mode

| Tính năng | Có/Không |
|-----------|----------|
| Xem/quản lý menu | ✅ Local DB |
| Tạo order | ✅ Lưu local |
| Thanh toán | ✅ Trên app |
| In bill | ✅ Bluetooth |
| In bếp | ✅ Bluetooth |
| Báo cáo | ✅ Trên app |
| Chốt ca | ✅ Trên app |
| Quản lý menu | ✅ Trên app |
| Sync Cloud | ✅ Trực tiếp |

---

## Mô hình 2: Quán lớn

### Đặc điểm
- Nhiều nhân viên (3+)
- Nhà hàng, quán ăn, cafe lớn
- Có khu bếp/bar riêng

### Thiết bị sử dụng
- **POS Thu ngân (CCB Master)**: Windows hoặc Android tablet
- **Màn hình Bếp/Bar (CCB Client)**: Hiển thị món cần làm
- **Order App (Client Mode)**: Điện thoại cho nhân viên phục vụ
- Máy in bill (USB/LAN)
- Máy in tem bếp/bar (USB/LAN)

### Luồng hoạt động

```
Khách đến quán
      │
      ▼
Nhân viên A dùng Order App → Gọi món cho Bàn 5
      │
      ▼
Order gửi về CCB (POS Thu ngân) qua WebSocket
      │
      ▼
CCB lưu vào SQLite + broadcast đến tất cả clients
      │
      ├───────────────────────────────────┐
      ▼                                   ▼
Màn hình Bếp hiển thị món           Các Order App khác
+ In tem bếp tự động                thấy Bàn 5 đang sử dụng
      │
      ▼
Bếp làm xong → Bấm "Hoàn thành"
      │
      ▼
Order App của NV A hiện thông báo "Món X sẵn sàng"
      │
      ▼
NV A mang món ra → Khách dùng xong
      │
      ▼
Khách thanh toán tại quầy thu ngân (CCB)
```

### Tính năng Client Mode (Order App)

| Tính năng | Có/Không |
|-----------|----------|
| Xem menu | ✅ Từ POS |
| Tạo order | ✅ Gửi POS |
| Thanh toán | ❌ Trên POS |
| In bill | ❌ POS in |
| In bếp | ❌ POS in |
| Báo cáo | ❌ Trên POS |
| Chốt ca | ❌ Trên POS |
| Quản lý menu | ❌ Trên Web Dashboard |
| Sync Cloud | ❌ Qua POS |

---

## So sánh 2 mô hình

| Tiêu chí | Quán nhỏ | Quán lớn |
|----------|----------|----------|
| Thiết bị | 1 điện thoại | Nhiều thiết bị |
| Order App mode | Standalone | Client |
| Database | Trên điện thoại | Trên POS |
| Thanh toán | Trên điện thoại | Tại quầy thu ngân |
| Màn hình bếp | Không có | Có |
| Chi phí setup | Thấp | Cao hơn |
| Khả năng mở rộng | Hạn chế | Linh hoạt |

---

## Chuyển đổi giữa 2 mô hình

Khi quán nhỏ phát triển và cần nâng cấp:

```
Quán nhỏ dùng Standalone
        │
        ▼
Quán phát triển, mua POS
        │
        ▼
Vào Settings → "Chuyển sang chế độ Client"
        │
        ▼
App tìm POS → Kết nối → Hoạt động như Client
        │
        ▼
Data cũ trên Standalone → Sync lên Cloud → POS tải về
```

### Lưu ý khi chuyển đổi

1. **Backup dữ liệu** trước khi chuyển
2. **Sync đầy đủ** lên cloud từ Standalone
3. **POS tải về** dữ liệu từ cloud
4. **Kiểm tra** menu, bàn, nhân viên đầy đủ
5. **Training** nhân viên sử dụng hệ thống mới

---

## Gói dịch vụ

| Gói | Số thiết bị | Tính năng | Giá |
|-----|-------------|-----------|-----|
| **Basic** | 1 | Standalone mode | Miễn phí |
| **Pro** | 5 | Full features | 299k/tháng |
| **Enterprise** | Không giới hạn | Full + API access | Liên hệ |
