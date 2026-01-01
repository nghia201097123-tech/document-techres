---
sidebar_position: 2
---

# Web Dashboard

Web Dashboard là ứng dụng dành cho **Chủ quán (Owner)** để quản lý Công ty, Thương hiệu và Chi nhánh của mình.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Nền tảng** | React/Next.js |
| **Users** | Owner, Manager |
| **Mục đích** | Quản lý nhân sự, menu, bàn, bếp, ca, HĐĐT, cài đặt |

## Đăng nhập

Owner đăng nhập bằng tài khoản được Web Admin cấp:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ĐĂNG NHẬP                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Mã công ty:    [annhonquan              ]                     │
│                                                                  │
│   Tên đăng nhập: [tr000001                ]                     │
│                                                                  │
│   Mật khẩu:      [••••••••••              ]                     │
│                                                                  │
│                      [  ĐĂNG NHẬP  ]                            │
│                                                                  │
│   Quên mật khẩu?                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Thông tin đăng nhập

| Trường | Mô tả |
|--------|-------|
| **Mã công ty** | Mã định danh công ty (VD: `annhonquan`, `phobien`) |
| **Tên đăng nhập** | Username được cấp (VD: `tr000001`) |
| **Mật khẩu** | Password được cấp |

### Quy trình đăng nhập

1. **Nhận thông tin từ Web Admin:**
   - Mã công ty
   - Tên đăng nhập (username)
   - Mật khẩu tạm

2. **Đăng nhập lần đầu:**
   - Nhập đầy đủ 3 thông tin
   - Bắt buộc đổi mật khẩu mới

3. **Bắt đầu thiết lập:**
   - Tạo Thương hiệu
   - Tạo Chi nhánh
   - Cấu hình menu, bàn, nhân viên

---

## Phạm vi quản lý theo cấp

| Cấp | Dữ liệu quản lý |
|-----|-----------------|
| **Công ty** | Bộ phận, Thiết lập công ty |
| **Thương hiệu** | Món ăn, Danh mục, Đơn vị, Ghi chú, Lý do hủy, Coupon, Thiết lập thương hiệu |
| **Chi nhánh** | Nhân viên, Khu, Bàn, Món tăng giá, Bếp, Gán món-bếp, Ca, Đơn hàng, HĐĐT, Thiết lập chi nhánh |

---

## 1. Quản lý Nhân sự (HR)

### 1.1 Danh sách Nhân viên (Chi nhánh)

| Chức năng | Mô tả |
|-----------|-------|
| Thêm nhân viên | Tạo mới với đầy đủ thông tin |
| Sửa thông tin | Cập nhật thông tin nhân viên |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt nhân viên |
| Reset mật khẩu | Đặt lại mật khẩu về mặc định |
| Gán quyền chi nhánh | Cho phép làm việc trên nhiều chi nhánh |
| Import Excel | Import danh sách từ file Excel |
| Export Excel | Xuất danh sách ra file Excel |

```
┌─────────────────────────────────────────────────────────────────┐
│  NHÂN VIÊN - Chi nhánh Quận 1            [Import] [Export] [+]  │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Tìm kiếm...                         [Bộ phận: Tất cả ▼]     │
├─────────────────────────────────────────────────────────────────┤
│  │ Mã NV    │ Tên          │ SĐT         │ Bộ phận   │ Trạng thái │
│  ├──────────┼──────────────┼─────────────┼───────────┼────────────┤
│  │ tr000001 │ Nguyễn Văn A │ 0901234567  │ Thu ngân  │ ● Hoạt động│
│  │ tr000002 │ Trần Thị B   │ 0909876543  │ Phục vụ   │ ● Hoạt động│
│  │ tr000003 │ Lê Văn C     │ 0912345678  │ Bếp chính │ ○ Tạm khóa │
│  └──────────┴──────────────┴─────────────┴───────────┴────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Thông tin Nhân viên Chi tiết

Khi thêm/sửa nhân viên, cần nhập các thông tin theo nhóm:

#### Thông tin cá nhân

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| **Tên nhân viên** | ✅ | Họ và tên đầy đủ |
| **Số điện thoại** | ✅ | SĐT liên hệ |
| **Ngày sinh** | ❌ | Ngày tháng năm sinh |
| **Giới tính** | ❌ | Nam / Nữ / Khác |
| **CMND/CCCD** | ❌ | Số chứng minh nhân dân hoặc căn cước |
| **Email** | ❌ | Email cá nhân |
| **Nơi sinh** | ❌ | Tỉnh/thành phố sinh |

#### Địa chỉ

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| **Tỉnh/Thành phố** | ❌ | Chọn từ danh sách |
| **Quận/Huyện** | ❌ | Chọn theo Tỉnh/Thành |
| **Phường/Xã** | ❌ | Chọn theo Quận/Huyện |
| **Số nhà, tên đường** | ❌ | Địa chỉ chi tiết |

#### Phân loại

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| **Loại nhân viên** | ✅ | Fulltime / Part-time / Thử việc |
| **Bậc lương** | ❌ | Bậc 1 / Bậc 2 / Bậc 3... |
| **Khối bộ phận** | ✅ | Bếp / Phục vụ / Thu ngân / Quản lý |
| **Bộ phận** | ✅ | Bộ phận cụ thể trong khối |

#### Làm việc

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| **Thương hiệu** | ✅ | Thương hiệu làm việc |
| **Chi nhánh chính** | ✅ | Chi nhánh làm việc chính |
| **Quyền hoạt động** | ❌ | Multi-select: Các chi nhánh được phép làm việc |
| **Khu vực** | ❌ | Khu vực phụ trách (Tầng 1, Sân vườn...) |
| **Quản lý khu vực** | ❌ | Có/Không - Nếu có sẽ hưởng doanh số khu vực |

#### Hệ thống

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| **Ngày bắt đầu làm việc** | ✅ | Ngày vào làm |
| **Username** | Tự động | Tự sinh: `tr000001`, `tr000002`... |
| **Password** | ✅ | Mật khẩu đăng nhập (có thể reset) |
| **PIN Code** | ❌ | Mã PIN đăng nhập nhanh trên app |

```
┌─────────────────────────────────────────────────────────────────┐
│  THÊM NHÂN VIÊN                                           [X]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ THÔNG TIN CÁ NHÂN                                       │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  Tên nhân viên*: [Nguyễn Văn A              ]           │    │
│  │  Số điện thoại*: [0901234567                ]           │    │
│  │  Ngày sinh:      [15/03/1995                ]           │    │
│  │  Giới tính:      [● Nam  ○ Nữ  ○ Khác       ]           │    │
│  │  CMND/CCCD:      [079123456789              ]           │    │
│  │  Email:          [nguyenvana@gmail.com      ]           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ PHÂN LOẠI                                               │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  Loại nhân viên*: [Fulltime           ▼]                │    │
│  │  Bậc lương:       [Bậc 2              ▼]                │    │
│  │  Khối bộ phận*:   [Thu ngân           ▼]                │    │
│  │  Bộ phận*:        [Thu ngân chính     ▼]                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LÀM VIỆC                                                │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  Thương hiệu*:    [Phở Việt           ▼]                │    │
│  │  Chi nhánh*:      [Quận 1             ▼]                │    │
│  │  Quyền hoạt động: [☑ Quận 1  ☑ Quận 3  ☐ Quận 7]        │    │
│  │  Khu vực:         [Tầng 1             ▼]                │    │
│  │  Quản lý khu vực: [☑ Có]                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ HỆ THỐNG                                                │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  Ngày bắt đầu*:   [01/01/2024                ]          │    │
│  │  Username:        [tr000001] (Tự động sinh)             │    │
│  │  Password*:       [••••••••                  ]          │    │
│  │  PIN Code:        [1234                      ]          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                                      [Hủy] [Lưu]                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Quản lý quyền Chi nhánh

Nhân viên có thể được cấp quyền làm việc trên nhiều chi nhánh:

| Chức năng | Mô tả |
|-----------|-------|
| Gán chi nhánh | Cho phép NV làm việc tại chi nhánh khác |
| Gỡ chi nhánh | Thu hồi quyền làm việc tại chi nhánh |
| Xem chi nhánh | Xem danh sách chi nhánh NV được phép làm việc |

```
┌─────────────────────────────────────────────────────────────────┐
│  QUYỀN CHI NHÁNH - Nguyễn Văn A (tr000001)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Chi nhánh chính: Quận 1                                        │
│                                                                  │
│  Quyền hoạt động tại các chi nhánh khác:                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ☑ Quận 1 (Chi nhánh chính)                              │    │
│  │ ☑ Quận 3                                                │    │
│  │ ☐ Quận 7                                                │    │
│  │ ☐ Bình Thạnh                                            │    │
│  │ ☐ Gò Vấp                                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                                      [Hủy] [Lưu]                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Quản lý Khu vực & Doanh số

| Khái niệm | Mô tả |
|-----------|-------|
| **Khu vực** | Khu vực phục vụ trong chi nhánh (Tầng 1, Tầng 2, Sân vườn...) |
| **Quản lý khu vực** | Nhân viên được gán làm quản lý khu vực |
| **Doanh số khu vực** | Quản lý khu vực được tính doanh số từ đơn hàng trong khu vực |

```
Nhân viên A (Quản lý khu vực: Tầng 1)
        │
        ▼
Đơn hàng tại Bàn 1-10 (thuộc Tầng 1)
        │
        ▼
Doanh số được tính cho Nhân viên A
```

### 1.5 Danh sách Loại nhân viên (Công ty)

| Chức năng | Mô tả |
|-----------|-------|
| Thêm loại | Tạo loại nhân viên mới |
| Sửa loại | Cập nhật tên, mô tả |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |

**Danh sách mặc định:**

| Mã | Tên | Mô tả |
|----|-----|-------|
| `fulltime` | Fulltime | Nhân viên toàn thời gian |
| `parttime` | Part-time | Nhân viên bán thời gian |
| `probation` | Thử việc | Nhân viên thử việc |
| `intern` | Thực tập | Sinh viên thực tập |

### 1.6 Danh sách Bậc lương (Công ty)

| Chức năng | Mô tả |
|-----------|-------|
| Thêm bậc | Tạo bậc lương mới |
| Sửa bậc | Cập nhật tên, mô tả, hệ số |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |

**Danh sách mặc định:**

| Bậc | Tên | Mô tả |
|-----|-----|-------|
| 1 | Bậc 1 | Nhân viên mới |
| 2 | Bậc 2 | Nhân viên có kinh nghiệm |
| 3 | Bậc 3 | Nhân viên lành nghề |
| 4 | Bậc 4 | Nhân viên kỹ năng cao |
| 5 | Bậc 5 | Chuyên gia |

### 1.8 Danh sách Bộ phận (Công ty)

Bộ phận có cấu trúc **cha-con** (hierarchical):

```
Bộ phận Bếp
    ├── Bếp chính
    ├── Bếp phụ
    └── Sơ chế

Bộ phận Phục vụ
    ├── Phục vụ bàn
    └── Thu ngân
```

| Chức năng | Mô tả |
|-----------|-------|
| Thêm bộ phận | Tạo mới, chọn bộ phận cha (nếu có) |
| Sửa bộ phận | Cập nhật tên, mô tả |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |
| Sắp xếp | Thay đổi thứ tự hiển thị |

### 1.9 Gán quyền (Chi nhánh)

Gán quyền cho nhân viên theo 2 cách:

| Cách gán | Mô tả |
|----------|-------|
| **Theo cá nhân** | Gán quyền trực tiếp cho từng nhân viên |
| **Theo bộ phận** | Gán quyền cho cả bộ phận, tất cả nhân viên trong bộ phận sẽ có quyền đó |

```
┌─────────────────────────────────────────────────────────────────┐
│  GÁN QUYỀN - Nguyễn Văn A (Thu ngân)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ☑ QUẢN LÝ ORDER                                               │
│     ☑ Tạo order                                                │
│     ☑ Sửa order                                                │
│     ☐ Hủy order                                                │
│                                                                 │
│  ☑ THANH TOÁN                                                  │
│     ☑ Thanh toán tiền mặt                                      │
│     ☑ Thanh toán chuyển khoản                                  │
│     ☐ Áp dụng giảm giá                                         │
│                                                                 │
│  ☐ QUẢN LÝ CA                                                  │
│     ☐ Mở ca                                                    │
│     ☐ Đóng ca                                                  │
│                                                                 │
│                                    [Hủy] [Lưu]                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Xây dựng dữ liệu Bán hàng

### 2.1 Danh sách Món ăn (Thương hiệu)

#### 5 loại món ăn

| Loại | Mô tả | Hiển thị order | In |
|------|-------|----------------|-----|
| **Đồ ăn** | Món ăn chính | ✅ Có | In món + In stamp |
| **Đồ uống** | Nước, trà, cafe... | ✅ Có | In món + In stamp |
| **Khác** | Món khác | ✅ Có | In món + In stamp |
| **Topping** | Món thêm | ❌ Không (chỉ hiện trong topping) | Theo món chính |
| **Combo** | Gói combo | ✅ Có | In món + In stamp |

#### Chức năng

| Chức năng | Mô tả |
|-----------|-------|
| Thêm món | Tạo mới với tên, giá, hình ảnh, danh mục, đơn vị |
| Sửa món | Cập nhật thông tin |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |
| Import Excel | Import danh sách từ file Excel |
| Export Excel | Xuất danh sách ra file Excel |
| Cài đặt in | Chọn in ra bếp / in tem dán |

#### Cài đặt in cho món

- **In món (in ra bếp/bar)**: Có/Không
- **In stamp (in tem dán)**: Có/Không

```
┌─────────────────────────────────────────────────────────────────┐
│  MÓN ĂN - Thương hiệu Phở Việt           [Import] [Export] [+]  │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Tìm kiếm...        [Loại: Tất cả ▼] [Danh mục: Tất cả ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ [Hình]  │  │ [Hình]  │  │ [Hình]  │  │ [Hình]  │            │
│  │ Phở bò  │  │ Phở gà  │  │ Bún chả │  │ Nem     │            │
│  │ 55,000đ │  │ 50,000đ │  │ 45,000đ │  │ 35,000đ │            │
│  │ 🍽️ Đồ ăn │  │ 🍽️ Đồ ăn │  │ 🍽️ Đồ ăn │  │ 🍽️ Đồ ăn │            │
│  │ [Sửa]   │  │ [Sửa]   │  │ [Sửa]   │  │ [Sửa]   │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Danh sách Danh mục (Thương hiệu)

Danh mục thuộc về 1 loại món:

| Chức năng | Mô tả |
|-----------|-------|
| Thêm danh mục | Tạo mới, chọn loại món (Đồ ăn/Đồ uống/Khác) |
| Sửa danh mục | Cập nhật tên, hình ảnh |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |
| Sắp xếp | Thay đổi thứ tự hiển thị |

```
Loại: Đồ ăn
├── Danh mục: Phở
├── Danh mục: Bún
└── Danh mục: Cơm

Loại: Đồ uống
├── Danh mục: Trà
├── Danh mục: Cà phê
└── Danh mục: Sinh tố
```

### 2.3 Danh sách Đơn vị (Thương hiệu)

Đơn vị tính chỉ để hiển thị, không ảnh hưởng business logic:

- Phần, Ly, Chai, Đĩa, Tô, Lon, Hộp...

| Chức năng | Mô tả |
|-----------|-------|
| Thêm đơn vị | Tạo mới |
| Sửa đơn vị | Cập nhật tên |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |

### 2.4 Ghi chú Món ăn (Thương hiệu)

Danh sách ghi chú mẫu để nhân viên chọn nhanh khi order:

- Ít đá, Nhiều đường, Không hành, Ít cay, Thêm rau...

| Chức năng | Mô tả |
|-----------|-------|
| Thêm ghi chú | Tạo ghi chú mẫu mới |
| Sửa ghi chú | Cập nhật nội dung |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |
| Sắp xếp | Thay đổi thứ tự hiển thị |

### 2.5 Lý do Hủy món (Thương hiệu)

Danh sách lý do hủy món để thống kê và kiểm soát:

- Hết nguyên liệu, Khách đổi ý, Làm sai, Chờ quá lâu...

| Chức năng | Mô tả |
|-----------|-------|
| Thêm lý do | Tạo lý do mới |
| Sửa lý do | Cập nhật nội dung |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |

### 2.6 Danh sách Coupon (Thương hiệu)

Quản lý mã giảm giá:

| Thông tin | Mô tả |
|-----------|-------|
| Mã coupon | VD: GIAMGIA10, FREESHIP |
| Loại giảm | Phần trăm / Số tiền cố định |
| Giá trị | VD: 10% hoặc 50,000đ |
| Đơn tối thiểu | Giá trị đơn tối thiểu để áp dụng |
| Giảm tối đa | Số tiền giảm tối đa (nếu là %) |
| Số lần sử dụng | Giới hạn số lần sử dụng |
| Thời hạn | Ngày bắt đầu - Ngày kết thúc |

```
┌─────────────────────────────────────────────────────────────────┐
│  COUPON - Thương hiệu Phở Việt                            [+]   │
├─────────────────────────────────────────────────────────────────┤
│  │ Mã        │ Loại     │ Giá trị │ Còn lại │ Hạn       │      │
│  ├───────────┼──────────┼─────────┼─────────┼───────────┼──────┤
│  │ GIAMGIA10 │ Phần trăm│ 10%     │ 45/100  │ 31/12/2024│ ● On │
│  │ KHAIMO    │ Cố định  │ 50,000đ │ Unlimit │ 30/06/2024│ ● On │
│  │ VIP20     │ Phần trăm│ 20%     │ 0/50    │ Hết hạn   │ ○Off │
│  └───────────┴──────────┴─────────┴─────────┴───────────┴──────┘
└─────────────────────────────────────────────────────────────────┘
```

### 2.7 Quản lý Khu (Chi nhánh)

| Chức năng | Mô tả |
|-----------|-------|
| Thêm khu | Tạo khu vực mới (Tầng 1, Sân vườn...) |
| Sửa khu | Cập nhật tên |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |
| Sắp xếp | Thay đổi thứ tự hiển thị |

### 2.8 Quản lý Bàn (Chi nhánh)

| Chức năng | Mô tả |
|-----------|-------|
| Thêm bàn | Tạo bàn mới, chọn khu, đặt sức chứa |
| Sửa bàn | Cập nhật thông tin |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |
| Sắp xếp | Thay đổi thứ tự hiển thị |

```
┌─────────────────────────────────────────────────────────────────┐
│  QUẢN LÝ BÀN - Chi nhánh Quận 1                  [+ Thêm bàn]   │
├─────────────────────────────────────────────────────────────────┤
│  Khu vực: [Tầng 1 ▼]                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐          │
│  │  1  │  │  2  │  │  3  │  │  4  │  │  5  │  │  6  │          │
│  │ 4ng │  │ 4ng │  │ 2ng │  │ 6ng │  │ 4ng │  │ 4ng │          │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.9 Món tăng giá (Chi nhánh)

Điều chỉnh giá món theo chi nhánh (override giá gốc từ Thương hiệu):

| Chức năng | Mô tả |
|-----------|-------|
| Thêm điều chỉnh | Chọn món, nhập giá mới tại chi nhánh |
| Sửa giá | Cập nhật giá điều chỉnh |
| Xóa điều chỉnh | Quay về giá gốc từ Thương hiệu |

```
┌─────────────────────────────────────────────────────────────────┐
│  MÓN TĂNG GIÁ - Chi nhánh Quận 1                          [+]   │
├─────────────────────────────────────────────────────────────────┤
│  │ Món           │ Giá gốc (TH) │ Giá CN    │ Chênh lệch │     │
│  ├───────────────┼──────────────┼───────────┼────────────┼─────┤
│  │ Phở bò đặc biệt│ 55,000đ     │ 65,000đ   │ +10,000đ   │ [x] │
│  │ Cà phê sữa    │ 29,000đ      │ 35,000đ   │ +6,000đ    │ [x] │
│  └───────────────┴──────────────┴───────────┴────────────┴─────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Xây dựng dữ liệu Bếp

### 3.1 Danh sách Bếp (Chi nhánh)

| Chức năng | Mô tả |
|-----------|-------|
| Thêm bếp | Tạo bếp mới, thiết lập máy in |
| Sửa bếp | Cập nhật tên, máy in |
| Tắt/Bật | Vô hiệu hóa hoặc kích hoạt |
| Cấu hình máy in | Chọn máy in (tên, IP) |

```
┌─────────────────────────────────────────────────────────────────┐
│  BẾP - Chi nhánh Quận 1                                   [+]   │
├─────────────────────────────────────────────────────────────────┤
│  │ Tên bếp      │ Máy in       │ IP           │ Trạng thái │   │
│  ├──────────────┼──────────────┼──────────────┼────────────┼───┤
│  │ Bếp chính    │ Kitchen_01   │ 192.168.1.50 │ ● Online   │ ⚙️ │
│  │ Quầy Bar     │ Bar_01       │ 192.168.1.51 │ ● Online   │ ⚙️ │
│  │ Bếp lạnh     │ Kitchen_02   │ 192.168.1.52 │ ○ Offline  │ ⚙️ │
│  └──────────────┴──────────────┴──────────────┴────────────┴───┘
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Gán món vào Bếp (Chi nhánh)

Cấu hình món nào in ra bếp nào:

```
Bếp chính (Máy in: Kitchen_01)
    ├── Phở bò
    ├── Phở gà
    ├── Cơm tấm
    └── Bún chả

Quầy Bar (Máy in: Bar_01)
    ├── Trà đào
    ├── Cà phê sữa
    ├── Sinh tố
    └── Nước ép
```

| Chức năng | Mô tả |
|-----------|-------|
| Gán món | Chọn bếp, thêm các món vào bếp đó |
| Gỡ món | Xóa món khỏi bếp |
| Di chuyển | Chuyển món sang bếp khác |

---

## 4. Quản lý Ca Thu ngân

### 4.1 Danh sách Ca (Chi nhánh)

**Chỉ xem** - không sửa (ca được mở/đóng trên app CCB):

| Thông tin | Mô tả |
|-----------|-------|
| Nhân viên | Ai mở ca |
| Thời gian | Giờ mở - Giờ đóng |
| Tiền đầu ca | Số tiền mặt ban đầu |
| Tiền cuối ca | Số tiền mặt khi đóng ca |
| Doanh thu | Tổng doanh thu trong ca |
| Số đơn | Tổng số đơn hàng |
| Trạng thái | Đang mở / Đã đóng |

```
┌─────────────────────────────────────────────────────────────────┐
│  CA LÀM VIỆC - Chi nhánh Quận 1                                 │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Tìm kiếm...                    [Từ ngày] [Đến ngày] [Lọc]   │
├─────────────────────────────────────────────────────────────────┤
│  │ Nhân viên │ Mở ca    │ Đóng ca  │ Doanh thu │ Đơn │ Status │ │
│  ├───────────┼──────────┼──────────┼───────────┼─────┼────────┤ │
│  │ Nguyễn A  │ 08:00    │ 16:00    │ 5,250,000 │ 45  │ Đã đóng│ │
│  │ Trần B    │ 16:00    │ 23:00    │ 3,800,000 │ 32  │ Đã đóng│ │
│  │ Lê C      │ 08:00    │ -        │ 1,200,000 │ 12  │ Đang mở│ │
│  └───────────┴──────────┴──────────┴───────────┴─────┴────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Danh sách Đơn hàng (Chi nhánh)

| Chức năng | Mô tả |
|-----------|-------|
| Xem danh sách | Lọc theo ngày, trạng thái, nhân viên |
| Xem chi tiết | Xem thông tin đơn hàng |
| Hủy đơn | Hủy đơn hàng (cần quyền) |
| In lại bill | In lại hóa đơn |

```
┌─────────────────────────────────────────────────────────────────┐
│  ĐƠN HÀNG - Chi nhánh Quận 1                                    │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Tìm kiếm...    [Ngày] [Trạng thái ▼] [Thanh toán ▼] [Lọc]   │
├─────────────────────────────────────────────────────────────────┤
│  │ Mã đơn   │ Bàn │ Tổng tiền │ TT      │ Thanh toán │ Thời gian│
│  ├──────────┼─────┼───────────┼─────────┼────────────┼──────────┤
│  │ #001245  │ 5   │ 235,000đ  │ Hoàn thành│ Tiền mặt │ 10:30    │
│  │ #001244  │ 12  │ 180,000đ  │ Hoàn thành│ Chuyển khoản│ 10:15 │
│  │ #001243  │ 3   │ 95,000đ   │ Đã hủy  │ -          │ 10:00    │
│  └──────────┴─────┴───────────┴─────────┴────────────┴──────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Quản lý Hóa đơn điện tử (E-Invoice)

### 5.1 Liên kết Đối tác HĐĐT (Chi nhánh)

Kết nối API với các đối tác hóa đơn điện tử:

| Đối tác | Mã |
|---------|-----|
| FPT | FPT |
| INVOICE | INVOICE |
| MIFI | MIFI |
| VNPT | VNPT |
| MISA | MISA |
| HILO | HILO |
| VIETTEL | VIETTEL |

| Thông tin cấu hình | Mô tả |
|-------------------|-------|
| Đối tác | Chọn nhà cung cấp HĐĐT |
| API Key | Key xác thực |
| API Secret | Secret xác thực |
| Username | Tài khoản (nếu có) |
| Password | Mật khẩu (nếu có) |

### 5.2 Danh sách HĐĐT (Chi nhánh)

| Trạng thái | Mô tả |
|------------|-------|
| **Chưa xuất** | Đơn hàng chưa xuất HĐĐT |
| **Chờ duyệt** | Đã gửi lên provider, chờ duyệt |
| **Đã duyệt** | HĐĐT đã được duyệt |
| **Từ chối** | HĐĐT bị từ chối, cần sửa và gửi lại |

```
┌─────────────────────────────────────────────────────────────────┐
│  HÓA ĐƠN ĐIỆN TỬ - Chi nhánh Quận 1                             │
├─────────────────────────────────────────────────────────────────┤
│  [Chưa xuất: 5] [Chờ duyệt: 2] [Đã duyệt: 150] [Từ chối: 1]    │
├─────────────────────────────────────────────────────────────────┤
│  │ Số HĐ     │ Đơn hàng │ Khách hàng   │ Tiền    │ Trạng thái │ │
│  ├───────────┼──────────┼──────────────┼─────────┼────────────┤ │
│  │ AA/24/001 │ #001245  │ Cty ABC      │ 235,000 │ ✅ Đã duyệt│ │
│  │ AA/24/002 │ #001250  │ Nguyễn Văn A │ 180,000 │ ⏳ Chờ duyệt│ │
│  │ -         │ #001255  │ -            │ 95,000  │ 📝 Chưa xuất│ │
│  │ AA/24/003 │ #001260  │ Cty XYZ      │ 500,000 │ ❌ Từ chối │ │
│  └───────────┴──────────┴──────────────┴─────────┴────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

| Chức năng | Mô tả |
|-----------|-------|
| Xuất HĐĐT | Chọn đơn → Nhập thông tin khách → Xuất |
| Xem HĐĐT | Xem PDF hóa đơn |
| Gửi lại | Gửi lại HĐĐT bị từ chối |
| Hủy HĐĐT | Hủy hóa đơn đã xuất |

---

## 6. Thiết lập (Settings)

### 6.1 Thiết lập Công ty

| Thông tin | Mô tả |
|-----------|-------|
| Tên công ty | Tên đầy đủ |
| Mã số thuế | MST doanh nghiệp |
| Địa chỉ | Địa chỉ đăng ký kinh doanh |
| Người đại diện | Họ tên người đại diện |
| Logo | Logo công ty |

### 6.2 Thiết lập Thương hiệu

| Thông tin | Mô tả |
|-----------|-------|
| Tên thương hiệu | Tên thương hiệu |
| Logo | Logo thương hiệu |
| Mô tả | Mô tả ngắn |
| Màu chủ đạo | Màu brand |

### 6.3 Thiết lập Chi nhánh

| Thông tin | Mô tả |
|-----------|-------|
| Tên chi nhánh | Tên chi nhánh |
| Địa chỉ | Địa chỉ chi nhánh |
| SĐT | Số điện thoại |
| Email | Email chi nhánh |
| Giờ mở cửa | Thời gian hoạt động |
| Cấu hình thuế | VAT, phí dịch vụ |
| Cấu hình in | Máy in bill, máy in bếp |
| Mô hình sử dụng | Order Only / CCB Only / Full System |

---

## Phân quyền

| Role | Quyền |
|------|-------|
| **Owner** | Toàn quyền: quản lý tất cả tính năng |
| **Manager** | Quản lý menu, nhân viên, xem báo cáo (không xem billing, không xóa chi nhánh) |

---

## Sync với Thiết bị

Khi thay đổi trên Dashboard:

```
Owner thay đổi dữ liệu (menu, bàn, nhân viên...)
        │
        ▼
Lưu vào PostgreSQL (Cloud Server)
        │
        ▼
Đánh dấu có thay đổi mới (version++)
        │
        ▼
CCB/Local Server kiểm tra định kỳ hoặc nhận push notification
        │
        ▼
Tải về thay đổi mới
        │
        ▼
Cập nhật SQLite local
        │
        ▼
Broadcast đến tất cả Order App (nếu Full System)
```

---

## API Endpoints

### Nhân sự

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/hr/staff` | Danh sách nhân viên |
| POST | `/hr/staff` | Thêm nhân viên |
| PUT | `/hr/staff/:id` | Sửa nhân viên |
| POST | `/hr/staff/import` | Import từ Excel |
| GET | `/hr/staff/export` | Export ra Excel |
| GET | `/hr/departments` | Danh sách bộ phận |
| POST | `/hr/departments` | Thêm bộ phận |
| GET | `/hr/permissions` | Danh sách quyền |
| POST | `/hr/staff/:id/permissions` | Gán quyền cho nhân viên |

### Menu

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/menu/products` | Danh sách món |
| POST | `/menu/products` | Thêm món |
| PUT | `/menu/products/:id` | Sửa món |
| POST | `/menu/products/import` | Import từ Excel |
| GET | `/menu/categories` | Danh sách danh mục |
| POST | `/menu/categories` | Thêm danh mục |
| GET | `/menu/units` | Danh sách đơn vị |
| GET | `/menu/notes` | Danh sách ghi chú mẫu |
| GET | `/menu/cancel-reasons` | Danh sách lý do hủy |
| GET | `/menu/coupons` | Danh sách coupon |
| GET | `/menu/areas` | Danh sách khu |
| GET | `/menu/tables` | Danh sách bàn |
| GET | `/menu/price-adjustments` | Danh sách món tăng giá |

### Bếp

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/kitchen/stations` | Danh sách bếp |
| POST | `/kitchen/stations` | Thêm bếp |
| PUT | `/kitchen/stations/:id` | Sửa bếp |
| GET | `/kitchen/mappings` | Danh sách gán món-bếp |
| POST | `/kitchen/mappings` | Gán món vào bếp |

### Ca & Đơn hàng

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/cashier/shifts` | Danh sách ca |
| GET | `/cashier/shifts/:id` | Chi tiết ca |
| GET | `/cashier/orders` | Danh sách đơn hàng |
| GET | `/cashier/orders/:id` | Chi tiết đơn |
| POST | `/cashier/orders/:id/cancel` | Hủy đơn |

### HĐĐT

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/e-invoice/providers` | Danh sách đối tác |
| POST | `/e-invoice/config` | Cấu hình liên kết |
| GET | `/e-invoice/invoices` | Danh sách HĐĐT |
| POST | `/e-invoice/invoices` | Xuất HĐĐT |
| GET | `/e-invoice/invoices/:id/pdf` | Tải PDF |

### Thiết lập

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/settings/company` | Thông tin công ty |
| PUT | `/settings/company` | Cập nhật công ty |
| GET | `/settings/brand` | Thông tin thương hiệu |
| PUT | `/settings/brand` | Cập nhật thương hiệu |
| GET | `/settings/branch` | Thông tin chi nhánh |
| PUT | `/settings/branch` | Cập nhật chi nhánh |
