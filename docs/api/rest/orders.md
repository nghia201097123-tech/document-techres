---
sidebar_position: 5
---

# Orders API

API quản lý đơn hàng.

## Danh sách đơn hàng

```http
GET /dashboard/orders
Authorization: Bearer {token}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Số trang (default: 1) |
| limit | integer | No | Số items/trang (default: 20) |
| status | string | No | Lọc theo status |
| from | string | No | Từ ngày (ISO 8601) |
| to | string | No | Đến ngày (ISO 8601) |
| tableId | string | No | Lọc theo bàn |

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": 45,
        "tableId": "table-uuid",
        "tableName": "Bàn 5",
        "status": "completed",
        "subtotal": 150000,
        "discountAmount": 15000,
        "totalAmount": 135000,
        "paymentMethod": "cash",
        "paymentStatus": "paid",
        "createdBy": "staff-uuid",
        "createdAt": "2024-01-15T10:30:00Z",
        "completedAt": "2024-01-15T10:45:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

## Chi tiết đơn hàng

```http
GET /dashboard/orders/:id
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "orderNumber": 45,
    "tableId": "table-uuid",
    "tableName": "Bàn 5",
    "status": "completed",
    "items": [
      {
        "id": "item-uuid",
        "productId": "product-uuid",
        "productName": "Cà phê sữa",
        "productPrice": 29000,
        "quantity": 2,
        "note": "Ít đường",
        "status": "served",
        "subtotal": 58000
      }
    ],
    "subtotal": 150000,
    "discountAmount": 15000,
    "discountType": "percent",
    "taxAmount": 0,
    "totalAmount": 135000,
    "paymentMethod": "cash",
    "paymentStatus": "paid",
    "note": "Khách VIP",
    "customer": {
      "id": "customer-uuid",
      "name": "Nguyễn Văn A",
      "phone": "0901234567"
    },
    "createdBy": {
      "id": "staff-uuid",
      "name": "Nhân viên A"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:45:00Z"
  }
}
```

## Tạo đơn hàng (từ POS Sync)

```http
POST /pos/orders
Authorization: Bearer {token}
```

**Request:**
```json
{
  "id": "order-uuid",
  "orderNumber": 46,
  "tableId": "table-uuid",
  "items": [
    {
      "id": "item-uuid",
      "productId": "product-uuid",
      "productName": "Trà đào",
      "productPrice": 35000,
      "quantity": 1,
      "note": ""
    }
  ],
  "subtotal": 35000,
  "totalAmount": 35000,
  "createdBy": "staff-uuid",
  "createdAt": "2024-01-15T11:00:00Z"
}
```

## Cập nhật đơn hàng

```http
PUT /pos/orders/:id
Authorization: Bearer {token}
```

**Request:**
```json
{
  "status": "completed",
  "paymentMethod": "cash",
  "paymentStatus": "paid",
  "completedAt": "2024-01-15T11:15:00Z",
  "version": 2
}
```

## Báo cáo doanh thu

```http
GET /dashboard/orders/revenue
Authorization: Bearer {token}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| from | string | Yes | Từ ngày |
| to | string | Yes | Đến ngày |
| groupBy | string | No | day, week, month |

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOrders": 150,
      "totalRevenue": 15000000,
      "totalDiscount": 500000,
      "averageOrderValue": 100000,
      "byPaymentMethod": {
        "cash": 8000000,
        "transfer": 5000000,
        "card": 2000000
      }
    },
    "byDate": [
      {
        "date": "2024-01-15",
        "orders": 45,
        "revenue": 5250000
      }
    ]
  }
}
```

## Top sản phẩm

```http
GET /dashboard/orders/top-products
Authorization: Bearer {token}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| from | string | Yes | Từ ngày |
| to | string | Yes | Đến ngày |
| limit | integer | No | Số lượng (default: 10) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "productId": "product-uuid",
      "productName": "Cà phê sữa",
      "quantity": 520,
      "revenue": 15080000
    }
  ]
}
```
