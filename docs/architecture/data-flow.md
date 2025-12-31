---
sidebar_position: 4
---

# Luồng dữ liệu

Mô tả chi tiết cách dữ liệu di chuyển giữa các thành phần trong hệ thống.

## Phân loại dữ liệu

| Loại data | Lưu ở Order App | Cách lấy | Cập nhật |
|-----------|-----------------|----------|----------|
| **Menu** | ✅ Memory | Lần đầu connect | WebSocket push + polling backup |
| **Danh sách bàn** | ✅ Memory | Lần đầu connect | WebSocket push |
| **Đơn hàng** | ❌ Không lưu | API trực tiếp | Gọi API realtime |
| **Chi tiết đơn** | ❌ Không lưu | API trực tiếp | Gọi API realtime |

## Flow lấy dữ liệu

### Menu + Bàn (Cache trong memory)

```
Order App connect lần đầu
        │
        ▼
CCB gửi full state: { tables, menu }
        │
        ▼
Order App lưu vào memory + ghi nhận version
        │
        ▼
WebSocket push khi có thay đổi → Cập nhật memory
```

### Đơn hàng (Không cache, API trực tiếp)

```
Nhân viên chọn bàn 5
        │
        ▼
GET /api/orders?tableId=5
        │
        ▼
Hiển thị đơn hiện tại
        │
        ▼
Thêm món → POST /api/orders/:id/items
        │
        ▼
CCB lưu SQLite + broadcast 'order:updated'
        │
        ▼
Các Order App khác thấy thay đổi
```

## Realtime cập nhật trạng thái bàn

```
Nhân viên A tạo order cho Bàn 5
        │
        ▼
POST /api/orders { tableId: 5, items: [...] }
        │
        ▼
CCB xử lý:
├── Lưu order vào SQLite
├── UPDATE tables SET status = 'occupied' WHERE id = 5
└── Broadcast WebSocket: { event: 'tables:updated', tableId: 5, status: 'occupied' }
        │
        ▼
Tất cả Order App nhận event → Cập nhật memory → UI render lại (đổi màu bàn)
```

## Events thay đổi trạng thái bàn

| Hành động | CCB broadcast | Order App xử lý |
|-----------|---------------|-----------------|
| Tạo order mới | `tables:updated` (status: occupied) | Đổi màu bàn sang "đang sử dụng" |
| Thanh toán xong | `tables:updated` (status: available) | Đổi màu bàn sang "trống" |
| Chuyển bàn | `tables:updated` (cả 2 bàn) | Cập nhật cả 2 bàn |
| Gộp bàn | `tables:updated` + `order:merged` | Cập nhật UI |

## Xử lý khi Order App miss WebSocket event

### Tình huống có thể miss

- App vào background (iOS/Android tắt WebSocket)
- Mạng chập chờn, mất gói tin
- App bị lag, event đến nhưng không xử lý kịp

### Giải pháp 1: Reconnect → Fetch full state

```
Order App phát hiện mất kết nối
        │
        ▼
Auto reconnect WebSocket
        │
        ▼
CCB gửi lại full state: { tables, menu }
        │
        ▼
Order App REPLACE toàn bộ memory (không merge)
```

### Giải pháp 2: Heartbeat + Version check

```
Mỗi 30 giây:
Order App gửi: { event: 'ping', versions: { menu: 5, tables: 12 } }
        │
        ▼
CCB kiểm tra version
        │
        ├── Khớp → Trả về 'pong' (không làm gì)
        │
        └── Không khớp → Trả về data mới cho phần lệch version
```

### Giải pháp 3: App foreground

```
Order App từ background sang foreground
        │
        ▼
Gọi GET /api/state
        │
        ▼
CCB trả về full state hiện tại
        │
        ▼
Order App replace memory
```

### Giải pháp 4: Pull to refresh

```
User kéo màn hình để refresh
        │
        ▼
Gọi GET /api/state
        │
        ▼
Replace toàn bộ memory
```

## Tổng hợp cơ chế đảm bảo data đồng bộ

| Trigger | Hành động | Mục đích |
|---------|-----------|----------|
| Connect/Reconnect | Fetch full state | Khởi tạo/khôi phục data |
| WebSocket event | Update memory | Realtime sync |
| App foreground | Fetch full state | Bù đắp miss khi background |
| Heartbeat 30s | Version check | Phát hiện miss |
| Pull refresh | Fetch full state | Manual sync |

## Lý do thiết kế này

- **Menu:** Ít thay đổi, cache để hiển thị danh sách món nhanh
- **Bàn:** Cần realtime để thấy bàn nào đang sử dụng
- **Đơn hàng:** Thay đổi liên tục bởi nhiều người, cần data chính xác → luôn gọi API
- **Data không lớn:** Vài chục bàn, vài trăm món → fetch full state không tốn thời gian

## Flow gọi món đến bếp

```
Nhân viên gọi món (Order App)
        │
        ▼
POST /api/orders/:id/items → CCB
        │
        ▼
CCB:
├── Lưu order_items vào SQLite
├── Tạo print_job (type: kitchen, status: pending)
├── Broadcast 'order:updated' → Tất cả Order App
└── Broadcast 'kitchen:new-items' → POS Bếp
        │
        ▼
POS Bếp:
├── Hiển thị món mới trên màn hình
├── Phát âm thanh "TING!"
└── In tem bếp (từ print queue)
```

## Flow bếp làm xong món

```
Bếp làm xong món → Bấm "Hoàn thành" trên POS Bếp
        │
        ▼
POST /api/orders/:orderId/items/:itemId/ready → CCB
        │
        ▼
CCB:
├── Update order_item.status = 'ready'
├── Broadcast 'kitchen:item-ready'
└── Broadcast 'order:updated'
        │
        ▼
Order App nhận event → Hiển thị "Món X đã sẵn sàng"
```

## Trạng thái món ăn

```
PENDING → PREPARING → READY → SERVED
   │          │         │        │
   │          │         │        └── Nhân viên đã mang ra
   │          │         └── Bếp làm xong
   │          └── Bếp đang làm
   └── Mới gọi, chờ bếp
```
