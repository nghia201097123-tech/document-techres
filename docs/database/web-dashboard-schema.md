---
sidebar_position: 3
---

# Schema Web Dashboard

Schema các bảng liên quan đến chức năng Web Dashboard.

## 1. Quản lý Nhân sự

### Departments (Bộ phận - Cấp Công ty)

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    parent_id UUID REFERENCES departments(id),  -- Bộ phận cha (null = root)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_departments_company ON departments(company_id);
CREATE INDEX idx_departments_parent ON departments(parent_id);
```

**Ví dụ cấu trúc cha-con:**
```
Bộ phận Bếp (parent_id = NULL)
    ├── Bếp chính (parent_id = Bộ phận Bếp)
    ├── Bếp phụ (parent_id = Bộ phận Bếp)
    └── Sơ chế (parent_id = Bộ phận Bếp)
```

### Staff (Nhân viên - Cấp Chi nhánh)

```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    department_id UUID REFERENCES departments(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    pin_code VARCHAR(10),              -- Mã PIN đăng nhập nhanh
    role VARCHAR(50) DEFAULT 'staff',  -- cashier, staff, kitchen
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(branch_id, pin_code)
);

CREATE INDEX idx_staff_branch ON staff(branch_id);
CREATE INDEX idx_staff_department ON staff(department_id);
```

### Permission Groups (Nhóm quyền)

```sql
CREATE TABLE permission_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,     -- menu_management, order_management...
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Danh sách nhóm quyền mẫu:**

| Code | Tên | Mô tả |
|------|-----|-------|
| `menu_management` | Quản lý Menu | Xem/Thêm/Sửa/Xóa món |
| `table_management` | Quản lý Bàn | Xem/Thêm/Sửa/Xóa bàn, Chuyển/Gộp bàn |
| `order_management` | Quản lý Order | Tạo/Sửa/Hủy/Xem order |
| `payment` | Thanh toán | Thanh toán các phương thức, Áp dụng giảm giá |
| `shift_management` | Quản lý Ca | Mở/Đóng ca, Xem báo cáo ca |
| `reports` | Báo cáo | Xem doanh thu, Best seller, Xuất báo cáo |
| `staff_management` | Quản lý NV | Xem/Thêm/Sửa/Xóa nhân viên |
| `customer_management` | Quản lý KH | Xem/Thêm/Sửa khách hàng, điểm |
| `transaction` | Thu/Chi | Tạo phiếu thu/chi |
| `settings` | Cài đặt | Máy in, thanh toán, chung |

### Permissions (Quyền chi tiết)

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES permission_groups(id),
    code VARCHAR(100) UNIQUE NOT NULL,     -- menu.view, menu.create, menu.edit...
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_group ON permissions(group_id);
```

**Ví dụ quyền trong nhóm `order_management`:**

| Code | Tên |
|------|-----|
| `order.view` | Xem order |
| `order.create` | Tạo order |
| `order.edit` | Sửa order |
| `order.cancel` | Hủy order |

### Department Permissions (Quyền của Bộ phận)

```sql
CREATE TABLE department_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(department_id, permission_id)
);

CREATE INDEX idx_department_permissions_dept ON department_permissions(department_id);
```

### Staff Permissions (Quyền của Nhân viên)

```sql
CREATE TABLE staff_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(staff_id, permission_id)
);

CREATE INDEX idx_staff_permissions_staff ON staff_permissions(staff_id);
CREATE INDEX idx_staff_permissions_permission ON staff_permissions(permission_id);
```

---

## 2. Dữ liệu Bán hàng

### Categories (Danh mục - Cấp Thương hiệu)

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    product_type VARCHAR(50) NOT NULL,     -- food, drink, other, topping, combo
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_brand ON categories(brand_id);
CREATE INDEX idx_categories_type ON categories(product_type);
```

### Units (Đơn vị - Cấp Thương hiệu)

```sql
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    name VARCHAR(100) NOT NULL,            -- Phần, Ly, Chai, Đĩa...
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_units_brand ON units(brand_id);
```

### Products (Món ăn - Cấp Thương hiệu)

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    category_id UUID REFERENCES categories(id),
    unit_id UUID REFERENCES units(id),

    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),                      -- Mã món
    price DECIMAL(12,2) NOT NULL,
    image_url TEXT,
    description TEXT,

    -- Loại món
    product_type VARCHAR(50) NOT NULL,     -- food, drink, other, topping, combo

    -- Cài đặt hiển thị
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    show_in_menu BOOLEAN DEFAULT true,     -- Topping thì false

    -- Cài đặt in
    print_to_kitchen BOOLEAN DEFAULT true, -- In ra bếp
    print_stamp BOOLEAN DEFAULT false,     -- In tem dán

    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_type ON products(product_type);
```

### Product Notes (Ghi chú mẫu - Cấp Thương hiệu)

```sql
CREATE TABLE product_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    name VARCHAR(255) NOT NULL,            -- Ít đá, Nhiều đường, Không hành...
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_notes_brand ON product_notes(brand_id);
```

### Cancel Reasons (Lý do hủy - Cấp Thương hiệu)

```sql
CREATE TABLE cancel_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    name VARCHAR(255) NOT NULL,            -- Hết nguyên liệu, Khách đổi ý...
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cancel_reasons_brand ON cancel_reasons(brand_id);
```

### Coupons (Mã giảm giá - Cấp Thương hiệu)

```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    code VARCHAR(50) UNIQUE NOT NULL,      -- GIAMGIA10, FREESHIP...
    name VARCHAR(255) NOT NULL,
    discount_type VARCHAR(20) NOT NULL,    -- percent, fixed
    discount_value DECIMAL(12,2) NOT NULL,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    max_discount DECIMAL(12,2),            -- Giảm tối đa (nếu là percent)
    usage_limit INTEGER,                   -- Số lần sử dụng tối đa
    used_count INTEGER DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_brand ON coupons(brand_id);
CREATE INDEX idx_coupons_code ON coupons(code);
```

### Product Toppings (Topping của món)

```sql
CREATE TABLE product_toppings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),    -- Món chính
    topping_id UUID NOT NULL REFERENCES products(id),    -- Món topping
    is_required BOOLEAN DEFAULT false,     -- Bắt buộc chọn?
    max_quantity INTEGER DEFAULT 1,        -- Số lượng tối đa
    extra_price DECIMAL(12,2) DEFAULT 0,   -- Giá thêm
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(product_id, topping_id)
);

CREATE INDEX idx_product_toppings_product ON product_toppings(product_id);
```

### Combo Items (Món trong Combo)

```sql
CREATE TABLE combo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_id UUID NOT NULL REFERENCES products(id),      -- Combo
    product_id UUID NOT NULL REFERENCES products(id),    -- Món trong combo
    quantity INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(combo_id, product_id)
);

CREATE INDEX idx_combo_items_combo ON combo_items(combo_id);
```

### Product Price Adjustments (Món tăng giá - Cấp Chi nhánh)

```sql
CREATE TABLE product_price_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    product_id UUID NOT NULL REFERENCES products(id),
    adjusted_price DECIMAL(12,2) NOT NULL, -- Giá mới tại chi nhánh
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(branch_id, product_id)
);

CREATE INDEX idx_product_price_adjustments_branch ON product_price_adjustments(branch_id);
```

---

## 3. Dữ liệu Bếp

### Kitchen Stations (Bếp - Cấp Chi nhánh)

```sql
CREATE TABLE kitchen_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,            -- Bếp chính, Quầy Bar, Bếp lạnh...
    printer_name VARCHAR(255),             -- Tên máy in gắn với bếp
    printer_ip VARCHAR(50),                -- IP máy in (nếu LAN)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kitchen_stations_branch ON kitchen_stations(branch_id);
```

### Product Kitchen Mapping (Gán món vào bếp - Cấp Chi nhánh)

```sql
CREATE TABLE product_kitchen_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    product_id UUID NOT NULL REFERENCES products(id),
    kitchen_station_id UUID NOT NULL REFERENCES kitchen_stations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(branch_id, product_id, kitchen_station_id)
);

CREATE INDEX idx_product_kitchen_mapping_branch ON product_kitchen_mapping(branch_id);
```

---

## 4. Hóa đơn điện tử (E-Invoice)

### E-Invoice Providers (Đối tác HĐĐT)

```sql
CREATE TABLE e_invoice_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,      -- FPT, INVOICE, MIFI, VNPT, MISA, HILO, VIETTEL
    name VARCHAR(255) NOT NULL,
    api_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default providers
INSERT INTO e_invoice_providers (code, name) VALUES
('FPT', 'FPT Invoice'),
('INVOICE', 'INVOICE'),
('MIFI', 'MIFI'),
('VNPT', 'VNPT Invoice'),
('MISA', 'MISA Invoice'),
('HILO', 'HILO'),
('VIETTEL', 'Viettel S-Invoice');
```

### Branch E-Invoice Config (Cấu hình HĐĐT theo Chi nhánh)

```sql
CREATE TABLE branch_e_invoice_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    provider_id UUID NOT NULL REFERENCES e_invoice_providers(id),
    api_key TEXT,
    api_secret TEXT,
    username VARCHAR(255),
    password_encrypted TEXT,
    settings JSONB DEFAULT '{}',           -- Cấu hình riêng theo provider
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(branch_id)                      -- Mỗi chi nhánh chỉ 1 provider
);
```

### E-Invoices (Hóa đơn điện tử)

```sql
CREATE TABLE e_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    provider_id UUID NOT NULL REFERENCES e_invoice_providers(id),

    -- Thông tin HĐĐT
    invoice_number VARCHAR(50),            -- Số hóa đơn từ provider
    invoice_series VARCHAR(20),            -- Ký hiệu hóa đơn
    invoice_date TIMESTAMP,

    -- Thông tin khách hàng
    customer_name VARCHAR(255),
    customer_tax_code VARCHAR(50),
    customer_address TEXT,
    customer_email VARCHAR(255),

    -- Số tiền
    subtotal DECIMAL(12,2),
    vat_rate DECIMAL(5,2) DEFAULT 10,
    vat_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2),

    -- Trạng thái
    status VARCHAR(50) DEFAULT 'pending',  -- pending, submitted, approved, rejected
    rejection_reason TEXT,

    -- Response từ provider
    provider_response JSONB,
    pdf_url TEXT,                          -- Link PDF hóa đơn

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_e_invoices_branch ON e_invoices(branch_id);
CREATE INDEX idx_e_invoices_order ON e_invoices(order_id);
CREATE INDEX idx_e_invoices_status ON e_invoices(status);
```

**Trạng thái HĐĐT:**

| Status | Tên | Mô tả |
|--------|-----|-------|
| `pending` | Chưa xuất | Đơn hàng chưa xuất HĐĐT |
| `submitted` | Chờ duyệt | Đã gửi lên provider, chờ duyệt |
| `approved` | Đã duyệt | HĐĐT đã được duyệt |
| `rejected` | Từ chối | HĐĐT bị từ chối, cần sửa và gửi lại |

---

## 5. Ca làm việc & Đơn hàng

### Shifts (Ca làm việc - Cấp Chi nhánh)

```sql
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    staff_id UUID NOT NULL REFERENCES staff(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    opening_cash DECIMAL(12,2) DEFAULT 0,
    closing_cash DECIMAL(12,2),
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    note TEXT,
    status VARCHAR(50) DEFAULT 'open',     -- open, closed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shifts_branch ON shifts(branch_id);
CREATE INDEX idx_shifts_staff ON shifts(staff_id);
CREATE INDEX idx_shifts_date ON shifts(start_time);
```

### Orders (Đơn hàng - Cấp Chi nhánh)

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    order_number INTEGER,
    table_id UUID REFERENCES tables(id),
    customer_id UUID REFERENCES customers(id),
    shift_id UUID REFERENCES shifts(id),

    status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, cancelled

    subtotal DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_type VARCHAR(50),             -- percent, fixed, coupon, points
    coupon_id UUID REFERENCES coupons(id),
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,

    payment_method VARCHAR(50),            -- cash, transfer, card
    payment_status VARCHAR(50) DEFAULT 'unpaid',  -- unpaid, paid

    note TEXT,
    cancel_reason_id UUID REFERENCES cancel_reasons(id),

    created_by UUID REFERENCES staff(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_orders_table ON orders(table_id, status);
CREATE INDEX idx_orders_date ON orders(branch_id, created_at);
CREATE INDEX idx_orders_shift ON orders(shift_id);
```

### Order Items (Chi tiết đơn hàng)

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(12,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    note TEXT,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, preparing, ready, served, cancelled
    cancel_reason_id UUID REFERENCES cancel_reasons(id),
    printed_to_kitchen BOOLEAN DEFAULT false,
    kitchen_station_id UUID REFERENCES kitchen_stations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_kitchen ON order_items(kitchen_station_id, status);
```

---

## Tổng quan quan hệ

```
companies
    │
    ├── brands
    │       ├── categories
    │       ├── products
    │       │       ├── product_toppings
    │       │       └── combo_items
    │       ├── units
    │       ├── product_notes
    │       ├── cancel_reasons
    │       └── coupons
    │
    ├── departments
    │       └── department_permissions → permissions
    │
    └── branches
            ├── staff
            │       └── staff_permissions → permissions
            ├── areas → tables
            ├── kitchen_stations
            │       └── product_kitchen_mapping
            ├── product_price_adjustments
            ├── shifts
            ├── orders → order_items
            ├── branch_e_invoice_config → e_invoice_providers
            └── e_invoices
```
