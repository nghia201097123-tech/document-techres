---
sidebar_position: 2
---

# Endpoints

Danh sách các API endpoints.

## Users

### Lấy danh sách users

```http
GET /users
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Số trang (default: 1) |
| limit | integer | No | Số items mỗi trang (default: 10) |
| search | string | No | Tìm kiếm theo tên |

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "name": "Nguyễn Văn A",
        "email": "a@example.com",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100
    }
  }
}
```

### Lấy thông tin user

```http
GET /users/:id
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | ID của user |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "a@example.com",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Tạo user mới

```http
POST /users
```

**Request Body:**

```json
{
  "name": "Nguyễn Văn B",
  "email": "b@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Nguyễn Văn B",
    "email": "b@example.com",
    "createdAt": "2024-01-02T00:00:00Z"
  },
  "message": "User created successfully"
}
```

### Cập nhật user

```http
PUT /users/:id
```

### Xóa user

```http
DELETE /users/:id
```

## Products

### Lấy danh sách products

```http
GET /products
```

### Tạo product

```http
POST /products
```

### Cập nhật product

```http
PUT /products/:id
```

### Xóa product

```http
DELETE /products/:id
```
