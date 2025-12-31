---
sidebar_position: 2
---

# Stores API

API quản lý quán (chỉ dành cho Web Admin).

## Danh sách quán

```http
GET /admin/stores
Authorization: Bearer {admin-token}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Số trang |
| limit | integer | Số items/trang |
| search | string | Tìm theo tên |
| plan | string | Lọc theo gói |
| status | string | active, inactive |

**Response:**
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "id": "store-uuid",
        "name": "Café ABC",
        "slug": "cafe-abc",
        "address": "123 Đường ABC",
        "phone": "0901234567",
        "email": "owner@cafe-abc.com",
        "plan": "pro",
        "planExpiresAt": "2024-12-31T23:59:59Z",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156
    }
  }
}
```

## Tạo quán mới

```http
POST /admin/stores
Authorization: Bearer {admin-token}
```

**Request:**
```json
{
  "name": "Nhà hàng XYZ",
  "address": "456 Đường XYZ",
  "phone": "0909876543",
  "ownerEmail": "owner@xyz.com",
  "ownerName": "Nguyễn Văn A",
  "plan": "pro"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "store": {
      "id": "new-store-uuid",
      "name": "Nhà hàng XYZ",
      "slug": "nha-hang-xyz"
    },
    "owner": {
      "id": "owner-uuid",
      "email": "owner@xyz.com",
      "temporaryPassword": "Abc123!@#"
    }
  },
  "message": "Đã tạo quán và gửi email cho owner"
}
```

## Chi tiết quán

```http
GET /admin/stores/:id
Authorization: Bearer {admin-token}
```

## Cập nhật quán

```http
PUT /admin/stores/:id
Authorization: Bearer {admin-token}
```

## Khóa/Mở khóa quán

```http
POST /admin/stores/:id/suspend
POST /admin/stores/:id/activate
Authorization: Bearer {admin-token}
```
