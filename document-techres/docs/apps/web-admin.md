---
sidebar_position: 1
---

# Web Admin

Web Admin là ứng dụng dành cho **Super Admin** để quản lý toàn bộ hệ thống FNB POS.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Nền tảng** | React/Next.js |
| **Users** | Super Admin, Support |
| **Mục đích** | Quản lý tất cả Công ty, Thương hiệu, Chi nhánh, Gói dịch vụ |

## Cấu trúc phân cấp

Web Admin quản lý hệ thống theo cấu trúc 3 cấp:

```
CÔNG TY (Company)
    │
    ├── THƯƠNG HIỆU 1 (Brand)
    │       │
    │       ├── Chi nhánh 1.1 (Branch)
    │       ├── Chi nhánh 1.2 (Branch)
    │       └── Chi nhánh 1.3 (Branch)
    │
    └── THƯƠNG HIỆU 2 (Brand)
            │
            ├── Chi nhánh 2.1 (Branch)
            └── Chi nhánh 2.2 (Branch)
```

### Ví dụ thực tế

```
Công ty TNHH ABC Food
    │
    ├── Thương hiệu "Phở Việt"
    │       ├── Chi nhánh Quận 1
    │       ├── Chi nhánh Quận 7
    │       └── Chi nhánh Thủ Đức
    │
    ├── Thương hiệu "Cà phê ABC"
    │       ├── Chi nhánh Nguyễn Huệ
    │       └── Chi nhánh Lê Lợi
    │
    └── Thương hiệu "Trà sữa XYZ"
            └── Chi nhánh Landmark
```

---

## Chức năng chính

### 1. Quản lý Công ty (Companies)

Quản lý các công ty/doanh nghiệp sử dụng hệ thống:

| Chức năng | Mô tả |
|-----------|-------|
| Tạo công ty mới | Tạo company + tài khoản Owner |
| Xem danh sách | Danh sách tất cả công ty |
| Chỉnh sửa | Cập nhật thông tin công ty |
| Khóa/mở khóa | Suspend hoặc activate công ty |
| Xóa | Soft delete công ty |

### 2. Quản lý Thương hiệu (Brands)

Quản lý các thương hiệu thuộc công ty:

| Chức năng | Mô tả |
|-----------|-------|
| Tạo thương hiệu | Tạo brand mới cho company |
| Danh sách | Xem brands theo company |
| Chỉnh sửa | Cập nhật thông tin brand |
| Logo & branding | Upload logo, màu sắc thương hiệu |

### 3. Quản lý Chi nhánh (Branches)

Quản lý các chi nhánh/cửa hàng:

| Chức năng | Mô tả |
|-----------|-------|
| Tạo chi nhánh | Tạo branch mới cho brand |
| Danh sách | Xem branches theo brand/company |
| Chỉnh sửa | Cập nhật thông tin chi nhánh |
| Cấu hình | Thiết lập máy in, thiết bị |
| Gán gói | Gán gói App Food cho chi nhánh |

### 4. Quản lý Hạng mục Thu/Chi (Transaction Categories)

Quản lý các hạng mục thu chi cho báo cáo tài chính:

| Loại | Ví dụ |
|------|-------|
| **Thu (Income)** | Doanh thu bán hàng, Tiền tip, Thu khác |
| **Chi (Expense)** | Mua nguyên liệu, Tiền điện nước, Lương NV, Chi khác |

**Chức năng:**
- Tạo/sửa/xóa hạng mục
- Phân loại: Thu nhập / Chi phí
- Gán hạng mục mặc định cho company/brand
- Import/export danh sách hạng mục

### 5. Quản lý Gói App Food (Packages)

Quản lý các gói dịch vụ và giới hạn kết nối:

| Gói | Kết nối tối đa | Mô tả |
|-----|----------------|-------|
| **Basic** | 3 connections | Quán nhỏ, 1-2 người |
| **Standard** | 10 connections | Quán vừa, 3-5 người |
| **Premium** | 30 connections | Quán lớn, nhiều nhân viên |
| **Enterprise** | Unlimited | Chuỗi, franchise |

**Chức năng:**
- Tạo/sửa/xóa gói dịch vụ
- Thiết lập giới hạn kết nối
- Thiết lập giá và thời hạn
- Xem lịch sử mua gói
- Gia hạn/nâng cấp gói

### 6. Quản lý Owners

- Tạo tài khoản Owner cho từng công ty
- Reset password
- Khóa/mở khóa tài khoản
- Phân quyền theo company

### 7. Quản lý Quyền (Permissions)

Web Admin quản lý hệ thống quyền theo cấu trúc **Nhóm quyền → Quyền chi tiết**:

#### Cấu trúc phân quyền

```
NHÓM QUYỀN (Permission Group)
    │
    ├── Quyền 1 (Permission)
    ├── Quyền 2 (Permission)
    └── Quyền 3 (Permission)
```

#### Danh sách nhóm quyền mẫu

| Nhóm quyền | Mã | Các quyền trong nhóm |
|------------|----|----------------------|
| **Quản lý Menu** | `menu_management` | Xem menu, Thêm món, Sửa món, Xóa món, Sửa giá |
| **Quản lý Bàn** | `table_management` | Xem bàn, Thêm bàn, Sửa bàn, Xóa bàn, Chuyển bàn, Gộp bàn |
| **Quản lý Order** | `order_management` | Tạo order, Sửa order, Hủy order, Xem order |
| **Thanh toán** | `payment` | Thanh toán tiền mặt, Thanh toán chuyển khoản, Áp dụng giảm giá, Hủy thanh toán |
| **Quản lý Ca** | `shift_management` | Mở ca, Đóng ca, Xem báo cáo ca |
| **Báo cáo** | `reports` | Xem doanh thu, Xem best seller, Xuất báo cáo |
| **Quản lý Nhân viên** | `staff_management` | Xem nhân viên, Thêm nhân viên, Sửa nhân viên, Xóa nhân viên |
| **Quản lý Khách hàng** | `customer_management` | Xem khách hàng, Thêm khách, Sửa điểm, Xem lịch sử |
| **Thu/Chi** | `transaction` | Tạo phiếu thu, Tạo phiếu chi, Xem thu chi |
| **Cài đặt** | `settings` | Cài đặt máy in, Cài đặt thanh toán, Cài đặt chung |

#### Ví dụ quyền trong nhóm `order_management`

| Mã quyền | Tên quyền | Mô tả |
|----------|-----------|-------|
| `order.view` | Xem order | Xem danh sách và chi tiết order |
| `order.create` | Tạo order | Tạo order mới |
| `order.edit` | Sửa order | Sửa thông tin order |
| `order.cancel` | Hủy order | Hủy order đang chờ |

#### Chức năng quản lý

| Chức năng | Mô tả |
|-----------|-------|
| **Quản lý Nhóm quyền** | Thêm/sửa/xóa/tắt-bật nhóm quyền |
| **Quản lý Quyền chi tiết** | Thêm/sửa/xóa quyền, gán vào nhóm |
| **Gán mặc định** | Đặt quyền mặc định cho từng role |

#### Gán quyền

Quyền có thể được gán theo 2 cách:

| Cách gán | Mô tả | Thực hiện tại |
|----------|-------|---------------|
| **Theo cá nhân** | Gán quyền trực tiếp cho từng nhân viên | Web Dashboard |
| **Theo bộ phận** | Gán quyền cho cả bộ phận | Web Dashboard |

```
┌─────────────────────────────────────────────────────────────────┐
│  QUẢN LÝ QUYỀN                                [+ Tạo nhóm mới]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [NHÓM QUYỀN]  [QUYỀN CHI TIẾT]                                 │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Mã            │ Tên nhóm         │ Số quyền │ Trạng thái │  │
│  ├───────────────┼──────────────────┼──────────┼────────────┤  │
│  │ menu_mgmt     │ Quản lý Menu     │    5     │  ● Active  │  │
│  │ order_mgmt    │ Quản lý Order    │    4     │  ● Active  │  │
│  │ payment       │ Thanh toán       │    4     │  ● Active  │  │
│  │ shift_mgmt    │ Quản lý Ca       │    3     │  ● Active  │  │
│  │ reports       │ Báo cáo          │    3     │  ● Active  │  │
│  │ staff_mgmt    │ Quản lý NV       │    4     │  ● Active  │  │
│  │ customer_mgmt │ Quản lý KH       │    4     │  ● Active  │  │
│  │ transaction   │ Thu/Chi          │    3     │  ● Active  │  │
│  │ settings      │ Cài đặt          │    3     │  ● Active  │  │
│  └───────────────┴──────────────────┴──────────┴────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8. Analytics & Reports

- Thống kê số lượng công ty, thương hiệu, chi nhánh
- Doanh thu theo thời gian (theo company/brand/branch)
- Tỷ lệ tăng trưởng
- Thống kê sử dụng gói dịch vụ
- Các metrics quan trọng

---

## Phân quyền

| Role | Quyền |
|------|-------|
| **Super Admin** | Toàn quyền: quản lý company/brand/branch, gói dịch vụ, hạng mục thu chi |
| **Support** | Chỉ xem thông tin, xử lý tickets (không sửa dữ liệu) |

---

## Flow tạo Công ty mới

```
Super Admin đăng nhập
        │
        ▼
Vào menu "Companies" → "Tạo mới"
        │
        ▼
Nhập thông tin công ty:
├── Tên công ty
├── Mã số thuế
├── Địa chỉ
├── Email đại diện
├── SĐT liên hệ
        │
        ▼
Tạo tài khoản Owner:
├── Email owner
├── Họ tên
├── SĐT
        │
        ▼
Chọn gói dịch vụ ban đầu (hoặc trial)
        │
        ▼
Bấm "Tạo công ty"
        │
        ▼
Hệ thống tự động:
├── Tạo company_id (UUID)
├── Tạo tài khoản Owner
├── Gửi email thông tin đăng nhập
        │
        ▼
Owner đăng nhập Web Dashboard → Tạo Brand → Tạo Branch
```

---

## Flow tạo Chi nhánh

```
Owner đăng nhập Web Dashboard
        │
        ▼
Chọn Thương hiệu (hoặc tạo mới)
        │
        ▼
Vào "Chi nhánh" → "Tạo mới"
        │
        ▼
Nhập thông tin chi nhánh:
├── Tên chi nhánh
├── Địa chỉ
├── SĐT
├── Giờ mở cửa
├── Chọn mô hình (Order Only / CCB Only / Full System)
        │
        ▼
Gán gói App Food (nếu cần)
        │
        ▼
Bấm "Tạo chi nhánh"
        │
        ▼
Hệ thống tự động:
├── Tạo branch_id (UUID)
├── Tạo store_code cho chi nhánh
├── Sync data cấu trúc lên thiết bị
```

---

## Màn hình chính

### Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD                                           [Admin ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Công ty     │  │ Thương hiệu │  │ Chi nhánh   │  │ Doanh   │ │
│  │    45       │  │    120      │  │    350      │  │ thu     │ │
│  │   +8%       │  │   +12%      │  │   +15%      │  │ 5.2 tỷ  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Biểu đồ tăng trưởng chi nhánh                            │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Công ty đăng ký gần đây:                                       │
│  • Công ty A - 2 giờ trước                                      │
│  • Công ty B - 5 giờ trước                                      │
│  • Công ty C - 1 ngày trước                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quản lý Companies

```
┌─────────────────────────────────────────────────────────────────┐
│  COMPANIES                                 [+ Tạo công ty mới]  │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Tìm kiếm...                    [Lọc: Tất cả ▼]              │
├─────────────────────────────────────────────────────────────────┤
│  │ Tên công ty      │ Brands │ Branches │ Gói      │ Status │  │
│  ├──────────────────┼────────┼──────────┼──────────┼────────┼──┤
│  │ Công ty ABC Food │   3    │    12    │ Premium  │●Active │⋮ │
│  │ Công ty XYZ      │   1    │    5     │ Standard │●Active │⋮ │
│  │ Cá nhân Nguyễn A │   1    │    1     │ Basic    │○Expired│⋮ │
│  └──────────────────┴────────┴──────────┴──────────┴────────┴──┘
│                                                                 │
│  Hiển thị 1-10 của 45 công ty                  [< 1 2 3 ... >]  │
└─────────────────────────────────────────────────────────────────┘
```

### Quản lý Gói App Food

```
┌─────────────────────────────────────────────────────────────────┐
│  GÓI APP FOOD                                    [+ Tạo gói]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   BASIC     │  │  STANDARD   │  │   PREMIUM   │  │ENTERPRISE│ │
│  │             │  │             │  │             │  │         │ │
│  │  3 kết nối  │  │ 10 kết nối  │  │ 30 kết nối  │  │Unlimited│ │
│  │             │  │             │  │             │  │         │ │
│  │ 500k/tháng  │  │ 1.5tr/tháng │  │ 3tr/tháng   │  │ Liên hệ │ │
│  │             │  │             │  │             │  │         │ │
│  │  120 users  │  │   85 users  │  │  45 users   │  │ 10 users│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                 │
│  Lịch sử mua gói gần đây:                                       │
│  • Công ty A - Premium - 2 giờ trước                            │
│  • Công ty B - Standard → Premium - 5 giờ trước (nâng cấp)      │
│  • Công ty C - Basic - 1 ngày trước                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quản lý Hạng mục Thu/Chi

```
┌─────────────────────────────────────────────────────────────────┐
│  HẠNG MỤC THU/CHI                              [+ Tạo hạng mục] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [THU NHẬP]  [CHI PHÍ]                                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Mã      │ Tên hạng mục            │ Loại     │ Mặc định  │  │
│  ├─────────┼─────────────────────────┼──────────┼───────────┤  │
│  │ INC001  │ Doanh thu bán hàng      │ Thu nhập │    ✓      │  │
│  │ INC002  │ Tiền tip                │ Thu nhập │    ✓      │  │
│  │ INC003  │ Thu nhập khác           │ Thu nhập │    ✓      │  │
│  │ EXP001  │ Mua nguyên liệu         │ Chi phí  │    ✓      │  │
│  │ EXP002  │ Tiền điện nước          │ Chi phí  │    ✓      │  │
│  │ EXP003  │ Lương nhân viên         │ Chi phí  │    ✓      │  │
│  │ EXP004  │ Chi phí khác            │ Chi phí  │    ✓      │  │
│  └─────────┴─────────────────────────┴──────────┴───────────┘  │
│                                                                 │
│  [Import Excel]  [Export Excel]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Companies

```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,      -- Mã viết tắt công ty (dùng để login: annhonquan)
    tax_code VARCHAR(50),
    address TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    representative VARCHAR(255),           -- Người đại diện
    owner_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_code ON companies(code);
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,             -- 'income' or 'expense'
    description TEXT,
    is_system BOOLEAN DEFAULT false,       -- Hạng mục hệ thống (không xóa được)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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

### Permissions (Quyền chi tiết)

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES permission_groups(id),
    code VARCHAR(100) UNIQUE NOT NULL,     -- menu.view, menu.create, order.edit...
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_group ON permissions(group_id);
```

### Admin Users

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

## API Endpoints

### Companies

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/companies` | Danh sách công ty |
| POST | `/admin/companies` | Tạo công ty mới |
| GET | `/admin/companies/:id` | Chi tiết công ty |
| PUT | `/admin/companies/:id` | Cập nhật công ty |
| DELETE | `/admin/companies/:id` | Xóa công ty |
| POST | `/admin/companies/:id/suspend` | Khóa công ty |
| POST | `/admin/companies/:id/activate` | Mở khóa công ty |

### Brands

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/brands` | Danh sách thương hiệu |
| POST | `/admin/brands` | Tạo thương hiệu |
| GET | `/admin/brands/:id` | Chi tiết thương hiệu |
| PUT | `/admin/brands/:id` | Cập nhật thương hiệu |
| DELETE | `/admin/brands/:id` | Xóa thương hiệu |

### Branches

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/branches` | Danh sách chi nhánh |
| POST | `/admin/branches` | Tạo chi nhánh |
| GET | `/admin/branches/:id` | Chi tiết chi nhánh |
| PUT | `/admin/branches/:id` | Cập nhật chi nhánh |
| DELETE | `/admin/branches/:id` | Xóa chi nhánh |
| POST | `/admin/branches/:id/assign-package` | Gán gói cho chi nhánh |

### Packages

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/packages` | Danh sách gói |
| POST | `/admin/packages` | Tạo gói mới |
| PUT | `/admin/packages/:id` | Cập nhật gói |
| DELETE | `/admin/packages/:id` | Xóa gói |
| GET | `/admin/packages/purchases` | Lịch sử mua gói |

### Transaction Categories

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/transaction-categories` | Danh sách hạng mục |
| POST | `/admin/transaction-categories` | Tạo hạng mục |
| PUT | `/admin/transaction-categories/:id` | Cập nhật hạng mục |
| DELETE | `/admin/transaction-categories/:id` | Xóa hạng mục |
| POST | `/admin/transaction-categories/import` | Import từ Excel |
| GET | `/admin/transaction-categories/export` | Export ra Excel |

### Permissions

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/permission-groups` | Danh sách nhóm quyền |
| POST | `/admin/permission-groups` | Tạo nhóm quyền |
| PUT | `/admin/permission-groups/:id` | Cập nhật nhóm quyền |
| DELETE | `/admin/permission-groups/:id` | Xóa nhóm quyền |
| GET | `/admin/permissions` | Danh sách quyền |
| POST | `/admin/permissions` | Tạo quyền mới |
| PUT | `/admin/permissions/:id` | Cập nhật quyền |
| DELETE | `/admin/permissions/:id` | Xóa quyền |

### Owners & Analytics

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/owners` | Danh sách owners |
| POST | `/admin/owners` | Tạo owner |
| POST | `/admin/owners/:id/reset-password` | Reset mật khẩu owner |
| POST | `/admin/owners/:id/suspend` | Khóa tài khoản owner |
| POST | `/admin/owners/:id/activate` | Mở khóa tài khoản owner |
| GET | `/admin/analytics` | Thống kê tổng quan |
| GET | `/admin/analytics/companies` | Thống kê theo công ty |
| GET | `/admin/analytics/packages` | Thống kê theo gói |

---

## Bảo mật

- Xác thực bằng JWT token
- Session timeout sau 30 phút không hoạt động
- 2FA cho Super Admin
- Audit log cho mọi thao tác quan trọng
- Rate limiting cho API endpoints
- RBAC (Role-Based Access Control)
