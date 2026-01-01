---
sidebar_position: 2
---

# Đồng bộ CCB - Order App

Cơ chế đồng bộ dữ liệu realtime giữa CCB và Order App trong mạng LAN.

## Phân loại dữ liệu

| Loại data | Lưu ở Order App | Cách lấy | Cập nhật |
|-----------|-----------------|----------|----------|
| **Menu** | ✅ Memory | Lần đầu connect | WebSocket push |
| **Bàn + trạng thái** | ✅ Memory | Lần đầu connect | WebSocket push |
| **Đơn hàng** | ❌ Không lưu | API trực tiếp | Realtime |
| **Chi tiết đơn** | ❌ Không lưu | API trực tiếp | Realtime |

## Flow kết nối

```
Order App khởi động
        │
        ▼
Listen UDP broadcast (port 9999)
        │
        ▼
Nhận thông tin CCB: { name, ip, port }
        │
        ▼
Kết nối WebSocket đến CCB
        │
        ▼
CCB gửi full state: { tables, menu, version }
        │
        ▼
Order App lưu vào memory
        │
        ▼
Sẵn sàng hoạt động
```

## Initial State

Khi Order App kết nối, CCB gửi toàn bộ state hiện tại:

```javascript
// CCB gửi khi client connect
socket.emit('connected', {
  tables: [...],      // Danh sách bàn + trạng thái
  menu: {
    categories: [...],
    products: [...]
  },
  version: {
    tables: 15,
    menu: 8
  }
});
```

## Realtime Updates

### Cập nhật bàn

```javascript
// CCB broadcast khi có thay đổi bàn
socket.broadcast.emit('tables:updated', {
  tables: [...],  // Full list hoặc chỉ những bàn thay đổi
  version: 16
});
```

### Cập nhật order

```javascript
// CCB broadcast khi có order mới/thay đổi
socket.broadcast.emit('order:updated', {
  orderId: 'xxx',
  tableId: 'yyy',
  status: 'processing',
  items: [...]
});
```

## Xử lý miss events

### Reconnect

Khi Order App reconnect, CCB gửi lại full state:

```javascript
// Order App
socket.on('connect', () => {
  console.log('Reconnected to CCB');
});

socket.on('connected', (fullState) => {
  // Replace toàn bộ memory
  store.setState({
    tables: fullState.tables,
    menu: fullState.menu
  });
});
```

### Heartbeat + Version Check

```javascript
// Order App gửi mỗi 30 giây
setInterval(() => {
  socket.emit('ping', {
    versions: {
      tables: store.getState().tablesVersion,
      menu: store.getState().menuVersion
    }
  });
}, 30000);

// CCB kiểm tra và trả về
socket.on('ping', ({ versions }) => {
  const response = {};

  if (versions.tables !== currentTablesVersion) {
    response.tables = getAllTables();
  }

  if (versions.menu !== currentMenuVersion) {
    response.menu = getFullMenu();
  }

  socket.emit('pong', response);
});
```

### App Foreground

```javascript
// Khi app từ background → foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    // Fetch full state để đảm bảo data mới nhất
    fetchFullState();
  }
});
```

### Pull to Refresh

```javascript
// User kéo refresh
const handleRefresh = async () => {
  setRefreshing(true);
  const state = await api.get('/state');
  store.setState({
    tables: state.tables,
    menu: state.menu
  });
  setRefreshing(false);
};
```

## Events Reference

### Server → Client

| Event | Data | Mô tả |
|-------|------|-------|
| `connected` | `{ tables, menu, orders }` | Full state khi kết nối |
| `tables:updated` | `{ tables }` | Trạng thái bàn thay đổi |
| `order:created` | `{ order }` | Order mới được tạo |
| `order:updated` | `{ order }` | Order được cập nhật |
| `order:completed` | `{ orderId, tableId }` | Order hoàn thành |
| `order:cancelled` | `{ orderId, tableId }` | Order bị hủy |
| `menu:updated` | `{ menu }` | Menu thay đổi |
| `kitchen:item-ready` | `{ orderId, itemId }` | Món đã sẵn sàng |

### Client → Server

| Event | Data | Mô tả |
|-------|------|-------|
| `ping` | `{ versions }` | Heartbeat + version check |
| `order:create` | `{ tableId, items }` | Tạo order |
| `order:add-item` | `{ orderId, item }` | Thêm món |
| `order:update-item` | `{ orderId, itemId, ... }` | Sửa món |
| `order:remove-item` | `{ orderId, itemId }` | Xóa món |
| `order:request-payment` | `{ orderId }` | Yêu cầu thanh toán |

## Error Handling

### Mất kết nối

```javascript
socket.on('disconnect', () => {
  showBanner('Mất kết nối với POS', 'warning');

  // Disable các action cần network
  store.setOfflineMode(true);
});

socket.on('connect', () => {
  hideBanner();
  store.setOfflineMode(false);
});
```

### Timeout

```javascript
// Timeout cho API calls
const fetchWithTimeout = async (url, timeout = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};
```
