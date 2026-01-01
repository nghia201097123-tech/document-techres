---
sidebar_position: 1
---

# Local API Endpoints

REST Endpoints được CCB cung cấp cho Order App trong mạng LAN.

## Base URL

```
http://{CCB_IP}:8080/api
```

## Endpoints

### State

#### Lấy full state

```http
GET /api/state
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tables": [...],
    "menu": {
      "categories": [...],
      "products": [...]
    },
    "version": {
      "tables": 15,
      "menu": 8
    }
  }
}
```

### Tables

#### Danh sách bàn

```http
GET /api/tables
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "table-uuid",
      "areaId": "area-uuid",
      "areaName": "Tầng 1",
      "name": "Bàn 5",
      "capacity": 4,
      "status": "occupied",
      "currentOrderId": "order-uuid"
    }
  ]
}
```

### Menu

#### Menu đầy đủ

```http
GET /api/menu
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat-uuid",
        "name": "Cà phê",
        "sortOrder": 1
      }
    ],
    "products": [
      {
        "id": "prod-uuid",
        "categoryId": "cat-uuid",
        "name": "Cà phê sữa",
        "price": 29000,
        "isAvailable": true
      }
    ]
  }
}
```

### Orders

#### Tất cả order đang mở

```http
GET /api/orders
```

**Query:**
```
?status=pending,processing
```

#### Order của bàn cụ thể

```http
GET /api/orders?tableId={tableId}
```

#### Chi tiết order

```http
GET /api/orders/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "orderNumber": 45,
    "tableId": "table-uuid",
    "status": "processing",
    "items": [
      {
        "id": "item-uuid",
        "productId": "prod-uuid",
        "productName": "Cà phê sữa",
        "productPrice": 29000,
        "quantity": 2,
        "note": "Ít đường",
        "status": "preparing"
      }
    ],
    "subtotal": 58000,
    "totalAmount": 58000,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Tạo order mới

```http
POST /api/orders
```

**Request:**
```json
{
  "tableId": "table-uuid",
  "items": [
    {
      "productId": "prod-uuid",
      "quantity": 2,
      "note": "Ít đường"
    }
  ],
  "note": "Khách yêu cầu nhanh"
}
```

#### Thêm món vào order

```http
POST /api/orders/:id/items
```

**Request:**
```json
{
  "productId": "prod-uuid",
  "quantity": 1,
  "note": ""
}
```

#### Sửa món

```http
PUT /api/orders/:id/items/:itemId
```

**Request:**
```json
{
  "quantity": 3,
  "note": "Thêm đá"
}
```

#### Xóa món

```http
DELETE /api/orders/:id/items/:itemId
```

#### In tem bếp

```http
POST /api/orders/:id/print-kitchen
```

**Request:**
```json
{
  "itemIds": ["item-uuid-1", "item-uuid-2"]
}
```

#### Yêu cầu thanh toán

```http
POST /api/orders/:id/request-payment
```

#### Chuyển bàn

```http
POST /api/orders/:id/transfer
```

**Request:**
```json
{
  "toTableId": "new-table-uuid"
}
```

#### Gộp bàn

```http
POST /api/orders/merge
```

**Request:**
```json
{
  "fromOrderId": "order-uuid-1",
  "toOrderId": "order-uuid-2"
}
```

### Print Jobs

#### Lấy jobs chờ in

```http
GET /api/print-jobs?status=pending&printer=kitchen_1
```

#### Bắt đầu in

```http
POST /api/print-jobs/:id/start
```

#### Hoàn thành in

```http
POST /api/print-jobs/:id/complete
```

#### Báo lỗi in

```http
POST /api/print-jobs/:id/fail
```

**Request:**
```json
{
  "error": "Hết giấy"
}
```

## Error Codes

| Code | Mô tả |
|------|-------|
| `TABLE_NOT_FOUND` | Không tìm thấy bàn |
| `ORDER_NOT_FOUND` | Không tìm thấy đơn |
| `PRODUCT_NOT_AVAILABLE` | Sản phẩm hết hàng |
| `ITEM_ALREADY_PREPARING` | Món đang được làm, không thể xóa |
| `TABLE_OCCUPIED` | Bàn đang có khách |
| `PRINT_JOB_LOCKED` | Job đang được in bởi thiết bị khác |
