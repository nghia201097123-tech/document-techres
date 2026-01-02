---
sidebar_position: 1
---

# Web Admin

Web Admin là ứng dụng dành cho **Super Admin** để quản lý toàn bộ hệ thống FNB POS theo mô hình **SaaS Multi-Tenant**.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Nền tảng** | React/Next.js |
| **Users** | Super Admin, Support |
| **Mục đích** | Quản lý tất cả Tenant/Công ty, Thương hiệu, Chi nhánh, Gói dịch vụ |
| **Database** | **KHÔNG kết nối trực tiếp** - gọi API Admin |

## Kiến trúc kết nối

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KIẾN TRÚC WEB ADMIN                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐         ┌─────────────────┐                  │
│   │    Web Admin    │  HTTP   │    API Admin    │                  │
│   │    (Next.js)    │────────▶│    (NestJS)     │                  │
│   │                 │         │                 │                  │
│   │  • UI/Forms     │         │  • Business     │                  │
│   │  • State Mgmt   │         │  • Database     │                  │
│   │  • API Calls    │         │  • TypeORM      │                  │
│   │                 │         │        │        │                  │
│   │  ❌ NO DATABASE │         │        ▼        │                  │
│   └─────────────────┘         │ ┌─────────────┐ │                  │
│                               │ │ PostgreSQL  │ │                  │
│                               │ │  Database   │ │                  │
│                               │ └─────────────┘ │                  │
│                               └─────────────────┘                  │
│                                                                     │
│   ⚠️ LƯU Ý QUAN TRỌNG:                                              │
│   • Web Admin KHÔNG kết nối trực tiếp đến database                 │
│   • Tất cả dữ liệu được lấy từ API Admin                           │
│   • Dữ liệu hiển thị là DỮ LIỆU THẬT từ PostgreSQL                 │
│   • Mọi thay đổi đều được lưu vào database qua API                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Mô hình SaaS Multi-Tenant

Web Admin quản lý hệ thống theo mô hình **Multi-Tenant**:

```
TENANT (tenant_id = company.code) ← Định danh duy nhất
    │
    └── CÔNG TY (Company)
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

### Quy tắc Tenant

| Quy tắc | Mô tả |
|---------|-------|
| **Tenant = Company** | Mỗi tenant là 1 công ty (1:1) |
| **tenant_id = company.code** | Mã công ty là định danh tenant |
| **Data Isolation** | Dữ liệu hoàn toàn tách biệt theo tenant |

---

## Chức năng chính

### 1. Quản lý Công ty (Companies) - Wizard 3 bước bắt buộc

Khi tạo công ty mới, **bắt buộc phải hoàn thành 3 bước liên tiếp**:

```
┌─────────────────────────────────────────────────────────────────────┐
│              TẠO CÔNG TY MỚI - WIZARD 3 BƯỚC BẮT BUỘC              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [●] Bước 1        [ ] Bước 2        [ ] Bước 3                   │
│   Thông tin         Thương hiệu       Chi nhánh                    │
│   công ty           đầu tiên          đầu tiên                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Bước 1: Thông tin Công ty

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên công ty | ✅ | Tên đầy đủ |
| Mã công ty (Tenant ID) | ✅ | Mã viết tắt, dùng để login (vd: abcfood) |
| **Logo công ty** | | Upload logo |
| Mã số thuế | | MST doanh nghiệp |
| Địa chỉ | | Địa chỉ trụ sở |
| Số điện thoại | | SĐT liên hệ |
| Email | | Email công ty |
| Người đại diện | | Họ tên người đại diện |
| Gói dịch vụ | ✅ | Basic / Standard / Premium / Enterprise |
| Số chi nhánh tối đa | | Mặc định theo gói |
| Số users tối đa | | Mặc định theo gói |

#### Bước 2: Thương hiệu đầu tiên (BẮT BUỘC)

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên thương hiệu | ✅ | Tên thương hiệu đầu tiên |
| Mã thương hiệu | ✅ | Mã viết tắt (unique) |
| **Logo thương hiệu** | | Upload logo |
| Mô tả | | Mô tả ngắn |
| Mô hình kinh doanh | ✅ | Order Only / CCB Only / Full System |

#### Bước 3: Chi nhánh đầu tiên (BẮT BUỘC)

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên chi nhánh | ✅ | Tên chi nhánh đầu tiên |
| Mã chi nhánh | ✅ | Mã viết tắt (unique) |
| **Logo chi nhánh** | | Mặc định dùng logo thương hiệu |
| Địa chỉ | ✅ | Địa chỉ chi nhánh |
| Số điện thoại | | SĐT chi nhánh |
| Email | | Email chi nhánh |
| Mô hình sử dụng | ✅ | Order Only / CCB Only / Full System |
| Số cổng kết nối | | Mặc định: 3 |
| Giờ mở cửa | | HH:mm |
| Giờ đóng cửa | | HH:mm |

#### Tùy chọn: Thông tin Owner

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên owner | | Mặc định lấy từ người đại diện công ty |
| Email | | Email để đăng nhập |
| Số điện thoại | | SĐT liên hệ |

#### Sau khi hoàn thành Wizard

```
Hệ thống tự động:
├── Tạo company với code = tenant_id
├── Tạo brand với tenant_id = company.code
├── Tạo branch với tenant_id = company.code
├── Tạo tài khoản Owner (username + password tạm)
└── Gửi email thông tin đăng nhập cho Owner
```

**Lưu ý quan trọng:**
- **Không thể lưu công ty nếu chưa hoàn thành cả 3 bước**
- Tất cả thực hiện trong 1 transaction để đảm bảo tính toàn vẹn
- Nút "Quay lại" cho phép sửa bước trước
- Nút "Hủy" sẽ không lưu gì cả
- Sau khi tạo xong, có thể thêm thương hiệu/chi nhánh khác từ menu riêng

#### Quản lý công ty đã tạo

| Chức năng | Mô tả |
|-----------|-------|
| Xem danh sách | Danh sách tất cả công ty (filter, search) |
| Xem chi tiết | Thông tin công ty + brands + branches |
| Chỉnh sửa | Cập nhật thông tin công ty |
| Khóa/mở khóa | Suspend hoặc activate công ty |
| Xóa | Soft delete công ty |

### 2. Quản lý Thương hiệu (Brands)

Quản lý các thương hiệu thuộc công ty:

| Chức năng | Mô tả |
|-----------|-------|
| Tạo thương hiệu | Tạo brand mới cho company (có tenant_id) |
| Danh sách | Xem brands theo company |
| Chỉnh sửa | Cập nhật thông tin brand |
| **Logo & branding** | Upload logo thương hiệu |
| Tắt/Bật | Toggle isActive |

### 3. Quản lý Chi nhánh (Branches)

Quản lý các chi nhánh/cửa hàng:

| Chức năng | Mô tả |
|-----------|-------|
| Tạo chi nhánh | Tạo branch mới cho brand (có tenant_id) |
| Danh sách | Xem branches theo brand/company |
| Chỉnh sửa | Cập nhật thông tin chi nhánh |
| **Logo chi nhánh** | Upload logo (mặc định dùng logo brand) |
| Cấu hình | Thiết lập máy in, thiết bị |
| Gán gói | Gán gói App Food cho chi nhánh |
| Tắt/Bật | Toggle isActive |

### 4. Quản lý Hạng mục Thu/Chi (Transaction Categories)

Quản lý các hạng mục thu chi cho báo cáo tài chính:

| Loại | Ví dụ |
|------|-------|
| **Thu (Income)** | Doanh thu bán hàng, Tiền tip, Thu khác |
| **Chi (Expense)** | Mua nguyên liệu, Tiền điện nước, Lương NV, Chi khác |

**Chức năng:**
- Tạo/sửa/xóa hạng mục
- Phân loại: Thu nhập / Chi phí
- Đánh dấu hạng mục hệ thống (không xóa được)
- Tắt/Bật hạng mục
- Import/export danh sách hạng mục

### 5. Quản lý Gói App Food (Packages)

Quản lý các gói dịch vụ và giới hạn kết nối:

| Gói | Kết nối tối đa | Giá/tháng | Mô tả |
|-----|----------------|-----------|-------|
| **Basic** | 3 | X VNĐ | 1 CCB + 2 Order App |
| **Standard** | 10 | Y VNĐ | 2 CCB + 8 Order App |
| **Premium** | 30 | Z VNĐ | 5 CCB + 25 Order App |
| **Enterprise** | Unlimited | Thỏa thuận | Không giới hạn |

**Chức năng:**
- Tạo/sửa/xóa gói dịch vụ
- Thiết lập giới hạn kết nối
- Thiết lập giá theo tháng/năm
- Quản lý features (JSONB)
- Xem lịch sử mua gói
- Gia hạn/nâng cấp gói

### 6. Quản lý Admin Users

- Tạo tài khoản Super Admin / Support
- Gán nhóm quyền
- Reset password
- Khóa/mở khóa tài khoản
- Xem last login

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

#### Chức năng quản lý

| Chức năng | Mô tả |
|-----------|-------|
| **Quản lý Nhóm quyền** | Thêm/sửa/xóa/tắt-bật nhóm quyền |
| **Quản lý Quyền chi tiết** | Thêm/sửa/xóa quyền, gán vào nhóm |
| **Gán mặc định** | Đặt quyền mặc định cho từng role |

**Lưu ý:** Permissions là dữ liệu **dùng chung** cho tất cả tenant (không có tenant_id)

### 8. Analytics & Reports

- Thống kê số lượng công ty, thương hiệu, chi nhánh
- Doanh thu theo thời gian (theo company/brand/branch)
- Tỷ lệ tăng trưởng
- Thống kê sử dụng gói dịch vụ
- Các metrics quan trọng

---

## Logo cho mọi cấp

Hệ thống hỗ trợ upload logo/avatar cho tất cả các cấp:

| Entity | Field | Mô tả | Kích thước khuyến nghị |
|--------|-------|-------|------------------------|
| **Company** | `logoUrl` | Logo công ty | 200x200px |
| **Brand** | `logoUrl` | Logo thương hiệu | 200x200px |
| **Branch** | `logoUrl` | Logo chi nhánh | 200x200px (mặc định dùng brand logo) |
| **Staff** | `avatarUrl` | Ảnh đại diện nhân viên | 150x150px |

---

## Phân quyền

| Role | Quyền |
|------|-------|
| **Super Admin** | Toàn quyền: quản lý company/brand/branch, gói dịch vụ, hạng mục thu chi, permissions |
| **Support** | Chỉ xem thông tin, xử lý tickets (không sửa dữ liệu) |

---

## Flow tạo Công ty mới (Wizard 3 bước)

```
Super Admin đăng nhập Web Admin
        │
        ▼
Vào menu "Companies" → "Tạo mới"
        │
        ▼
┌─────────────────────────────────────────┐
│            WIZARD BƯỚC 1                │
│         Thông tin Công ty               │
├─────────────────────────────────────────┤
│  Tên công ty: [__________________]      │
│  Mã công ty (Tenant ID): [________]     │
│  Logo: [Upload]                         │
│  MST: [______________]                  │
│  Địa chỉ: [_____________________]       │
│  Email: [___________________]           │
│  SĐT: [____________]                    │
│  Người đại diện: [_______________]      │
│  Gói dịch vụ: [Standard ▼]              │
│                                         │
│  [Hủy]                      [Tiếp tục]  │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│            WIZARD BƯỚC 2                │
│     Thương hiệu đầu tiên (BẮT BUỘC)     │
├─────────────────────────────────────────┤
│  Tên thương hiệu: [_______________]     │
│  Mã thương hiệu: [________]             │
│  Logo: [Upload]                         │
│  Mô tả: [____________________]          │
│  Mô hình: [CCB Only ▼]                  │
│                                         │
│  [Quay lại]                 [Tiếp tục]  │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│            WIZARD BƯỚC 3                │
│      Chi nhánh đầu tiên (BẮT BUỘC)      │
├─────────────────────────────────────────┤
│  Tên chi nhánh: [_______________]       │
│  Mã chi nhánh: [________]               │
│  Logo: [Dùng logo thương hiệu]          │
│  Địa chỉ: [_____________________]       │
│  SĐT: [____________]                    │
│  Mô hình: [CCB Only ▼]                  │
│  Số cổng kết nối: [3]                   │
│                                         │
│  ☑ Tạo tài khoản Owner                  │
│    Email: [___________________]         │
│                                         │
│  [Quay lại]          [Hoàn tất & Tạo]   │
└─────────────────────────────────────────┘
        │
        ▼
Hệ thống thực hiện trong 1 TRANSACTION:
├── Tạo company với code = tenant_id
├── Tạo brand với tenant_id
├── Tạo branch với tenant_id
├── Tạo tài khoản Owner
└── Gửi email thông tin đăng nhập
        │
        ▼
Hiển thị kết quả:
├── Company: [Tên công ty] ([mã tenant])
├── Brand: [Tên thương hiệu] ([mã thương hiệu])
├── Branch: [Tên chi nhánh] ([mã chi nhánh])
└── Owner: [email đăng nhập] (password: [mật khẩu tạm])
        │
        ▼
Owner đăng nhập Web Dashboard → Sẵn sàng sử dụng
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
│  │  [count]    │  │   [count]   │  │   [count]   │  │ thu     │ │
│  │  [% tăng]   │  │  [% tăng]   │  │  [% tăng]   │  │ [total] │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Biểu đồ tăng trưởng chi nhánh                            │  │
│  │  [Dữ liệu thực từ database]                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Tenant đăng ký gần đây:                                        │
│  [Danh sách tenant thực từ database]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quản lý Companies

```
┌─────────────────────────────────────────────────────────────────┐
│  COMPANIES                              [+ Tạo công ty mới]     │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Tìm kiếm...                    [Lọc: Tất cả ▼]              │
├─────────────────────────────────────────────────────────────────┤
│  │Logo│ Tenant ID    │ Tên công ty      │Brands│Branches│Status││
│  ├────┼──────────────┼──────────────────┼──────┼────────┼──────┤│
│  │    │              │                  │      │        │      ││
│  │        [Dữ liệu thực từ database qua API]                   ││
│  │                                                              ││
│  └────┴──────────────┴──────────────────┴──────┴────────┴──────┘│
│                                                                 │
│  Hiển thị [x]-[y] của [total] công ty          [< 1 2 3 ... >]  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (PostgreSQL)

### Companies (Tenant)

```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,      -- Tenant ID
    logo_url TEXT,                         -- Logo công ty
    tax_code VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    representative VARCHAR(255),

    -- SaaS Subscription
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP,
    max_branches INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 10,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Brands

```sql
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES companies(code),
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    logo_url TEXT,                         -- Logo thương hiệu
    business_model VARCHAR(50) DEFAULT 'full_system',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_brands_tenant ON brands(tenant_id);
```

### Branches

```sql
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES companies(code),
    brand_id UUID NOT NULL REFERENCES brands(id),
    package_id UUID REFERENCES packages(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    logo_url TEXT,                         -- Logo chi nhánh
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    manager VARCHAR(255),
    business_model VARCHAR(50) DEFAULT 'ccb_only',
    open_time TIME,
    close_time TIME,
    max_connections INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id);
```

### Staff

```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES companies(code),
    company_id UUID NOT NULL REFERENCES companies(id),
    brand_id UUID REFERENCES brands(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,                       -- Ảnh đại diện nhân viên
    phone VARCHAR(20),
    email VARCHAR(255),
    username VARCHAR(50),
    password_hash VARCHAR(255),
    pin_code VARCHAR(10),
    role VARCHAR(50) DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_tenant ON staff(tenant_id);
```

### Packages

```sql
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    max_branches INTEGER,
    monthly_price DECIMAL(12,2),
    yearly_price DECIMAL(12,2),
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Companies (với Wizard)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/companies` | Danh sách công ty |
| **POST** | **`/companies/wizard`** | **Wizard tạo công ty 3 bước** |
| POST | `/companies` | Tạo công ty đơn (không bắt buộc brand/branch) |
| GET | `/companies/:id` | Chi tiết công ty |
| GET | `/companies/by-code/:code` | Tìm theo tenant code |
| PATCH | `/companies/:id` | Cập nhật công ty |
| DELETE | `/companies/:id` | Xóa công ty |
| PATCH | `/companies/:id/toggle-status` | Tắt/Bật công ty |

### Wizard API

```typescript
// POST /companies/wizard
interface CreateCompanyWizardDto {
  company: {
    name: string;
    code: string;           // Tenant ID
    logoUrl?: string;       // Logo công ty
    taxCode?: string;
    address?: string;
    phone?: string;
    email?: string;
    representative?: string;
    subscriptionPlan: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
    maxBranches?: number;
    maxUsers?: number;
    subscriptionExpiresAt?: string;
  };
  brand: {
    name: string;
    code: string;
    logoUrl?: string;       // Logo thương hiệu
    description?: string;
    businessModel: 'ORDER_ONLY' | 'CCB_ONLY' | 'FULL_SYSTEM';
  };
  branch: {
    name: string;
    code: string;
    logoUrl?: string;       // Logo chi nhánh (mặc định dùng brand logo)
    address: string;
    phone?: string;
    email?: string;
    manager?: string;
    businessModel?: 'ORDER_ONLY' | 'CCB_ONLY' | 'FULL_SYSTEM';
    openTime?: string;
    closeTime?: string;
    maxConnections?: number;
  };
  owner?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

// Response
interface CreateCompanyWizardResponseDto {
  company: { id: string; name: string; code: string; };
  brand: { id: string; name: string; code: string; };
  branch: { id: string; name: string; code: string; };
  owner?: {
    id: string;
    username: string;
    temporaryPassword: string;
  };
}
```

### Brands

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/brands` | Danh sách thương hiệu |
| POST | `/brands` | Tạo thương hiệu |
| GET | `/brands/:id` | Chi tiết thương hiệu |
| PATCH | `/brands/:id` | Cập nhật thương hiệu |
| DELETE | `/brands/:id` | Xóa thương hiệu |
| PATCH | `/brands/:id/toggle-status` | Tắt/Bật thương hiệu |

### Branches

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/branches` | Danh sách chi nhánh |
| POST | `/branches` | Tạo chi nhánh |
| GET | `/branches/:id` | Chi tiết chi nhánh |
| PATCH | `/branches/:id` | Cập nhật chi nhánh |
| DELETE | `/branches/:id` | Xóa chi nhánh |
| PATCH | `/branches/:id/toggle-status` | Tắt/Bật chi nhánh |

### Packages

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/packages` | Danh sách gói |
| POST | `/packages` | Tạo gói mới |
| PATCH | `/packages/:id` | Cập nhật gói |
| DELETE | `/packages/:id` | Xóa gói |
| PATCH | `/packages/:id/toggle-status` | Tắt/Bật gói |

### Transaction Categories

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/categories` | Danh sách hạng mục |
| POST | `/categories` | Tạo hạng mục |
| PATCH | `/categories/:id` | Cập nhật hạng mục |
| DELETE | `/categories/:id` | Xóa hạng mục |
| PATCH | `/categories/:id/toggle-status` | Tắt/Bật hạng mục |

### Permissions

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/permissions/groups` | Danh sách nhóm quyền |
| POST | `/permissions/groups` | Tạo nhóm quyền |
| PATCH | `/permissions/groups/:id` | Cập nhật nhóm quyền |
| DELETE | `/permissions/groups/:id` | Xóa nhóm quyền |
| GET | `/permissions` | Danh sách quyền |
| POST | `/permissions` | Tạo quyền mới |
| PATCH | `/permissions/:id` | Cập nhật quyền |
| DELETE | `/permissions/:id` | Xóa quyền |

### Admin Users

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin-users` | Danh sách admin |
| POST | `/admin-users` | Tạo admin |
| PATCH | `/admin-users/:id` | Cập nhật admin |
| DELETE | `/admin-users/:id` | Xóa admin |
| POST | `/admin-users/:id/change-password` | Đổi mật khẩu |

---

## Bảo mật

- Xác thực bằng JWT token
- Session timeout sau 30 phút không hoạt động
- 2FA cho Super Admin (tùy chọn)
- Audit log cho mọi thao tác quan trọng
- Rate limiting cho API endpoints
- RBAC (Role-Based Access Control)
- Mã hóa password với bcrypt
