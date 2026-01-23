---
sidebar_position: 6
---

# Sync và lưu dữ liệu (Order Sync)

Chi tiết về logic so sánh, phân loại và lưu đơn hàng từ food platforms vào PostgreSQL.

## Tổng quan

Sau khi polling đơn hàng từ các platforms, hệ thống cần:
1. **So sánh** với dữ liệu hiện có trong DB
2. **Phân loại** thành đơn mới hoặc đơn cập nhật
3. **Lưu** vào PostgreSQL
4. **Đánh dấu** flags để trả về cho CCB

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Orders từ Platform APIs (raw data)                                      │
│  ├── Order #GR12345 (Grab)                                               │
│  ├── Order #GR12346 (Grab)                                               │
│  ├── Order #SF98765 (ShopeeFood)                                         │
│  └── Order #BF55555 (BeFood)                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SYNC LOGIC                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  For each order:                                                 │    │
│  │                                                                  │    │
│  │  1. Query DB by order_code + platform                            │    │
│  │                                                                  │    │
│  │  2. IF not exists → INSERT (mark as NEW)                         │    │
│  │                                                                  │    │
│  │  3. IF exists:                                                   │    │
│  │     - Compare: status, driver_info, updated_at                   │    │
│  │     - IF changed → UPDATE (mark as UPDATED)                      │    │
│  │     - IF unchanged → SKIP                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  OUTPUT                                                                  │
│  ├── newOrders: [#GR12346, #BF55555]        → 2 đơn mới                 │
│  ├── updatedOrders: [#GR12345, #SF98765]    → 2 đơn cập nhật           │
│  └── unchangedCount: 0                       → 0 đơn không đổi          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### food_orders Table

```sql
CREATE TABLE food_orders (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  external_order_id VARCHAR(100) NOT NULL,  -- ID trên platform
  order_code VARCHAR(50) NOT NULL,          -- #GR12345, #SF98765
  platform VARCHAR(20) NOT NULL,            -- grab, shopee_food, befood

  -- Relations
  tenant_id VARCHAR(50) NOT NULL,
  branch_id INTEGER NOT NULL,
  account_id UUID NOT NULL,                 -- FK to food_platform_accounts

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  previous_status VARCHAR(20),              -- Để track changes

  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address TEXT,
  customer_note TEXT,

  -- Order items (JSON array)
  items JSONB NOT NULL DEFAULT '[]',

  -- Payment
  subtotal BIGINT NOT NULL DEFAULT 0,       -- Stored as cents/đồng
  delivery_fee BIGINT NOT NULL DEFAULT 0,
  platform_fee BIGINT NOT NULL DEFAULT 0,
  discount BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_method VARCHAR(50),

  -- Driver info
  driver_name VARCHAR(255),
  driver_phone VARCHAR(20),
  estimated_delivery_time VARCHAR(50),

  -- Timestamps from platform
  platform_created_at TIMESTAMP NOT NULL,
  platform_updated_at TIMESTAMP NOT NULL,

  -- Our timestamps
  accepted_at TIMESTAMP,
  prepared_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Sync metadata
  first_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sync_count INTEGER NOT NULL DEFAULT 1,

  -- System timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_food_orders_external UNIQUE (external_order_id, platform),
  CONSTRAINT fk_food_orders_account FOREIGN KEY (account_id)
    REFERENCES food_platform_accounts(id),
  CONSTRAINT fk_food_orders_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id)
);

-- Indexes for common queries
CREATE INDEX idx_food_orders_branch_status ON food_orders(branch_id, status);
CREATE INDEX idx_food_orders_order_code ON food_orders(order_code);
CREATE INDEX idx_food_orders_platform ON food_orders(platform);
CREATE INDEX idx_food_orders_created_at ON food_orders(created_at DESC);
CREATE INDEX idx_food_orders_last_synced ON food_orders(last_synced_at DESC);

-- Index for finding orders to display
CREATE INDEX idx_food_orders_display ON food_orders(
  branch_id,
  status,
  created_at DESC
) WHERE status NOT IN ('completed', 'cancelled');
```

### Items JSONB Structure

```json
{
  "items": [
    {
      "productName": "Cà phê sữa đá",
      "quantity": 2,
      "unitPrice": 25000,
      "totalPrice": 50000,
      "note": "Ít đường",
      "options": "Size L, Thêm shot"
    },
    {
      "productName": "Bánh mì thịt",
      "quantity": 1,
      "unitPrice": 35000,
      "totalPrice": 35000,
      "note": null,
      "options": null
    }
  ]
}
```

## Sync Logic Implementation

### Main Sync Function

```typescript
// food-orders.service.ts
interface SyncResult {
  newOrders: FoodOrder[];
  updatedOrders: FoodOrder[];
  unchangedCount: number;
  errors: SyncError[];
}

async function syncOrdersToDb(
  rawOrders: RawFoodOrder[],
  branchId: number
): Promise<SyncResult> {
  const result: SyncResult = {
    newOrders: [],
    updatedOrders: [],
    unchangedCount: 0,
    errors: [],
  };

  // Process in batches for better performance
  const batchSize = 50;
  const batches = chunk(rawOrders, batchSize);

  for (const batch of batches) {
    await this.processBatch(batch, branchId, result);
  }

  return result;
}

private async processBatch(
  orders: RawFoodOrder[],
  branchId: number,
  result: SyncResult
): Promise<void> {
  // 1. Get order_codes để query một lần
  const orderCodes = orders.map(o => o.orderCode);

  // 2. Query existing orders
  const existingOrders = await this.foodOrderRepo.find({
    where: {
      branchId,
      orderCode: In(orderCodes),
    },
  });

  const existingMap = new Map(
    existingOrders.map(o => [`${o.platform}:${o.orderCode}`, o])
  );

  // 3. Process each order
  for (const rawOrder of orders) {
    try {
      const key = `${rawOrder.platform}:${rawOrder.orderCode}`;
      const existing = existingMap.get(key);

      if (!existing) {
        // NEW ORDER
        const newOrder = await this.insertNewOrder(rawOrder);
        result.newOrders.push(newOrder);
      } else {
        // CHECK FOR UPDATES
        const changes = this.detectChanges(existing, rawOrder);

        if (changes.hasChanges) {
          const updatedOrder = await this.updateExistingOrder(
            existing,
            rawOrder,
            changes
          );
          result.updatedOrders.push(updatedOrder);
        } else {
          // Just update last_synced_at
          await this.touchOrder(existing.id);
          result.unchangedCount++;
        }
      }
    } catch (error) {
      result.errors.push({
        orderCode: rawOrder.orderCode,
        platform: rawOrder.platform,
        error: error.message,
      });
    }
  }
}
```

### Insert New Order

```typescript
private async insertNewOrder(rawOrder: RawFoodOrder): Promise<FoodOrder> {
  const order = this.foodOrderRepo.create({
    externalOrderId: rawOrder.externalOrderId,
    orderCode: rawOrder.orderCode,
    platform: rawOrder.platform,
    tenantId: rawOrder.tenantId,
    branchId: rawOrder.branchId,
    accountId: rawOrder.accountId,

    status: rawOrder.status,

    customerName: rawOrder.customerName,
    customerPhone: rawOrder.customerPhone,
    customerAddress: rawOrder.customerAddress,
    customerNote: rawOrder.customerNote,

    items: rawOrder.items,

    subtotal: rawOrder.subtotal,
    deliveryFee: rawOrder.deliveryFee,
    platformFee: rawOrder.platformFee,
    discount: rawOrder.discount,
    totalAmount: rawOrder.totalAmount,
    isPaid: rawOrder.isPaid,
    paymentMethod: rawOrder.paymentMethod,

    driverName: rawOrder.driverName,
    driverPhone: rawOrder.driverPhone,
    estimatedDeliveryTime: rawOrder.estimatedDeliveryTime,

    platformCreatedAt: rawOrder.createdAt,
    platformUpdatedAt: rawOrder.platformUpdatedAt,

    firstSyncedAt: new Date(),
    lastSyncedAt: new Date(),
    syncCount: 1,
  });

  const saved = await this.foodOrderRepo.save(order);

  // Log for audit
  await this.auditLog({
    action: 'ORDER_CREATED',
    orderId: saved.id,
    orderCode: saved.orderCode,
    platform: saved.platform,
  });

  return saved;
}
```

### Detect Changes

```typescript
interface OrderChanges {
  hasChanges: boolean;
  statusChanged: boolean;
  driverAssigned: boolean;
  driverChanged: boolean;
  fieldsChanged: string[];
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
}

private detectChanges(
  existing: FoodOrder,
  incoming: RawFoodOrder
): OrderChanges {
  const changes: OrderChanges = {
    hasChanges: false,
    statusChanged: false,
    driverAssigned: false,
    driverChanged: false,
    fieldsChanged: [],
    previousValues: {},
    newValues: {},
  };

  // 1. Check status change
  if (existing.status !== incoming.status) {
    changes.hasChanges = true;
    changes.statusChanged = true;
    changes.fieldsChanged.push('status');
    changes.previousValues.status = existing.status;
    changes.newValues.status = incoming.status;
  }

  // 2. Check driver assignment
  if (!existing.driverName && incoming.driverName) {
    changes.hasChanges = true;
    changes.driverAssigned = true;
    changes.fieldsChanged.push('driverName', 'driverPhone');
    changes.newValues.driverName = incoming.driverName;
    changes.newValues.driverPhone = incoming.driverPhone;
  } else if (existing.driverName !== incoming.driverName) {
    changes.hasChanges = true;
    changes.driverChanged = true;
    changes.fieldsChanged.push('driverName', 'driverPhone');
    changes.previousValues.driverName = existing.driverName;
    changes.newValues.driverName = incoming.driverName;
  }

  // 3. Check customer info updates
  const customerFields = ['customerName', 'customerPhone', 'customerAddress', 'customerNote'];
  for (const field of customerFields) {
    if (existing[field] !== incoming[field]) {
      changes.hasChanges = true;
      changes.fieldsChanged.push(field);
      changes.previousValues[field] = existing[field];
      changes.newValues[field] = incoming[field];
    }
  }

  // 4. Check payment status
  if (existing.isPaid !== incoming.isPaid) {
    changes.hasChanges = true;
    changes.fieldsChanged.push('isPaid');
    changes.previousValues.isPaid = existing.isPaid;
    changes.newValues.isPaid = incoming.isPaid;
  }

  // 5. Check estimated delivery time
  if (existing.estimatedDeliveryTime !== incoming.estimatedDeliveryTime) {
    changes.hasChanges = true;
    changes.fieldsChanged.push('estimatedDeliveryTime');
    changes.newValues.estimatedDeliveryTime = incoming.estimatedDeliveryTime;
  }

  return changes;
}
```

### Update Existing Order

```typescript
private async updateExistingOrder(
  existing: FoodOrder,
  incoming: RawFoodOrder,
  changes: OrderChanges
): Promise<FoodOrder> {
  // Build update object
  const updateData: Partial<FoodOrder> = {
    lastSyncedAt: new Date(),
    syncCount: existing.syncCount + 1,
    platformUpdatedAt: incoming.platformUpdatedAt,
  };

  // Apply status change
  if (changes.statusChanged) {
    updateData.previousStatus = existing.status;
    updateData.status = incoming.status;

    // Set timestamp based on new status
    switch (incoming.status) {
      case 'accepted':
        updateData.acceptedAt = new Date();
        break;
      case 'preparing':
        // No specific timestamp
        break;
      case 'ready':
        updateData.preparedAt = new Date();
        break;
      case 'completed':
        updateData.completedAt = new Date();
        break;
      case 'cancelled':
        updateData.cancelledAt = new Date();
        break;
    }
  }

  // Apply driver info
  if (changes.driverAssigned || changes.driverChanged) {
    updateData.driverName = incoming.driverName;
    updateData.driverPhone = incoming.driverPhone;
    updateData.estimatedDeliveryTime = incoming.estimatedDeliveryTime;
  }

  // Apply customer info changes
  if (changes.fieldsChanged.includes('customerName')) {
    updateData.customerName = incoming.customerName;
  }
  if (changes.fieldsChanged.includes('customerPhone')) {
    updateData.customerPhone = incoming.customerPhone;
  }
  if (changes.fieldsChanged.includes('customerAddress')) {
    updateData.customerAddress = incoming.customerAddress;
  }
  if (changes.fieldsChanged.includes('customerNote')) {
    updateData.customerNote = incoming.customerNote;
  }

  // Apply payment changes
  if (changes.fieldsChanged.includes('isPaid')) {
    updateData.isPaid = incoming.isPaid;
  }

  // Update in DB
  await this.foodOrderRepo.update(existing.id, updateData);

  // Log for audit
  await this.auditLog({
    action: 'ORDER_UPDATED',
    orderId: existing.id,
    orderCode: existing.orderCode,
    platform: existing.platform,
    changes: changes.fieldsChanged,
    previousValues: changes.previousValues,
    newValues: changes.newValues,
  });

  // Return updated order
  return {
    ...existing,
    ...updateData,
    _changes: changes, // Include changes info for CCB
  };
}
```

## Status Flow Tracking

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Status Transitions                                                      │
│                                                                          │
│  ┌───────┐                                                               │
│  │  NEW  │ ← Đơn hàng vừa được đặt                                       │
│  └───┬───┘                                                               │
│      │                                                                   │
│      │ [Accept] - Nhà hàng xác nhận                                      │
│      ▼                                                                   │
│  ┌──────────┐                                                            │
│  │ ACCEPTED │ ← Đã nhận đơn, bắt đầu chuẩn bị                            │
│  └────┬─────┘                                                            │
│       │                                                                  │
│       │ [Start Preparing] - Bắt đầu làm                                  │
│       ▼                                                                  │
│  ┌───────────┐                                                           │
│  │ PREPARING │ ← Đang chuẩn bị món                                       │
│  └─────┬─────┘                                                           │
│        │                                                                 │
│        │ [Mark Ready] - Đã xong, chờ giao                                │
│        ▼                                                                 │
│  ┌───────┐                                                               │
│  │ READY │ ← Sẵn sàng giao cho tài xế                                    │
│  └───┬───┘                                                               │
│      │                                                                   │
│      │ [Driver Assigned] - Platform gán tài xế                           │
│      ▼                                                                   │
│  ┌────────────┐                                                          │
│  │ DELIVERING │ ← Tài xế đang giao                                       │
│  └──────┬─────┘                                                          │
│         │                                                                │
│         │ [Delivered] - Giao thành công                                  │
│         ▼                                                                │
│  ┌───────────┐                                                           │
│  │ COMPLETED │ ← Hoàn thành                                              │
│  └───────────┘                                                           │
│                                                                          │
│  Note: Bất kỳ lúc nào cũng có thể chuyển sang CANCELLED                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Conflict Resolution

### Same Order, Multiple Sources

Nếu cùng một đơn được poll từ nhiều nguồn (rare case):

```typescript
// Conflict resolution strategy: Platform timestamp wins
function resolveConflict(
  existing: FoodOrder,
  incoming: RawFoodOrder
): 'keep' | 'update' {
  // So sánh platform_updated_at
  if (incoming.platformUpdatedAt > existing.platformUpdatedAt) {
    return 'update';
  }
  return 'keep';
}
```

### Status Regression Prevention

Không cho phép status đi ngược:

```typescript
const STATUS_ORDER = {
  'new': 1,
  'accepted': 2,
  'preparing': 3,
  'ready': 4,
  'delivering': 5,
  'completed': 6,
  'cancelled': 99, // Special case
};

function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  // Allow cancellation from any status
  if (newStatus === 'cancelled') {
    return true;
  }

  // Don't allow going backwards
  return STATUS_ORDER[newStatus] >= STATUS_ORDER[currentStatus];
}
```

## Batch Processing Optimization

### Bulk Insert

```typescript
// Sử dụng bulk insert cho performance
async function bulkInsertOrders(orders: FoodOrder[]): Promise<FoodOrder[]> {
  const result = await this.foodOrderRepo
    .createQueryBuilder()
    .insert()
    .into(FoodOrder)
    .values(orders)
    .orIgnore() // Skip if duplicate (by unique constraint)
    .returning('*')
    .execute();

  return result.generatedMaps as FoodOrder[];
}
```

### Bulk Update

```typescript
// Bulk update với CASE statement
async function bulkUpdateOrders(
  updates: { id: string; status: string; driverName?: string }[]
): Promise<void> {
  if (updates.length === 0) return;

  const ids = updates.map(u => u.id);

  // Build CASE statement for status
  let statusCase = 'CASE id';
  for (const u of updates) {
    statusCase += ` WHEN '${u.id}' THEN '${u.status}'`;
  }
  statusCase += ' END';

  await this.foodOrderRepo
    .createQueryBuilder()
    .update(FoodOrder)
    .set({
      status: () => statusCase,
      lastSyncedAt: new Date(),
    })
    .whereInIds(ids)
    .execute();
}
```

## Data Retention

### Cleanup Old Orders

```typescript
// Xóa đơn hàng cũ đã hoàn thành (> 30 ngày)
@Cron('0 3 * * *') // Chạy lúc 3 AM mỗi ngày
async cleanupOldOrders() {
  const retentionDays = 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Archive trước khi xóa
  await this.archiveOrders(cutoffDate);

  // Xóa
  const result = await this.foodOrderRepo
    .createQueryBuilder()
    .delete()
    .where('status IN (:...statuses)', {
      statuses: ['completed', 'cancelled']
    })
    .andWhere('created_at < :cutoff', { cutoff: cutoffDate })
    .execute();

  this.logger.log(`Cleaned up ${result.affected} old orders`);
}
```

### Archive to Cold Storage

```typescript
async function archiveOrders(beforeDate: Date): Promise<void> {
  // Move to archive table
  await this.db.query(`
    INSERT INTO food_orders_archive
    SELECT * FROM food_orders
    WHERE status IN ('completed', 'cancelled')
      AND created_at < $1
  `, [beforeDate]);
}
```

## Audit Trail

### Order History Table

```sql
CREATE TABLE food_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES food_orders(id),
  action VARCHAR(50) NOT NULL,  -- CREATED, STATUS_CHANGED, DRIVER_ASSIGNED, etc.
  previous_value JSONB,
  new_value JSONB,
  changed_by VARCHAR(100),      -- 'system', 'platform', user_id
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_food_order_history_order ON food_order_history(order_id);
```

### Logging Example

```typescript
async function logOrderHistory(
  orderId: string,
  action: string,
  previousValue: any,
  newValue: any,
  changedBy: string = 'system'
): Promise<void> {
  await this.orderHistoryRepo.insert({
    orderId,
    action,
    previousValue,
    newValue,
    changedBy,
    changedAt: new Date(),
  });
}

// Usage
await logOrderHistory(
  order.id,
  'STATUS_CHANGED',
  { status: 'ready' },
  { status: 'delivering', driverName: 'Nguyễn Văn A' },
  'platform'
);
```

## Performance Metrics

```typescript
interface SyncMetrics {
  totalOrdersProcessed: number;
  newOrdersInserted: number;
  ordersUpdated: number;
  ordersUnchanged: number;
  errors: number;
  processingTimeMs: number;
  dbQueryTimeMs: number;
  platformApiTimeMs: number;
}

// Log metrics after each sync
async function logSyncMetrics(metrics: SyncMetrics): Promise<void> {
  this.logger.log('Sync completed', {
    ...metrics,
    ordersPerSecond: metrics.totalOrdersProcessed / (metrics.processingTimeMs / 1000),
  });

  // Store for dashboard
  await this.metricsService.record('food_order_sync', metrics);
}
```

## Error Recovery

### Failed Sync Recovery

```typescript
// Retry failed syncs
@Cron('*/5 * * * *') // Mỗi 5 phút
async retryFailedSyncs(): Promise<void> {
  // Get orders that failed to sync
  const failedOrders = await this.syncErrorRepo.find({
    where: {
      retryCount: LessThan(5),
      lastRetryAt: LessThan(new Date(Date.now() - 5 * 60 * 1000)),
    },
  });

  for (const error of failedOrders) {
    try {
      await this.reprocessOrder(error.rawData);
      await this.syncErrorRepo.delete(error.id);
    } catch (e) {
      await this.syncErrorRepo.update(error.id, {
        retryCount: error.retryCount + 1,
        lastRetryAt: new Date(),
        lastError: e.message,
      });
    }
  }
}
```

## Tiếp theo

- [Hiển thị trên CCB](./ccb-display.md) - UI và UX trên CCB Android
