---
sidebar_position: 1
---

# Tổng quan Database

Hệ thống sử dụng 2 loại database với mục đích khác nhau.

## Kiến trúc Database

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD                                   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   PostgreSQL                             │   │
│   │                                                          │   │
│   │  • Lưu trữ tất cả dữ liệu các quán                      │   │
│   │  • Multi-tenant (phân biệt bằng store_id)               │   │
│   │  • Backup tự động                                        │   │
│   │  • Báo cáo tổng hợp                                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ Sync                             │
│                              ▼                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                         CỬA HÀNG                                │
│                              │                                  │
│   ┌──────────────────────────▼──────────────────────────────┐   │
│   │                   SQLite (CCB)                           │   │
│   │                                                          │   │
│   │  • Source of Truth trong cửa hàng                       │   │
│   │  • Hoạt động offline                                     │   │
│   │  • Sync lên PostgreSQL khi có mạng                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## So sánh

| Tiêu chí | SQLite (Local) | PostgreSQL (Cloud) |
|----------|----------------|-------------------|
| Vị trí | CCB/Order App | Server |
| Mục đích | Hoạt động offline | Lưu trữ lâu dài, báo cáo |
| Dữ liệu | 1 quán | Tất cả quán |
| Truy cập | Nhanh, local | Qua API |
| Backup | Manual | Tự động |

## Phân loại dữ liệu

### Master Data

Dữ liệu ít thay đổi, được đồng bộ từ Server xuống CCB:

- Danh mục (categories)
- Sản phẩm (products)
- Khu vực (areas)
- Bàn (tables)
- Nhân viên (users/staff)

### Transactional Data

Dữ liệu phát sinh trong quá trình bán hàng, được đồng bộ từ CCB lên Server:

- Đơn hàng (orders)
- Chi tiết đơn hàng (order_items)
- Ca làm việc (shifts)
- Lịch sử điểm (point_transactions)

### Cached Data

Dữ liệu cache từ Server, có thể refresh:

- Thông tin khách hàng (customers)
- Cấu hình quán

## Nguyên tắc thiết kế

### 1. UUID cho Primary Key

```sql
-- Đúng ✅
id TEXT PRIMARY KEY  -- UUID

-- Sai ❌
id INTEGER PRIMARY KEY AUTOINCREMENT
```

Lý do: Tránh conflict khi sync giữa nhiều thiết bị.

### 2. Soft Delete

```sql
-- Đánh dấu xóa thay vì xóa thật
is_active INTEGER DEFAULT 1
```

Lý do: Giữ dữ liệu cho báo cáo, có thể khôi phục.

### 3. Timestamps

```sql
created_at TEXT DEFAULT CURRENT_TIMESTAMP
updated_at TEXT DEFAULT CURRENT_TIMESTAMP
```

Lý do: Tracking thay đổi, hỗ trợ conflict resolution.

### 4. Version Control

```sql
version INTEGER DEFAULT 1
```

Lý do: Optimistic locking, phát hiện conflict.

### 5. Sync Status

```sql
sync_status TEXT DEFAULT 'pending'  -- pending, syncing, synced, failed
synced_at TEXT
retry_count INTEGER DEFAULT 0
```

Lý do: Quản lý trạng thái đồng bộ.

## Indexes quan trọng

```sql
-- Tối ưu sync
CREATE INDEX idx_orders_sync ON orders(sync_status, created_at);

-- Tối ưu query theo ngày
CREATE INDEX idx_orders_date ON orders(created_at);

-- Tối ưu query theo bàn
CREATE INDEX idx_orders_table ON orders(table_id, status);

-- Tối ưu chi tiết đơn
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

## Migration Strategy

### Thêm cột mới

```sql
-- 1. Thêm cột với giá trị default
ALTER TABLE orders ADD COLUMN discount_type TEXT DEFAULT NULL;

-- 2. Không yêu cầu NOT NULL ngay
-- 3. Update dữ liệu cũ nếu cần
-- 4. Sau đó mới thêm constraint
```

### Đổi tên cột

```sql
-- SQLite không hỗ trợ RENAME COLUMN trước version 3.25
-- Cần tạo bảng mới và migrate dữ liệu
```

### Xóa cột

```sql
-- SQLite không hỗ trợ DROP COLUMN
-- Cần tạo bảng mới và migrate dữ liệu
```
