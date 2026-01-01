---
sidebar_position: 3
---

# PostgreSQL Server

Schema PostgreSQL trên Cloud Server, lưu trữ dữ liệu của tất cả các quán theo cấu trúc **Công ty → Thương hiệu → Chi nhánh**.

## Cấu trúc phân cấp

```
CÔNG TY (Company)
    │
    ├── THƯƠNG HIỆU 1 (Brand)
    │       ├── Chi nhánh A (Branch)
    │       ├── Chi nhánh B
    │       └── Chi nhánh C
    │
    └── THƯƠNG HIỆU 2 (Brand)
            ├── Chi nhánh D
            └── Chi nhánh E
```

---

## Bảng cho Web Admin

### companies (Công ty)

```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,      -- Mã viết tắt công ty (dùng để login: annhonquan)
    tax_code VARCHAR(50),                  -- Mã số thuế
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    representative VARCHAR(255),           -- Người đại diện
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_code ON companies(code);
```

### brands (Thương hiệu)

```sql
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_brands_company ON brands(company_id);
```

### branches (Chi nhánh)

```sql
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,              -- URL friendly name
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),

    -- Mô hình sử dụng
    business_model VARCHAR(50) DEFAULT 'ccb_only', -- order_only, ccb_only, full_system

    -- Gói dịch vụ
    package_id UUID REFERENCES packages(id),
    max_connections INTEGER DEFAULT 3,     -- Số cổng kết nối tối đa
    package_expires_at TIMESTAMP,

    -- Settings
    settings JSONB DEFAULT '{}',           -- Cấu hình chi nhánh
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_brand ON branches(brand_id);
```

### packages (Gói App Food)

```sql
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,            -- Basic, Standard, Premium, Enterprise
    max_connections INTEGER NOT NULL,      -- Số cổng kết nối
    price DECIMAL(12,2) NOT NULL,          -- Giá gói
    duration_days INTEGER DEFAULT 30,      -- Thời hạn (ngày)
    description TEXT,
    features JSONB DEFAULT '[]',           -- Danh sách tính năng
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### package_purchases (Lịch sử mua gói)

```sql
CREATE TABLE package_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    package_id UUID NOT NULL REFERENCES packages(id),
    quantity INTEGER DEFAULT 1,            -- Số lượng cổng mua thêm (nếu có)
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    status VARCHAR(50) DEFAULT 'pending',  -- pending, paid, failed, refunded
    payment_method VARCHAR(50),
    paid_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_package_purchases_branch ON package_purchases(branch_id);
```

### transaction_categories (Hạng mục Thu/Chi)

```sql
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,             -- income (thu), expense (chi)
    description TEXT,
    is_system BOOLEAN DEFAULT false,       -- Hạng mục hệ thống (không xóa được)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### permission_groups (Nhóm quyền)

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

### permissions (Quyền)

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

### admin_users (Super Admin, Support)

```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'support',    -- super_admin, support
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Bảng cho Web Dashboard

### departments (Bộ phận - Cấp Công ty)

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    parent_id UUID REFERENCES departments(id), -- Bộ phận cha (null = root)
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

### department_permissions (Quyền của Bộ phận)

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

### staff (Nhân viên - Cấp Chi nhánh)

```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID NOT NULL REFERENCES branches(id),     -- Chi nhánh chính
    department_id UUID REFERENCES departments(id),       -- Bộ phận

    -- Thông tin cá nhân
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    birth_date DATE,
    gender VARCHAR(10),                    -- male, female
    id_number VARCHAR(20),                 -- CMND/CCCD
    birth_place TEXT,                      -- Nơi sinh

    -- Địa chỉ
    province_code VARCHAR(10),             -- Mã tỉnh/thành
    district_code VARCHAR(10),             -- Mã quận/huyện
    ward_code VARCHAR(10),                 -- Mã phường/xã
    address TEXT,                          -- Số nhà, tên đường

    -- Làm việc
    brand_id UUID REFERENCES brands(id),   -- Thương hiệu
    area_id UUID REFERENCES areas(id),     -- Khu vực trong chi nhánh
    start_date DATE,                       -- Ngày bắt đầu làm việc

    -- Đăng nhập
    username VARCHAR(50) UNIQUE,           -- Tên đăng nhập (tr000001)
    password_hash VARCHAR(255),            -- Mật khẩu (web dashboard)
    pin_code VARCHAR(10),                  -- Mã PIN (POS/Order App)

    role VARCHAR(50) DEFAULT 'staff',      -- cashier, staff, kitchen
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, username),
    UNIQUE(branch_id, pin_code)
);

CREATE INDEX idx_staff_company ON staff(company_id);
CREATE INDEX idx_staff_branch ON staff(branch_id);
CREATE INDEX idx_staff_department ON staff(department_id);
CREATE INDEX idx_staff_username ON staff(username);
```

### staff_branch_access (Quyền hoạt động trên chi nhánh)

```sql
CREATE TABLE staff_branch_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,      -- Chi nhánh mặc định
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(staff_id, branch_id)
);

CREATE INDEX idx_staff_branch_access_staff ON staff_branch_access(staff_id);
CREATE INDEX idx_staff_branch_access_branch ON staff_branch_access(branch_id);
```

### staff_permissions (Quyền của nhân viên)

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

### areas (Khu vực - Cấp Chi nhánh)

```sql
CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_areas_branch ON areas(branch_id);
```

### tables (Bàn - Cấp Chi nhánh)

```sql
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    area_id UUID REFERENCES areas(id),
    name VARCHAR(255) NOT NULL,
    capacity INTEGER DEFAULT 4,
    status VARCHAR(50) DEFAULT 'available',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tables_branch ON tables(branch_id);
```

### categories (Danh mục - Cấp Thương hiệu)

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

### units (Đơn vị tính - Cấp Thương hiệu)

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

### products (Món ăn - Cấp Thương hiệu)

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    category_id UUID REFERENCES categories(id),
    unit_id UUID REFERENCES units(id),

    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),                      -- Mã món
    price DECIMAL(12,2) NOT NULL,          -- Giá đã bao gồm VAT
    vat_rate DECIMAL(5,2) DEFAULT 10,      -- % VAT (0, 5, 8, 10...)
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

### product_toppings (Topping của món)

```sql
CREATE TABLE product_toppings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),    -- Món chính (food, drink, other)
    topping_id UUID NOT NULL REFERENCES products(id),    -- Món topping (product_type = 'topping')
    is_required BOOLEAN DEFAULT false,     -- Bắt buộc chọn?
    max_quantity INTEGER DEFAULT 1,        -- Số lượng tối đa
    extra_price DECIMAL(12,2) DEFAULT 0,   -- Giá thêm
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(product_id, topping_id)
);

CREATE INDEX idx_product_toppings_product ON product_toppings(product_id);
```

### combo_items (Món trong Combo)

> **Quy tắc Combo:**
> - Combo có thể chứa: `food`, `drink`, `other`
> - Combo **KHÔNG** chứa: `topping`, `combo` (không lồng combo)
> - Chỉ gán món, **không gán topping** cho món trong combo

```sql
CREATE TABLE combo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_id UUID NOT NULL REFERENCES products(id),      -- Combo (product_type = 'combo')
    product_id UUID NOT NULL REFERENCES products(id),    -- Món trong combo (food, drink, other)
    quantity INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(combo_id, product_id)
);

CREATE INDEX idx_combo_items_combo ON combo_items(combo_id);
```

### product_notes (Ghi chú món ăn - Cấp Thương hiệu)

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

### cancel_reasons (Lý do hủy món - Cấp Thương hiệu)

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

### coupons (Mã giảm giá - Cấp Thương hiệu)

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

### kitchen_stations (Bếp - Cấp Chi nhánh)

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

### product_kitchen_mapping (Gán món vào bếp - Cấp Chi nhánh)

```sql
-- 1 món có thể gán vào nhiều bếp để in ra nhiều nơi
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

### product_price_adjustments (Món tăng giá - Cấp Chi nhánh)

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

## Bảng cho Hóa đơn điện tử

### e_invoice_providers (Đối tác HĐĐT)

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
```

### branch_e_invoice_config (Cấu hình HĐĐT theo chi nhánh)

```sql
CREATE TABLE branch_e_invoice_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    provider_id UUID NOT NULL REFERENCES e_invoice_providers(id),

    -- Thông tin đăng nhập API
    username VARCHAR(255) NOT NULL,        -- Tài khoản
    password_encrypted TEXT NOT NULL,      -- Mật khẩu (encrypted)

    -- Thông tin doanh nghiệp
    tax_code VARCHAR(50) NOT NULL,         -- Mã số thuế doanh nghiệp
    invoice_template VARCHAR(20) NOT NULL, -- Mẫu số hóa đơn (1, 2...)
    digital_signature VARCHAR(50) NOT NULL,-- Chữ ký điện tử (C25MAA...)
    api_url TEXT NOT NULL,                 -- URL xác thực

    -- Cài đặt xuất hóa đơn
    auto_export BOOLEAN DEFAULT false,     -- Xuất bill tự động
    export_app_food BOOLEAN DEFAULT false, -- Xuất bill App Food
    export_restaurant BOOLEAN DEFAULT false,-- Xuất bill nhà hàng

    -- Mô hình
    business_type VARCHAR(20) DEFAULT 'enterprise', -- enterprise (doanh nghiệp), household (hộ gia đình)

    -- Tùy chọn khác
    apply_before_discount BOOLEAN DEFAULT false, -- Áp dụng trước giảm giá

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(branch_id)                      -- Mỗi chi nhánh chỉ 1 provider
);
```

### e_invoices (Hóa đơn điện tử)

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

---

## Bảng giao dịch

### orders (Đơn hàng)

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    order_number INTEGER,
    table_id UUID REFERENCES tables(id),
    customer_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    subtotal DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_type VARCHAR(50),
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    note TEXT,
    created_by UUID,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_orders_date ON orders(branch_id, created_at);
CREATE INDEX idx_orders_table ON orders(table_id, status);
```

### order_items (Chi tiết đơn hàng)

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(12,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    note TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    printed_to_kitchen BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

### shifts (Ca làm việc)

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
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shifts_branch ON shifts(branch_id);
```

### customers (Khách hàng)

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    points INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(branch_id, phone)
);

CREATE INDEX idx_customers_branch ON customers(branch_id);
```

### point_transactions (Lịch sử điểm thưởng)

```sql
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    type VARCHAR(50) NOT NULL,             -- earn, redeem, expire, adjust
    points INTEGER NOT NULL,
    balance_after INTEGER,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### transactions (Thu/Chi)

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    category_id UUID NOT NULL REFERENCES transaction_categories(id),
    type VARCHAR(20) NOT NULL,             -- income (thu), expense (chi)
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID,                     -- order_id nếu là thu từ bán hàng
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_branch ON transactions(branch_id);
```

### daily_summaries (Báo cáo tổng hợp theo ngày)

```sql
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_discount DECIMAL(12,2) DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    avg_order_value DECIMAL(12,2) DEFAULT 0,
    cash_amount DECIMAL(12,2) DEFAULT 0,
    transfer_amount DECIMAL(12,2) DEFAULT 0,
    card_amount DECIMAL(12,2) DEFAULT 0,
    total_income DECIMAL(12,2) DEFAULT 0,  -- Tổng thu (ngoài bán hàng)
    total_expense DECIMAL(12,2) DEFAULT 0, -- Tổng chi
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(branch_id, date)
);

CREATE INDEX idx_daily_summaries_branch ON daily_summaries(branch_id, date);
```

---

## Multi-tenant Architecture

Tất cả các bảng liên quan đến dữ liệu kinh doanh đều được filter theo `branch_id`:

```sql
-- Mọi query đều filter theo branch_id
SELECT * FROM products
WHERE brand_id = (SELECT brand_id FROM branches WHERE id = 'xxx')
AND is_active = true;

-- Middleware tự động thêm context
app.use('/dashboard/*', storeContextMiddleware);
```
