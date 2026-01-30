# Review: Food Order Flow - api-app-food vs api-order-worker

## 1. Tổng quan vấn đề

### 1.1 Vấn đề giá món ăn bị 0đ

**Nguyên nhân chính:** Grab Pagination API **KHÔNG trả về giá items**!

- Pagination API chỉ trả về: `itemID`, `name`, `quantity`, `weight`
- **KHÔNG có**: `price`, `fare`, `unitPrice`, `totalPrice`, `modifiers`, `discounts`
- Giá items phải được lấy từ **Detail API** (`/orders/{orderId}`)

### 1.2 Flow đúng

```
1. Worker gọi Pagination API → lấy danh sách orders (KHÔNG có giá items)
2. OrdersService gọi Detail API → lấy chi tiết order + items (CÓ giá)
3. Parse items từ Detail API response
4. Lưu order + items vào database với giá từ Detail API
```

### 1.3 Vấn đề tiềm ẩn

Nếu Detail API response có structure khác với expected, giá sẽ = 0:

- Expected: `item.fare.originalItemPriceDisplay` và `item.fare.priceDisplay`
- Nếu path khác (vd: `item.price`, `item.unitPrice`) → cần thêm fallback

## 2. Trùng lặp Business Logic

### 2.1 Các function bị trùng lặp

| Function | api-app-food | api-order-worker |
|----------|--------------|------------------|
| `parseCurrency()` | `grab.connector.ts:77-80` | `orders.service.ts:703-707` |
| | | `grab-poll.worker.ts:211-215` |
| `transformOrderItems()` | `grab.connector.ts:887-940` | `orders.service.ts:630-697` (`parseDetailItems`) |
| `transformPaginationOrder()` | `grab.connector.ts:542-604` | `grab-poll.worker.ts:147-193` |
| `GRAB_STATUS_MAP` | `grab.connector.ts:33-51` | `grab-poll.worker.ts:16-31` |
| `mapToMerchantStatus()` | - | `orders.service.ts:219-242` |
| `formatPhoneNumber()` | `grab.connector.ts:57-71` | `grab-poll.worker.ts:199-205` |

### 2.2 Vấn đề với trùng lặp

1. **Inconsistency**: Mỗi nơi có thể parse khác nhau
2. **Maintenance nightmare**: Khi Grab API thay đổi, phải update nhiều nơi
3. **Bug propagation**: Fix ở 1 nơi, quên nơi khác

### 2.3 Đề xuất cải thiện

**Option 1: Shared Library**
```
packages/
├── shared-food-connectors/
│   ├── src/
│   │   ├── grab/
│   │   │   ├── parser.ts          # parseCurrency, parsePhone
│   │   │   ├── transformer.ts     # transformOrderItems, transformOrder
│   │   │   ├── status-mapper.ts   # GRAB_STATUS_MAP
│   │   │   └── interfaces.ts      # TypeScript interfaces
│   │   └── index.ts
│   └── package.json
```

**Option 2: Single Service**
- Di chuyển tất cả logic transform/parse vào `api-order-worker`
- `api-app-food` chỉ gọi API và delegate sang worker

## 3. Chi tiết các service

### 3.1 api-app-food

**Vai trò:** Gateway API cho CCB (Client App)

**Responsibilities:**
- Poll orders từ database/cache
- Trigger worker để poll từ platforms
- Xử lý actions: confirm, accept, ready, complete, cancel
- WebSocket gateway để push realtime updates

**KHÔNG nên:**
- Parse/transform orders trực tiếp từ platform API
- Lưu orders/items vào database (trừ update status)

### 3.2 api-order-worker

**Vai trò:** Background worker poll orders từ platforms

**Responsibilities:**
- Poll orders từ GrabFood/ShopeeFood/BeFood APIs
- Gọi Detail API để lấy đầy đủ thông tin (giá, modifiers, discounts)
- Parse và transform orders
- Lưu orders + items vào database (atomic transaction)
- Publish events qua Redis để api-app-food push WebSocket

## 4. Grab API Structure

### 4.1 Pagination API Response

```typescript
// GET /orders-pagination
{
  orders: [
    {
      orderID: "grab-123",
      displayID: "#GR123456",
      state: "ORDER_IN_PREPARE",
      itemInfo: {
        count: 2,
        items: [
          {
            itemID: "item-1",
            name: "Cà phê sữa đá",
            quantity: 2,
            weight: null
            // KHÔNG CÓ GIÁ!
          }
        ]
      },
      orderValue: "120.000",  // Tổng giá trị đơn (string)
      eater: { ID: 123, name: "Khách hàng" },
      driver: { ID: 456, name: "Tài xế", avatar: "..." }
    }
  ],
  orderStats: { ... },
  pollInterval: 60
}
```

### 4.2 Detail API Response

```typescript
// GET /orders/{orderID}
{
  order: {
    orderID: "grab-123",
    displayID: "#GR123456",
    state: "ORDER_IN_PREPARE",
    itemInfo: {
      items: [
        {
          itemID: "item-1",
          name: "Cà phê sữa đá",
          quantity: 2,
          fare: {
            originalItemPriceDisplay: "25.000",  // Giá đơn vị
            priceDisplay: "55.000"               // Tổng (bao gồm options)
          },
          modifierGroups: [
            {
              modifierGroupID: "grp-1",
              modifierGroupName: "Size",
              modifiers: [
                {
                  modifierID: "mod-1",
                  modifierName: "Size L",
                  priceDisplay: "5.000"
                }
              ]
            }
          ],
          discountInfo: [
            {
              discountName: "Voucher",
              itemDiscountPriceDisplay: "2.500"
            }
          ],
          comment: "Ít đá, nhiều đường"
        }
      ]
    },
    fare: {
      subTotalDisplay: "55.000",
      deliveryFeeDisplay: "15.000",
      passengerTotalDisplay: "70.000"
    },
    eater: {
      ID: 123,
      name: "Nguyễn Văn A",
      mobileNumber: "+84 936 254 257",
      address: "123 Đường ABC, Quận 1"
    }
  }
}
```

## 5. Fixes đã thực hiện

### 5.1 `api-order-worker/src/modules/orders/orders.service.ts`

1. **`parseDetailItems()`**: Thêm fallback paths cho price parsing
   ```typescript
   const unitPrice = this.parseCurrency(
     item.fare?.originalItemPriceDisplay ||
     item.fare?.originalPrice ||
     item.originalItemPriceDisplay ||
     item.unitPrice ||
     item.price,
   );
   ```

2. **`saveItemsInTransaction()`**: Xử lý edge cases với `typeof` check
   ```typescript
   const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
   ```

3. **Validation**: Không skip order khi prices = 0, log warning để debug
   ```typescript
   // KHÔNG skip - vẫn lưu để không mất order, nhưng log warning
   this.logger.warn(`⚠️ SAVING ORDER ANYWAY with 0 prices - check Detail API!`);
   ```

### 5.2 `api-order-worker/src/workers/grab-poll.worker.ts`

1. **Interface**: Cập nhật `GrabPaginationOrder` với comment rõ ràng
   ```typescript
   // LƯU Ý: KHÔNG có trường price trong pagination response!
   ```

2. **Transform**: Không cố parse price từ pagination (vì không có)
   ```typescript
   items: (grabOrder.itemInfo?.items || []).map((item) => ({
     itemID: item.itemID,
     productName: item.name,
     quantity: item.quantity,
     // KHÔNG set unitPrice/totalPrice - sẽ lấy từ Detail API
   })),
   ```

## 6. Debug Tips

### 6.1 Khi giá vẫn bị 0đ

1. Check logs của `api-order-worker`:
   ```
   [parseDetailItems] ⚠️ Item "xxx" has 0 price!
   [parseDetailItems] Item fare structure: {...}
   ```

2. Kiểm tra Detail API response structure:
   - Có `order` wrapper không?
   - Items nằm ở `itemInfo.items` hay `items`?
   - Giá nằm ở `fare.originalItemPriceDisplay` hay path khác?

### 6.2 Test với sample data

```bash
# Gọi Grab Detail API trực tiếp để xem structure
curl -X GET "https://api.grab.com/food/merchant/v3/orders/{orderId}" \
  -H "Authorization: {accessToken}"
```

## 7. Action Items

- [ ] Tạo shared library cho common functions
- [ ] Thêm integration tests cho order flow
- [ ] Document Grab API response structure chi tiết hơn
- [ ] Monitor logs để detect khi prices = 0
