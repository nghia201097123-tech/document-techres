---
sidebar_position: 3
---

# Đồng bộ lên Cloud

Cơ chế đồng bộ dữ liệu từ CCB lên Cloud Server.

## Sync Flow

```
1. THU THẬP
   - Lấy records: sync_status IN ('pending', 'failed') AND retry_count < 5
   - Giới hạn: 50-100 records/batch

2. CHUẨN BỊ
   - Đánh dấu sync_status = 'syncing'
   - Ghi nhận thời gian bắt đầu

3. GỬI LÊN SERVER
   - POST /api/sync với array of records
   - Server xử lý từng record, trả về kết quả

4. XỬ LÝ KẾT QUẢ
   - Success → sync_status = 'synced', synced_at = now()
   - Failed → sync_status = 'failed', retry_count++
   - Conflict → sync_status = 'conflict', lưu server_data

5. RETRY LOGIC
   - retry_count < 5 → schedule retry với backoff
   - retry_count >= 5 → cảnh báo admin
```

## Implementation

### Sync Service

```javascript
class SyncService {
  async syncPendingOrders() {
    // 1. Lấy records cần sync
    const orders = await db.query(`
      SELECT * FROM orders
      WHERE sync_status IN ('pending', 'failed')
      AND retry_count < 5
      ORDER BY created_at
      LIMIT 50
    `);

    if (orders.length === 0) return;

    // 2. Đánh dấu đang sync
    const ids = orders.map(o => o.id);
    await db.run(`
      UPDATE orders SET sync_status = 'syncing'
      WHERE id IN (${ids.map(() => '?').join(',')})
    `, ids);

    // 3. Gửi lên server
    try {
      const response = await api.post('/sync/orders', { orders });

      // 4. Xử lý kết quả
      for (const result of response.results) {
        if (result.success) {
          await db.run(`
            UPDATE orders
            SET sync_status = 'synced', synced_at = ?
            WHERE id = ?
          `, [new Date().toISOString(), result.id]);
        } else if (result.conflict) {
          await this.handleConflict(result);
        } else {
          await db.run(`
            UPDATE orders
            SET sync_status = 'failed', retry_count = retry_count + 1
            WHERE id = ?
          `, [result.id]);
        }
      }
    } catch (error) {
      // Network error - reset về pending
      await db.run(`
        UPDATE orders SET sync_status = 'pending'
        WHERE id IN (${ids.map(() => '?').join(',')})
      `, ids);
    }
  }
}
```

### Batch Sync

```javascript
// Chạy định kỳ
const startSyncScheduler = () => {
  // Sync orders mỗi 5 phút
  setInterval(() => {
    syncService.syncPendingOrders();
  }, 5 * 60 * 1000);

  // Sync logs mỗi giờ
  setInterval(() => {
    syncService.syncActivityLogs();
  }, 60 * 60 * 1000);

  // Sync khi có mạng trở lại
  NetInfo.addEventListener(state => {
    if (state.isConnected) {
      syncService.syncAll();
    }
  });
};
```

### Idempotent Check trên Server

```javascript
// Server xử lý sync
app.post('/sync/orders', async (req, res) => {
  const { orders } = req.body;
  const results = [];

  for (const order of orders) {
    // Kiểm tra đã tồn tại chưa
    const existing = await db.orders.findById(order.id);

    if (existing) {
      // Đã có - kiểm tra version
      if (existing.version >= order.version) {
        // Version cũ hoặc bằng - bỏ qua
        results.push({ id: order.id, success: true, skipped: true });
      } else {
        // Version mới - update
        await db.orders.update(order.id, order);
        results.push({ id: order.id, success: true });
      }
    } else {
      // Chưa có - insert
      await db.orders.create(order);
      results.push({ id: order.id, success: true });
    }
  }

  res.json({ results });
});
```

## Sync từ Server xuống

### Master Data Sync

```javascript
const syncMasterData = async () => {
  const lastSync = await db.get('SELECT value FROM settings WHERE key = "last_master_sync"');

  const response = await api.get('/sync/master-data', {
    params: { since: lastSync?.value }
  });

  // Update local data
  if (response.categories) {
    await db.run('DELETE FROM categories');
    for (const cat of response.categories) {
      await db.run('INSERT INTO categories VALUES (...)', cat);
    }
  }

  if (response.products) {
    await db.run('DELETE FROM products');
    for (const prod of response.products) {
      await db.run('INSERT INTO products VALUES (...)', prod);
    }
  }

  // Cập nhật timestamp
  await db.run(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    ['last_master_sync', new Date().toISOString()]
  );

  // Broadcast đến Order Apps
  socketServer.broadcast('menu:updated', {
    categories: response.categories,
    products: response.products
  });
};
```

### Trigger sync

```javascript
// Sync khi mở ca
const openShift = async () => {
  await syncMasterData();
  // ... mở ca logic
};

// Sync định kỳ (mỗi giờ)
setInterval(syncMasterData, 60 * 60 * 1000);

// Sync khi nhận push notification
messaging.onMessage((message) => {
  if (message.type === 'MASTER_DATA_UPDATED') {
    syncMasterData();
  }
});
```

## Monitoring

```javascript
const getSyncStats = async () => {
  const stats = await db.get(`
    SELECT
      COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN sync_status = 'syncing' THEN 1 END) as syncing,
      COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced,
      COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed,
      COUNT(CASE WHEN sync_status = 'conflict' THEN 1 END) as conflict,
      MAX(synced_at) as last_sync
    FROM orders
  `);

  return stats;
};
```
