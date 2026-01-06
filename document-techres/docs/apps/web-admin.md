---
sidebar_position: 1
---

# Web Admin

Web Admin là ứng dụng dành cho **Super Admin** để quản lý toàn bộ hệ thống FNB POS theo mô hình **SaaS Multi-Tenant**.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Nền tảng** | Next.js 15 + React 19 |
| **UI Framework** | Shadcn/ui + TailwindCSS |
| **State Management** | Redux Toolkit + Zustand |
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

## Cấu trúc Menu

```
Web Admin
├── 📊 Dashboard
├── 🏢 Quản lý Công ty (Companies)
│   ├── Danh sách công ty
│   ├── Tạo công ty mới (Wizard 4 bước)
│   ├── Clone công ty
│   └── Quick create
├── 🏷️ Quản lý Thương hiệu (Brands)
├── 🏪 Quản lý Chi nhánh (Branches)
├── 📦 Quản lý Gói App Food (Packages)
├── 🔐 Quản lý Quyền (Permissions)
│   ├── Nhóm quyền
│   └── Danh sách quyền theo module
├── 💰 Hạng mục Thu/Chi (Transaction Categories)
└── 👤 Admin Users
```

---

## Chức năng chính

### 1. Dashboard

Dashboard hiển thị tổng quan hệ thống với các tính năng nổi bật:

#### Thống kê tổng quan

| Thẻ thống kê | Mô tả |
|--------------|-------|
| **Tổng số công ty** | Số lượng company trong hệ thống |
| **Tổng số thương hiệu** | Số lượng brand |
| **Tổng số chi nhánh** | Số lượng branch |
| **Doanh thu** | Tổng doanh thu hệ thống |

#### Quick Entry (Tạo nhanh)

Cho phép tạo nhanh các entity từ Dashboard:

```
┌─────────────────────────────────────────────────────────────────┐
│  QUICK ENTRY - TẠO NHANH                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [+ Công ty mới]  [+ Thương hiệu]  [+ Chi nhánh]               │
│                                                                 │
│  Tenant gần đây:                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Tên công ty    │ Mã tenant  │ Brands │ Branches │ [Sửa]   ││
│  │ ABC Food       │ abcfood    │   2    │    5     │ [✏️]    ││
│  │ XYZ Coffee     │ xyzcoffee  │   1    │    3     │ [✏️]    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ↑ Inline Editing: Click vào ô để sửa trực tiếp               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Inline Editing

- Click trực tiếp vào cell để chỉnh sửa ngay trên table
- Auto-save khi blur hoặc nhấn Enter
- Validation real-time

---

### 2. Quản lý Công ty (Companies) - Wizard 4 bước

Khi tạo công ty mới, **bắt buộc phải hoàn thành 4 bước liên tiếp**:

```
┌─────────────────────────────────────────────────────────────────────┐
│              TẠO CÔNG TY MỚI - WIZARD 4 BƯỚC BẮT BUỘC              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [●] Bước 1        [ ] Bước 2        [ ] Bước 3        [ ] Bước 4 │
│   Thông tin         Thương hiệu       Chi nhánh         Thông tin  │
│   công ty           đầu tiên          đầu tiên          Owner      │
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

#### Bước 4: Thông tin Owner

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên owner | | Mặc định lấy từ người đại diện công ty |
| Email | ✅ | Email để đăng nhập |
| Số điện thoại | | SĐT liên hệ |
| Mật khẩu | | Tự động tạo nếu không nhập |

#### Sau khi hoàn thành Wizard

```
Hệ thống tự động:
├── Tạo company với code = tenant_id
├── Tạo brand với tenant_id = company.code
├── Tạo branch với tenant_id = company.code
├── Tạo tài khoản Owner (username + password)
└── Gửi email thông tin đăng nhập cho Owner
```

#### Clone Company

Tính năng Clone cho phép sao chép cấu hình từ công ty đã có:

| Chức năng | Mô tả |
|-----------|-------|
| **Clone cấu trúc** | Sao chép brands, branches structure |
| **Clone cấu hình** | Sao chép settings, permissions |
| **Clone menu** | Sao chép categories, products (tùy chọn) |
| **Clone nhân viên** | Sao chép roles, không sao chép nhân viên |

#### Quick Create

Tạo nhanh công ty với thông tin tối thiểu:

```typescript
// POST /companies/quick-create
{
  "name": "Tên công ty",
  "code": "tencode",
  "email": "admin@company.com",
  "subscriptionPlan": "STANDARD"
}
// Tự động tạo brand + branch mặc định
```

#### Quản lý công ty đã tạo

| Chức năng | Mô tả |
|-----------|-------|
| Xem danh sách | Danh sách tất cả công ty (filter, search, sort) |
| Xem chi tiết | Thông tin công ty + brands + branches |
| Chỉnh sửa | Cập nhật thông tin công ty |
| Clone | Sao chép công ty |
| Khóa/mở khóa | Suspend hoặc activate công ty |
| Xóa | Soft delete công ty |

---

### 3. Quản lý Thương hiệu (Brands)

Quản lý các thương hiệu thuộc công ty với 3 mô hình kinh doanh:

#### Mô hình kinh doanh

| Mô hình | Mô tả | Use Case |
|---------|-------|----------|
| **ORDER_ONLY** | Chỉ dùng Order App | Quán rất nhỏ, 1-2 nhân viên |
| **CCB_ONLY** | Chỉ dùng CCB App | Quán nhỏ có quầy thu ngân |
| **FULL_SYSTEM** | Local Server + CCB + Order | Quán lớn, nhiều nhân viên |

#### Chức năng quản lý Brand

| Chức năng | Mô tả |
|-----------|-------|
| Tạo thương hiệu | Tạo brand mới cho company (có tenant_id) |
| Danh sách | Xem brands theo company |
| Chỉnh sửa | Cập nhật thông tin brand |
| **Logo & branding** | Upload logo thương hiệu |
| **Chọn mô hình** | Order Only / CCB Only / Full System |
| Tắt/Bật | Toggle isActive |

---

### 4. Quản lý Chi nhánh (Branches)

Quản lý các chi nhánh/cửa hàng:

#### Chức năng quản lý Branch

| Chức năng | Mô tả |
|-----------|-------|
| Tạo chi nhánh | Tạo branch mới cho brand (có tenant_id) |
| Danh sách | Xem branches theo brand/company |
| Chỉnh sửa | Cập nhật thông tin chi nhánh |
| **Logo chi nhánh** | Upload logo (mặc định dùng logo brand) |
| **Giờ hoạt động** | Cấu hình open_time, close_time |
| **Gán gói** | Gán Package (gói App Food) cho chi nhánh |
| Cấu hình | Thiết lập max_connections |
| Tắt/Bật | Toggle isActive |

#### Cấu hình giờ hoạt động

```
┌─────────────────────────────────────────────────────────────────┐
│  GIỜ HOẠT ĐỘNG                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Giờ mở cửa:   [07:00]  ◄─── Time picker                       │
│  Giờ đóng cửa: [22:00]                                         │
│                                                                 │
│  ☑ Áp dụng cho tất cả ngày trong tuần                          │
│  ☐ Cấu hình riêng theo từng ngày                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Quản lý Gói App Food (Packages)

Quản lý các gói dịch vụ và giới hạn kết nối:

| Gói | Kết nối tối đa | Giá/tháng | Mô tả |
|-----|----------------|-----------|-------|
| **Basic** | 3 | X VNĐ | 1 CCB + 2 Order App |
| **Standard** | 10 | Y VNĐ | 2 CCB + 8 Order App |
| **Premium** | 30 | Z VNĐ | 5 CCB + 25 Order App |
| **Enterprise** | Unlimited | Thỏa thuận | Không giới hạn |

#### Chức năng quản lý Package

| Chức năng | Mô tả |
|-----------|-------|
| Tạo/sửa/xóa gói | CRUD gói dịch vụ |
| **Thiết lập features** | Cấu hình features (JSONB) |
| **Thiết lập giá** | Giá theo tháng/năm |
| Giới hạn kết nối | maxConnections |
| Xem chi nhánh đang dùng | Danh sách branches sử dụng package |
| Tắt/Bật | Toggle isActive |

#### Features của Package

```json
{
  "maxConnections": 10,
  "maxProducts": 500,
  "maxStaff": 20,
  "features": {
    "multiPrinter": true,
    "cloudSync": true,
    "reports": ["daily", "weekly", "monthly"],
    "integrations": ["vietqr", "einvoice"]
  }
}
```

---

### 6. Quản lý Quyền (Permissions)

Web Admin quản lý hệ thống quyền theo cấu trúc **Nhóm quyền → Quyền chi tiết** được tổ chức theo module:

#### Cấu trúc phân quyền theo Module

```
NHÓM QUYỀN (Permission Group)
    │
    ├── MODULE: Quản lý Menu
    │   ├── menu.view - Xem menu
    │   ├── menu.create - Tạo sản phẩm
    │   ├── menu.edit - Sửa sản phẩm
    │   └── menu.delete - Xóa sản phẩm
    │
    ├── MODULE: Quản lý Nhân viên
    │   ├── staff.view - Xem nhân viên
    │   ├── staff.create - Tạo nhân viên
    │   └── staff.edit - Sửa nhân viên
    │
    └── MODULE: Báo cáo
        ├── reports.view - Xem báo cáo
        └── reports.export - Xuất báo cáo
```

#### Chức năng quản lý

| Chức năng | Mô tả |
|-----------|-------|
| **Quản lý Nhóm quyền** | Thêm/sửa/xóa/tắt-bật nhóm quyền |
| **Quản lý Quyền theo module** | Danh sách quyền được tổ chức theo module |
| **Thêm quyền** | Tạo quyền mới, gán vào module/nhóm |
| **Gán mặc định** | Đặt quyền mặc định cho từng role |

#### Màn hình quản lý quyền

```
┌─────────────────────────────────────────────────────────────────┐
│  QUẢN LÝ QUYỀN                                    [+ Thêm quyền]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Module: [Tất cả ▼]  Nhóm: [Tất cả ▼]  🔍 Tìm kiếm...          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Mã quyền        │ Tên quyền       │ Module  │ Nhóm │ [Sửa] ││
│  ├─────────────────┼─────────────────┼─────────┼──────┼───────┤│
│  │ menu.view       │ Xem menu        │ Menu    │ Staff│  ✏️   ││
│  │ menu.create     │ Tạo sản phẩm    │ Menu    │ Admin│  ✏️   ││
│  │ staff.view      │ Xem nhân viên   │ HR      │ Staff│  ✏️   ││
│  └─────────────────┴─────────────────┴─────────┴──────┴───────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Lưu ý:** Permissions là dữ liệu **dùng chung** cho tất cả tenant (không có tenant_id)

---

### 7. Hạng mục Thu/Chi (Transaction Categories)

Quản lý các hạng mục thu chi cho báo cáo tài chính:

| Loại | Ví dụ |
|------|-------|
| **Thu (Income)** | Doanh thu bán hàng, Tiền tip, Thu khác |
| **Chi (Expense)** | Mua nguyên liệu, Tiền điện nước, Lương NV, Chi khác |

#### Chức năng

| Chức năng | Mô tả |
|-----------|-------|
| Tạo/sửa/xóa hạng mục | CRUD hạng mục |
| Phân loại | Thu nhập (income) / Chi phí (expense) |
| Đánh dấu hệ thống | Hạng mục system (không xóa được) |
| **Seed Defaults** | Tạo sẵn các hạng mục mặc định cho tenant mới |
| Tắt/Bật | Toggle isActive |
| Import/export | Import/export danh sách hạng mục |

#### Seed Defaults

Khi tạo tenant mới, hệ thống tự động seed các hạng mục mặc định:

```typescript
const defaultCategories = [
  // Income
  { type: 'INCOME', name: 'Doanh thu bán hàng', isSystem: true },
  { type: 'INCOME', name: 'Tiền tip', isSystem: false },
  { type: 'INCOME', name: 'Thu khác', isSystem: false },
  // Expense
  { type: 'EXPENSE', name: 'Mua nguyên liệu', isSystem: false },
  { type: 'EXPENSE', name: 'Tiền điện nước', isSystem: false },
  { type: 'EXPENSE', name: 'Lương nhân viên', isSystem: false },
  { type: 'EXPENSE', name: 'Chi khác', isSystem: false },
];
```

---

### 8. Quản lý Admin Users

Quản lý tài khoản quản trị viên hệ thống:

| Chức năng | Mô tả |
|-----------|-------|
| Tạo tài khoản | Tạo Super Admin / Support |
| Gán role | Phân quyền theo role |
| Đổi mật khẩu | Reset password |
| Khóa/mở khóa | Suspend/activate tài khoản |
| Xem lịch sử | Last login, audit log |

#### Phân quyền Admin

| Role | Quyền |
|------|-------|
| **Super Admin** | Toàn quyền: quản lý company/brand/branch, gói dịch vụ, hạng mục thu chi, permissions |
| **Support** | Chỉ xem thông tin, xử lý tickets (không sửa dữ liệu) |

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

## Flow tạo Công ty mới (Wizard 4 bước)

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
│  Giờ mở cửa: [07:00]                    │
│  Giờ đóng cửa: [22:00]                  │
│                                         │
│  [Quay lại]                 [Tiếp tục]  │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│            WIZARD BƯỚC 4                │
│           Thông tin Owner               │
├─────────────────────────────────────────┤
│  Tên owner: [_______________]           │
│  Email: [___________________]           │
│  SĐT: [____________]                    │
│  Mật khẩu: [__________] (auto generate) │
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
├── Seed transaction categories mặc định
└── Gửi email thông tin đăng nhập
        │
        ▼
Hiển thị kết quả:
├── Company: [Tên công ty] ([mã tenant])
├── Brand: [Tên thương hiệu] ([mã thương hiệu])
├── Branch: [Tên chi nhánh] ([mã chi nhánh])
└── Owner: [email đăng nhập] (password: [mật khẩu])
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
│  QUICK ENTRY:                                                   │
│  [+ Công ty mới]  [+ Clone công ty]  [+ Chi nhánh]             │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Tenant gần đây (Inline Editing)                          │  │
│  │  │ Tên      │ Tenant ID │ Brands │ Branches │ Status │    │  │
│  │  │ [edit]   │ [edit]    │ [view] │ [view]   │ [toggle]│    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Biểu đồ tăng trưởng chi nhánh theo tháng                │  │
│  │  [Chart - Dữ liệu thực từ database]                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quản lý Companies

```
┌─────────────────────────────────────────────────────────────────┐
│  COMPANIES                    [+ Tạo mới] [Clone] [Quick Create]│
├─────────────────────────────────────────────────────────────────┤
│  🔍 Tìm kiếm...        [Lọc: Tất cả ▼]  [Gói: Tất cả ▼]        │
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
    business_model VARCHAR(50) DEFAULT 'full_system',  -- ORDER_ONLY, CCB_ONLY, FULL_SYSTEM
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
    open_time TIME,                        -- Giờ mở cửa
    close_time TIME,                       -- Giờ đóng cửa
    max_connections INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id);
```

### Packages

```sql
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    max_connections INTEGER,
    max_branches INTEGER,
    monthly_price DECIMAL(12,2),
    yearly_price DECIMAL(12,2),
    features JSONB DEFAULT '{}',           -- Tính năng gói
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Transaction Categories

```sql
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) REFERENCES companies(code),  -- NULL = system default
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,             -- INCOME, EXPENSE
    is_system BOOLEAN DEFAULT false,       -- Không xóa được
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Permissions

```sql
CREATE TABLE permission_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES permission_groups(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,     -- format: module.action
    module VARCHAR(50) NOT NULL,           -- menu, staff, reports, etc.
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Companies (với Wizard)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/companies` | Danh sách công ty |
| **POST** | **`/companies/wizard`** | **Wizard tạo công ty 4 bước** |
| **POST** | **`/companies/quick-create`** | **Tạo nhanh công ty** |
| **POST** | **`/companies/:id/clone`** | **Clone công ty** |
| POST | `/companies` | Tạo công ty đơn |
| GET | `/companies/:id` | Chi tiết công ty |
| GET | `/companies/by-code/:code` | Tìm theo tenant code |
| PATCH | `/companies/:id` | Cập nhật công ty |
| DELETE | `/companies/:id` | Xóa công ty |
| PATCH | `/companies/:id/toggle-status` | Tắt/Bật công ty |

### Wizard API

```typescript
// POST /companies/wizard
interface CreateCompanyWizardDto {
  // Step 1: Company
  company: {
    name: string;
    code: string;           // Tenant ID
    logoUrl?: string;
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
  // Step 2: Brand
  brand: {
    name: string;
    code: string;
    logoUrl?: string;
    description?: string;
    businessModel: 'ORDER_ONLY' | 'CCB_ONLY' | 'FULL_SYSTEM';
  };
  // Step 3: Branch
  branch: {
    name: string;
    code: string;
    logoUrl?: string;
    address: string;
    phone?: string;
    email?: string;
    manager?: string;
    businessModel?: 'ORDER_ONLY' | 'CCB_ONLY' | 'FULL_SYSTEM';
    openTime?: string;      // HH:mm
    closeTime?: string;     // HH:mm
    maxConnections?: number;
  };
  // Step 4: Owner
  owner: {
    name?: string;
    email: string;
    phone?: string;
    password?: string;      // Auto-generate if not provided
  };
}

// Response
interface CreateCompanyWizardResponseDto {
  company: { id: string; name: string; code: string; };
  brand: { id: string; name: string; code: string; };
  branch: { id: string; name: string; code: string; };
  owner: {
    id: string;
    username: string;
    temporaryPassword: string;
  };
}
```

### Clone API

```typescript
// POST /companies/:id/clone
interface CloneCompanyDto {
  newCode: string;          // Tenant ID mới
  newName: string;          // Tên công ty mới
  cloneOptions: {
    brands: boolean;        // Clone brands
    branches: boolean;      // Clone branches
    settings: boolean;      // Clone settings
    menu?: boolean;         // Clone menu (optional)
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
| **PATCH** | **`/branches/:id/assign-package`** | **Gán gói cho chi nhánh** |

### Packages

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/packages` | Danh sách gói |
| POST | `/packages` | Tạo gói mới |
| GET | `/packages/:id` | Chi tiết gói |
| PATCH | `/packages/:id` | Cập nhật gói |
| DELETE | `/packages/:id` | Xóa gói |
| PATCH | `/packages/:id/toggle-status` | Tắt/Bật gói |
| **GET** | **`/packages/:id/branches`** | **Danh sách chi nhánh dùng gói** |

### Transaction Categories

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/transaction-categories` | Danh sách hạng mục |
| POST | `/transaction-categories` | Tạo hạng mục |
| PATCH | `/transaction-categories/:id` | Cập nhật hạng mục |
| DELETE | `/transaction-categories/:id` | Xóa hạng mục |
| PATCH | `/transaction-categories/:id/toggle-status` | Tắt/Bật hạng mục |
| **POST** | **`/transaction-categories/seed`** | **Seed defaults cho tenant** |

### Permissions

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/permissions/groups` | Danh sách nhóm quyền |
| POST | `/permissions/groups` | Tạo nhóm quyền |
| PATCH | `/permissions/groups/:id` | Cập nhật nhóm quyền |
| DELETE | `/permissions/groups/:id` | Xóa nhóm quyền |
| GET | `/permissions` | Danh sách quyền |
| **GET** | **`/permissions/by-module`** | **Danh sách quyền theo module** |
| POST | `/permissions` | Tạo quyền mới |
| PATCH | `/permissions/:id` | Cập nhật quyền |
| DELETE | `/permissions/:id` | Xóa quyền |

### Admin Users

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin-users` | Danh sách admin |
| POST | `/admin-users` | Tạo admin |
| GET | `/admin-users/:id` | Chi tiết admin |
| PATCH | `/admin-users/:id` | Cập nhật admin |
| DELETE | `/admin-users/:id` | Xóa admin |
| POST | `/admin-users/:id/change-password` | Đổi mật khẩu |
| PATCH | `/admin-users/:id/toggle-status` | Khóa/mở khóa |

---

## Bảo mật

- Xác thực bằng JWT token
- Session timeout sau 30 phút không hoạt động
- 2FA cho Super Admin (tùy chọn)
- Audit log cho mọi thao tác quan trọng
- Rate limiting cho API endpoints
- RBAC (Role-Based Access Control)
- Mã hóa password với bcrypt

---

## Technology Stack

| Thành phần | Công nghệ |
|------------|-----------|
| **Framework** | Next.js 15 + React 19 |
| **UI Library** | Shadcn/ui |
| **Styling** | TailwindCSS |
| **State Management** | Redux Toolkit + Zustand |
| **Form** | React Hook Form + Zod |
| **Table** | TanStack Table |
| **Chart** | Recharts |
| **HTTP Client** | Axios |
| **Date** | date-fns |
