---
sidebar_position: 4
---

# Troubleshooting

Các vấn đề thường gặp và cách giải quyết.

## Order App không tìm thấy CCB

### Nguyên nhân

1. Không cùng mạng WiFi
2. Firewall chặn UDP port 9999
3. CCB chưa khởi động broadcast

### Giải pháp

```
1. Kiểm tra Order App và CCB cùng mạng WiFi
   - CCB: Settings → About → IP Address
   - Order App: Settings → Network Info

2. Restart CCB để khởi động lại broadcast service

3. Thử kết nối thủ công:
   - Order App: Settings → Manual Connect
   - Nhập IP của CCB
```

## Mất kết nối WebSocket

### Triệu chứng

- Order App hiện "Mất kết nối"
- Không nhận được cập nhật realtime

### Giải pháp

```
1. Kiểm tra CCB còn chạy không

2. Order App tự động reconnect sau 3 giây
   - Nếu không, pull to refresh

3. Nếu vẫn lỗi:
   - Restart Order App
   - Restart CCB
```

## Sync lên Cloud thất bại

### Triệu chứng

- Hiện "Pending sync: 100+ orders"
- Cảnh báo "Sync failed"

### Giải pháp

```
1. Kiểm tra kết nối internet

2. Xem logs:
   CCB → Settings → Logs → Sync Errors

3. Retry thủ công:
   CCB → Settings → Sync → Retry Failed

4. Nếu conflict:
   - Xem chi tiết conflict
   - Chọn "Keep Local" hoặc "Use Server"
```

## Máy in không hoạt động

### Triệu chứng

- Bấm in không có gì xảy ra
- Báo lỗi "Print failed"

### Giải pháp

**Bluetooth:**
```
1. Kiểm tra máy in đã bật và pair
2. Kiểm tra pin máy in
3. Restart Bluetooth trên device
4. Reconnect trong Settings → Printers
```

**USB:**
```
1. Kiểm tra cáp kết nối
2. Kiểm tra driver (Windows)
3. Restart CCB
```

**LAN:**
```
1. Ping IP máy in: ping 192.168.1.50
2. Kiểm tra máy in cùng VLAN
3. Kiểm tra firewall không chặn port 9100
```

## Order không hiển thị trên màn hình Bếp

### Nguyên nhân

1. POS Bếp không kết nối CCB
2. Print Queue bị kẹt
3. Lọc sai loại món

### Giải pháp

```
1. Kiểm tra kết nối:
   POS Bếp → Status Bar → Connected

2. Kiểm tra Print Queue:
   CCB → Settings → Print Queue
   - Nếu có jobs stuck, clear và retry

3. Kiểm tra filter:
   POS Bếp → Settings → Filter
   - Đảm bảo chọn đúng danh mục
```

## Performance chậm

### Triệu chứng

- App lag
- Response chậm
- SQLite query timeout

### Giải pháp

```
1. Cleanup database:
   CCB → Settings → Maintenance → Cleanup Old Data

2. VACUUM database:
   CCB → Settings → Maintenance → Optimize Database

3. Kiểm tra RAM usage:
   - Đóng các app không cần thiết
   - Nếu RAM < 2GB, giảm số connections
```

## Xung đột dữ liệu

### Triệu chứng

- Báo lỗi "Conflict detected"
- Dữ liệu không khớp giữa local và server

### Giải pháp

```
1. Xem chi tiết conflict:
   CCB → Settings → Sync → Conflicts

2. So sánh dữ liệu:
   - Local: giá trị trên CCB
   - Server: giá trị trên Cloud

3. Chọn phương án:
   - Keep Local: giữ dữ liệu CCB, ghi đè server
   - Use Server: lấy dữ liệu server, xóa local

4. Đối với financial data:
   - Không tự động resolve
   - Liên hệ admin để kiểm tra
```

## Logs

### Xem logs CCB

```
CCB → Settings → Logs

- General: Hoạt động chung
- Sync: Đồng bộ
- Print: In ấn
- Network: Kết nối
- Error: Lỗi
```

### Export logs

```
CCB → Settings → Logs → Export
→ Gửi file cho support team
```

## Liên hệ hỗ trợ

Nếu không giải quyết được:

1. Chụp màn hình lỗi
2. Export logs
3. Ghi lại các bước tái hiện lỗi
4. Liên hệ support team
