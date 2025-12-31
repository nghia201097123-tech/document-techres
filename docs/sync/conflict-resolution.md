---
sidebar_position: 4
---

# Xử lý Conflict

Hướng dẫn xử lý các trường hợp xung đột dữ liệu khi đồng bộ.

## Khi nào xảy ra conflict

```
         CCB                    Server
          │                       │
  ┌───────┴───────┐       ┌───────┴───────┐
  │ Update record │       │ Update record │
  │  (offline)    │       │ (from Dashboard) │
  └───────┬───────┘       └───────┬───────┘
          │                       │
          │    Khi CCB sync       │
          ├───────────────────────►
          │                       │
          │ CONFLICT: cùng record,│
          │   khác giá trị        │
          │◄──────────────────────┤
```

## Chiến lược xử lý

### Option 1: Server Wins

Áp dụng cho **Master Data** (menu, user, config):

```javascript
const handleServerWins = async (localRecord, serverRecord) => {
  // Dữ liệu trên server được giữ
  await db.run(`
    UPDATE products SET
      name = ?,
      price = ?,
      version = ?,
      sync_status = 'synced'
    WHERE id = ?
  `, [serverRecord.name, serverRecord.price, serverRecord.version, serverRecord.id]);

  // Notify UI
  notifyDataChanged('products', serverRecord.id);
};
```

**Lý do:** Master data được quản lý từ Dashboard, CCB chỉ nhận.

### Option 2: Last Write Wins

Áp dụng cho **Order Data**:

```javascript
const handleLastWriteWins = async (localRecord, serverRecord) => {
  if (new Date(localRecord.updated_at) > new Date(serverRecord.updated_at)) {
    // Local mới hơn - giữ local, force sync
    await api.put(`/orders/${localRecord.id}`, {
      ...localRecord,
      force: true
    });
  } else {
    // Server mới hơn - nhận server
    await db.run(`
      UPDATE orders SET
        status = ?,
        updated_at = ?,
        sync_status = 'synced'
      WHERE id = ?
    `, [serverRecord.status, serverRecord.updated_at, serverRecord.id]);
  }
};
```

**Lý do:** Order có thể được sửa từ nhiều nơi, bản mới nhất quan trọng nhất.

### Option 3: Manual Resolve

Áp dụng cho **Financial Data** (thanh toán, điểm):

```javascript
const handleManualResolve = async (localRecord, serverRecord) => {
  // Đánh dấu conflict
  await db.run(`
    UPDATE orders SET
      sync_status = 'conflict',
      conflict_data = ?
    WHERE id = ?
  `, [JSON.stringify(serverRecord), localRecord.id]);

  // Alert admin
  showAlert({
    type: 'error',
    title: 'Xung đột dữ liệu',
    message: `Đơn hàng ${localRecord.order_number} cần xử lý thủ công`,
    action: 'Xem chi tiết'
  });
};
```

**Lý do:** Dữ liệu tài chính cần chính xác, không tự động merge.

## UI xử lý conflict

### Hiển thị conflict

```jsx
const ConflictItem = ({ order }) => {
  const conflict = JSON.parse(order.conflict_data);

  return (
    <Card className="conflict-card">
      <CardHeader>
        <AlertTriangle color="orange" />
        <span>Xung đột: Đơn #{order.order_number}</span>
      </CardHeader>

      <CardBody>
        <div className="comparison">
          <div className="local">
            <h4>Dữ liệu local</h4>
            <p>Tổng tiền: {formatCurrency(order.total_amount)}</p>
            <p>Trạng thái: {order.status}</p>
            <p>Cập nhật: {formatDate(order.updated_at)}</p>
          </div>

          <div className="server">
            <h4>Dữ liệu server</h4>
            <p>Tổng tiền: {formatCurrency(conflict.total_amount)}</p>
            <p>Trạng thái: {conflict.status}</p>
            <p>Cập nhật: {formatDate(conflict.updated_at)}</p>
          </div>
        </div>
      </CardBody>

      <CardFooter>
        <Button onClick={() => keepLocal(order)}>Giữ local</Button>
        <Button onClick={() => useServer(order)}>Dùng server</Button>
      </CardFooter>
    </Card>
  );
};
```

### Resolve conflict

```javascript
const keepLocal = async (order) => {
  // Force sync local lên server
  await api.put(`/orders/${order.id}`, {
    ...order,
    force: true
  });

  await db.run(`
    UPDATE orders SET
      sync_status = 'synced',
      conflict_data = NULL
    WHERE id = ?
  `, [order.id]);
};

const useServer = async (order) => {
  const serverData = JSON.parse(order.conflict_data);

  await db.run(`
    UPDATE orders SET
      total_amount = ?,
      status = ?,
      updated_at = ?,
      sync_status = 'synced',
      conflict_data = NULL
    WHERE id = ?
  `, [serverData.total_amount, serverData.status, serverData.updated_at, order.id]);
};
```

## Prevention

### Optimistic Locking

```javascript
// Thêm version vào mỗi update
const updateOrder = async (id, data) => {
  const current = await db.get('SELECT version FROM orders WHERE id = ?', [id]);

  const result = await db.run(`
    UPDATE orders SET
      status = ?,
      version = version + 1
    WHERE id = ? AND version = ?
  `, [data.status, id, current.version]);

  if (result.changes === 0) {
    throw new Error('Record đã bị thay đổi bởi người khác');
  }
};
```

### Timestamp-based

```javascript
// So sánh updated_at trước khi update
const safeUpdate = async (id, data) => {
  const response = await api.put(`/orders/${id}`, {
    ...data,
    expected_updated_at: data.updated_at
  });

  if (response.conflict) {
    // Handle conflict
    return handleConflict(data, response.server_data);
  }
};
```
