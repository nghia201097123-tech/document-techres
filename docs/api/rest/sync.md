---
sidebar_position: 7
---

# Sync API

API đồng bộ dữ liệu giữa CCB và Cloud Server.

## Pull Master Data

Lấy dữ liệu master từ server về CCB.

```http
GET /pos/sync/master-data
Authorization: Bearer {token}
```

**Query:**
```
?since=2024-01-15T00:00:00Z
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [...],
    "products": [...],
    "areas": [...],
    "tables": [...],
    "staff": [...],
    "settings": {...},
    "syncedAt": "2024-01-15T10:00:00Z"
  }
}
```

## Push Orders

Đẩy đơn hàng từ CCB lên server.

```http
POST /pos/sync/orders
Authorization: Bearer {token}
```

**Request:**
```json
{
  "orders": [
    {
      "id": "order-uuid",
      "orderNumber": 45,
      "tableId": "table-uuid",
      "status": "completed",
      "items": [...],
      "totalAmount": 150000,
      "paymentMethod": "cash",
      "createdAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:45:00Z",
      "version": 3
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      { "id": "order-uuid", "success": true },
      { "id": "order-uuid-2", "success": false, "error": "CONFLICT", "serverData": {...} }
    ]
  }
}
```

## Push Shifts

Đẩy thông tin ca làm việc.

```http
POST /pos/sync/shifts
Authorization: Bearer {token}
```

**Request:**
```json
{
  "shifts": [
    {
      "id": "shift-uuid",
      "staffId": "staff-uuid",
      "startTime": "2024-01-15T08:00:00Z",
      "endTime": "2024-01-15T16:00:00Z",
      "openingCash": 1000000,
      "closingCash": 5500000,
      "totalSales": 4500000,
      "totalOrders": 45,
      "status": "closed"
    }
  ]
}
```

## Push Activity Logs

Đẩy logs hoạt động.

```http
POST /pos/sync/logs
Authorization: Bearer {token}
```

**Request:**
```json
{
  "logs": [
    {
      "id": 1,
      "userId": "staff-uuid",
      "action": "order_created",
      "entityType": "order",
      "entityId": "order-uuid",
      "details": {...},
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Check Sync Status

Kiểm tra có dữ liệu mới trên server không.

```http
GET /pos/sync/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasUpdates": true,
    "lastUpdate": "2024-01-15T10:00:00Z",
    "types": ["menu", "staff"]
  }
}
```
