---
sidebar_position: 3
---

# CCB App (POS)

CCB App là ứng dụng POS đa năng, hỗ trợ cả **Standalone** và **Client** mode, hoạt động ở vai trò **Thu ngân** hoặc **Bếp/Bar**.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Nền tảng Android** | Kotlin (Native) |
| **Nền tảng Windows** | .NET 8 (WPF/WinForms) |
| **Database** | SQLite (Standalone) / Không có (Client) |
| **Vai trò** | Thu ngân hoặc Bếp/Bar |

## Chế độ hoạt động

| Mô hình | Chế độ | Database | Kết nối |
|---------|--------|----------|---------|
| CCB Only | Standalone | SQLite local | Trực tiếp Cloud |
| Full System | Client Thu ngân | Không có DB | Kết nối Local Server |
| Full System | Client Bếp/Bar | Không có DB | Kết nối Local Server |

---

## Standalone Mode (Mô hình CCB Only)

### Khi nào sử dụng

- Quán nhỏ có quầy thu ngân
- 1-3 nhân viên
- Không có Local Server

### Kiến trúc

```
┌─────────────────────────────────────────┐
│            CCB App (Standalone)         │
│         Kotlin/Android hoặc .NET/Win    │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   SQLite    │  │  Cloud Sync     │   │
│  │   Database  │  │   Service       │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   Print     │  │  Bluetooth      │   │
│  │   Service   │  │   Service       │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

### Chức năng

- ✅ Tự quản lý SQLite database
- ✅ Tạo order và thanh toán
- ✅ In bill qua USB/Bluetooth/LAN
- ✅ In tem bếp/bar
- ✅ Chốt ca, xem báo cáo
- ✅ Sync trực tiếp lên Cloud

---

## Client Mode - Thu ngân (Mô hình Full System)

### Khi nào sử dụng

- Quán lớn với Local Server
- Nhiều nhân viên và thiết bị
- Cần quản lý tập trung

### Kiến trúc

```
┌─────────────────────────────────────────┐
│          LOCAL SERVER                   │
│          (Source of Truth)              │
└──────────────────┬──────────────────────┘
                   │ SignalR + REST API
                   ▼
┌─────────────────────────────────────────┐
│        CCB App (Client - Thu ngân)      │
│         Kotlin/Android hoặc .NET/Win    │
├─────────────────────────────────────────┤
│  • Không có database local              │
│  • Nhận data từ Local Server            │
│  • Gửi actions về Server                │
│  • In bill qua Server Print Queue       │
└─────────────────────────────────────────┘
```

### Chức năng

- ✅ Kết nối WebSocket (SignalR) đến Local Server
- ✅ Nhận và quản lý order từ Order App
- ✅ Thanh toán đơn hàng
- ✅ Gửi lệnh in đến Server Print Queue
- ✅ Chốt ca làm việc
- ✅ Xem báo cáo doanh thu
- ❌ Không có database local
- ❌ Không sync trực tiếp lên Cloud

---

## Client Mode - Bếp/Bar (Mô hình Full System)

### Đặc điểm

- **Không có database** - chỉ nhận data qua WebSocket
- Kết nối đến Local Server trong mạng LAN
- Hiển thị danh sách món cần làm

### Chức năng

- ✅ Hiển thị món cần làm theo thứ tự
- ✅ Phát âm thanh khi có món mới
- ✅ In tem bếp/bar từ Print Queue
- ✅ Đánh dấu "Đang làm", "Hoàn thành"
- ❌ Không có database
- ❌ Không thanh toán

### Giao diện

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÀN HÌNH BẾP                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ BÀN 5       │  │ BÀN 12      │  │ BÀN 3       │              │
│  │ 10:30 AM    │  │ 10:32 AM    │  │ 10:35 AM    │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ 2x Phở bò   │  │ 1x Cơm gà   │  │ 3x Bún chả  │              │
│  │ 1x Nem      │  │ 2x Gỏi cuốn │  │             │              │
│  │             │  │             │  │             │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ [ĐANG LÀM]  │  │  [BẮT ĐẦU]  │  │  [BẮT ĐẦU]  │              │
│  │ [HOÀN THÀNH]│  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  Tổng: 5 đơn chờ | 2 đang làm | Hôm nay: 45 đơn hoàn thành     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Trạng thái món

```
PENDING → PREPARING → READY → SERVED
   │          │         │        │
   │          │         │        └── Nhân viên đã mang ra
   │          │         └── Bếp làm xong
   │          └── Bếp đang làm
   └── Mới gọi, chờ bếp
```

---

## Giao diện Thu ngân

```
┌─────────────────────────────────────────────────────────────────┐
│  THU NGÂN - Café ABC                            NV: Nguyễn A    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────┐  ┌───────────────────────────┐ │
│  │ DANH SÁCH ĐƠN CHỜ           │  │ CHI TIẾT ĐƠN - BÀN 5      │ │
│  ├─────────────────────────────┤  ├───────────────────────────┤ │
│  │ ● Bàn 5  - 350,000đ    ◀   │  │ 2x Cà phê sữa   58,000đ  │ │
│  │ ○ Bàn 12 - 180,000đ        │  │ 1x Trà đào      35,000đ  │ │
│  │ ○ Bàn 3  - 420,000đ        │  │ 2x Bánh mì      50,000đ  │ │
│  │ ○ Bàn 8  - 95,000đ         │  │                           │ │
│  │                             │  ├───────────────────────────┤ │
│  │                             │  │ Tạm tính:       143,000đ │ │
│  │                             │  │ Giảm giá:             0đ │ │
│  │                             │  │ Tổng:           143,000đ │ │
│  │                             │  ├───────────────────────────┤ │
│  │                             │  │ [TIỀN MẶT] [CHUYỂN KHOẢN] │ │
│  │                             │  │      [THANH TOÁN]         │ │
│  └─────────────────────────────┘  └───────────────────────────┘ │
│                                                                 │
│  [Chốt ca]  [Báo cáo]  [Cài đặt]                   Ca: 08:00   │
└─────────────────────────────────────────────────────────────────┘
```

---

## CCB Android - Chi tiết Implementation

### Cấu trúc Project

```
ccb-android/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/techres/ccb/
│       │   ├── CCBApplication.kt           # Hilt Application
│       │   ├── data/
│       │   │   ├── local/
│       │   │   │   ├── CCBDatabase.kt      # Room Database
│       │   │   │   ├── dao/                # Data Access Objects
│       │   │   │   │   ├── CategoryDao.kt
│       │   │   │   │   ├── ProductDao.kt
│       │   │   │   │   ├── OrderDao.kt
│       │   │   │   │   ├── OrderItemDao.kt
│       │   │   │   │   ├── ShiftDao.kt
│       │   │   │   │   ├── StaffDao.kt
│       │   │   │   │   ├── AreaDao.kt
│       │   │   │   │   └── TableDao.kt
│       │   │   │   └── entity/             # Room Entities
│       │   │   │       ├── CategoryEntity.kt
│       │   │   │       ├── ProductEntity.kt
│       │   │   │       ├── OrderEntity.kt
│       │   │   │       ├── OrderItemEntity.kt
│       │   │   │       ├── ShiftEntity.kt
│       │   │   │       ├── StaffEntity.kt
│       │   │   │       ├── AreaEntity.kt
│       │   │   │       └── TableEntity.kt
│       │   │   ├── remote/
│       │   │   │   ├── api/
│       │   │   │   │   └── MasterDataApi.kt  # Retrofit API interface
│       │   │   │   └── dto/
│       │   │   │       └── SyncDto.kt        # DTOs for sync
│       │   │   └── repository/
│       │   │       ├── AuthRepository.kt
│       │   │       ├── SyncRepository.kt
│       │   │       ├── CategoryRepository.kt
│       │   │       ├── ProductRepository.kt
│       │   │       ├── OrderRepository.kt
│       │   │       ├── ShiftRepository.kt
│       │   │       ├── StaffRepository.kt
│       │   │       └── TableRepository.kt
│       │   ├── di/                         # Hilt DI Modules
│       │   │   ├── DatabaseModule.kt
│       │   │   ├── NetworkModule.kt
│       │   │   └── RepositoryModule.kt
│       │   └── presentation/
│       │       ├── MainActivity.kt
│       │       ├── navigation/
│       │       │   └── CCBNavHost.kt       # Compose Navigation
│       │       ├── screens/
│       │       │   ├── splash/             # Splash screen
│       │       │   ├── auth/               # Login & PIN screens
│       │       │   ├── home/               # Home screen
│       │       │   ├── menu/               # Product menu
│       │       │   ├── order/              # Order detail
│       │       │   ├── payment/            # Payment screen
│       │       │   ├── shift/              # Shift management
│       │       │   └── settings/           # Settings
│       │       └── theme/
│       │           └── Theme.kt            # Material3 Theme
│       └── res/
│           └── values/
│               ├── strings.xml
│               ├── colors.xml
│               └── themes.xml
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/
    └── libs.versions.toml                  # Version Catalog
```

### Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| **UI** | Jetpack Compose + Material3 |
| **Architecture** | MVVM + Clean Architecture |
| **DI** | Hilt |
| **Database** | Room (SQLite) |
| **Network** | Retrofit + OkHttp |
| **State** | StateFlow + Compose State |
| **Navigation** | Compose Navigation |
| **Async** | Kotlin Coroutines + Flow |

### Database Schema

#### Entities

```kotlin
// CategoryEntity
@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val branchId: String,
    val name: String,
    val displayOrder: Int,
    val imageUrl: String?,
    val isActive: Boolean,
    val version: Int,
    val syncStatus: String,
    val syncedAt: String?
)

// ProductEntity
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val branchId: String,
    val categoryId: String,
    val code: String,
    val name: String,
    val description: String?,
    val price: Double,
    val imageUrl: String?,
    val unit: String?,
    val vatRate: Double,
    val isActive: Boolean,
    val displayOrder: Int,
    val version: Int,
    val syncStatus: String,
    val syncedAt: String?
)

// OrderEntity
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: String,
    val branchId: String,
    val orderNumber: String,
    val tableId: String?,
    val tableName: String?,
    val staffId: String,
    val staffName: String,
    val status: String,           // pending, preparing, ready, completed, cancelled
    val subtotal: Double,
    val discountAmount: Double,
    val discountPercent: Double,
    val totalAmount: Double,
    val paymentMethod: String?,   // cash, bank_transfer, card
    val paidAmount: Double,
    val changeAmount: Double,
    val note: String?,
    val shiftId: String?,
    val createdAt: String,
    val updatedAt: String,
    val syncStatus: String,
    val syncedAt: String?
)

// ShiftEntity
@Entity(tableName = "shifts")
data class ShiftEntity(
    @PrimaryKey val id: String,
    val branchId: String,
    val staffId: String,
    val staffName: String,
    val startTime: String,
    val endTime: String?,
    val openingAmount: Double,
    val closingAmount: Double?,
    val expectedAmount: Double?,
    val actualAmount: Double?,
    val difference: Double?,
    val totalOrders: Int,
    val totalRevenue: Double,
    val cashRevenue: Double,
    val bankRevenue: Double,
    val cardRevenue: Double,
    val status: String,           // open, closed
    val note: String?,
    val syncStatus: String,
    val syncedAt: String?
)
```

### Luồng xác thực

```
┌─────────────────────────────────────────────────────────────────┐
│                     LUỒNG XÁC THỰC CCB                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ĐĂNG NHẬP THIẾT BỊ (1 lần duy nhất)                        │
│  ┌─────────────┐                        ┌─────────────────────┐ │
│  │ Màn hình    │  POST /auth/login      │  API Master Data    │ │
│  │ Login       │ ───────────────────────▶│                     │ │
│  │             │  {storeCode, deviceId}  │  Trả về:            │ │
│  │             │◀───────────────────────│  - accessToken      │ │
│  │             │                        │  - branchId         │ │
│  └─────────────┘                        │  - branchName       │ │
│        │                                └─────────────────────┘ │
│        │ Lưu token vào SharedPreferences                        │
│        ▼                                                        │
│  2. XÁC THỰC NHÂN VIÊN (Mỗi lần mở app)                        │
│  ┌─────────────┐                        ┌─────────────────────┐ │
│  │ Màn hình    │  POST /auth/verify-pin │  API Master Data    │ │
│  │ PIN         │ ───────────────────────▶│                     │ │
│  │             │  {pinCode}              │  Trả về:            │ │
│  │  [1][2][3]  │◀───────────────────────│  - staffId          │ │
│  │  [4][5][6]  │                        │  - staffName        │ │
│  │  [7][8][9]  │                        │  - role             │ │
│  │     [0]     │                        └─────────────────────┘ │
│  └─────────────┘                                                │
│        │                                                        │
│        ▼                                                        │
│  3. VÀO MÀN HÌNH CHÍNH                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      HOME SCREEN                            ││
│  │  - Tạo đơn mới                                              ││
│  │  - Xem đơn đang phục vụ                                     ││
│  │  - Quản lý ca làm việc                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Luồng đồng bộ dữ liệu

```
┌─────────────────────────────────────────────────────────────────┐
│                     SYNC MASTER DATA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     GET /sync/full      ┌─────────────────────┐│
│  │ CCB App     │ ───────────────────────▶│ API Master Data     ││
│  │             │                         │                     ││
│  │             │◀───────────────────────│ Response:           ││
│  │             │     FullSyncResponse    │ - categories[]      ││
│  │             │                         │ - products[]        ││
│  │             │                         │ - areas[]           ││
│  │             │                         │ - tables[]          ││
│  │             │                         │ - staff[]           ││
│  │             │                         │ - syncedAt          ││
│  └─────────────┘                         └─────────────────────┘│
│        │                                                        │
│        ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  ROOM DATABASE (SQLite)                     ││
│  │  Transaction: Delete old → Insert new                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  INCREMENTAL SYNC (sau lần đầu)                                 │
│  ┌─────────────┐   GET /sync/incremental  ┌────────────────────┐│
│  │ CCB App     │   ?since={lastSyncTime}  │ API Master Data    ││
│  │             │ ────────────────────────▶│                    ││
│  │             │◀────────────────────────│ Chỉ trả về records ││
│  │             │                          │ thay đổi sau since ││
│  └─────────────┘                          └────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Màn hình ứng dụng

| Màn hình | Mô tả | Route |
|----------|-------|-------|
| **Splash** | Kiểm tra trạng thái đăng nhập | `/splash` |
| **Login** | Đăng nhập bằng mã cửa hàng | `/login` |
| **PIN** | Xác thực nhân viên bằng mã PIN | `/pin` |
| **Home** | Trang chủ, danh sách đơn đang phục vụ | `/home` |
| **Menu** | Thực đơn sản phẩm theo danh mục | `/menu` |
| **Order** | Chi tiết đơn hàng, thêm/sửa/xóa món | `/order/{orderId}` |
| **Payment** | Thanh toán (tiền mặt/chuyển khoản/thẻ) | `/payment/{orderId}` |
| **Shift** | Mở/chốt ca làm việc | `/shift` |
| **Settings** | Cài đặt, đồng bộ dữ liệu | `/settings` |

---

## Windows (.NET)

```
CCB.Windows/
├── Views/
│   ├── CashierView.xaml
│   ├── KitchenView.xaml
│   └── SettingsView.xaml
├── ViewModels/
│   ├── CashierViewModel.cs
│   └── KitchenViewModel.cs
├── Models/
├── Services/
│   ├── DatabaseService/       # SQLite
│   ├── PrinterService/        # USB/LAN printer
│   ├── WebSocketService/      # SignalR client
│   └── SyncService/           # Cloud sync
├── Modes/
│   ├── Standalone/
│   ├── Client/
│   └── Kitchen/
└── CCB.Windows.csproj
```

---

## Discovery (Tìm Local Server)

### UDP Broadcast

```
Local Server khởi động
     │
     ▼
Start UDP Broadcast (port 9999)
Gửi mỗi 2 giây: { type: "LOCAL_SERVER", name: "Quán ABC", ip: "192.168.1.100", port: 8080 }
     │
     ▼
CCB App mở → Listen port 9999 → Nhận broadcast → Hiển thị danh sách Server
     │
     ▼
User chọn Server → Kết nối SignalR
```

### Phương án backup

- **QR Code:** Server hiển thị QR chứa IP, CCB App scan
- **Nhập thủ công:** User nhập IP của Server

---

## Yêu cầu phần cứng

### Android

| Cấu hình | Tối thiểu | Khuyến nghị |
|----------|-----------|-------------|
| RAM | 2GB | 4GB |
| Storage | 1GB trống | 2GB trống |
| Android | 8.0+ (API 26) | 11+ (API 30) |

### Windows

| Cấu hình | Tối thiểu | Khuyến nghị |
|----------|-----------|-------------|
| RAM | 4GB | 8GB |
| Storage | 2GB trống | 5GB trống |
| Windows | 10 | 11 |
| .NET | 8.0 Runtime | 8.0 Runtime |

---

## Xử lý lỗi

### Mất kết nối Server (Client Mode)

```
Mất kết nối SignalR
        │
        ▼
Hiển thị banner "Mất kết nối với Server"
        │
        ▼
Auto reconnect mỗi 3 giây
        │
        ▼
Kết nối lại thành công
        │
        ▼
Nhận full state mới từ Server
```

### CCB Standalone mất internet

- Mọi tính năng offline vẫn hoạt động
- Hiện indicator "Offline mode"
- Queue sync data
- Tính năng cần online bị disable (dùng điểm)
