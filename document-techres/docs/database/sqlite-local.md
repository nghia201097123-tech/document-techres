---
sidebar_position: 2
---

# SQLite Local (CCB)

Schema SQLite được sử dụng trên CCB App và Order App (Standalone mode).

## Schema

### Bảng areas (Khu vực)

```sql
CREATE TABLE areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    synced_at TEXT,
    version INTEGER DEFAULT 1
);
```

### Bảng tables (Bàn)

```sql
CREATE TABLE tables (
    id TEXT PRIMARY KEY,
    area_id TEXT,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 4,
    status TEXT DEFAULT 'available', -- available, occupied, reserved
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    synced_at TEXT,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (area_id) REFERENCES areas(id)
);
```

### Bảng categories (Danh mục)

```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    synced_at TEXT,
    version INTEGER DEFAULT 1
);
```

### Bảng products (Sản phẩm)

```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    category_id TEXT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    image_url TEXT,
    description TEXT,
    is_available INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    synced_at TEXT,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### Bảng orders (Đơn hàng)

```sql
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    order_number INTEGER,
    table_id TEXT,
    customer_id TEXT,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, cancelled
    subtotal REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    discount_type TEXT, -- percent, fixed, points
    tax_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    payment_method TEXT, -- cash, transfer, card
    payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid
    note TEXT,
    created_by TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    synced_at TEXT,
    retry_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (table_id) REFERENCES tables(id)
);
```

### Bảng order_items (Chi tiết đơn)

```sql
CREATE TABLE order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_price REAL NOT NULL,
    quantity INTEGER DEFAULT 1,
    note TEXT,
    status TEXT DEFAULT 'pending', -- pending, preparing, ready, served
    printed_to_kitchen INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Bảng users (Nhân viên)

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    pin_code TEXT, -- Mã PIN đăng nhập nhanh
    role TEXT DEFAULT 'staff', -- admin, cashier, staff
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    synced_at TEXT,
    version INTEGER DEFAULT 1
);
```

### Bảng shifts (Ca làm việc)

```sql
CREATE TABLE shifts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    opening_cash REAL DEFAULT 0,
    closing_cash REAL,
    total_sales REAL DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    note TEXT,
    status TEXT DEFAULT 'open', -- open, closed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    synced_at TEXT,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Bảng customers (Cache khách hàng)

```sql
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT UNIQUE,
    email TEXT,
    points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TEXT
);
```

### Bảng daily_summaries (Báo cáo ngày)

```sql
CREATE TABLE daily_summaries (
    date TEXT PRIMARY KEY,
    total_orders INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    total_discount REAL DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    avg_order_value REAL DEFAULT 0,
    cash_amount REAL DEFAULT 0,
    transfer_amount REAL DEFAULT 0,
    card_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Bảng activity_logs (Log hoạt động)

```sql
CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT NOT NULL, -- order_created, payment_completed, item_cancelled...
    entity_type TEXT, -- order, product, table...
    entity_id TEXT,
    details TEXT, -- JSON chi tiết
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Bảng sync_queue (Queue đồng bộ)

```sql
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL, -- insert, update, delete
    data TEXT, -- JSON data
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    next_retry_at TEXT
);
```

### Bảng print_jobs (Hàng đợi in)

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

## Indexes

```sql
CREATE INDEX idx_orders_sync ON orders(sync_status, created_at);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_orders_table ON orders(table_id, status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_tables_area ON tables(area_id);
CREATE INDEX idx_logs_date ON activity_logs(created_at);
```
