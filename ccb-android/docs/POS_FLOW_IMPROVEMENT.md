# CCB Offline POS - Cai thien Quy trinh theo chuan F&B

## 1. TONG QUAN HIEN TAI vs CHUAN POS F&B

### Quy trinh hien tai:
```
Login -> Initial Sync -> Branch Selection -> Open Shift -> Dashboard -> Sale
```

### Van de:
1. **Sync qua nhieu buoc**: User phai doi sync nhieu lan
2. **Khong co Quick Login**: Doi ca phai nhap lai thong tin
3. **Thieu Kitchen Display System (KDS)**: Khong co man hinh bep
4. **Payment flow chua toi uu**: Chua ho tro split bill, partial payment
5. **Shift transition phuc tap**: Khong co che do chuyen ca nhanh

---

## 2. QUY TRINH DE XUAT (CHUAN POS F&B)

### 2.1 AUTHENTICATION FLOW

#### Hien tai:
```
Splash -> Login (username/password) -> Initial Sync -> Branch Selection
```

#### De xuat:
```
Splash
  |
  +---> [Da dang nhap thiet bi?]
           |
           +---> YES: PIN Screen (chon nhan vien + nhap PIN)
           |           |
           |           +---> Dashboard (neu co ca dang mo)
           |           +---> Open Shift (neu chua co ca)
           |
           +---> NO: Device Login (chi 1 lan)
                     |
                     +---> Background Sync (async)
                     +---> PIN Screen
```

**Loi ich:**
- Nhan vien doi ca chi can nhap PIN (3-5 giay)
- Device Login chi 1 lan khi cai dat
- Sync chay background, khong chan user

### 2.2 SYNC STRATEGY

#### Hien tai: Blocking Sync
```kotlin
// User phai doi cho sync hoan thanh
performFullSync() // 30-60 giay
navigateToDashboard()
```

#### De xuat: Smart Sync Strategy

```kotlin
// Sync Priority Levels
enum class SyncPriority {
    CRITICAL,  // Categories, Products - can thiet de ban hang
    HIGH,      // Tables, Staff - can cho operations
    MEDIUM,    // Coupons, Seasonal Prices - can cho tinh toan
    LOW        // Notes, Settings - khong gap
}

// Background Sync with Progress
class SmartSyncManager {
    fun syncWithPriority(onCriticalReady: () -> Unit) {
        // 1. Sync CRITICAL first (5-10 giay)
        syncCategories()
        syncProducts()
        onCriticalReady() // User co the bat dau ban hang

        // 2. Continue HIGH in background
        viewModelScope.launch {
            syncTables()
            syncStaff()
        }

        // 3. LOW priority khi ranh
        viewModelScope.launch(Dispatchers.IO) {
            delay(5000) // Doi 5 giay
            syncCoupons()
            syncNotes()
        }
    }
}
```

### 2.3 SHIFT MANAGEMENT FLOW

#### Hien tai:
- Mo ca: Nhap so tien dau ca
- Dong ca: Kiem tien + xac nhan

#### De xuat theo chuan F&B:

```
+------------------+
|   SHIFT STATES   |
+------------------+
     |
     v
[OPENING] --> [OPEN] --> [CLOSING] --> [CLOSED]
     |           |            |
     |           |            +-- Confirm summary
     |           |            +-- Print report
     |           |
     |           +-- Normal operations
     |           +-- Can "Transfer" to new staff
     |
     +-- Initial cash count
     +-- Safe verification (optional)

// Chuyen ca khong dong ca
Transfer Shift:
  - Current staff xac nhan
  - New staff nhap PIN
  - Tien duoc giu nguyen
  - Order dang xu ly tiep tuc
```

**Code Implementation:**
```kotlin
// ShiftEntity them trang thai
data class ShiftEntity(
    // ... existing fields
    val status: String, // "opening", "open", "paused", "closing", "closed"
    val transferredFromId: String?, // Ca truoc (neu chuyen)
    val transferredToId: String?,   // Ca sau (neu chuyen)
    val pausedAt: String?,          // Thoi gian tam dung
    val pauseReason: String?        // Ly do tam dung
)

// Chuyen ca
suspend fun transferShift(
    currentShiftId: String,
    newStaffId: String,
    newStaffPin: String
): Result<ShiftEntity>
```

### 2.4 ORDER FLOW (Chuan F&B)

#### Cac loai don hang F&B:

```
ORDER TYPES:
+------------------+------------------+------------------+
|    DINE-IN       |    TAKEAWAY      |    DELIVERY      |
+------------------+------------------+------------------+
| - Chon ban       | - Khong can ban  | - Thong tin KH   |
| - Co the chuyen  | - In tem ngay    | - Dia chi        |
| - Split bill OK  | - Thanh toan ngay| - Phi ship       |
| - Giu ban        |                  | - Doi tac (Food  |
|                  |                  |   App)           |
+------------------+------------------+------------------+
```

#### Order States (FSM):

```
                    [DRAFT]
                       |
          +-----------++-----------+
          |            |            |
          v            v            v
      [SENT]      [CONFIRMED]   [CANCELLED]
          |            |
          v            v
    [PREPARING]   [PRINTED]
          |            |
          v            v
      [READY]     [SERVED]
          |            |
          +-----+------+
                |
                v
          [COMPLETED]
                |
                v
           [SYNCED]
```

**Order States Explanation:**
- `DRAFT`: Dang order, chua gui bep
- `SENT`: Da gui xuong bep (KDS/Printer)
- `CONFIRMED`: Bep xac nhan nhan don
- `PREPARING`: Dang che bien
- `READY`: San sang phuc vu
- `SERVED`: Da mang ra ban
- `COMPLETED`: Da thanh toan
- `CANCELLED`: Da huy (can ly do)

### 2.5 PAYMENT FLOW (Chuan F&B)

#### Hien tai: Single payment

#### De xuat: Multi-payment support

```
PAYMENT OPTIONS:
+------------------+
|   Single Pay     | --> 1 phuong thuc
+------------------+
|   Split Bill     | --> Chia theo mon/nguoi
+------------------+
|   Partial Pay    | --> Tra truoc 1 phan
+------------------+
|   Combined Pay   | --> Nhieu phuong thuc
+------------------+

Example Combined Payment:
  Total: 500,000 VND
  - Cash: 300,000 VND
  - Card: 200,000 VND
  = Paid: 500,000 VND
```

**Implementation:**
```kotlin
data class PaymentEntity(
    val id: String,
    val orderId: String,
    val amount: Double,
    val method: PaymentMethod,
    val status: PaymentStatus, // pending, completed, refunded
    val reference: String?, // Ma giao dich
    val createdAt: String
)

// Mot order co the co nhieu payment
// Order.paymentStatus = "partial" neu chua du
// Order.paymentStatus = "paid" khi sum(payments) >= totalAmount
```

### 2.6 KITCHEN DISPLAY SYSTEM (KDS)

#### Hien tai: Khong co

#### De xuat: Them man hinh bep don gian

```
+----------------------------------------+
|  KITCHEN DISPLAY         [14:30:25]    |
+----------------------------------------+
| PENDING (3)  | PREPARING (2) | DONE(5) |
+----------------------------------------+
|              |               |         |
| [ORDER #45]  | [ORDER #43]   | #42     |
| Ban A-1      | Ban B-2       | #41     |
| 5 phut       | 8 phut        | #40     |
| ------------ | ------------- |         |
| 2x Ca phe    | 1x Pho        |         |
| 1x Banh mi   | 2x Com        |         |
|              |               |         |
| [NHAN DON]   | [HOAN THANH]  |         |
+----------------------------------------+
```

**Features:**
- Hien thi order theo trang thai
- Tinh thoi gian cho
- Canh bao order qua lau (>15 phut)
- Am thanh thong bao order moi
- Touch de cap nhat trang thai

---

## 3. DATA SYNC IMPROVEMENTS

### 3.1 Delta Sync (Incremental)

```kotlin
// Hien tai: Full sync moi lan
// De xuat: Chi sync thay doi

data class SyncMetadata(
    val entityType: String,
    val lastSyncAt: String,
    val lastServerVersion: Long
)

// API call
GET /sync/delta?since={lastSyncAt}&entities=products,categories

// Response chi tra ve thay doi
{
  "serverTimestamp": "2024-01-10T10:00:00Z",
  "changes": {
    "products": {
      "created": [...],
      "updated": [...],
      "deleted": ["id1", "id2"]
    }
  }
}
```

### 3.2 Conflict Resolution

```kotlin
enum class ConflictResolution {
    SERVER_WINS,     // Mac dinh: Du lieu server thang
    CLIENT_WINS,     // Du lieu local thang
    MERGE,           // Gop ca hai
    MANUAL           // Hoi user
}

// Auto-resolve rules:
// - Master data (products, categories): SERVER_WINS
// - Transactions (orders): CLIENT_WINS (du lieu local la truth)
// - Settings: MERGE
```

### 3.3 Offline Queue Management

```kotlin
// Priority Queue cho sync
class SyncQueue {
    // Priority: SHIFT > ORDER > PAYMENT > OTHER
    fun enqueue(item: SyncItem, priority: Int)

    // Process khi co mang
    suspend fun processQueue() {
        // 1. Sync shifts truoc (dependencies)
        // 2. Sync orders (can shiftId)
        // 3. Sync payments (can orderId)
    }
}
```

---

## 4. UX IMPROVEMENTS

### 4.1 Quick Actions (Cashier Optimized)

```
+------------------------------------------+
|  DASHBOARD - QUICK ACTIONS               |
+------------------------------------------+
|                                          |
|  [+ TAO DON MOI]  [SCAN QR]  [TIM DON]  |
|                                          |
+------------------------------------------+
|  DON DANG XU LY                          |
+------------------------------------------+
|  [#45 - Ban A1]  [#46 - Mang di]  ...   |
|   150,000d        85,000d               |
|   [THANH TOAN]    [THANH TOAN]          |
+------------------------------------------+
```

### 4.2 Keyboard Shortcuts (Tablet)

```
Ctrl + N  : Tao don moi
Ctrl + P  : Thanh toan don hien tai
Ctrl + F  : Tim kiem san pham
Ctrl + T  : Chon ban
Esc       : Huy thao tac
Enter     : Xac nhan
```

### 4.3 Sound Notifications

```kotlin
enum class SoundAlert {
    NEW_ORDER,      // Ting! - Order moi tu app
    ORDER_READY,    // Ding dong! - Mon da san sang
    PAYMENT_SUCCESS,// Ka-ching! - Thanh toan thanh cong
    LOW_STOCK,      // Beep! - Het hang
    URGENT_ORDER    // Alarm! - Order qua 15 phut
}
```

---

## 5. IMPLEMENTATION PRIORITY

### Phase 1: Core Improvements (1-2 weeks)
1. [ ] PIN-based staff login (Quick Login)
2. [ ] Background sync (non-blocking)
3. [ ] Order state machine improvements
4. [ ] Payment method expansion

### Phase 2: Enhanced Features (2-3 weeks)
5. [ ] Split bill / Combined payment
6. [ ] Transfer shift (chuyen ca)
7. [ ] Kitchen Display (basic)
8. [ ] Sound notifications

### Phase 3: Advanced (3-4 weeks)
9. [ ] Delta sync implementation
10. [ ] Conflict resolution UI
11. [ ] Reports & Analytics
12. [ ] Multi-printer support

---

## 6. DATABASE SCHEMA CHANGES

### 6.1 New Tables

```sql
-- Payment co the co nhieu record cho 1 order
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    reference TEXT,
    staff_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Kitchen tickets
CREATE TABLE kitchen_tickets (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    station TEXT NOT NULL, -- 'kitchen', 'bar', 'grill'
    status TEXT DEFAULT 'pending',
    items TEXT NOT NULL, -- JSON array of item IDs
    sent_at TEXT,
    acknowledged_at TEXT,
    completed_at TEXT
);
```

### 6.2 Schema Updates

```sql
-- Orders table updates
ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'dine_in';
-- order_type: 'dine_in', 'takeaway', 'delivery'

ALTER TABLE orders ADD COLUMN kitchen_status TEXT DEFAULT 'pending';
-- kitchen_status: 'pending', 'sent', 'preparing', 'ready', 'served'

-- Shifts table updates
ALTER TABLE shifts ADD COLUMN transfer_from_id TEXT;
ALTER TABLE shifts ADD COLUMN transfer_to_id TEXT;
ALTER TABLE shifts ADD COLUMN pause_reason TEXT;
```

---

## 7. API CHANGES REQUIRED

### 7.1 Delta Sync Endpoint
```
GET /api/v1/sync/delta
Query: since, entities[], branchId
Response: {changes, serverTimestamp}
```

### 7.2 Multi-Payment Support
```
POST /api/v1/orders/{orderId}/payments
Body: [{method, amount, reference}]
```

### 7.3 Kitchen Status Updates
```
PUT /api/v1/orders/{orderId}/kitchen-status
Body: {status, station, staffId}
```

---

## 8. TESTING CHECKLIST

### Offline Scenarios:
- [ ] Tao order khi mat mang
- [ ] Thanh toan khi mat mang
- [ ] Dong ca khi mat mang
- [ ] Sync khi co mang lai
- [ ] Conflict resolution

### Performance:
- [ ] Sync 1000+ products < 30s
- [ ] Search products < 100ms
- [ ] Order creation < 500ms
- [ ] Payment processing < 1s

### Edge Cases:
- [ ] Chuyen ca khi co order chua thanh toan
- [ ] Huy order da gui bep
- [ ] Refund partial payment
- [ ] Network drop during sync
