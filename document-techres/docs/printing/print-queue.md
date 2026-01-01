---
sidebar_position: 2
---

# Print Queue

Hệ thống hàng đợi in đảm bảo không miss lệnh in.

## Vấn đề với Push thuần

| Cơ chế | Vấn đề |
|--------|--------|
| Chỉ dùng WebSocket Push | Miss event = không in được |
| Chỉ dùng Polling | Delay, tốn request |

**Giải pháp:** Kết hợp Push + Pull + Queue

## Nguyên tắc

1. Mọi lệnh in đều lưu vào **PRINT QUEUE** (SQLite của CCB)
2. **Push** (WebSocket) để thông báo nhanh "có lệnh in mới"
3. **Pull** (Polling) để lấy danh sách lệnh in chưa xử lý (backup)
4. **Confirm** sau khi in xong

## Database Schema

```sql
CREATE TABLE print_jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,           -- 'kitchen', 'bar', 'bill', 'report'
    target_printer TEXT,          -- 'kitchen_1', 'bar_1', 'cashier'
    order_id TEXT,
    content TEXT,                 -- JSON data để in
    status TEXT DEFAULT 'pending', -- pending, printing, completed, failed
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    printed_at TEXT,
    printed_by TEXT               -- device nào đã in
);

CREATE INDEX idx_print_jobs_status ON print_jobs(status, target_printer);
```

## Trạng thái Print Job

```
PENDING → PRINTING → COMPLETED
              │
              └──→ FAILED (retry tối đa 3 lần)
```

## API Endpoints

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/print-jobs?status=pending&printer=kitchen_1` | Lấy jobs chờ in |
| POST | `/api/print-jobs/:id/start` | Đánh dấu đang in (lock job) |
| POST | `/api/print-jobs/:id/complete` | Đánh dấu in xong |
| POST | `/api/print-jobs/:id/fail` | Đánh dấu lỗi |
| POST | `/api/print-jobs/:id/retry` | In lại |

## Flow hoàn chỉnh

### Tạo print job

```javascript
const createPrintJob = async (order, type, printer) => {
  const job = {
    id: uuid(),
    type,
    targetPrinter: printer,
    orderId: order.id,
    content: JSON.stringify(formatPrintContent(order, type)),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await db.run(`
    INSERT INTO print_jobs (id, type, target_printer, order_id, content, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [job.id, job.type, job.targetPrinter, job.orderId, job.content, job.status, job.createdAt]);

  // Broadcast để client biết
  socketServer.broadcast('print:new-job', {
    jobId: job.id,
    printer: job.targetPrinter
  });

  return job;
};
```

### Fetch và in (POS Bếp/Bar)

```javascript
const printLoop = async () => {
  // Lấy pending jobs
  const response = await api.get('/print-jobs', {
    params: { status: 'pending', printer: MY_PRINTER_ID }
  });

  for (const job of response.data) {
    // Lock job
    const lockResult = await api.post(`/print-jobs/${job.id}/start`);

    if (!lockResult.success) {
      // Job đã được in bởi máy khác
      continue;
    }

    try {
      // In
      await printToDevice(job.content);

      // Confirm
      await api.post(`/print-jobs/${job.id}/complete`);
    } catch (error) {
      // Báo lỗi
      await api.post(`/print-jobs/${job.id}/fail`, {
        error: error.message
      });
    }
  }
};
```

### Xử lý WebSocket event

```javascript
socket.on('print:new-job', ({ jobId, printer }) => {
  if (printer === MY_PRINTER_ID) {
    // Có job mới cho mình, fetch và in
    printLoop();
  }
});
```

### Backup polling

```javascript
// Polling mỗi 5 giây (backup nếu miss WebSocket)
setInterval(() => {
  printLoop();
}, 5000);
```

## Xử lý trùng lặp

Khi 2 máy cùng lấy 1 job:

```javascript
// POST /api/print-jobs/:id/start
app.post('/print-jobs/:id/start', async (req, res) => {
  const job = await db.get('SELECT * FROM print_jobs WHERE id = ?', [req.params.id]);

  if (job.status !== 'pending') {
    return res.json({
      success: false,
      error: 'Job đã được xử lý bởi máy khác'
    });
  }

  await db.run(`
    UPDATE print_jobs SET
      status = 'printing',
      printed_by = ?
    WHERE id = ? AND status = 'pending'
  `, [req.deviceId, req.params.id]);

  res.json({ success: true });
});
```

## Xử lý lỗi in

```javascript
// Khi in thất bại
const handlePrintFailed = async (jobId, error) => {
  const job = await db.get('SELECT * FROM print_jobs WHERE id = ?', [jobId]);

  if (job.retry_count < 3) {
    // Retry
    await db.run(`
      UPDATE print_jobs SET
        status = 'pending',
        retry_count = retry_count + 1
      WHERE id = ?
    `, [jobId]);
  } else {
    // Quá 3 lần, fail hẳn
    await db.run(`
      UPDATE print_jobs SET status = 'failed' WHERE id = ?
    `, [jobId]);

    // Cảnh báo admin
    showAlert('In thất bại', `Job ${jobId}: ${error}`);
  }
};
```

## Trigger đảm bảo không miss

| Trigger | Hành động |
|---------|-----------|
| WebSocket 'print:new-job' | Fetch pending → In |
| Polling mỗi 5 giây | Fetch pending → In nếu có |
| POS Bếp/Bar reconnect | Fetch pending |
| POS Bếp/Bar foreground | Fetch pending |
