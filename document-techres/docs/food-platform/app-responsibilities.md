---
sidebar_position: 2
---

# Phân chia nhiệm vụ các App

Mô tả chi tiết nhiệm vụ của từng ứng dụng trong hệ thống Food Platform Integration.

## Tổng quan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PHÂN CHIA NHIỆM VỤ                               │
│                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐    │
│  │    WEB-ADMIN      │  │   WEB-DASHBOARD   │  │       CCB         │    │
│  │   (Quản trị)      │  │   (Chi nhánh)     │  │    (Tại quán)     │    │
│  ├───────────────────┤  ├───────────────────┤  ├───────────────────┤    │
│  │                   │  │                   │  │                   │    │
│  │ • Tạo cổng liên   │  │ • Liên kết tài    │  │ • Liên kết tài    │    │
│  │   kết (ports)     │  │   khoản merchant  │  │   khoản merchant  │    │
│  │                   │  │                   │  │                   │    │
│  │ • Cấu hình hệ     │  │ • Gán chi nhánh   │  │ • Poll đơn hàng   │    │
│  │   thống           │  │   với cửa hàng    │  │   mỗi 5 giây      │    │
│  │                   │  │                   │  │                   │    │
│  │                   │  │ • Gán món ăn      │  │ • Auto xác nhận   │    │
│  │                   │  │   thương hiệu với │  │   đơn hàng        │    │
│  │                   │  │   món merchant    │  │                   │    │
│  │                   │  │                   │  │ • In bill giao    │    │
│  │                   │  │ • Bật/tắt cổng    │  │   hàng            │    │
│  │                   │  │   liên kết        │  │                   │    │
│  │                   │  │                   │  │ • Hoàn tất đơn    │    │
│  │                   │  │                   │  │   và lưu hóa đơn  │    │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Web Admin (Quản trị hệ thống)

**Đối tượng sử dụng**: Admin hệ thống, Quản lý cấp cao

### Nhiệm vụ chính

| Chức năng | Mô tả |
|-----------|-------|
| **Tạo cổng liên kết** | Cấu hình các food platform được phép sử dụng trong hệ thống |
| **Quản lý platforms** | Thêm/sửa/xóa các platform (Grab, Shopee, BeFood...) |
| **Cấu hình API credentials** | Lưu trữ client_id, client_secret cho từng platform |
| **Quản lý tenant** | Phân quyền tenant nào được sử dụng platform nào |

### Flow trên Web Admin

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WEB-ADMIN: Quản lý cổng liên kết                                        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Cài đặt > Tích hợp Food Platform                                │    │
│  │                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ Platform          │ API Config        │ Status    │ Actions ││    │
│  │  ├───────────────────┼───────────────────┼───────────┼─────────┤│    │
│  │  │ 🟢 GrabFood       │ ✓ Configured      │ 🟢 Active │ [Edit]  ││    │
│  │  │ 🟠 ShopeeFood     │ ✓ Configured      │ 🟢 Active │ [Edit]  ││    │
│  │  │ 🔵 BeFood         │ ✗ Not configured  │ ⚪ Inactive│ [Setup] ││    │
│  │  │ 🔴 GoFood         │ ✗ Not configured  │ ⚪ Inactive│ [Setup] ││    │
│  │  └───────────────────┴───────────────────┴───────────┴─────────┘│    │
│  │                                                                  │    │
│  │  [+ Thêm Platform mới]                                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Cấu hình GrabFood                                               │    │
│  │                                                                  │    │
│  │  Client ID:     [grab_client_xxxxx                    ]          │    │
│  │  Client Secret: [••••••••••••••••                     ]          │    │
│  │  API Base URL:  [https://api.grab.com/merchant/v2     ]          │    │
│  │  Webhook URL:   [https://api.techres.vn/webhooks/grab ]          │    │
│  │                                                                  │    │
│  │  Tenants được phép sử dụng:                                      │    │
│  │  ☑ Công ty Cà phê ABC                                            │    │
│  │  ☑ Nhà hàng XYZ                                                  │    │
│  │  ☐ Quán ăn 123                                                   │    │
│  │                                                                  │    │
│  │  [Lưu cấu hình]                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database: food_platform_ports

```sql
CREATE TABLE food_platform_ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Platform info
  platform VARCHAR(50) NOT NULL UNIQUE,  -- grab, shopee_food, befood
  display_name VARCHAR(100) NOT NULL,    -- GrabFood, ShopeeFood
  logo_url VARCHAR(255),
  color VARCHAR(20),                     -- Brand color (#00B14F)

  -- API Configuration
  client_id VARCHAR(255),
  client_secret VARCHAR(255),            -- Encrypted
  api_base_url VARCHAR(255),
  webhook_url VARCHAR(255),

  -- Auth config
  supported_auth_types JSONB DEFAULT '["username_password"]',
  -- ["username_password", "phone_otp"]

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tenant permissions
CREATE TABLE food_platform_tenant_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  port_id UUID NOT NULL REFERENCES food_platform_ports(id),
  tenant_id VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 2. Web Dashboard (Quản lý chi nhánh)

**Đối tượng sử dụng**: Quản lý chi nhánh, Nhân viên văn phòng

### Nhiệm vụ chính

| Chức năng | Mô tả |
|-----------|-------|
| **Liên kết tài khoản** | Đăng nhập vào tài khoản merchant trên platform |
| **Gán chi nhánh ↔ cửa hàng** | Mapping store trên platform với branch TechRes |
| **Gán món ăn** | Mapping sản phẩm thương hiệu với sản phẩm merchant |
| **Bật/tắt cổng** | Enable/disable từng platform cho chi nhánh |
| **Xem báo cáo** | Thống kê đơn hàng theo platform |

### Flow trên Web Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WEB-DASHBOARD: Quản lý Food Platform                                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Tab 1: LIÊN KẾT TÀI KHOẢN                                       │    │
│  │  ─────────────────────────────────────────────────────────────── │    │
│  │                                                                  │    │
│  │  Tài khoản đã liên kết:                                          │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ 🟢 GrabFood                                                  ││    │
│  │  │    merchant@techres.vn                     [Đã kết nối]      ││    │
│  │  │    Số cửa hàng: 3                          [Ngắt kết nối]    ││    │
│  │  ├─────────────────────────────────────────────────────────────┤│    │
│  │  │ 🟠 ShopeeFood                                                ││    │
│  │  │    0901234567                              [Đã kết nối]      ││    │
│  │  │    Số cửa hàng: 2                          [Ngắt kết nối]    ││    │
│  │  ├─────────────────────────────────────────────────────────────┤│    │
│  │  │ 🔵 BeFood                                                    ││    │
│  │  │    Chưa liên kết                           [+ Liên kết]      ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Tab 2: GÁN CHI NHÁNH VỚI CỬA HÀNG                               │    │
│  │  ─────────────────────────────────────────────────────────────── │    │
│  │                                                                  │    │
│  │  GrabFood - merchant@techres.vn                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ Cửa hàng Grab              │ Chi nhánh TechRes    │ Status  ││    │
│  │  ├────────────────────────────┼──────────────────────┼─────────┤│    │
│  │  │ Cà phê TechRes Q1          │ [Chi nhánh Q1    ▼]  │ 🟢 On   ││    │
│  │  │ Cà phê TechRes Q3          │ [Chi nhánh Q3    ▼]  │ 🟢 On   ││    │
│  │  │ Cà phê TechRes Thủ Đức     │ [Chưa chọn       ▼]  │ ⚪ Off  ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  │                                                                  │    │
│  │  [Lưu mapping]                                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Tab 3: GÁN MÓN ĂN (Cho xuất định lượng)                         │    │
│  │  ─────────────────────────────────────────────────────────────── │    │
│  │                                                                  │    │
│  │  Chi nhánh: [Chi nhánh Quận 1 ▼]                                 │    │
│  │  Platform:  [GrabFood ▼]                                         │    │
│  │                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ Món trên Grab              │ Món TechRes          │ Status  ││    │
│  │  ├────────────────────────────┼──────────────────────┼─────────┤│    │
│  │  │ ☕ Cà phê sữa đá           │ [Cà phê sữa     ▼]   │ ✓ Mapped││    │
│  │  │ ☕ Cà phê đen              │ [Cà phê đen     ▼]   │ ✓ Mapped││    │
│  │  │ 🥖 Bánh mì thịt            │ [Chọn món...    ▼]   │ ⚠ Chưa  ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  │                                                                  │    │
│  │  [Auto-mapping]  [Lưu]                                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Tab 4: BẬT/TẮT CỔNG LIÊN KẾT                                    │    │
│  │  ─────────────────────────────────────────────────────────────── │    │
│  │                                                                  │    │
│  │  Chi nhánh: [Chi nhánh Quận 1 ▼]                                 │    │
│  │                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ Platform        │ Trạng thái      │ Đơn hôm nay │ Action    ││    │
│  │  ├─────────────────┼─────────────────┼─────────────┼───────────┤│    │
│  │  │ 🟢 GrabFood     │ 🟢 Đang bật     │ 45 đơn      │ [🔴 Tắt]  ││    │
│  │  │ 🟠 ShopeeFood   │ 🔴 Đang tắt     │ 0 đơn       │ [🟢 Bật]  ││    │
│  │  │ 🔵 BeFood       │ ⚪ Chưa cấu hình │ -           │ [Cấu hình]││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  │                                                                  │    │
│  │  💡 Tắt cổng = Tạm ngừng nhận đơn từ platform đó                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Endpoints cho Web Dashboard

```typescript
// Liên kết tài khoản
POST /api/food-platforms/accounts/login
POST /api/food-platforms/accounts/request-otp
POST /api/food-platforms/accounts/verify-otp
DELETE /api/food-platforms/accounts/{id}/disconnect

// Store mapping
GET /api/food-platforms/accounts/{id}/stores
POST /api/food-platforms/store-mappings
PUT /api/food-platforms/store-mappings/{id}
DELETE /api/food-platforms/store-mappings/{id}

// Product mapping
GET /api/food-platforms/store-mappings/{id}/products
POST /api/food-platforms/product-mappings
PUT /api/food-platforms/product-mappings/{id}
POST /api/food-platforms/product-mappings/auto-map

// Bật/tắt cổng
PUT /api/food-platforms/store-mappings/{id}/toggle
GET /api/branches/{branchId}/food-platform-status
```

---

## 3. CCB (Cash Control Box - Tại quán)

**Đối tượng sử dụng**: Nhân viên tại quán, Thu ngân

### Nhiệm vụ chính

| Chức năng | Mô tả |
|-----------|-------|
| **Liên kết tài khoản** | Đăng nhập nhanh vào merchant (nếu chưa có) |
| **Poll đơn hàng** | Tự động gọi API mỗi 5 giây để lấy đơn mới |
| **Hiển thị đơn hàng** | Danh sách đơn theo trạng thái và platform |
| **Auto xác nhận** | Tự động accept đơn khi có tài xế |
| **In bill** | In phiếu giao hàng khi đơn sẵn sàng |
| **Hoàn tất đơn** | Đánh dấu hoàn thành và lưu vào hóa đơn local |

### Flow trên CCB

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CCB: Food Order Flow                                                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  BƯỚC 1: LIÊN KẾT TÀI KHOẢN (nếu chưa có)                        │    │
│  │  ─────────────────────────────────────────────────────────────── │    │
│  │                                                                  │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │ 🔗 Liên kết Food Platform                                  │  │    │
│  │  │                                                            │  │    │
│  │  │ Chọn platform: [GrabFood ▼]                                │  │    │
│  │  │                                                            │  │    │
│  │  │ Username: [_________________________]                      │  │    │
│  │  │ Password: [_________________________]                      │  │    │
│  │  │                                                            │  │    │
│  │  │           [Hủy]    [Liên kết]                              │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                          │                                               │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  BƯỚC 2: POLLING ĐƠN HÀNG (Tự động mỗi 5 giây)                   │    │
│  │  ─────────────────────────────────────────────────────────────── │    │
│  │                                                                  │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │ 🔄 Đang tải đơn hàng...                         [●] 5s    │  │    │
│  │  │                                                            │  │    │
│  │  │ GET /food-orders/poll?branchId=1&lastPollAt=xxx            │  │    │
│  │  │                                                            │  │    │
│  │  │ Response: { newOrders: 2, updatedOrders: 1 }               │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                          │                                               │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  BƯỚC 3: HIỂN THỊ VÀ XỬ LÝ ĐƠN HÀNG                              │    │
│  │  ─────────────────────────────────────────────────────────────── │    │
│  │                                                                  │    │
│  │  [Mới (3)] [Đang làm (2)] [Sẵn sàng (1)] [Hoàn thành]           │    │
│  │                                                                  │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │ 🟢 GRAB  #GR12345                          2 phút trước   │  │    │
│  │  │                                                            │  │    │
│  │  │ 👤 Nguyễn Văn A                          📞 0901234567    │  │    │
│  │  │ 📦 2x Cà phê sữa, 1x Bánh mì              💰 95,000đ     │  │    │
│  │  │                                                            │  │    │
│  │  │ 🚗 Tài xế: Trần Văn B (0987654321)       ← Driver assigned│  │    │
│  │  │                                                            │  │    │
│  │  │ ┌─────────────────────────────────────────────────────┐   │  │    │
│  │  │ │ ⚡ AUTO: Đã tự động xác nhận                         │   │  │    │
│  │  │ │ 🖨️ AUTO: Đang in bill...                             │   │  │    │
│  │  │ └─────────────────────────────────────────────────────┘   │  │    │
│  │  │                                                            │  │    │
│  │  │              [Xem chi tiết]    [✓ Hoàn tất]                │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                          │                                               │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  BƯỚC 4: HOÀN TẤT VÀ LƯU HÓA ĐƠN LOCAL                           │    │
│  │  ─────────────────────────────────────────────────────────────── │    │
│  │                                                                  │    │
│  │  Khi nhấn [✓ Hoàn tất]:                                          │    │
│  │  1. Update status = COMPLETED trên platform                      │    │
│  │  2. Tạo hóa đơn local trong SQLite                               │    │
│  │  3. Sync hóa đơn lên cloud (nếu có mạng)                         │    │
│  │  4. Move order sang tab "Hoàn thành"                             │    │
│  │                                                                  │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │ SQLite - invoices table                                    │  │    │
│  │  │                                                            │  │    │
│  │  │ INSERT INTO invoices (                                     │  │    │
│  │  │   source = 'food_platform',                                │  │    │
│  │  │   platform = 'grab',                                       │  │    │
│  │  │   external_order_code = '#GR12345',                        │  │    │
│  │  │   total_amount = 95000,                                    │  │    │
│  │  │   items = [...],                                           │  │    │
│  │  │   ...                                                      │  │    │
│  │  │ )                                                          │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### CCB Auto-flow khi có Driver

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CCB AUTO-FLOW KHI CÓ TÀI XẾ                                             │
│                                                                          │
│  Đơn hàng #GR12345 - Status: READY                                       │
│                                                                          │
│        ┌─────────────────────────────────────────┐                       │
│        │ Poll response có driver_info:           │                       │
│        │ {                                       │                       │
│        │   driverName: "Trần Văn B",             │                       │
│        │   driverPhone: "0987654321",            │                       │
│        │   estimatedTime: "15 phút"              │                       │
│        │ }                                       │                       │
│        └───────────────────┬─────────────────────┘                       │
│                            │                                             │
│                            ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  STEP 1: AUTO CONFIRM (nếu bật)                                  │    │
│  │  ───────────────────────────────────────────────────────────────│    │
│  │                                                                  │    │
│  │  if (settings.autoConfirmEnabled && order.status !== 'accepted')│    │
│  │  {                                                               │    │
│  │    // Call platform API                                          │    │
│  │    POST /merchant/orders/{orderId}/accept                        │    │
│  │                                                                  │    │
│  │    // Update local status                                        │    │
│  │    order.status = 'DELIVERING'                                   │    │
│  │  }                                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                            │                                             │
│                            ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  STEP 2: AUTO PRINT BILL (nếu bật)                               │    │
│  │  ───────────────────────────────────────────────────────────────│    │
│  │                                                                  │    │
│  │  if (settings.autoPrintEnabled)                                  │    │
│  │  {                                                               │    │
│  │    // Generate bill content                                      │    │
│  │    val billContent = generateDeliveryBill(order)                 │    │
│  │                                                                  │    │
│  │    // Send to printer                                            │    │
│  │    printerService.print(billContent)                             │    │
│  │  }                                                               │    │
│  │                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │        *** TECHRES - PHIẾU GIAO HÀNG ***                │    │    │
│  │  │        GrabFood - #GR12345                              │    │    │
│  │  │                                                         │    │    │
│  │  │  Khách: Nguyễn Văn A (0901234567)                       │    │    │
│  │  │  Tài xế: Trần Văn B (0987654321)                        │    │    │
│  │  │                                                         │    │    │
│  │  │  2x Cà phê sữa đá           50,000đ                     │    │    │
│  │  │  1x Bánh mì thịt            35,000đ                     │    │    │
│  │  │  ─────────────────────────────────                      │    │    │
│  │  │  Tổng:                      95,000đ (Đã TT)             │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                            │                                             │
│                            ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  STEP 3: NOTIFY USER                                             │    │
│  │  ───────────────────────────────────────────────────────────────│    │
│  │                                                                  │    │
│  │  🔔 Notification: "Tài xế đã nhận đơn #GR12345"                  │    │
│  │  🔊 Sound: play(R.raw.driver_assigned_sound)                     │    │
│  │  📳 Vibrate: 500ms                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                            │                                             │
│                            ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  STEP 4: WAIT FOR MANUAL COMPLETION                              │    │
│  │  ───────────────────────────────────────────────────────────────│    │
│  │                                                                  │    │
│  │  Nhân viên kiểm tra đơn hàng đã giao cho tài xế                  │    │
│  │                                                                  │    │
│  │                    [✓ Hoàn tất đơn hàng]                         │    │
│  │                            │                                     │    │
│  │                            ▼                                     │    │
│  │  1. API: POST /orders/{id}/complete                              │    │
│  │  2. Local: INSERT INTO invoices (...)                            │    │
│  │  3. Sync: queue for cloud sync                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### CCB Local Invoice Storage

```kotlin
// FoodOrder -> Local Invoice
data class LocalInvoice(
    val id: String,
    val source: String = "food_platform",
    val platform: String,                    // grab, shopee_food, befood
    val externalOrderCode: String,           // #GR12345

    // Customer
    val customerName: String,
    val customerPhone: String,

    // Items
    val items: List<InvoiceItem>,

    // Amounts
    val subtotal: Long,
    val deliveryFee: Long,
    val discount: Long,
    val totalAmount: Long,

    // Payment
    val paymentMethod: String,
    val isPaid: Boolean,

    // Timestamps
    val orderedAt: Long,
    val completedAt: Long,

    // Sync
    val syncStatus: SyncStatus,  // PENDING, SYNCED, FAILED
    val syncedAt: Long?
)

// Save to SQLite
suspend fun saveFoodOrderAsInvoice(order: FoodOrder) {
    val invoice = LocalInvoice(
        id = UUID.randomUUID().toString(),
        source = "food_platform",
        platform = order.platform.name.lowercase(),
        externalOrderCode = order.orderCode,
        customerName = order.customerName,
        customerPhone = order.customerPhone,
        items = order.items.map { it.toInvoiceItem() },
        subtotal = order.subtotal,
        deliveryFee = order.deliveryFee,
        discount = order.discount,
        totalAmount = order.totalAmount,
        paymentMethod = order.paymentMethod ?: "ONLINE",
        isPaid = order.isPaid,
        orderedAt = order.createdAt,
        completedAt = System.currentTimeMillis(),
        syncStatus = SyncStatus.PENDING,
        syncedAt = null
    )

    invoiceDao.insert(invoice)

    // Queue for cloud sync
    syncQueue.enqueue(SyncJob(
        type = "invoice",
        id = invoice.id,
        action = "create"
    ))
}
```

---

## Tổng kết phân chia

| App | Nhiệm vụ chính | Database |
|-----|---------------|----------|
| **Web Admin** | Cấu hình cổng liên kết, API credentials | `food_platform_ports` |
| **Web Dashboard** | Liên kết tài khoản, mapping store/product, bật/tắt | `food_platform_accounts`, `store_mappings`, `product_mappings` |
| **CCB** | Poll đơn, auto-confirm, in bill, hoàn tất, lưu hóa đơn | `food_orders` (cache), `invoices` (local) |

```
┌───────────────────────────────────────────────────────────────────┐
│                    DATA FLOW OVERVIEW                              │
│                                                                    │
│   WEB-ADMIN          WEB-DASHBOARD              CCB                │
│      │                    │                      │                 │
│      │ Create ports       │ Link accounts        │ Poll orders     │
│      ▼                    ▼                      ▼                 │
│  ┌───────┐           ┌───────┐              ┌───────┐              │
│  │ Ports │──────────▶│Accounts│─────────────▶│Orders │              │
│  └───────┘           │Mappings│              │Invoice│              │
│                      └───────┘              └───────┘              │
│                           │                      │                 │
│                           └──────────────────────┘                 │
│                                    │                               │
│                                    ▼                               │
│                            ┌────────────┐                          │
│                            │ PostgreSQL │ (Cloud)                  │
│                            │  + SQLite  │ (Local)                  │
│                            └────────────┘                          │
└───────────────────────────────────────────────────────────────────┘
```

## Tiếp theo

- [Liên kết tài khoản](./account-linking.md) - Chi tiết flow login
- [Mapping cửa hàng](./store-mapping.md) - Gán store ↔ branch
- [Mapping sản phẩm](./product-mapping.md) - Gán món ăn (Future)
