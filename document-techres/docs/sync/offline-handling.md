---
sidebar_position: 5
---

# Xử lý Offline

Hướng dẫn xử lý các tính năng khi không có kết nối internet.

## Phân loại tính năng

### Offline OK

Các tính năng hoạt động bình thường khi offline:

| Tính năng | Mô tả |
|-----------|-------|
| Tạo order | Core business |
| Thêm/sửa/xóa món | Core business |
| Thanh toán thường | Tiền mặt, chuyển khoản |
| In bill, tem bếp | Local printer |
| Chốt ca | Lưu local, sync sau |
| Tích điểm | Ghi nhận, sync sau |

### Cần Online

Các tính năng bắt buộc phải có internet:

| Tính năng | Lý do |
|-----------|-------|
| Sử dụng điểm | Cần verify số dư realtime |
| Voucher online | Cần verify còn hạn/còn lượt |
| Kiểm tra khách hàng mới | Cần tìm trên server |
| Sync Dashboard | Cần kết nối server |

## Detect Network Status

```javascript
import NetInfo from '@react-native-community/netinfo';

class NetworkService {
  isOnline = true;
  listeners = [];

  init() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      // Notify listeners
      this.listeners.forEach(fn => fn(this.isOnline));

      // Trigger sync when back online
      if (!wasOnline && this.isOnline) {
        this.onBackOnline();
      }
    });
  }

  onBackOnline() {
    // Sync pending data
    syncService.syncAll();
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }
}
```

## UI Indicator

```jsx
const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return networkService.subscribe(setIsOnline);
  }, []);

  if (isOnline) return null;

  return (
    <Banner type="warning">
      <WifiOff size={16} />
      <span>Đang offline - Một số tính năng bị giới hạn</span>
    </Banner>
  );
};
```

## Disable Online-only Features

```jsx
const UsePointsButton = ({ order }) => {
  const isOnline = useNetworkStatus();

  if (!isOnline) {
    return (
      <Button disabled>
        Dùng điểm (cần internet)
      </Button>
    );
  }

  return (
    <Button onClick={() => openPointsModal(order)}>
      Dùng điểm
    </Button>
  );
};
```

## Queue Offline Actions

```javascript
class OfflineQueue {
  queue = [];

  add(action) {
    this.queue.push({
      id: uuid(),
      action,
      createdAt: new Date().toISOString(),
      retries: 0
    });
    this.persist();
  }

  async process() {
    if (!networkService.isOnline) return;

    for (const item of this.queue) {
      try {
        await this.execute(item.action);
        this.remove(item.id);
      } catch (error) {
        item.retries++;
        if (item.retries >= 5) {
          this.remove(item.id);
          this.logFailure(item);
        }
      }
    }
  }

  persist() {
    AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }

  async restore() {
    const data = await AsyncStorage.getItem('offline_queue');
    this.queue = data ? JSON.parse(data) : [];
  }
}
```

## Flow sử dụng điểm (Online Required)

```
Khách muốn dùng điểm
        │
        ▼
CCB kiểm tra internet
        │
        ├── Không có internet
        │   │
        │   ▼
        │   Hiện thông báo:
        │   "Cần kết nối internet để sử dụng điểm"
        │   │
        │   ▼
        │   Gợi ý: "Thanh toán thường và tích điểm sau"
        │
        └── Có internet
            │
            ▼
            Gọi API: POST /api/points/hold
            Body: { customer_id, points, order_id }
            │
            ▼
            Server kiểm tra:
            • Khách có đủ điểm?
            • Điểm có bị hold ở đơn khác?
            │
            ▼
            Server HOLD điểm (timeout 15 phút)
            │
            ▼
            CCB áp dụng giảm giá vào đơn
            │
            ▼
            Thanh toán thành công
            │
            ▼
            POST /api/points/confirm
            │
            ▼
            Server trừ điểm chính thức
```

## Edge Cases

### Mất mạng sau khi hold điểm

```javascript
const completePaymentWithPoints = async (order, holdId) => {
  try {
    // Thanh toán local
    await db.run(`
      UPDATE orders SET
        payment_status = 'paid',
        completed_at = ?
      WHERE id = ?
    `, [new Date().toISOString(), order.id]);

    // Confirm points (có thể offline)
    if (networkService.isOnline) {
      await api.post(`/points/confirm`, { holdId });
    } else {
      // Queue để confirm sau
      offlineQueue.add({
        type: 'CONFIRM_POINTS',
        holdId,
        orderId: order.id
      });
    }
  } catch (error) {
    // Points server timeout 15 phút sẽ tự release
    console.error('Failed to confirm points', error);
  }
};
```

### CCB crash sau khi hold điểm

Server có cơ chế timeout 15 phút:

```javascript
// Server auto-release held points
const releaseExpiredHolds = async () => {
  await db.query(`
    UPDATE point_holds SET
      status = 'released'
    WHERE status = 'held'
    AND created_at < NOW() - INTERVAL '15 minutes'
  `);
};

// Chạy mỗi phút
setInterval(releaseExpiredHolds, 60000);
```

## Sync khi có mạng lại

```javascript
const onBackOnline = async () => {
  // 1. Process offline queue
  await offlineQueue.process();

  // 2. Sync pending orders
  await syncService.syncPendingOrders();

  // 3. Refresh master data
  await syncService.syncMasterData();

  // 4. Update UI
  notifyOnlineStatus(true);
};
```
