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
