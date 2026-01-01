---
sidebar_position: 4
---

# Chiến lược lưu trữ

Hướng dẫn quản lý dữ liệu local trên CCB để tối ưu hiệu năng và dung lượng.

## Thời gian giữ dữ liệu

| Loại dữ liệu | Giữ local | Hành động sau đó |
|--------------|-----------|------------------|
| Order chi tiết | 7 ngày | Xóa detail, giữ summary |
| Order items | 7 ngày | Xóa cùng order |
| Daily summaries | 30 ngày | Xóa |
| Activity logs | 3 ngày | Xóa |
| Master data | Vĩnh viễn | Chỉ sync update |
| Customers (cache) | 30 ngày | Refresh từ server |
| Print jobs | 1 ngày | Xóa completed |

## Nguyên tắc xóa

### 1. Chỉ xóa data đã sync thành công

```sql
-- Đúng ✅
DELETE FROM orders
WHERE sync_status = 'synced'
AND created_at < date('now', '-7 days');

-- Sai ❌
DELETE FROM orders
WHERE created_at < date('now', '-7 days');
```

### 2. Tạo summary trước khi xóa chi tiết

```sql
-- Bước 1: Tạo summary cho ngày cần xóa
INSERT OR REPLACE INTO daily_summaries (date, total_orders, total_revenue, ...)
SELECT
    date(created_at) as date,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_revenue,
    ...
FROM orders
WHERE date(created_at) = '2024-01-08'
GROUP BY date(created_at);

-- Bước 2: Xóa order items
DELETE FROM order_items
WHERE order_id IN (
    SELECT id FROM orders
    WHERE sync_status = 'synced'
    AND date(created_at) = '2024-01-08'
);

-- Bước 3: Xóa orders
DELETE FROM orders
WHERE sync_status = 'synced'
AND date(created_at) = '2024-01-08';
```

### 3. Không xóa order đang xử lý

```sql
-- Kiểm tra trước khi xóa
SELECT COUNT(*) FROM orders
WHERE status IN ('pending', 'processing');

-- Chỉ xóa completed/cancelled
DELETE FROM orders
WHERE sync_status = 'synced'
AND status IN ('completed', 'cancelled')
AND created_at < date('now', '-7 days');
```

### 4. VACUUM sau cleanup

```sql
-- Thu hồi dung lượng sau khi xóa
VACUUM;
```

## Thời điểm cleanup

### Tự động (Background)

```javascript
// Chạy lúc 2-4 AM mỗi ngày
const scheduleCleanup = () => {
  cron.schedule('0 3 * * *', async () => {
    await cleanupOldOrders();
    await cleanupOldLogs();
    await cleanupPrintJobs();
    await vacuumDatabase();
  });
};
```

### Khi đóng ca

```javascript
// Cleanup khi chốt ca
const closeShift = async (shiftId) => {
  // ... chốt ca logic

  // Cleanup nếu cần
  const pendingCount = await getPendingSyncCount();
  if (pendingCount > 1000) {
    showWarning('Có nhiều dữ liệu chờ sync!');
  }

  await cleanupCompletedPrintJobs();
};
```

## Monitoring

### Cảnh báo khi pending sync > 1000 records

```javascript
const checkSyncHealth = async () => {
  const pendingCount = await db.get(
    'SELECT COUNT(*) as count FROM orders WHERE sync_status = "pending"'
  );

  if (pendingCount.count > 1000) {
    sendAlert({
      type: 'warning',
      message: `Có ${pendingCount.count} đơn hàng chờ sync!`,
      action: 'Kiểm tra kết nối internet'
    });
  }
};
```

### Kiểm tra dung lượng database

```javascript
const checkDatabaseSize = async () => {
  const stats = await db.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');
  const sizeMB = stats.size / (1024 * 1024);

  if (sizeMB > 500) {
    showWarning('Database đang lớn, cần cleanup');
  }

  return sizeMB;
};
```

## Cleanup Scripts

### Cleanup orders

```javascript
const cleanupOldOrders = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  // 1. Tạo summary
  await createDailySummaries(cutoff);

  // 2. Xóa order_items
  await db.run(`
    DELETE FROM order_items
    WHERE order_id IN (
      SELECT id FROM orders
      WHERE sync_status = 'synced'
      AND status IN ('completed', 'cancelled')
      AND date(created_at) < ?
    )
  `, [cutoff]);

  // 3. Xóa orders
  const result = await db.run(`
    DELETE FROM orders
    WHERE sync_status = 'synced'
    AND status IN ('completed', 'cancelled')
    AND date(created_at) < ?
  `, [cutoff]);

  console.log(`Deleted ${result.changes} orders`);
};
```

### Cleanup activity logs

```javascript
const cleanupOldLogs = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 3);
  const cutoff = cutoffDate.toISOString();

  await db.run(`
    DELETE FROM activity_logs
    WHERE created_at < ?
  `, [cutoff]);
};
```

### Cleanup print jobs

```javascript
const cleanupPrintJobs = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 1);
  const cutoff = cutoffDate.toISOString();

  await db.run(`
    DELETE FROM print_jobs
    WHERE status IN ('completed', 'failed')
    AND created_at < ?
  `, [cutoff]);
};
```

## Backup

### Export database

```javascript
const backupDatabase = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${BACKUP_DIR}/backup-${timestamp}.db`;

  // Copy file database
  await FileSystem.copyFile(DB_PATH, backupPath);

  // Nén nếu cần
  await compress(backupPath);

  return backupPath;
};
```

### Restore từ backup

```javascript
const restoreDatabase = async (backupPath) => {
  // Dừng các connections
  await closeAllConnections();

  // Restore
  await FileSystem.copyFile(backupPath, DB_PATH);

  // Reconnect
  await initDatabase();
};
```
