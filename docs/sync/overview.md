---
sidebar_position: 1
---

# Tổng quan đồng bộ

Hệ thống sử dụng nhiều cơ chế đồng bộ khác nhau phù hợp với từng loại dữ liệu.

## Các tầng đồng bộ

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD SERVER                                 │
│                    (PostgreSQL)                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    Sync API
                    (HTTPS)
                         │
┌────────────────────────┼────────────────────────────────────────┐
│                    CCB (SQLite)                                 │
│               Source of Truth trong quán                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                   WebSocket
                   (LAN/WiFi)
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │Order App │   │Order App │   │ POS Bếp  │
   │  (NV 1)  │   │  (NV 2)  │   │          │
   │ (Memory) │   │ (Memory) │   │ (Memory) │
   └──────────┘   └──────────┘   └──────────┘
```

## Loại sync

| Loại | Hướng | Tần suất | Mục đích |
|------|-------|----------|----------|
| **Master Data Sync** | Server → CCB | Khi mở app, mỗi giờ | Menu, bàn, nhân viên |
| **Realtime Sync** | CCB ↔ Order App | Realtime (WebSocket) | Trạng thái bàn, order |
| **Transaction Sync** | CCB → Server | Mỗi 5-10 phút | Đơn hàng, thanh toán |
| **Shift Sync** | CCB → Server | Khi chốt ca | Báo cáo ca |

## Trạng thái Sync

```
                              ┌─────────────┐
                              │   PENDING   │ ← Mới tạo/update
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │   SYNCING   │ ← Đang gửi lên server
                              └──────┬──────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
       ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
       │   SYNCED    │        │   FAILED    │        │  CONFLICT   │
       └─────────────┘        └──────┬──────┘        └──────┬──────┘
                                     │                      │
                                     ▼                      ▼
                              Retry (max 5 lần)       Cần xử lý thủ công
```

## Hybrid Sync Strategy

### Realtime (khi có mạng)

Áp dụng cho dữ liệu quan trọng cần đồng bộ ngay:

- Thanh toán hoàn thành
- Chốt ca
- Thay đổi menu từ Dashboard

### Batch (định kỳ)

Áp dụng cho dữ liệu có thể chờ:

- Order details: Mỗi 5-10 phút hoặc khi idle
- Activity logs: Cuối ngày
- Full sync: Khi mở ca mới

## Đảm bảo an toàn dữ liệu

| Yêu cầu | Giải pháp |
|---------|-----------|
| Không duplicate | UUID cho mỗi record + version check |
| Idempotent | Server kiểm tra ID + version |
| Không mất data | Không xóa trước khi sync thành công |
| Conflict resolution | Rule-based (Server wins / Last write wins) |
| Audit trail | Log mọi sync action |

## Retry Logic

```javascript
const syncWithRetry = async (data) => {
  const maxRetries = 5;
  const baseDelay = 5000; // 5 giây

  for (let i = 0; i < maxRetries; i++) {
    try {
      await syncToServer(data);
      return { success: true };
    } catch (error) {
      const delay = baseDelay * Math.pow(2, i); // 5s, 10s, 20s, 40s, 80s
      await sleep(delay);
    }
  }

  return { success: false, needsManualResolve: true };
};
```

## Monitoring

```javascript
// Kiểm tra sync health
const checkSyncHealth = () => {
  const metrics = {
    pendingCount: db.count('orders', { sync_status: 'pending' }),
    failedCount: db.count('orders', { sync_status: 'failed' }),
    lastSyncAt: db.get('SELECT MAX(synced_at) FROM orders'),
    oldestPending: db.get('SELECT MIN(created_at) FROM orders WHERE sync_status = "pending"')
  };

  if (metrics.failedCount > 0) {
    alert('Có đơn hàng sync thất bại!');
  }

  if (metrics.pendingCount > 100) {
    alert('Nhiều đơn đang chờ sync!');
  }

  return metrics;
};
```
