---
sidebar_position: 2
---

# Web Dashboard

Web Dashboard là ứng dụng quản lý dành cho **Chủ quán (Owner)** để quản lý toàn bộ hoạt động kinh doanh trong phạm vi tenant của mình.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Framework** | Next.js 15 (App Router) |
| **UI Library** | Shadcn/ui + TailwindCSS |
| **State Management** | Redux (global filters) + Zustand (auth) |
| **Đăng nhập** | Tenant ID + Username + Password |

## Cấu trúc Menu

```
├── Tổng quan (Dashboard)
├── Nhân sự (HR)
│   ├── Nhân viên (Staff)
│   └── Bộ phận (Departments)
├── Menu
│   ├── Món ăn (Products)
│   ├── Món theo CN (Branch Products)
│   ├── Danh mục (Categories)
│   ├── Đơn vị tính (Units)
│   ├── Topping Options
│   ├── Ghi chú (Product Notes)
│   ├── Phụ thu (Surcharges)
│   ├── Giá thời vụ (Seasonal Prices)
│   ├── Món tặng (Gift Items)
│   ├── Voucher
│   └── Coupon
├── Quản lý bàn (Tables)
│   ├── Khu vực (Areas)
│   └── Danh sách bàn (Table List)
├── Bếp (Kitchen)
├── Kết nối (Integrations)
│   └── App Food (Food Partners)
├── Báo cáo (Reports)
└── Thiết lập (Settings)
```

---

## Chi tiết tính năng

### 1. Dashboard (`/dashboard`)

**Mô tả:** Trang tổng quan hiển thị các chỉ số kinh doanh

**Tính năng:**
- **Cards thống kê:**
  - Doanh thu hôm nay
  - Số đơn hàng
  - Món bán chạy (Top 5)
  - Nhân viên đang làm việc
- **Hoạt động gần đây:** Danh sách orders/activities mới nhất
- **Thống kê nhanh:** Biểu đồ doanh thu, phân bổ thanh toán

---

### 2. Quản lý Nhân sự (HR)

#### 2.1 Nhân viên (`/hr/staff`)

**Mô tả:** Quản lý thông tin nhân viên của chi nhánh

**Tính năng:**
- Danh sách nhân viên với tìm kiếm và lọc
- Tạo/Sửa/Xóa nhân viên
- Upload ảnh đại diện (avatar)
- Phân công bộ phận
- Gán vai trò (Owner, Manager, Cashier, Staff, Kitchen)
- Bật/tắt trạng thái hoạt động
- Quản lý mật khẩu và PIN code
- Bulk operations:
  - Import từ Excel
  - Cập nhật bộ phận hàng loạt
  - Cập nhật chi nhánh hàng loạt
  - Toggle active hàng loạt
  - Reset password hàng loạt

**Các trường thông tin:**
| Trường | Mô tả |
|--------|-------|
| Họ tên | Tên đầy đủ |
| Email | Email đăng nhập |
| Số điện thoại | SĐT liên hệ |
| Username | Tên đăng nhập (auto-generate) |
| Vai trò | owner/manager/cashier/staff/kitchen |
| Bộ phận | Thuộc bộ phận nào |
| Mã PIN | PIN để đăng nhập POS (4-6 số) |
| Giới tính | Nam/Nữ/Khác |
| Trạng thái | Active/Inactive |

#### 2.2 Bộ phận (`/hr/departments`)

**Mô tả:** Quản lý cấu trúc bộ phận theo mô hình cây cha-con (hierarchical)

**Tính năng:**
- Hiển thị phân cấp bộ phận với OKR-style cards
- 6 cấp: Owner → Level 1 → Level 2 → Level 3 → Level 4 → Level 5
- Tạo/Sửa/Xóa bộ phận
- Quan hệ cha-con linh hoạt
- Gán quyền cho bộ phận
- Cascade activate/deactivate (ảnh hưởng bộ phận con và nhân viên)
- Chuyển nhân viên khi xóa bộ phận (soft delete)
- Đếm số nhân viên theo bộ phận
- Color-coded hierarchy levels
- Expand/collapse hierarchical view
- Badge "Mới"/"Đã cập nhật" để track changes
- Chế độ "Tiếp tục tạo" (continue creating mode)

---

### 3. Quản lý Menu

#### 3.1 Món ăn (`/menu/products`)

**Mô tả:** Quản lý danh sách sản phẩm/món ăn theo thương hiệu

**5 loại sản phẩm:**
| Loại | Mô tả | Hiển thị order | Gán vào Combo |
|------|-------|----------------|---------------|
| **Đồ ăn (food)** | Món ăn chính | ✅ Có | ✅ Có thể |
| **Đồ uống (drink)** | Nước, trà, cafe... | ✅ Có | ✅ Có thể |
| **Khác (other)** | Món khác | ✅ Có | ✅ Có thể |
| **Topping** | Món thêm | ❌ Chỉ trong topping | ❌ Không |
| **Combo** | Gói combo | ✅ Có | ❌ Không |

**Tính năng:**
- CRUD sản phẩm đầy đủ
- Upload hình ảnh sản phẩm
- Cấu hình giá bán, giá vốn
- Thiết lập thuế VAT (%)
- Chọn đơn vị tính
- Bật/tắt trạng thái
- Mô tả và ghi chú
- Chế độ "Tiếp tục tạo"
- Bulk operations:
  - Import từ Excel
  - Cập nhật danh mục hàng loạt
  - Cập nhật giá hàng loạt
  - Cập nhật VAT hàng loạt
  - Toggle active hàng loạt

**Các trường:**
| Trường | Mô tả |
|--------|-------|
| Tên món | Tên sản phẩm |
| Mã | Mã sản phẩm (code) |
| Danh mục | Thuộc danh mục nào |
| Loại | food/drink/other/topping/combo |
| Giá bán | Giá bán lẻ (đã bao gồm VAT) |
| Giá vốn | Giá nhập/cost |
| Thuế VAT | % thuế (0%, 5%, 8%, 10%) |
| Đơn vị | Đơn vị tính (ly, phần, cái...) |
| Hình ảnh | URL ảnh |
| Thời gian chuẩn bị | Phút (preparation time) |

#### 3.2 Danh mục (`/menu/categories`)

**Mô tả:** Quản lý nhóm danh mục sản phẩm theo thương hiệu

**Tính năng:**
- Tạo/Sửa/Xóa danh mục
- Phân loại theo 5 loại sản phẩm
- Cấu hình thứ tự hiển thị (order index)
- Bật/tắt trạng thái
- Đếm số sản phẩm theo danh mục (count by type)
- Lọc theo type và status
- Cấu hình cột hiển thị (column visibility)
- Lọc theo brand

#### 3.3 Đơn vị tính (`/menu/units`)

**Mô tả:** Quản lý đơn vị đo lường (ly, phần, cái, chai, lon...)

**Tính năng:**
- Tạo/Sửa/Xóa đơn vị
- Mô tả đơn vị
- Cấu hình thứ tự hiển thị
- Bật/tắt trạng thái
- Cấu hình cột hiển thị
- Lọc theo brand

#### 3.4 Topping Options (`/menu/topping-options`)

**Mô tả:** Quản lý các món thêm/topping

**Tính năng:**
- Tạo nhóm topping (Topping Groups)
- Thêm topping items với giá
- Gán topping vào sản phẩm
- Cấu hình số lượng tối đa có thể chọn

#### 3.5 Ghi chú món (`/menu/product-notes`)

**Mô tả:** Quản lý thư viện ghi chú/hướng dẫn cho món

**Ví dụ:** Ít đá, Nhiều đường, Không hành, Ít cay, Thêm rau...

**Tính năng:**
- Tạo/Sửa/Xóa ghi chú mẫu
- Gán ghi chú vào sản phẩm
- Nhân viên chọn nhanh khi order

#### 3.6 Phụ thu (`/menu/surcharges`)

**Mô tả:** Quản lý các khoản phụ thu (phí dịch vụ, phí giao hàng...)

**Tính năng:**
- Tạo/Sửa/Xóa phụ thu
- Cấu hình số tiền hoặc %
- Áp dụng cho sản phẩm/đơn hàng

#### 3.7 Giá thời vụ (`/menu/seasonal-prices`)

**Mô tả:** Cấu hình giá theo mùa/khuyến mãi

**Tính năng:**
- Thiết lập giá theo khoảng thời gian (date range)
- Override giá gốc trong period cụ thể
- Áp dụng theo sản phẩm
- Tự động apply khi trong thời gian

#### 3.8 Món tặng (`/menu/gift-items`)

**Mô tả:** Quản lý các món quà tặng/khuyến mãi

#### 3.9 Voucher (`/menu/vouchers`)

**Mô tả:** Quản lý mã giảm giá voucher

**Tính năng:**
- Tạo mã voucher
- Cấu hình % hoặc số tiền giảm
- Thiết lập thời hạn sử dụng
- Giới hạn số lần dùng
- Theo dõi số lần đã sử dụng

#### 3.10 Coupon (`/menu/coupons`)

**Mô tả:** Quản lý promotional coupons

**Tính năng:**
- Tạo mã coupon
- Loại giảm: Phần trăm / Số tiền cố định
- Đơn tối thiểu để áp dụng
- Giảm tối đa (nếu là %)
- Thời hạn sử dụng

#### 3.11 Món theo chi nhánh (`/menu/branch-products`)

**Mô tả:** Override cấu hình sản phẩm theo từng chi nhánh

**Tính năng:**
- Bật/tắt sản phẩm theo chi nhánh
- Override giá theo chi nhánh (món tăng giá)
- Quản lý tồn kho theo chi nhánh

---

### 4. Quản lý Bàn

#### 4.1 Khu vực (`/tables/areas`)

**Mô tả:** Quản lý các khu vực trong quán (Tầng 1, Sân vườn, Phòng VIP...)

**Tính năng:**
- Tạo/Sửa/Xóa khu vực
- Thêm nhanh nhiều bàn khi tạo khu vực (bulk add 5 tables)
- Inline table entry: edit name, capacity trực tiếp
- Đếm số bàn theo khu vực
- Lọc theo trạng thái
- Cấu hình cột hiển thị

#### 4.2 Danh sách bàn (`/tables/list`)

**Mô tả:** Quản lý chi tiết từng bàn

**Tính năng:**
- Tạo/Sửa/Xóa bàn
- Trạng thái bàn với màu sắc:
  - 🟢 Available (Trống)
  - 🔴 Occupied (Có khách)
  - 🟡 Reserved (Đã đặt)
- Hiển thị sức chứa (capacity)
- Nhóm theo khu vực
- Toggle active/inactive
- Tìm kiếm và lọc
- Quick area creation từ table page
- Table cards với action dropdown

---

### 5. Quản lý Bếp (`/kitchen`)

**Mô tả:** Cấu hình các trạm bếp/bar và máy in

**Tính năng:**
- Tạo nhiều bếp cho chi nhánh
- Cấu hình máy in:
  | Cấu hình | Mô tả |
  |----------|-------|
  | Tên máy in | Tên để nhận dạng |
  | IP Address | Địa chỉ IP máy in |
  | Port | Cổng kết nối (mặc định 9100) |
  | Khổ giấy | 58mm, 80mm, 76mm, 110mm, A4 |
  | Chế độ in | Danh sách / Từng món riêng lẻ |
- Gán sản phẩm vào bếp:
  - Chọn món in ra bếp nào
  - Lọc theo loại (food, drink, other, combo)
  - Multi-select với checkbox
  - Product count per kitchen
- Bật/tắt trạng thái bếp
- Chế độ "Tiếp tục tạo"
- Badge "Mới"/"Đã cập nhật"

---

### 6. Kết nối đối tác (`/integrations/food-partners`)

**Mô tả:** Liên kết với các app giao đồ ăn

**Đối tác hỗ trợ:**
- Shopee Food
- Grab Food
- BFood
- (Mở rộng thêm)

**Tính năng:**
- **Quản lý cổng kết nối (ports):**
  - Phân bổ port cho từng đối tác/chi nhánh
  - Cấu hình Shop Number
  - Giới hạn số kết nối mỗi port
  - Bật/tắt trạng thái port
- **Liên kết tài khoản:**
  - Nhiều tài khoản mỗi port
  - Theo dõi trạng thái kết nối:
    - 🟢 Connected
    - ⚪ Disconnected
    - 🟡 Pending
    - 🔴 Error
  - Thời gian sync gần nhất
  - Hiển thị error message
- Link/Unlink tài khoản
- Refresh/Re-sync kết nối

---

### 7. Báo cáo (`/reports`)

**Mô tả:** Xem báo cáo kinh doanh

**Tính năng:**
- **Thống kê tổng quan:**
  - Tổng doanh thu
  - Số đơn hàng
  - Đơn trung bình
  - Số khách hàng
- **Lọc theo thời gian:**
  - Hôm nay
  - Tuần này
  - Tháng này
  - Quý này
- **Biểu đồ:**
  - Doanh thu theo ngày (7 ngày gần nhất)
  - Top 5 món bán chạy
  - Phân bổ theo hình thức thanh toán:
    - Tiền mặt
    - Chuyển khoản
    - Thẻ/Ví điện tử
- **Xuất báo cáo:** Download Excel/PDF

---

### 8. Thiết lập (`/settings`)

#### 8.1 Thông tin công ty

**Hiển thị (read-only từ auth):**
- Tên công ty
- Mã công ty (tenant_id)
- Email liên hệ
- Số điện thoại

#### 8.2 Phương thức thanh toán

**Mô tả:** Cấu hình các hình thức thanh toán

**Loại thanh toán:**
- Tiền mặt (Cash)
- Chuyển khoản (Bank Transfer)
- Thẻ/Ví điện tử (Card/E-wallet)
- Custom types

**Tính năng:**
- Tạo/Sửa/Xóa phương thức
- Mô tả phương thức
- Cấu hình thứ tự hiển thị
- Bật/tắt trạng thái
- Brand-specific payment methods

#### 8.3 Tài khoản ngân hàng

**Mô tả:** Quản lý tài khoản nhận thanh toán

**Tính năng:**
- Chọn từ danh sách ngân hàng Việt Nam
- Nhập số tài khoản
- Tên chủ tài khoản
- Bank code và BIN
- Template chuyển khoản (với placeholder `{order_code}`)
- Đánh dấu tài khoản chính (primary)
- **Tạo QR Code VietQR:**
  - QR động với số tiền và mô tả
  - Download QR image
  - Copy URL to clipboard
  - Mở trong tab mới
- Bật/tắt trạng thái
- Hỗ trợ nhiều tài khoản per brand

#### 8.4 Hóa đơn điện tử (E-Invoice)

**Mô tả:** Cấu hình xuất HĐĐT

**Nhà cung cấp hỗ trợ:**
| Provider | Mô tả |
|----------|-------|
| FPT e-Invoice | FPT |
| VNPT e-Invoice | VNPT |
| MISA e-Invoice | MISA |
| Viettel e-Invoice | Viettel |
| MIFI e-Invoice | MIFI |
| Invoice.vn | Invoice.vn |
| Hilo | Hilo |

**Cấu hình:**
| Trường | Mô tả |
|--------|-------|
| Mã số thuế (MST) | Tax code |
| Tên công ty | Company name từ tax registration |
| Địa chỉ | Company address |
| Mẫu hóa đơn | Invoice template code |
| Ký hiệu hóa đơn | Invoice series/symbol |
| API URL | Provider API endpoint |
| Username/Password | API credentials |
| Tự động xuất | Toggle auto-issue on payment |

---

## Tính năng chung

### Global Filters
- Bộ lọc thương hiệu (Brand selector)
- Bộ lọc chi nhánh (Branch selector)
- Filter áp dụng cho toàn bộ dữ liệu
- Hiển thị placeholder khi chưa chọn filter

### Cấu hình cột (Column Configuration)
- Hiển thị/ẩn cột
- Khóa/mở khóa cột
- Reset về mặc định
- Lưu vào localStorage
- Áp dụng cho: Categories, Units, Areas

### Quản lý dữ liệu
- CRUD đầy đủ cho hầu hết entity
- Chế độ "Tiếp tục tạo" (continue creating mode)
- Bulk operations (where applicable)
- Soft delete với confirmation dialog
- Toggle active/inactive
- Badge "Mới"/"Đã cập nhật" (track recent changes)

### Tìm kiếm & Lọc
- Text search across listings
- Status filtering (active/inactive)
- Type filtering (where applicable)
- Area/location filtering
- Brand/branch filtering
- Date range selection (reports)

### Header User Menu
- Hiển thị avatar và tên
- Role badge (Owner, Manager, Cashier, Staff, Kitchen)
- Notification bell với count
- **Đổi mật khẩu:**
  - Mật khẩu hiện tại
  - Mật khẩu mới (tối thiểu 6 ký tự)
  - Xác nhận mật khẩu
  - Validation matching
- Đăng xuất

### Dialog Management
- Create dialogs for adding
- Edit dialogs for modifying
- Confirmation dialogs for deletions
- Product assignment dialogs (Kitchen)
- Permission assignment dialogs (Departments)
- QR generation dialogs (Bank accounts)

### Status Indicators
- Active/Inactive badges
- New item badges (green)
- Updated item badges (blue)
- Error status badges (red)
- Pending badges (yellow)
- Connected/Disconnected badges

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI Components | Shadcn/ui |
| Styling | TailwindCSS |
| State Management | Redux (global filters), Zustand (auth) |
| Forms | React Hook Form + Zod validation |
| API Client | Axios với service layer |
| Icons | Lucide React |
| Data Persistence | localStorage (column configs) |
| Notifications | Toast notifications |

---

## API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/login` | Đăng nhập (tenant_id + username + password) |
| POST | `/auth/change-password` | Đổi mật khẩu |
| GET | `/auth/me` | Lấy thông tin user hiện tại |

### Nhân sự
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/staff` | Danh sách nhân viên |
| POST | `/staff` | Thêm nhân viên |
| PUT | `/staff/:id` | Sửa nhân viên |
| PATCH | `/staff/:id/toggle-active` | Toggle trạng thái |
| POST | `/staff/:id/reset-password` | Reset mật khẩu |
| POST | `/staff/bulk-import` | Import hàng loạt |
| POST | `/staff/bulk/update-department` | Cập nhật bộ phận hàng loạt |
| GET | `/departments` | Danh sách bộ phận |
| POST | `/departments` | Thêm bộ phận |

### Menu
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/products` | Danh sách món |
| POST | `/products` | Thêm món |
| PUT | `/products/:id` | Sửa món |
| DELETE | `/products/:id` | Xóa món |
| POST | `/products/bulk-import` | Import hàng loạt |
| GET | `/categories` | Danh sách danh mục |
| GET | `/categories/count-by-type` | Đếm theo loại |
| GET | `/units` | Danh sách đơn vị |
| POST | `/products/topping-groups` | Tạo nhóm topping |
| POST | `/products/notes` | Tạo ghi chú |

### Bàn
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/areas` | Danh sách khu vực |
| POST | `/areas` | Thêm khu vực |
| GET | `/tables` | Danh sách bàn |
| POST | `/tables` | Thêm bàn |

### Bếp
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/kitchen` | Danh sách bếp |
| POST | `/kitchen` | Thêm bếp |
| PUT | `/kitchen/:id` | Sửa bếp |

### Dashboard
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/dashboard/stats` | Thống kê tổng quan |
| GET | `/dashboard/recent-activity` | Hoạt động gần đây |
