---
sidebar_position: 2
---

# WebSocket Events

Các events realtime giữa CCB và Order App/POS Bếp.

## Kết nối

```javascript
import { io } from 'socket.io-client';

const socket = io('http://192.168.1.100:8080', {
  auth: {
    token: 'session-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to CCB');
});

socket.on('disconnect', () => {
  console.log('Disconnected from CCB');
});
```

## Server → Client Events

### connected

Gửi khi client kết nối thành công, chứa full state.

```javascript
socket.on('connected', (data) => {
  // data = { tables, menu, orders, version }
  store.setState({
    tables: data.tables,
    menu: data.menu,
    tablesVersion: data.version.tables,
    menuVersion: data.version.menu
  });
});
```

### tables:updated

Trạng thái bàn thay đổi.

```javascript
socket.on('tables:updated', (data) => {
  // data = { tables: [...] } hoặc { table: {...} }
  if (data.tables) {
    store.setTables(data.tables);
  } else {
    store.updateTable(data.table);
  }
});
```

### order:created

Order mới được tạo.

```javascript
socket.on('order:created', (data) => {
  // data = { order: {...} }
  showNotification(`Đơn mới: Bàn ${data.order.tableName}`);
});
```

### order:updated

Order được cập nhật (thêm/sửa/xóa món).

```javascript
socket.on('order:updated', (data) => {
  // data = { order: {...} }
  if (currentOrderId === data.order.id) {
    refreshCurrentOrder();
  }
});
```

### order:completed

Order hoàn thành (đã thanh toán).

```javascript
socket.on('order:completed', (data) => {
  // data = { orderId, tableId }
  showNotification('Đơn đã thanh toán');
});
```

### order:cancelled

Order bị hủy.

```javascript
socket.on('order:cancelled', (data) => {
  // data = { orderId, tableId, reason }
  showNotification(`Đơn bị hủy: ${data.reason}`);
});
```

### menu:updated

Menu thay đổi (thêm/sửa/xóa sản phẩm).

```javascript
socket.on('menu:updated', (data) => {
  // data = { menu: { categories, products } }
  store.setMenu(data.menu);
});
```

### kitchen:new-items

Có món mới cần làm (cho POS Bếp).

```javascript
socket.on('kitchen:new-items', (data) => {
  // data = { orderId, items: [...], tableNumber }
  playSound('new-order');
  addToKitchenQueue(data);
});
```

### kitchen:item-ready

Món đã làm xong (cho Order App).

```javascript
socket.on('kitchen:item-ready', (data) => {
  // data = { orderId, itemId, itemName, tableNumber }
  showNotification(`${data.itemName} - Bàn ${data.tableNumber} đã sẵn sàng`);
});
```

### print:new-job

Có lệnh in mới.

```javascript
socket.on('print:new-job', (data) => {
  // data = { jobId, printer, type }
  fetchAndPrint(data.jobId);
});
```

### print:job-failed

Lệnh in thất bại.

```javascript
socket.on('print:job-failed', (data) => {
  // data = { jobId, error }
  showAlert(`In thất bại: ${data.error}`);
});
```

### pong

Response cho heartbeat.

```javascript
socket.on('pong', (data) => {
  // data = { tables?, menu? } - chỉ có nếu version khác
  if (data.tables) {
    store.setTables(data.tables);
  }
  if (data.menu) {
    store.setMenu(data.menu);
  }
});
```

## Client → Server Events

### ping

Heartbeat + version check.

```javascript
setInterval(() => {
  socket.emit('ping', {
    versions: {
      tables: store.tablesVersion,
      menu: store.menuVersion
    }
  });
}, 30000);
```

### order:create

Tạo order mới.

```javascript
socket.emit('order:create', {
  tableId: 'table-uuid',
  items: [
    { productId: 'prod-uuid', quantity: 2, note: 'Ít đường' }
  ],
  note: ''
}, (response) => {
  if (response.success) {
    // Order created
    navigateToOrder(response.order.id);
  }
});
```

### order:add-item

Thêm món vào order.

```javascript
socket.emit('order:add-item', {
  orderId: 'order-uuid',
  item: {
    productId: 'prod-uuid',
    quantity: 1,
    note: ''
  }
}, (response) => {
  if (response.success) {
    // Item added
  }
});
```

### order:update-item

Sửa món.

```javascript
socket.emit('order:update-item', {
  orderId: 'order-uuid',
  itemId: 'item-uuid',
  quantity: 3,
  note: 'Thêm đá'
});
```

### order:remove-item

Xóa món.

```javascript
socket.emit('order:remove-item', {
  orderId: 'order-uuid',
  itemId: 'item-uuid'
});
```

### order:request-payment

Yêu cầu thanh toán.

```javascript
socket.emit('order:request-payment', {
  orderId: 'order-uuid'
});
```

### order:transfer

Chuyển bàn.

```javascript
socket.emit('order:transfer', {
  orderId: 'order-uuid',
  toTableId: 'new-table-uuid'
});
```

### order:print-kitchen

In tem bếp.

```javascript
socket.emit('order:print-kitchen', {
  orderId: 'order-uuid',
  itemIds: ['item-1', 'item-2']
});
```

### kitchen:item-preparing

Bếp bắt đầu làm món.

```javascript
socket.emit('kitchen:item-preparing', {
  orderId: 'order-uuid',
  itemId: 'item-uuid'
});
```

### kitchen:item-ready

Bếp làm xong món.

```javascript
socket.emit('kitchen:item-ready', {
  orderId: 'order-uuid',
  itemId: 'item-uuid'
});
```

## Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  showAlert(error.message);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  showBanner('Không thể kết nối với POS');
});
```
