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
│   │  • Lưu trữ tất cả dữ liệu (Company/Brand/Branch)        │   │
│   │  • Multi-tenant (phân biệt bằng company_id, branch_id)  │   │
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
│   │           SQLite (CCB/Order App/Local Server)           │   │
│   │                                                          │   │
│   │  • Source of Truth trong cửa hàng                       │   │
│   │  • Hoạt động offline                                     │   │
│   │  • Sync lên PostgreSQL khi có mạng                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Cấu trúc phân cấp

```
CLOUD DATABASE (PostgreSQL)
│
├── companies (Công ty)
│   ├── id (UUID)
│   ├── name
│   ├── tax_code
│   └── owner_id
│
├── brands (Thương hiệu)
│   ├── id (UUID)
│   ├── company_id (FK → companies)
│   ├── name
│   └── logo_url
│
├── branches (Chi nhánh)
│   ├── id (UUID)
│   ├── brand_id (FK → brands)
│   ├── name
│   ├── store_code
│   └── model_type
│
├── packages (Gói dịch vụ)
│   ├── id (UUID)
│   ├── name
│   └── max_connections
│
└── package_purchases (Lịch sử mua gói)
    ├── branch_id
    ├── package_id
    └── end_date
```

## So sánh

| Tiêu chí | SQLite (Local) | PostgreSQL (Cloud) |
|----------|----------------|-------------------|
| Vị trí | CCB/Order App/Local Server | Cloud Server |
| Mục đích | Hoạt động offline | Lưu trữ lâu dài, báo cáo |
| Dữ liệu | 1 chi nhánh | Tất cả công ty, thương hiệu, chi nhánh |
| Truy cập | Nhanh, local | Qua API |
| Backup | Manual | Tự động |

## Phân loại dữ liệu

### Organization Data

Dữ liệu cấu trúc tổ chức (chỉ trên Cloud):

- Công ty (companies)
- Thương hiệu (brands)
- Chi nhánh (branches)
- Gói dịch vụ (packages)
- Hạng mục thu/chi (transaction_categories)

### Master Data

Dữ liệu ít thay đổi, được đồng bộ từ Server xuống thiết bị:

- Danh mục (categories)
- Sản phẩm (products)
- Khu vực (areas)
- Bàn (tables)
- Nhân viên (users/staff)

### Transactional Data

Dữ liệu phát sinh trong quá trình bán hàng, được đồng bộ từ thiết bị lên Server:

- Đơn hàng (orders)
- Chi tiết đơn hàng (order_items)
- Ca làm việc (shifts)
- Lịch sử điểm (point_transactions)
- Thu chi (transactions)

### Cached Data

Dữ liệu cache từ Server, có thể refresh:

- Thông tin khách hàng (customers)
- Cấu hình chi nhánh

## Cloud Database Schema

### Companies

```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(50),
    address TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    owner_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Brands

```sql
CREATE TABLE brands (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Branches

```sql
CREATE TABLE branches (
    id UUID PRIMARY KEY,
    brand_id UUID REFERENCES brands(id),
    name VARCHAR(255) NOT NULL,
    store_code VARCHAR(20) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    opening_hours JSONB,
    model_type VARCHAR(20),  -- 'order_only', 'ccb_only', 'full_system'
    package_id UUID REFERENCES packages(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Packages

```sql
CREATE TABLE packages (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    max_connections INTEGER,  -- NULL = unlimited
    price_monthly DECIMAL(12,2),
    price_yearly DECIMAL(12,2),
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Default packages
INSERT INTO packages (id, name, max_connections) VALUES
('basic', 'Basic', 3),
('standard', 'Standard', 10),
('premium', 'Premium', 30),
('enterprise', 'Enterprise', NULL);  -- Unlimited
```

### Package Purchases

```sql
CREATE TABLE package_purchases (
    id UUID PRIMARY KEY,
    branch_id UUID REFERENCES branches(id),
    package_id UUID REFERENCES packages(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price_paid DECIMAL(12,2),
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Transaction Categories

```sql
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL,  -- 'income' or 'expense'
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Default categories
INSERT INTO transaction_categories (company_id, code, name, type, is_default) VALUES
(NULL, 'INC001', 'Doanh thu bán hàng', 'income', true),
(NULL, 'INC002', 'Tiền tip', 'income', true),
(NULL, 'INC003', 'Thu nhập khác', 'income', true),
(NULL, 'EXP001', 'Mua nguyên liệu', 'expense', true),
(NULL, 'EXP002', 'Tiền điện nước', 'expense', true),
(NULL, 'EXP003', 'Lương nhân viên', 'expense', true),
(NULL, 'EXP004', 'Chi phí khác', 'expense', true);
```

## Nguyên tắc thiết kế

### 1. UUID cho Primary Key

```sql
-- Đúng ✅
id TEXT PRIMARY KEY  -- UUID (SQLite)
id UUID PRIMARY KEY  -- UUID (PostgreSQL)

-- Sai ❌
id INTEGER PRIMARY KEY AUTOINCREMENT
```

Lý do: Tránh conflict khi sync giữa nhiều thiết bị.

### 2. Soft Delete

```sql
-- Đánh dấu xóa thay vì xóa thật
is_active INTEGER DEFAULT 1  -- SQLite
is_active BOOLEAN DEFAULT true  -- PostgreSQL
status VARCHAR(20) DEFAULT 'active'  -- Cả hai
```

Lý do: Giữ dữ liệu cho báo cáo, có thể khôi phục.

### 3. Timestamps

```sql
-- SQLite
created_at TEXT DEFAULT CURRENT_TIMESTAMP
updated_at TEXT DEFAULT CURRENT_TIMESTAMP

-- PostgreSQL
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
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

### Cloud (PostgreSQL)

```sql
-- Index cho multi-tenant
CREATE INDEX idx_brands_company ON brands(company_id);
CREATE INDEX idx_branches_brand ON branches(brand_id);
CREATE INDEX idx_orders_branch ON orders(branch_id);

-- Index cho query
CREATE INDEX idx_branches_store_code ON branches(store_code);
CREATE INDEX idx_package_purchases_branch ON package_purchases(branch_id, status);
```

### Local (SQLite)

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

-- PostgreSQL
ALTER TABLE orders RENAME COLUMN old_name TO new_name;
```

### Xóa cột

```sql
-- SQLite không hỗ trợ DROP COLUMN
-- Cần tạo bảng mới và migrate dữ liệu

-- PostgreSQL
ALTER TABLE orders DROP COLUMN column_name;
```

## Connection Limits

Hệ thống quản lý số lượng kết nối theo gói dịch vụ:

| Gói | Max Connections | Mô tả |
|-----|-----------------|-------|
| Basic | 3 | 1 CCB + 2 Order App |
| Standard | 10 | Quán vừa |
| Premium | 30 | Quán lớn |
| Enterprise | Unlimited | Chuỗi, franchise |

```sql
-- Kiểm tra khi thiết bị kết nối
SELECT p.max_connections, COUNT(*) as current_connections
FROM branches b
JOIN packages p ON b.package_id = p.id
JOIN active_connections ac ON ac.branch_id = b.id
WHERE b.id = :branch_id
GROUP BY p.max_connections;
```
