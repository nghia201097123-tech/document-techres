---
sidebar_position: 3
---

# CCB App (POS) - Offline First

CCB (Cashier Counter Box) là ứng dụng POS dành cho thu ngân tại nhà hàng/quán ăn, hoạt động **hoàn toàn offline** và đồng bộ dữ liệu lên cloud sau.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Nền tảng** | Kotlin (Native Android) |
| **Target Device** | Máy POS Android + Máy in nhiệt |
| **Database** | Room (SQLite) - Offline First |
| **Sync** | Background sync với WorkManager |
| **Print** | ESC/POS Protocol |

## Mô hình hoạt động

Hệ thống TechRes chia thành 3 mô hình, tài liệu này tập trung vào **Mô hình CCB Offline**:

| Mô hình | Mô tả | Database |
|---------|-------|----------|
| Order App Only | App order trên mobile | SQLite local |
| **CCB Only** | **Máy POS + Máy in (Tài liệu này)** | **SQLite local** |
| Order + CCB | Kết hợp cả hai | Sync qua Local Server |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CCB OFFLINE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      ANDROID POS APP (Kotlin)                    │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │                    Presentation Layer                        ││   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           ││   │
│  │  │  │  Login  │ │  Menu   │ │  Cart   │ │ Payment │           ││   │
│  │  │  │ Screen  │ │ Screen  │ │ Screen  │ │ Screen  │           ││   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           ││   │
│  │  │  Jetpack Compose + MVVM + StateFlow                         ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │                              │                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │                     Domain Layer                             ││   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            ││   │
│  │  │  │  UseCases   │ │  Entities   │ │ Repositories│            ││   │
│  │  │  │             │ │  (Domain)   │ │ (Interface) │            ││   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘            ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │                              │                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │                      Data Layer                              ││   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       ││   │
│  │  │  │    Room DB   │  │  Sync Engine │  │   Printer    │       ││   │
│  │  │  │   (SQLite)   │  │  WorkManager │  │   Manager    │       ││   │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘       ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼ (Khi có mạng)                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         CLOUD API                                │   │
│  │                    (api-dashboard / api-ccb)                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology | Lý do |
|-----------|------------|-------|
| **Language** | Kotlin | Android native, performance |
| **UI** | Jetpack Compose | Modern, declarative UI |
| **Architecture** | Clean Architecture + MVVM | Maintainable, testable |
| **DI** | Hilt (Dagger) | Official recommendation |
| **Local DB** | Room | SQLite wrapper, offline-first |
| **Async** | Coroutines + Flow | Reactive, lifecycle-aware |
| **Network** | Retrofit + OkHttp | REST API sync |
| **Sync** | WorkManager | Background sync |
| **Print** | ESC/POS | Thermal printer protocol |
| **Navigation** | Compose Navigation | Type-safe navigation |

---

## Cấu trúc Project

```
app-ccb/
├── app/
│   ├── src/main/
│   │   ├── java/com/techres/ccb/
│   │   │   │
│   │   │   ├── App.kt                          # Application class
│   │   │   │
│   │   │   ├── di/                             # Dependency Injection
│   │   │   │   ├── AppModule.kt
│   │   │   │   ├── DatabaseModule.kt
│   │   │   │   ├── NetworkModule.kt
│   │   │   │   └── PrinterModule.kt
│   │   │   │
│   │   │   ├── data/                           # Data Layer
│   │   │   │   ├── local/
│   │   │   │   │   ├── database/
│   │   │   │   │   │   ├── AppDatabase.kt
│   │   │   │   │   │   ├── dao/
│   │   │   │   │   │   │   ├── ProductDao.kt
│   │   │   │   │   │   │   ├── CategoryDao.kt
│   │   │   │   │   │   │   ├── OrderDao.kt
│   │   │   │   │   │   │   ├── StaffDao.kt
│   │   │   │   │   │   │   └── SyncQueueDao.kt
│   │   │   │   │   │   └── entity/
│   │   │   │   │   │       ├── ProductEntity.kt
│   │   │   │   │   │       ├── CategoryEntity.kt
│   │   │   │   │   │       ├── OrderEntity.kt
│   │   │   │   │   │       ├── OrderItemEntity.kt
│   │   │   │   │   │       ├── PaymentEntity.kt
│   │   │   │   │   │       ├── ShiftEntity.kt
│   │   │   │   │   │       └── SyncQueueEntity.kt
│   │   │   │   │   └── preferences/
│   │   │   │   │       └── AppPreferences.kt
│   │   │   │   │
│   │   │   │   ├── remote/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   ├── AuthApi.kt
│   │   │   │   │   │   ├── SyncApi.kt
│   │   │   │   │   │   └── MasterDataApi.kt
│   │   │   │   │   └── dto/
│   │   │   │   │
│   │   │   │   ├── repository/
│   │   │   │   │   ├── ProductRepositoryImpl.kt
│   │   │   │   │   ├── OrderRepositoryImpl.kt
│   │   │   │   │   ├── AuthRepositoryImpl.kt
│   │   │   │   │   └── SyncRepositoryImpl.kt
│   │   │   │   │
│   │   │   │   └── sync/
│   │   │   │       ├── SyncManager.kt
│   │   │   │       ├── SyncWorker.kt
│   │   │   │       └── ConflictResolver.kt
│   │   │   │
│   │   │   ├── domain/                         # Domain Layer
│   │   │   │   ├── model/
│   │   │   │   │   ├── Product.kt
│   │   │   │   │   ├── Category.kt
│   │   │   │   │   ├── Order.kt
│   │   │   │   │   ├── OrderItem.kt
│   │   │   │   │   ├── Payment.kt
│   │   │   │   │   ├── Staff.kt
│   │   │   │   │   └── Shift.kt
│   │   │   │   │
│   │   │   │   ├── repository/
│   │   │   │   │   ├── ProductRepository.kt
│   │   │   │   │   ├── OrderRepository.kt
│   │   │   │   │   └── SyncRepository.kt
│   │   │   │   │
│   │   │   │   └── usecase/
│   │   │   │       ├── auth/
│   │   │   │       │   └── LoginWithPinUseCase.kt
│   │   │   │       ├── order/
│   │   │   │       │   ├── CreateOrderUseCase.kt
│   │   │   │       │   └── CheckoutOrderUseCase.kt
│   │   │   │       └── shift/
│   │   │   │           ├── OpenShiftUseCase.kt
│   │   │   │           └── CloseShiftUseCase.kt
│   │   │   │
│   │   │   ├── presentation/                   # Presentation Layer
│   │   │   │   ├── navigation/
│   │   │   │   │   ├── NavGraph.kt
│   │   │   │   │   └── Screen.kt
│   │   │   │   │
│   │   │   │   ├── theme/
│   │   │   │   │   ├── Color.kt
│   │   │   │   │   ├── Theme.kt
│   │   │   │   │   └── Typography.kt
│   │   │   │   │
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProductCard.kt
│   │   │   │   │   ├── CartItem.kt
│   │   │   │   │   ├── NumPad.kt
│   │   │   │   │   └── PaymentMethodSelector.kt
│   │   │   │   │
│   │   │   │   └── screens/
│   │   │   │       ├── auth/
│   │   │   │       │   ├── LoginScreen.kt
│   │   │   │       │   └── LoginViewModel.kt
│   │   │   │       ├── menu/
│   │   │   │       │   ├── MenuScreen.kt
│   │   │   │       │   └── MenuViewModel.kt
│   │   │   │       ├── payment/
│   │   │   │       │   ├── PaymentScreen.kt
│   │   │   │       │   └── PaymentViewModel.kt
│   │   │   │       └── shift/
│   │   │   │           ├── ShiftScreen.kt
│   │   │   │           └── ShiftViewModel.kt
│   │   │   │
│   │   │   ├── printer/                        # Printer Module
│   │   │   │   ├── PrinterManager.kt
│   │   │   │   ├── EscPosCommands.kt
│   │   │   │   ├── ReceiptBuilder.kt
│   │   │   │   └── PrinterConnection.kt
│   │   │   │
│   │   │   └── util/
│   │   │       ├── Extensions.kt
│   │   │       └── Constants.kt
│   │   │
│   │   └── res/
│   │
│   └── build.gradle.kts
│
└── settings.gradle.kts
```

---

## Database Schema

### Enums

```kotlin
enum class ProductType { SINGLE, COMBO, TOPPING }
enum class OrderType { COUNTER, DINE_IN, TAKEAWAY, DELIVERY }
enum class OrderStatus { PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED }
enum class PaymentStatus { UNPAID, PARTIAL, PAID, REFUNDED }
enum class PaymentMethod { CASH, BANK_TRANSFER, CREDIT_CARD, E_WALLET, QR_CODE }
enum class ShiftStatus { OPEN, CLOSED }
enum class SyncStatus { PENDING, SYNCING, SYNCED, FAILED }
enum class SyncAction { CREATE, UPDATE, DELETE }
```

### Staff Entity

```kotlin
@Entity(tableName = "staff")
data class StaffEntity(
    @PrimaryKey
    val id: String,
    val tenantId: String,
    val branchId: String,
    val code: String?,
    val name: String,
    val phone: String?,
    val pin: String?,           // PIN đăng nhập
    val role: String,           // cashier, manager, admin
    val avatarUrl: String?,
    val isActive: Boolean = true,

    // Sync fields
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val lastSyncAt: Long? = null,
    val localCreatedAt: Long = System.currentTimeMillis(),
    val localUpdatedAt: Long = System.currentTimeMillis()
)
```

### Category Entity

```kotlin
@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey
    val id: String,
    val tenantId: String,
    val brandId: String,
    val name: String,
    val imageUrl: String?,
    val parentId: String?,
    val sortOrder: Int = 0,
    val isActive: Boolean = true,

    // Sync fields
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val lastSyncAt: Long? = null
)
```

### Product Entity

```kotlin
@Entity(
    tableName = "products",
    indices = [
        Index("categoryId"),
        Index("tenantId", "brandId")
    ]
)
data class ProductEntity(
    @PrimaryKey
    val id: String,
    val tenantId: String,
    val brandId: String,
    val categoryId: String?,
    val code: String?,
    val name: String,
    val description: String?,
    val imageUrl: String?,
    val price: Double,
    val costPrice: Double = 0.0,
    val vatRate: Double = 0.0,
    val unit: String?,
    val productType: ProductType = ProductType.SINGLE,
    val isAvailable: Boolean = true,
    val isActive: Boolean = true,
    val sortOrder: Int = 0,

    // Offline fields
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val lastSyncAt: Long? = null
)
```

### Order Entity

```kotlin
@Entity(
    tableName = "orders",
    indices = [
        Index("tenantId", "branchId"),
        Index("orderNumber"),
        Index("syncStatus")
    ]
)
data class OrderEntity(
    @PrimaryKey
    val id: String,                           // UUID local
    val serverId: String? = null,             // UUID từ server (sau khi sync)
    val tenantId: String,
    val branchId: String,
    val orderNumber: String,                  // DH-20260107-0001
    val orderType: OrderType = OrderType.COUNTER,
    val status: OrderStatus = OrderStatus.PENDING,

    // Customer info (optional)
    val customerId: String? = null,
    val customerName: String? = null,
    val customerPhone: String? = null,

    // Staff
    val staffId: String,
    val staffName: String,

    // Amounts
    val subtotal: Double = 0.0,
    val discountAmount: Double = 0.0,
    val discountPercent: Double = 0.0,
    val surchargeAmount: Double = 0.0,
    val taxAmount: Double = 0.0,
    val total: Double = 0.0,

    // Payment
    val paymentStatus: PaymentStatus = PaymentStatus.UNPAID,
    val paidAmount: Double = 0.0,

    // Voucher/Coupon
    val voucherId: String? = null,
    val voucherCode: String? = null,
    val couponId: String? = null,
    val couponCode: String? = null,

    val notes: String? = null,
    val shiftId: String,

    // Timestamps
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val completedAt: Long? = null,

    // Sync fields
    val syncStatus: SyncStatus = SyncStatus.PENDING,
    val syncError: String? = null,
    val lastSyncAttempt: Long? = null
)
```

### Order Item Entity

```kotlin
@Entity(
    tableName = "order_items",
    foreignKeys = [
        ForeignKey(
            entity = OrderEntity::class,
            parentColumns = ["id"],
            childColumns = ["orderId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("orderId")]
)
data class OrderItemEntity(
    @PrimaryKey
    val id: String,
    val orderId: String,
    val productId: String,
    val productCode: String?,
    val productName: String,
    val productImageUrl: String?,

    val quantity: Int,
    val unitPrice: Double,
    val totalPrice: Double,

    // Topping/Options as JSON
    val toppings: String? = null,    // JSON: [{"id":"...", "name":"...", "price":5000}]
    val notes: String? = null,

    val status: OrderItemStatus = OrderItemStatus.PENDING,
    val createdAt: Long = System.currentTimeMillis()
)

enum class OrderItemStatus { PENDING, PREPARING, READY, SERVED, CANCELLED }
```

### Payment Entity

```kotlin
@Entity(
    tableName = "payments",
    foreignKeys = [
        ForeignKey(
            entity = OrderEntity::class,
            parentColumns = ["id"],
            childColumns = ["orderId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("orderId")]
)
data class PaymentEntity(
    @PrimaryKey
    val id: String,
    val orderId: String,
    val tenantId: String,
    val branchId: String,

    val amount: Double,
    val paymentMethod: PaymentMethod,
    val paymentMethodName: String,

    // For cash
    val receivedAmount: Double? = null,
    val changeAmount: Double? = null,

    // For bank/card
    val referenceCode: String? = null,
    val bankAccountId: String? = null,

    val status: PaymentEntityStatus = PaymentEntityStatus.COMPLETED,
    val paidAt: Long = System.currentTimeMillis(),

    // Sync
    val syncStatus: SyncStatus = SyncStatus.PENDING
)

enum class PaymentEntityStatus { PENDING, COMPLETED, FAILED, REFUNDED }
```

### Shift Entity

```kotlin
@Entity(tableName = "shifts")
data class ShiftEntity(
    @PrimaryKey
    val id: String,
    val tenantId: String,
    val branchId: String,
    val staffId: String,
    val staffName: String,

    val startTime: Long,
    val endTime: Long? = null,

    val openingCash: Double,                  // Tiền đầu ca
    val closingCash: Double? = null,          // Tiền cuối ca (thực tế)
    val expectedClosingCash: Double? = null,  // Tiền cuối ca (lý thuyết)

    // Summary
    val totalCashSales: Double = 0.0,
    val totalBankSales: Double = 0.0,
    val totalOrders: Int = 0,
    val totalCancelled: Int = 0,

    val status: ShiftStatus = ShiftStatus.OPEN,
    val notes: String? = null,

    // Sync
    val syncStatus: SyncStatus = SyncStatus.PENDING,
    val serverId: String? = null
)
```

### Sync Queue Entity

```kotlin
@Entity(
    tableName = "sync_queue",
    indices = [Index("entityType"), Index("status"), Index("priority")]
)
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    val entityType: String,                   // order, payment, shift
    val entityId: String,
    val action: SyncAction,                   // CREATE, UPDATE, DELETE
    val payload: String,                      // JSON data

    val priority: Int = 0,                    // Higher = more urgent
    val status: SyncQueueStatus = SyncQueueStatus.PENDING,
    val attempts: Int = 0,
    val maxAttempts: Int = 5,
    val lastError: String? = null,

    val createdAt: Long = System.currentTimeMillis(),
    val lastAttemptAt: Long? = null
)

enum class SyncQueueStatus { PENDING, PROCESSING, COMPLETED, FAILED }
```

---

## Flow Chi tiết

### Flow Đăng nhập PIN

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLOW ĐĂNG NHẬP PIN                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐             │
│  │  App Start  │ ---> │ Check Shift │ ---> │   Có ca     │ --> Main    │
│  │             │      │   Status    │      │   đang mở?  │             │
│  └─────────────┘      └─────────────┘      └──────┬──────┘             │
│                                                   │ Không               │
│                                                   ▼                     │
│                       ┌─────────────────────────────────────────┐      │
│                       │           MÀN HÌNH ĐĂNG NHẬP            │      │
│                       │  ┌─────────────────────────────────┐    │      │
│                       │  │         NHẬP MÃ PIN             │    │      │
│                       │  │                                  │    │      │
│                       │  │      ┌───┐ ┌───┐ ┌───┐ ┌───┐   │    │      │
│                       │  │      │ * │ │ * │ │ * │ │ * │   │    │      │
│                       │  │      └───┘ └───┘ └───┘ └───┘   │    │      │
│                       │  │                                  │    │      │
│                       │  │  ┌───┐ ┌───┐ ┌───┐             │    │      │
│                       │  │  │ 1 │ │ 2 │ │ 3 │             │    │      │
│                       │  │  ├───┤ ├───┤ ├───┤             │    │      │
│                       │  │  │ 4 │ │ 5 │ │ 6 │             │    │      │
│                       │  │  ├───┤ ├───┤ ├───┤             │    │      │
│                       │  │  │ 7 │ │ 8 │ │ 9 │             │    │      │
│                       │  │  ├───┤ ├───┤ ├───┤             │    │      │
│                       │  │  │ C │ │ 0 │ │ ⌫ │             │    │      │
│                       │  │  └───┘ └───┘ └───┘             │    │      │
│                       │  └─────────────────────────────────┘    │      │
│                       └─────────────────────────────────────────┘      │
│                                          │                              │
│                                          ▼                              │
│                       ┌─────────────────────────────────────────┐      │
│                       │    Verify PIN (Local Database)          │      │
│                       │    SELECT * FROM staff WHERE pin = ?    │      │
│                       └─────────────────────────────────────────┘      │
│                                          │                              │
│                              ┌───────────┴───────────┐                 │
│                              ▼                       ▼                  │
│                       ┌──────────────┐       ┌──────────────┐          │
│                       │   Success    │       │    Failed    │          │
│                       │  Save Staff  │       │  Show Error  │          │
│                       │  to Session  │       │              │          │
│                       └──────────────┘       └──────────────┘          │
│                              │                                          │
│                              ▼                                          │
│                       ┌──────────────────────────────────────────┐     │
│                       │            MỞ CA LÀM VIỆC                │     │
│                       │  Nhập tiền đầu ca: [____________] VNĐ    │     │
│                       │                                           │     │
│                       │  [HỦY]                    [MỞ CA]        │     │
│                       └──────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow Order tại quầy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       FLOW TẠO ORDER TẠI QUẦY                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MÀN HÌNH CHÍNH (SPLIT VIEW)                   │   │
│  │ ┌──────────────────────────────┬───────────────────────────────┐│   │
│  │ │       MENU SẢN PHẨM          │         GIỎ HÀNG              ││   │
│  │ │                              │                                ││   │
│  │ │ [Tất cả] [Đồ uống] [Món chính] │  Order #: DH-20260107-0001  ││   │
│  │ │                              │  ─────────────────────────     ││   │
│  │ │ 🔍 Tìm kiếm...              │                                ││   │
│  │ │                              │  • Cà phê sữa        x2  70k  ││   │
│  │ │ ┌────┐ ┌────┐ ┌────┐ ┌────┐│    [+] [-] [🗑️]                ││   │
│  │ │ │ Cà │ │ Trà │ │ Phở │ │ Cơm││  • Phở bò tái        x1  80k  ││   │
│  │ │ │ phê │ │ sữa │ │ bò  │ │ gà ││    Thêm: Hành, Giá            ││   │
│  │ │ │ 35k │ │ 30k │ │ 80k │ │ 65k││    [+] [-] [🗑️]                ││   │
│  │ │ └────┘ └────┘ └────┘ └────┘│  • Bánh flan         x2  50k  ││   │
│  │ │                              │    [+] [-] [🗑️]                ││   │
│  │ │ ┌────┐ ┌────┐ ┌────┐ ┌────┐│                                ││   │
│  │ │ │Bánh│ │Nước│ │Sinh│ │Kem ││  ─────────────────────────     ││   │
│  │ │ │flan│ │ ép │ │ tố │ │    ││  Tạm tính:          200,000đ  ││   │
│  │ │ │ 25k│ │ 45k│ │ 40k│ │ 30k││  Giảm giá:               0đ  ││   │
│  │ │ └────┘ └────┘ └────┘ └────┘│  VAT (10%):          20,000đ  ││   │
│  │ │                              │  ─────────────────────────     ││   │
│  │ │                              │  TỔNG CỘNG:        220,000đ  ││   │
│  │ │                              │                                ││   │
│  │ │                              │  [Ghi chú] [Giảm giá] [THANH TOÁN]│
│  │ └──────────────────────────────┴───────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Flow chi tiết:                                                         │
│  1. Chọn Category → Load Products theo category                        │
│  2. Tap Product → Thêm vào Cart (quantity = 1)                         │
│  3. Tap Product trong Cart → Dialog chỉnh sửa (topping, ghi chú)       │
│  4. Tap [+] [-] → Tăng/giảm số lượng                                   │
│  5. Tap [🗑️] → Xóa item                                                 │
│  6. Tap [Giảm giá] → Dialog nhập % hoặc số tiền                        │
│  7. Tap [THANH TOÁN] → Chuyển sang màn Payment                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow Thanh toán

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLOW THANH TOÁN                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MÀN HÌNH THANH TOÁN                           │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │  THÔNG TIN ĐƠN HÀNG                                         ││   │
│  │  │  Order #: DH-20260107-0001                                  ││   │
│  │  │  Nhân viên: Nguyễn Văn A                                    ││   │
│  │  │  Số món: 5                                                  ││   │
│  │  │  ─────────────────────────────────────────────────          ││   │
│  │  │  Tạm tính:                              200,000đ            ││   │
│  │  │  Giảm giá (Voucher GIAM10):             -20,000đ            ││   │
│  │  │  VAT (10%):                              18,000đ            ││   │
│  │  │  ─────────────────────────────────────────────────          ││   │
│  │  │  TỔNG THANH TOÁN:                       198,000đ            ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │  PHƯƠNG THỨC THANH TOÁN                                     ││   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       ││   │
│  │  │  │  💵      │ │  🏦      │ │  💳      │ │  📱      │       ││   │
│  │  │  │ Tiền mặt │ │ Chuyển   │ │ Thẻ      │ │ Ví       │       ││   │
│  │  │  │  [✓]     │ │ khoản    │ │ ngân hàng│ │ điện tử  │       ││   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │  TIỀN MẶT                                                   ││   │
│  │  │  Cần thanh toán:  198,000đ                                  ││   │
│  │  │  Khách đưa:       [200,000    ]                             ││   │
│  │  │  Tiền thừa:       2,000đ                                    ││   │
│  │  │                                                              ││   │
│  │  │  [200k] [300k] [500k] [Đủ tiền]                             ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  │                                                                   │   │
│  │  ┌──────────────────┐  ┌──────────────────────────────────────┐ │   │
│  │  │      [HỦY]       │  │         [THANH TOÁN & IN HÓA ĐƠN]    │ │   │
│  │  └──────────────────┘  └──────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Flow xử lý (Offline):                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Validate payment amount                                       │   │
│  │ 2. Create PaymentEntity (local)                                  │   │
│  │ 3. Update OrderEntity status = COMPLETED                         │   │
│  │ 4. Update ShiftEntity totals                                     │   │
│  │ 5. Add to SyncQueue (priority = HIGH)                            │   │
│  │ 6. Generate & Print Receipt                                      │   │
│  │ 7. Open cash drawer (if cash payment)                            │   │
│  │ 8. Return to Main Screen                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow In hóa đơn

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLOW IN HÓA ĐƠN                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                     RECEIPT TEMPLATE (80mm)                     │    │
│  │ ┌────────────────────────────────────────────────────────────┐ │    │
│  │ │            ████████  TECHRES  ████████                     │ │    │
│  │ │                                                             │ │    │
│  │ │  Chi nhánh: Quận 1 - TP.HCM                                │ │    │
│  │ │  Địa chỉ: 123 Nguyễn Huệ, P.Bến Nghé, Q.1                 │ │    │
│  │ │  Hotline: 1900 1234                                        │ │    │
│  │ │  ─────────────────────────────────────────                 │ │    │
│  │ │  HÓA ĐƠN BÁN HÀNG                                          │ │    │
│  │ │  Số: DH-20260107-0001                                      │ │    │
│  │ │  Ngày: 07/01/2026 14:30:25                                 │ │    │
│  │ │  Thu ngân: Nguyễn Văn A                                    │ │    │
│  │ │  ─────────────────────────────────────────                 │ │    │
│  │ │  Cà phê sữa           x2        70,000đ                    │ │    │
│  │ │  Phở bò tái           x1        80,000đ                    │ │    │
│  │ │    + Thêm hành                   5,000đ                    │ │    │
│  │ │  Bánh flan            x2        50,000đ                    │ │    │
│  │ │  ─────────────────────────────────────────                 │ │    │
│  │ │  Tạm tính:                     205,000đ                    │ │    │
│  │ │  Giảm giá (GIAM10):            -20,500đ                    │ │    │
│  │ │  VAT (10%):                     18,450đ                    │ │    │
│  │ │  ═════════════════════════════════════════                 │ │    │
│  │ │  TỔNG CỘNG:                    202,950đ                    │ │    │
│  │ │  ═════════════════════════════════════════                 │ │    │
│  │ │  Tiền mặt:                     210,000đ                    │ │    │
│  │ │  Tiền thừa:                      7,050đ                    │ │    │
│  │ │  ─────────────────────────────────────────                 │ │    │
│  │ │          Cảm ơn quý khách!                                 │ │    │
│  │ │       Hẹn gặp lại lần sau!                                 │ │    │
│  │ │                                                             │ │    │
│  │ │  [QR Code - Review/Feedback]                               │ │    │
│  │ └────────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ESC/POS Commands Flow:                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Initialize printer    → ESC @                                │   │
│  │ 2. Print logo           → GS v 0 (bitmap)                       │   │
│  │ 3. Print header         → ESC a 1 (center align)                │   │
│  │ 4. Print items          → ESC a 0 (left align)                  │   │
│  │ 5. Print total          → ESC E 1 (bold on)                     │   │
│  │ 6. Print QR code        → GS ( k                                │   │
│  │ 7. Cut paper            → GS V 66 3                             │   │
│  │ 8. Open drawer          → ESC p 0 50 50                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Sync Engine (Offline → Cloud)

### Kiến trúc Sync

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYNC ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   LOCAL (Room DB)              SYNC ENGINE              CLOUD           │
│  ┌─────────────┐            ┌─────────────┐        ┌──────────┐        │
│  │   Orders    │ ────────── │  SyncQueue  │ ─────> │  API     │        │
│  │  Payments   │            │  WorkManager│ <───── │  Server  │        │
│  │   Shifts    │            │             │        │          │        │
│  └─────────────┘            └─────────────┘        └──────────┘        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sync Strategy

| Strategy | Direction | Data Type | Priority |
|----------|-----------|-----------|----------|
| **PUSH** | Local → Cloud | Orders, Payments, Shifts | High |
| **PULL** | Cloud → Local | Products, Categories, Staff | Medium |
| **Conflict** | Merge/Last-Write-Wins | Tùy loại data | - |

### PUSH Flow (Local → Cloud)

```
┌─────────────────────────────────────────────────────────────────┐
│ • Order created/updated locally                                  │
│ • Payment processed locally                                      │
│ • Shift opened/closed locally                                    │
│                                                                   │
│ Flow:                                                             │
│ 1. Add to SyncQueue (status = PENDING)                           │
│ 2. WorkManager picks up when online                              │
│ 3. POST/PUT to API                                               │
│ 4. On success: Update syncStatus = SYNCED                        │
│ 5. On failure: Retry with exponential backoff                    │
└─────────────────────────────────────────────────────────────────┘
```

### PULL Flow (Cloud → Local)

```
┌─────────────────────────────────────────────────────────────────┐
│ • Master data (Products, Categories, Staff)                      │
│ • Vouchers, Coupons                                              │
│ • Settings, Configurations                                       │
│                                                                   │
│ Flow:                                                             │
│ 1. Check lastSyncTimestamp                                       │
│ 2. GET /sync/changes?since={timestamp}                           │
│ 3. Apply changes to local DB                                     │
│ 4. Update lastSyncTimestamp                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution

| Entity | Strategy | Lý do |
|--------|----------|-------|
| Order | Server wins | Admin có thể sửa |
| Product | Server wins | Master data |
| Payment | Local wins | Đã xử lý tại POS |
| Shift | Merge | Cộng dồn nếu conflict |

### Sync Triggers

- Network connectivity restored
- Periodic (every 5 minutes when online)
- Manual trigger (pull-to-refresh)
- App foreground
- Before shift close

---

## Implementation Phases

### Phase 1: Project Setup (Tuần 1)

| Task | Mô tả |
|------|-------|
| Khởi tạo Project | Android Studio, Compose Activity |
| Setup Dependencies | Hilt, Room, Retrofit, WorkManager |
| Clean Architecture | Package structure, DI modules |

### Phase 2: Database & Core (Tuần 2)

| Task | Mô tả |
|------|-------|
| Room Database | All Entity classes, DAOs |
| Repository Layer | Product, Order, Auth repositories |
| Use Cases | GetProducts, CreateOrder, Login |

### Phase 3: Authentication (Tuần 3)

| Task | Mô tả |
|------|-------|
| Login Screen | PIN input, NumPad component |
| Auth Logic | Verify PIN, session management |
| Shift Management | Open/Close shift screens |

### Phase 4: Menu & Cart (Tuần 4-5)

| Task | Mô tả |
|------|-------|
| Menu Screen | Category tabs, product grid, search |
| Cart Screen | Item list, quantity, summary |
| Order Logic | Cart state, price calculations |

### Phase 5: Payment (Tuần 6)

| Task | Mô tả |
|------|-------|
| Payment Screen | Order summary, method selector |
| Payment Logic | Process payment, update order |
| Voucher/Coupon | Validate and apply discount |

### Phase 6: Printing (Tuần 7)

| Task | Mô tả |
|------|-------|
| Printer Connection | Bluetooth, USB, Network |
| ESC/POS Commands | Text formatting, QR code |
| Receipt Builder | Template, print queue |

### Phase 7: Sync Engine (Tuần 8)

| Task | Mô tả |
|------|-------|
| API Setup | Retrofit, interceptors |
| Sync Queue | Add/process queue, retry logic |
| WorkManager | SyncWorker, periodic sync |

### Phase 8: Polish & Testing (Tuần 9-10)

| Task | Mô tả |
|------|-------|
| UI/UX Polish | Loading states, animations |
| Testing | Unit tests, UI tests |
| Performance | Query optimization, profiling |

---

## Yêu cầu phần cứng

### Android POS

| Cấu hình | Tối thiểu | Khuyến nghị |
|----------|-----------|-------------|
| RAM | 2GB | 4GB |
| Storage | 1GB trống | 2GB trống |
| Android | 8.0+ (API 26) | 11+ (API 30) |
| Screen | 7" | 10"+ |
| Printer Port | USB/Bluetooth | USB + Ethernet |

### Máy in nhiệt

| Cấu hình | Tối thiểu | Khuyến nghị |
|----------|-----------|-------------|
| Paper Width | 58mm | 80mm |
| Connection | Bluetooth | USB + Ethernet |
| Speed | 100mm/s | 200mm/s |
| Auto-cutter | Optional | Yes |
| Cash Drawer | Optional | Yes |

---

## Các bất cập và Giải pháp CCB Offline

### 1. Sync Master Data (PULL: Cloud → Local)

#### Bất cập

| Vấn đề | Mô tả | Impact |
|--------|-------|--------|
| **Initial Sync lớn** | Lần đầu download toàn bộ Products, Categories, Staff, Vouchers... có thể hàng ngàn record | Mất thời gian, tốn bandwidth |
| **Incremental Sync** | Không biết data nào đã thay đổi kể từ lần sync trước | Sync lại toàn bộ = lãng phí |
| **Data stale** | Giá sản phẩm thay đổi trên server nhưng POS offline | Bán sai giá |
| **Sản phẩm bị xóa/ẩn** | Server ẩn/xóa sản phẩm nhưng POS vẫn hiện | Bán món không có |
| **Dung lượng local** | Hình ảnh sản phẩm chiếm nhiều storage | Hết bộ nhớ |
| **Conflict khi đồng thời** | 2 admin sửa cùng 1 sản phẩm | Data không nhất quán |

#### Giải pháp tối ưu

**a) Delta Sync với Timestamp + Version**

```kotlin
// Server API: GET /sync/master-data?since={timestamp}&version={version}
data class SyncResponse(
    val products: List<ProductDto>,
    val categories: List<CategoryDto>,
    val deletedProductIds: List<String>,      // Quan trọng!
    val deletedCategoryIds: List<String>,
    val serverTimestamp: Long,
    val serverVersion: Int
)

// Local: Lưu timestamp cuối cùng
@Entity(tableName = "sync_metadata")
data class SyncMetadata(
    @PrimaryKey val key: String,              // "master_data", "vouchers", etc.
    val lastSyncAt: Long,
    val serverVersion: Int
)
```

**b) Chunked Download cho Initial Sync**

```kotlin
// API: GET /sync/products?page={page}&limit=100
// Download 100 records/lần, show progress bar

class InitialSyncWorker : CoroutineWorker() {
    override suspend fun doWork(): Result {
        var page = 1
        var hasMore = true

        while (hasMore) {
            val response = api.getProducts(page = page, limit = 100)
            productDao.insertAll(response.data)

            // Update progress notification
            setProgress(workDataOf("progress" to (page * 100 / response.totalPages)))

            hasMore = page < response.totalPages
            page++
        }
        return Result.success()
    }
}
```

**c) Image Caching Strategy**

```kotlin
// 1. Chỉ download thumbnail (nhỏ) ban đầu
// 2. Download full image khi cần (lazy load)
// 3. LRU Cache với giới hạn size

@Entity
data class ProductEntity(
    // ...
    val thumbnailUrl: String?,    // 100x100, luôn cache
    val imageUrl: String?,        // Full size, lazy load
    val localThumbnailPath: String? = null,  // Local cache path
)

// Coil/Glide với disk cache
AsyncImage(
    model = ImageRequest.Builder(context)
        .data(product.thumbnailUrl)
        .diskCachePolicy(CachePolicy.ENABLED)
        .memoryCachePolicy(CachePolicy.ENABLED)
        .build(),
    ...
)
```

**d) Soft Delete + isActive Flag**

```kotlin
// Server không xóa thật, chỉ set isActive = false, deletedAt = now
// Client filter: WHERE isActive = true AND deletedAt IS NULL

@Query("""
    SELECT * FROM products
    WHERE isActive = 1
    AND (deletedAt IS NULL OR deletedAt = 0)
    ORDER BY sortOrder
""")
fun getActiveProducts(): Flow<List<ProductEntity>>
```

**e) Force Sync khi ca làm việc**

```kotlin
// Bắt buộc sync master data trước khi mở ca
class OpenShiftUseCase {
    suspend fun execute(openingCash: Double): Result<Shift> {
        // 1. Check internet
        if (networkMonitor.isOnline()) {
            // 2. Force sync master data
            val syncResult = syncManager.syncMasterData(force = true)
            if (syncResult.isFailure) {
                // Cho phép mở ca với warning
                return Result.success(shift.copy(
                    notes = "⚠️ Dữ liệu có thể chưa cập nhật"
                ))
            }
        }
        // 3. Open shift
        return shiftRepository.openShift(openingCash)
    }
}
```

---

### 2. Sync Transactions (PUSH: Local → Cloud)

#### Bất cập

| Vấn đề | Mô tả | Impact |
|--------|-------|--------|
| **Order chưa sync** | POS hỏng trước khi sync | Mất dữ liệu bán hàng |
| **Duplicate Order** | Network timeout, retry tạo trùng | Doanh thu sai |
| **Thứ tự sync** | Shift phải sync trước Order | Foreign key fail |
| **Partial sync fail** | Order sync OK nhưng Payment fail | Data inconsistent |
| **Queue quá lớn** | Offline lâu, hàng ngàn records pending | Sync timeout |
| **Conflict** | Admin sửa order trên web trong khi POS offline | Data conflict |

#### Giải pháp tối ưu

**a) Idempotency Key để tránh Duplicate**

```kotlin
@Entity
data class OrderEntity(
    @PrimaryKey
    val id: String,                           // UUID local
    val idempotencyKey: String = UUID.randomUUID().toString(),  // Key chống duplicate
    val serverId: String? = null,             // ID từ server sau khi sync
    // ...
)

// API call với header
suspend fun syncOrder(order: OrderEntity) {
    api.createOrder(
        order = order.toDto(),
        headers = mapOf("Idempotency-Key" to order.idempotencyKey)
    )
}

// Server: Check idempotencyKey trước khi insert
// Nếu đã tồn tại → return existing order, không tạo mới
```

**b) Transaction-based Sync (Order + Items + Payment)**

```kotlin
// Sync cả bundle, không tách lẻ
data class OrderSyncPayload(
    val order: OrderDto,
    val items: List<OrderItemDto>,
    val payments: List<PaymentDto>
)

// API: POST /sync/orders - atomic transaction
// Server sử dụng database transaction để đảm bảo all-or-nothing

class SyncWorker {
    suspend fun syncOrder(orderId: String) {
        val order = orderDao.getById(orderId)
        val items = orderItemDao.getByOrderId(orderId)
        val payments = paymentDao.getByOrderId(orderId)

        // Sync as single payload
        val payload = OrderSyncPayload(
            order = order.toDto(),
            items = items.map { it.toDto() },
            payments = payments.map { it.toDto() }
        )

        val response = api.syncOrder(payload)

        // Update all local records with server IDs
        orderDao.updateServerId(orderId, response.serverId)
        // ...
    }
}
```

**c) Dependency-aware Sync Queue**

```kotlin
enum class SyncEntityType(val priority: Int, val dependencies: List<SyncEntityType>) {
    SHIFT(1, emptyList()),                    // Sync đầu tiên
    ORDER(2, listOf(SHIFT)),                  // Cần shift đã sync
    PAYMENT(3, listOf(ORDER)),                // Cần order đã sync
}

@Entity
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val entityType: SyncEntityType,
    val entityId: String,
    val dependsOnId: String? = null,          // ID của entity dependency
    val status: SyncStatus,
    // ...
)

// Sync processor
class SyncProcessor {
    suspend fun processQueue() {
        // 1. Get pending items sorted by priority
        val pendingItems = syncQueueDao.getPendingOrderByPriority()

        for (item in pendingItems) {
            // 2. Check dependencies
            if (item.dependsOnId != null) {
                val dependency = syncQueueDao.getById(item.dependsOnId)
                if (dependency?.status != SyncStatus.COMPLETED) {
                    continue  // Skip, wait for dependency
                }
            }

            // 3. Process
            processItem(item)
        }
    }
}
```

**d) Batch Sync với Chunking**

```kotlin
// Thay vì sync từng order, batch 50 orders/request
class BatchSyncWorker {
    companion object {
        const val BATCH_SIZE = 50
    }

    suspend fun syncPendingOrders() {
        val pendingOrders = orderDao.getPendingSyncOrders(limit = BATCH_SIZE)

        if (pendingOrders.isEmpty()) return

        val payloads = pendingOrders.map { order ->
            OrderSyncPayload(
                order = order.toDto(),
                items = orderItemDao.getByOrderId(order.id).map { it.toDto() },
                payments = paymentDao.getByOrderId(order.id).map { it.toDto() }
            )
        }

        // Batch API call
        val response = api.syncOrdersBatch(payloads)

        // Update results
        response.results.forEach { result ->
            if (result.success) {
                orderDao.updateSyncStatus(result.localId, SyncStatus.SYNCED, result.serverId)
            } else {
                orderDao.updateSyncError(result.localId, result.error)
            }
        }
    }
}
```

**e) Conflict Resolution Strategy**

```kotlin
enum class ConflictStrategy {
    LOCAL_WINS,      // POS data luôn thắng (payment, shift)
    SERVER_WINS,     // Server data luôn thắng (master data)
    LAST_WRITE_WINS, // So sánh timestamp
    MERGE,           // Merge fields (shift summary)
    MANUAL           // Flag để admin review
}

data class SyncConflict(
    val entityType: String,
    val entityId: String,
    val localData: String,      // JSON
    val serverData: String,     // JSON
    val localUpdatedAt: Long,
    val serverUpdatedAt: Long,
    val strategy: ConflictStrategy,
    val resolvedData: String? = null,
    val status: ConflictStatus = ConflictStatus.PENDING
)

class ConflictResolver {
    fun resolve(conflict: SyncConflict): String {
        return when (conflict.strategy) {
            ConflictStrategy.LOCAL_WINS -> conflict.localData
            ConflictStrategy.SERVER_WINS -> conflict.serverData
            ConflictStrategy.LAST_WRITE_WINS -> {
                if (conflict.localUpdatedAt > conflict.serverUpdatedAt)
                    conflict.localData
                else
                    conflict.serverData
            }
            ConflictStrategy.MERGE -> mergeData(conflict)
            ConflictStrategy.MANUAL -> throw ConflictNeedsReviewException(conflict)
        }
    }

    private fun mergeData(conflict: SyncConflict): String {
        // Ví dụ merge Shift: cộng dồn sales
        val local = json.decodeFromString<ShiftDto>(conflict.localData)
        val server = json.decodeFromString<ShiftDto>(conflict.serverData)

        return json.encodeToString(local.copy(
            totalCashSales = local.totalCashSales + server.totalCashSales,
            totalBankSales = local.totalBankSales + server.totalBankSales,
            totalOrders = local.totalOrders + server.totalOrders
        ))
    }
}
```

---

### 3. ID Generation Offline

#### Bất cập

| Vấn đề | Mô tả | Impact |
|--------|-------|--------|
| **UUID collision** | 2 devices tạo cùng UUID (xác suất cực thấp nhưng có) | Data conflict |
| **Order number trùng** | 2 POS cùng tạo DH-20260107-0001 | Nhầm lẫn |
| **Sequential ID** | Auto-increment không work offline | Foreign key issues |
| **Human-readable ID** | Customer cần số đơn dễ đọc | UX issue |

#### Giải pháp tối ưu

**a) Device-prefixed UUID**

```kotlin
object DeviceIdGenerator {
    private lateinit var deviceCode: String  // VD: "POS01", "POS02"

    fun init(context: Context, assignedCode: String) {
        deviceCode = assignedCode
    }

    // UUID format: {deviceCode}-{uuid}
    // VD: POS01-550e8400-e29b-41d4-a716-446655440000
    fun generateId(): String {
        return "${deviceCode}-${UUID.randomUUID()}"
    }
}
```

**b) Order Number với Device Prefix**

```kotlin
class OrderNumberGenerator(
    private val deviceCode: String,
    private val orderDao: OrderDao
) {
    // Format: {deviceCode}-{YYYYMMDD}-{sequence}
    // VD: P1-20260107-0001, P2-20260107-0001

    suspend fun generate(): String {
        val today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)
        val prefix = "$deviceCode-$today"

        // Get max sequence for today on this device
        val lastOrder = orderDao.getLastOrderByPrefix("$prefix-%")
        val sequence = if (lastOrder != null) {
            val lastSeq = lastOrder.orderNumber.split("-").last().toInt()
            lastSeq + 1
        } else {
            1
        }

        return "$prefix-${sequence.toString().padStart(4, '0')}"
    }
}
```

**c) Pre-allocated ID Ranges**

```kotlin
// Server cấp range ID cho mỗi device
// Device POS01: 1000000 - 1999999
// Device POS02: 2000000 - 2999999

@Entity(tableName = "id_allocation")
data class IdAllocation(
    @PrimaryKey val entityType: String,  // "order", "payment"
    val currentId: Long,
    val maxId: Long,
    val allocatedAt: Long
)

class IdAllocator(private val api: SyncApi, private val dao: IdAllocationDao) {

    suspend fun getNextId(entityType: String): Long {
        val allocation = dao.get(entityType)

        if (allocation == null || allocation.currentId >= allocation.maxId) {
            // Request new range from server
            val newRange = api.allocateIdRange(entityType, deviceCode, count = 10000)
            dao.insert(IdAllocation(
                entityType = entityType,
                currentId = newRange.startId,
                maxId = newRange.endId,
                allocatedAt = System.currentTimeMillis()
            ))
            return newRange.startId
        }

        dao.incrementCurrentId(entityType)
        return allocation.currentId + 1
    }
}
```

---

### 4. Giá và Khuyến mãi thay đổi khi Offline

#### Bất cập

| Vấn đề | Mô tả | Impact |
|--------|-------|--------|
| **Giá đã thay đổi** | Admin tăng giá 10% nhưng POS bán giá cũ | Thiệt hại doanh thu |
| **Voucher hết hạn** | Voucher expire nhưng POS vẫn áp dụng | Giảm giá sai |
| **Flash sale kết thúc** | Khuyến mãi hết nhưng POS vẫn bán giá sale | Lỗ |
| **Giới hạn voucher** | Voucher đã hết lượt nhưng offline không biết | Over-redemption |

#### Giải pháp tối ưu

**a) Snapshot Pricing (Giá tại thời điểm bán)**

```kotlin
@Entity
data class OrderItemEntity(
    // ...
    val productId: String,
    val productName: String,

    // Snapshot giá tại thời điểm tạo order - KHÔNG reference
    val unitPrice: Double,           // Giá bán snapshot
    val originalPrice: Double,       // Giá gốc snapshot (để hiện crossed price)
    val costPrice: Double,           // Giá vốn snapshot (để tính lợi nhuận)
    val vatRate: Double,             // VAT snapshot

    // Reference để audit
    val priceVersion: Int,           // Version giá tại thời điểm bán
    val priceSnapshotAt: Long,       // Timestamp snapshot
)

// Khi thêm vào cart
fun addToCart(product: ProductEntity): OrderItemEntity {
    return OrderItemEntity(
        productId = product.id,
        productName = product.name,
        unitPrice = product.price,              // Snapshot NOW
        originalPrice = product.originalPrice,
        costPrice = product.costPrice,
        vatRate = product.vatRate,
        priceVersion = product.priceVersion,
        priceSnapshotAt = System.currentTimeMillis()
    )
}
```

**b) Voucher Validation với Local Rules**

```kotlin
@Entity
data class VoucherEntity(
    @PrimaryKey val id: String,
    val code: String,
    val discountType: DiscountType,     // PERCENT, FIXED
    val discountValue: Double,

    // Validation rules
    val startDate: Long,
    val endDate: Long,
    val minOrderAmount: Double?,
    val maxDiscountAmount: Double?,
    val maxUsageCount: Int?,            // Tổng lượt sử dụng
    val maxUsagePerCustomer: Int?,

    // Local tracking
    val localUsageCount: Int = 0,       // Đếm local

    // Sync
    val serverUsageCount: Int = 0,      // Từ server
    val lastSyncAt: Long? = null
)

class VoucherValidator {
    fun validate(voucher: VoucherEntity, order: OrderEntity): ValidationResult {
        val now = System.currentTimeMillis()

        // 1. Check date range
        if (now < voucher.startDate) {
            return ValidationResult.Error("Voucher chưa bắt đầu")
        }
        if (now > voucher.endDate) {
            return ValidationResult.Error("Voucher đã hết hạn")
        }

        // 2. Check min order amount
        if (voucher.minOrderAmount != null && order.subtotal < voucher.minOrderAmount) {
            return ValidationResult.Error(
                "Đơn hàng tối thiểu ${voucher.minOrderAmount.formatCurrency()}"
            )
        }

        // 3. Check usage limit (conservative - dùng cả local + server)
        val totalUsage = voucher.localUsageCount + voucher.serverUsageCount
        if (voucher.maxUsageCount != null && totalUsage >= voucher.maxUsageCount) {
            return ValidationResult.Error("Voucher đã hết lượt sử dụng")
        }

        // 4. Calculate discount
        val discount = calculateDiscount(voucher, order.subtotal)
        return ValidationResult.Success(discount)
    }

    private fun calculateDiscount(voucher: VoucherEntity, amount: Double): Double {
        val rawDiscount = when (voucher.discountType) {
            DiscountType.PERCENT -> amount * voucher.discountValue / 100
            DiscountType.FIXED -> voucher.discountValue
        }

        // Apply max cap
        return voucher.maxDiscountAmount?.let { minOf(rawDiscount, it) } ?: rawDiscount
    }
}
```

**c) Price Validity Window**

```kotlin
// Giá chỉ valid trong một khoảng thời gian
// Sau đó bắt buộc sync để cập nhật giá mới

@Entity
data class ProductEntity(
    // ...
    val price: Double,
    val priceValidUntil: Long,    // Server set thời hạn giá
    val priceVersion: Int,
)

class ProductRepository {
    fun getProductsForSale(): Flow<List<ProductEntity>> {
        val now = System.currentTimeMillis()

        return productDao.getActiveProducts()
            .map { products ->
                products.map { product ->
                    if (product.priceValidUntil < now) {
                        // Giá đã hết hạn - đánh dấu để hiện warning
                        product.copy(
                            _priceExpiredWarning = true
                        )
                    } else {
                        product
                    }
                }
            }
    }
}

// UI: Hiện warning nếu giá có thể đã thay đổi
@Composable
fun ProductCard(product: Product) {
    Card {
        // ...
        if (product.priceExpiredWarning) {
            Text(
                "⚠️ Giá có thể đã thay đổi",
                color = Color.Orange,
                fontSize = 10.sp
            )
        }
    }
}
```

---

### 5. Multi-Device Conflicts

#### Bất cập

| Vấn đề | Mô tả | Impact |
|--------|-------|--------|
| **Cùng mở ca** | 2 POS cùng mở ca cho 1 nhân viên | Ca bị trùng |
| **Cùng edit order** | Offline, cùng sửa 1 order trên 2 device | Mất data |
| **Stock conflict** | 2 POS bán hết tồn kho | Bán âm kho |
| **Report sai** | Tổng hợp từ 2 POS chưa sync | Báo cáo sai |

#### Giải pháp tối ưu

**a) Device Registration + Exclusive Lock**

```kotlin
// Mỗi device phải register với server
@Entity
data class DeviceRegistration(
    @PrimaryKey val deviceId: String,
    val deviceCode: String,         // "POS01"
    val branchId: String,
    val registeredAt: Long,
    val lastHeartbeat: Long,
    val status: DeviceStatus        // ACTIVE, INACTIVE, SUSPENDED
)

// Server check: 1 nhân viên chỉ được mở ca trên 1 device
// API: POST /shifts/open
// Body: { staffId, deviceId, openingCash }
// Response:
//   - 200: OK
//   - 409 Conflict: "Staff đã có ca đang mở trên device POS02"
```

**b) Order Ownership**

```kotlin
// Order thuộc về device tạo ra nó
// Chỉ device đó được sửa/xử lý

@Entity
data class OrderEntity(
    // ...
    val deviceId: String,           // Device tạo order
    val deviceCode: String,         // "POS01"
)

// Khi sync, server check deviceId
// Nếu edit request từ device khác → reject hoặc tạo conflict
```

**c) Optimistic Locking với Version**

```kotlin
@Entity
data class OrderEntity(
    // ...
    val version: Int = 1,           // Increment mỗi lần update
)

// Khi sync update:
// API: PUT /orders/{id}
// Body: { ...data, expectedVersion: 3 }
// Server check:
//   - Nếu currentVersion == 3 → update, set version = 4
//   - Nếu currentVersion != 3 → 409 Conflict, return current data

suspend fun syncOrderUpdate(order: OrderEntity): SyncResult {
    val response = api.updateOrder(
        id = order.serverId!!,
        data = order.toDto(),
        expectedVersion = order.version
    )

    return when (response.code()) {
        200 -> {
            orderDao.updateVersion(order.id, response.body()!!.version)
            SyncResult.Success
        }
        409 -> {
            // Conflict! Get server version
            val serverOrder = response.body()!!
            SyncResult.Conflict(localOrder = order, serverOrder = serverOrder)
        }
        else -> SyncResult.Error(response.message())
    }
}
```

---

### 6. Authentication & Session Offline

#### Bất cập

| Vấn đề | Mô tả | Impact |
|--------|-------|--------|
| **JWT expired** | Token hết hạn khi offline | Không sync được |
| **Staff bị khóa** | Admin disable staff nhưng POS offline | Staff vẫn dùng được |
| **Permission thay đổi** | Staff bị giảm quyền | Truy cập trái phép |
| **PIN bị đổi** | Admin reset PIN nhưng offline | Login bằng PIN cũ |

#### Giải pháp tối ưu

**a) Long-lived Refresh Token + Short-lived Access Token**

```kotlin
@Entity
data class AuthSession(
    @PrimaryKey val id: String = "current",
    val staffId: String,
    val accessToken: String,
    val refreshToken: String,
    val accessTokenExpiresAt: Long,
    val refreshTokenExpiresAt: Long,        // 30 days

    // Cached permissions
    val role: String,
    val permissions: String,                 // JSON array
    val permissionsValidUntil: Long,         // Revalidate after this
)

class AuthManager {
    suspend fun getValidToken(): String {
        val session = authDao.getCurrentSession()

        if (session.accessTokenExpiresAt > System.currentTimeMillis()) {
            return session.accessToken
        }

        // Access token expired, try refresh
        if (networkMonitor.isOnline()) {
            try {
                val newTokens = api.refreshToken(session.refreshToken)
                authDao.updateTokens(newTokens)
                return newTokens.accessToken
            } catch (e: Exception) {
                // Refresh failed - continue with expired token for local operations
            }
        }

        // Offline hoặc refresh failed - dùng token cũ cho local
        // Sync sẽ fail nhưng local operations vẫn hoạt động
        return session.accessToken
    }
}
```

**b) Periodic Permission Revalidation**

```kotlin
class PermissionValidator {
    suspend fun validateStaffPermissions(staffId: String): PermissionResult {
        val session = authDao.getCurrentSession()

        // Check if permissions cache is still valid
        if (session.permissionsValidUntil > System.currentTimeMillis()) {
            return PermissionResult.Valid(session.permissions.toList())
        }

        // Need to revalidate
        if (networkMonitor.isOnline()) {
            try {
                val response = api.getStaffPermissions(staffId)

                // Check if staff is still active
                if (!response.isActive) {
                    return PermissionResult.StaffDisabled
                }

                // Update cached permissions
                authDao.updatePermissions(
                    permissions = response.permissions,
                    validUntil = System.currentTimeMillis() + 4.hours.inMilliseconds
                )

                return PermissionResult.Valid(response.permissions)

            } catch (e: Exception) {
                // Network error - use cached with warning
                return PermissionResult.ValidWithWarning(
                    permissions = session.permissions.toList(),
                    warning = "Quyền có thể đã thay đổi"
                )
            }
        }

        // Offline - use cached with warning
        return PermissionResult.ValidWithWarning(
            permissions = session.permissions.toList(),
            warning = "Đang offline, quyền có thể đã thay đổi"
        )
    }
}
```

**c) PIN Hash với Salt + Server Verification**

```kotlin
// PIN được hash và lưu local, nhưng cũng verify online khi có thể

@Entity
data class StaffEntity(
    // ...
    val pinHash: String,            // SHA256(pin + salt)
    val pinSalt: String,
    val pinUpdatedAt: Long,         // Để biết PIN có cũ không
)

class PinAuthenticator {
    suspend fun authenticate(enteredPin: String): AuthResult {
        val staff = staffDao.getByPinHash(hashPin(enteredPin))

        if (staff == null) {
            return AuthResult.InvalidPin
        }

        // Local auth passed
        // Try online verification if possible
        if (networkMonitor.isOnline()) {
            try {
                val onlineResult = api.verifyPin(staff.id, enteredPin)

                if (!onlineResult.valid) {
                    // PIN đã bị đổi trên server
                    // Update local hash
                    staffDao.updatePinHash(staff.id, onlineResult.newPinHash, onlineResult.newSalt)
                    return AuthResult.PinChanged("PIN đã được thay đổi, vui lòng dùng PIN mới")
                }

                if (!onlineResult.isActive) {
                    staffDao.updateStatus(staff.id, isActive = false)
                    return AuthResult.StaffDisabled
                }

            } catch (e: Exception) {
                // Online verification failed - allow with local auth
                // Log for audit
            }
        }

        return AuthResult.Success(staff)
    }

    private fun hashPin(pin: String, salt: String): String {
        return MessageDigest.getInstance("SHA-256")
            .digest("$pin$salt".toByteArray())
            .toHexString()
    }
}
```

---

### 7. Shift Management Offline

#### Bất cập

| Vấn đề | Mô tả | Impact |
|--------|-------|--------|
| **Quên đóng ca** | Nhân viên tắt máy không đóng ca | Ca treo vô thời hạn |
| **Tiền không khớp** | Tiền mặt thực tế ≠ tiền hệ thống | Thất thoát |
| **2 ca chồng nhau** | Mở ca mới khi chưa đóng ca cũ | Báo cáo sai |
| **Sync ca fail** | Ca đóng offline, sync fail | Mất data |

#### Giải pháp tối ưu

**a) Auto-close Shift sau 24h**

```kotlin
class ShiftManager {
    // Run daily at midnight
    suspend fun autoCloseStaleShifts() {
        val staleShifts = shiftDao.getOpenShiftsOlderThan(
            timestamp = System.currentTimeMillis() - 24.hours.inMilliseconds
        )

        staleShifts.forEach { shift ->
            // Auto close với note
            val closedShift = shift.copy(
                status = ShiftStatus.AUTO_CLOSED,
                endTime = shift.startTime + 24.hours.inMilliseconds,
                closingCash = null,  // Unknown
                notes = "⚠️ Ca được tự động đóng sau 24h. Cần kiểm tra lại tiền mặt.",
                needsReview = true
            )

            shiftDao.update(closedShift)
            syncQueueDao.add(SyncQueueEntity(
                entityType = "shift",
                entityId = shift.id,
                action = SyncAction.UPDATE,
                priority = SyncPriority.HIGH
            ))
        }
    }
}
```

**b) Cash Variance Tracking**

```kotlin
@Entity
data class ShiftEntity(
    // ...
    val openingCash: Double,
    val closingCash: Double? = null,
    val expectedClosingCash: Double? = null,  // Calculated

    // Variance
    val cashVariance: Double? = null,         // closingCash - expectedClosingCash
    val varianceReason: String? = null,       // "Thiếu do trả tiền thừa"
    val varianceApprovedBy: String? = null,
)

class CloseShiftUseCase {
    suspend fun execute(shiftId: String, closingCash: Double, notes: String?): Result<Shift> {
        val shift = shiftDao.getById(shiftId)
        val orders = orderDao.getByShiftId(shiftId)
        val payments = paymentDao.getByShiftId(shiftId)

        // Calculate expected cash
        val totalCashReceived = payments
            .filter { it.paymentMethod == PaymentMethod.CASH }
            .sumOf { it.receivedAmount ?: it.amount }

        val totalChangeGiven = payments
            .filter { it.paymentMethod == PaymentMethod.CASH }
            .sumOf { it.changeAmount ?: 0.0 }

        val expectedClosing = shift.openingCash + totalCashReceived - totalChangeGiven
        val variance = closingCash - expectedClosing

        val closedShift = shift.copy(
            status = ShiftStatus.CLOSED,
            endTime = System.currentTimeMillis(),
            closingCash = closingCash,
            expectedClosingCash = expectedClosing,
            cashVariance = variance,
            totalCashSales = totalCashReceived,
            totalBankSales = payments
                .filter { it.paymentMethod != PaymentMethod.CASH }
                .sumOf { it.amount },
            totalOrders = orders.size,
            notes = notes,
            needsReview = abs(variance) > 10000  // Flag nếu chênh lệch > 10k
        )

        shiftDao.update(closedShift)
        return Result.success(closedShift.toDomain())
    }
}
```

---

### 8. Data Storage & Performance

#### Bất cập

| Vấn đề | Mô tả | Impact |
|--------|-------|--------|
| **DB quá lớn** | Tích lũy nhiều năm data | Hết storage, chậm |
| **Query chậm** | Full table scan | UI lag |
| **Memory leak** | Load quá nhiều data vào RAM | App crash |
| **Backup/Restore** | Mất máy = mất data | Data loss |

#### Giải pháp tối ưu

**a) Data Archival Strategy**

```kotlin
// Archive data cũ hơn 90 ngày
class DataArchivalWorker : CoroutineWorker() {
    override suspend fun doWork(): Result {
        val cutoffDate = System.currentTimeMillis() - 90.days.inMilliseconds

        // 1. Đảm bảo data đã sync
        val unsyncedOldOrders = orderDao.getUnsyncedBeforeDate(cutoffDate)
        if (unsyncedOldOrders.isNotEmpty()) {
            // Không archive data chưa sync
            return Result.retry()
        }

        // 2. Export to archive file (optional)
        val ordersToArchive = orderDao.getSyncedBeforeDate(cutoffDate)
        archiveManager.exportToJson(ordersToArchive, "orders_archive_${Date()}.json")

        // 3. Delete archived data
        orderDao.deleteBeforeDate(cutoffDate)
        orderItemDao.deleteOrphanItems()
        paymentDao.deleteOrphanPayments()

        // 4. Vacuum database
        database.query("VACUUM", null)

        return Result.success()
    }
}
```

**b) Proper Indexing**

```kotlin
@Entity(
    tableName = "orders",
    indices = [
        Index("tenantId", "branchId"),          // Multi-tenant query
        Index("shiftId"),                        // Shift summary
        Index("syncStatus"),                     // Sync queue
        Index("status"),                         // Order status filter
        Index("createdAt"),                      // Date range query
        Index("orderNumber"),                    // Search
    ]
)
data class OrderEntity(...)

// Composite index cho common queries
// CREATE INDEX idx_orders_branch_date ON orders(branchId, createdAt)
```

**c) Paging với Room**

```kotlin
// Dùng Paging 3 cho list lớn
@Dao
interface OrderDao {
    @Query("""
        SELECT * FROM orders
        WHERE branchId = :branchId
        ORDER BY createdAt DESC
    """)
    fun getOrdersPagingSource(branchId: String): PagingSource<Int, OrderEntity>
}

// ViewModel
class OrderListViewModel : ViewModel() {
    val orders: Flow<PagingData<Order>> = Pager(
        config = PagingConfig(
            pageSize = 20,
            prefetchDistance = 5,
            enablePlaceholders = false
        ),
        pagingSourceFactory = { orderDao.getOrdersPagingSource(branchId) }
    ).flow
        .map { pagingData ->
            pagingData.map { it.toDomain() }
        }
        .cachedIn(viewModelScope)
}
```

**d) Auto Backup to Cloud/Local**

```kotlin
class BackupManager(
    private val context: Context,
    private val database: AppDatabase
) {
    // Backup daily
    suspend fun createBackup(): BackupResult {
        val dbFile = context.getDatabasePath("ccb_database")
        val backupDir = File(context.filesDir, "backups")
        backupDir.mkdirs()

        // Local backup
        val localBackup = File(backupDir, "backup_${System.currentTimeMillis()}.db")
        dbFile.copyTo(localBackup, overwrite = true)

        // Cleanup old backups (keep last 7)
        val backups = backupDir.listFiles()?.sortedByDescending { it.lastModified() }
        backups?.drop(7)?.forEach { it.delete() }

        // Upload to cloud if online
        if (networkMonitor.isOnline()) {
            try {
                val cloudUrl = cloudStorage.upload(localBackup, "backups/${deviceId}/")
                return BackupResult.Success(localPath = localBackup.path, cloudUrl = cloudUrl)
            } catch (e: Exception) {
                return BackupResult.LocalOnly(localPath = localBackup.path)
            }
        }

        return BackupResult.LocalOnly(localPath = localBackup.path)
    }

    suspend fun restoreFromBackup(backupFile: File): RestoreResult {
        // Close database
        database.close()

        // Replace database file
        val dbFile = context.getDatabasePath("ccb_database")
        backupFile.copyTo(dbFile, overwrite = true)

        // Reopen database
        // ...

        return RestoreResult.Success
    }
}
```

---

### 9. Network Handling

#### Bất cập

| Vấn đề | Mô tả | Impact |
|--------|-------|--------|
| **Intermittent connection** | Mạng chập chờn | Sync fail |
| **Slow network** | 3G yếu | Timeout |
| **False positive offline** | Có mạng nhưng API down | Không sync được |

#### Giải pháp tối ưu

**a) Comprehensive Network Monitor**

```kotlin
class NetworkMonitor(private val context: Context) {
    private val connectivityManager = context.getSystemService<ConnectivityManager>()

    private val _networkState = MutableStateFlow(NetworkState.Unknown)
    val networkState: StateFlow<NetworkState> = _networkState

    init {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                // Network available, but is API reachable?
                viewModelScope.launch {
                    val apiReachable = checkApiReachability()
                    _networkState.value = if (apiReachable) {
                        NetworkState.Online
                    } else {
                        NetworkState.OnlineButApiUnreachable
                    }
                }
            }

            override fun onLost(network: Network) {
                _networkState.value = NetworkState.Offline
            }

            override fun onCapabilitiesChanged(
                network: Network,
                capabilities: NetworkCapabilities
            ) {
                val hasInternet = capabilities.hasCapability(
                    NetworkCapabilities.NET_CAPABILITY_INTERNET
                )
                val isValidated = capabilities.hasCapability(
                    NetworkCapabilities.NET_CAPABILITY_VALIDATED
                )
                // ...
            }
        }

        connectivityManager?.registerDefaultNetworkCallback(callback)
    }

    private suspend fun checkApiReachability(): Boolean {
        return try {
            withTimeout(5000) {
                api.healthCheck()  // GET /health
                true
            }
        } catch (e: Exception) {
            false
        }
    }
}

enum class NetworkState {
    Unknown,
    Offline,
    Online,
    OnlineButApiUnreachable,
    OnlineButSlow
}
```

**b) Retry với Exponential Backoff**

```kotlin
class SyncWorker {
    companion object {
        const val MAX_RETRIES = 5
        val BACKOFF_DELAYS = listOf(1000L, 2000L, 4000L, 8000L, 16000L) // ms
    }

    suspend fun syncWithRetry(item: SyncQueueEntity): SyncResult {
        var lastError: Exception? = null

        repeat(MAX_RETRIES) { attempt ->
            try {
                return performSync(item)
            } catch (e: IOException) {
                lastError = e

                // Wait with exponential backoff
                val delay = BACKOFF_DELAYS.getOrElse(attempt) { 16000L }
                delay(delay)

                // Check if still online
                if (!networkMonitor.isOnline()) {
                    return SyncResult.NetworkError(e)
                }
            } catch (e: HttpException) {
                // Server error - don't retry 4xx
                if (e.code() in 400..499) {
                    return SyncResult.ServerError(e)
                }

                lastError = e
                delay(BACKOFF_DELAYS.getOrElse(attempt) { 16000L })
            }
        }

        return SyncResult.MaxRetriesExceeded(lastError)
    }
}
```

---

### 10. Tổng hợp Best Practices

| Category | Best Practice | Priority |
|----------|---------------|----------|
| **ID Generation** | Device-prefixed UUID, pre-allocated ranges | Critical |
| **Master Data Sync** | Delta sync với timestamp, force sync khi mở ca | High |
| **Transaction Sync** | Idempotency key, batch sync, dependency order | Critical |
| **Pricing** | Snapshot pricing, price validity window | High |
| **Vouchers** | Local validation với conservative limits | High |
| **Conflict** | Version-based optimistic locking | High |
| **Auth** | Long-lived refresh token, periodic revalidation | Medium |
| **Shift** | Auto-close stale shifts, variance tracking | Medium |
| **Storage** | Data archival, proper indexing, paging | Medium |
| **Network** | Comprehensive monitor, exponential backoff | High |
| **Backup** | Daily backup to cloud + local | High |

---

## Xử lý lỗi

### Mất internet (Offline mode)

```
┌─────────────────────────────────────────────────────────────────┐
│ • Mọi tính năng offline vẫn hoạt động                           │
│ • Hiện indicator "Offline mode"                                 │
│ • Queue sync data                                               │
│ • Auto sync khi có mạng trở lại                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Lỗi máy in

```
┌─────────────────────────────────────────────────────────────────┐
│ • Hiển thị thông báo lỗi                                        │
│ • Cho phép bỏ qua (order vẫn hoàn thành)                       │
│ • Queue để in lại sau                                           │
│ • Hỗ trợ in từ thiết bị khác                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Sync failed

```
┌─────────────────────────────────────────────────────────────────┐
│ • Retry với exponential backoff                                 │
│ • Max 5 attempts                                                │
│ • Log error để debug                                            │
│ • Notify admin nếu critical                                     │
└─────────────────────────────────────────────────────────────────┘
```
