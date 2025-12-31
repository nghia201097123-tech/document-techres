---
sidebar_position: 3
---

# Menu API

API quản lý menu (danh mục và sản phẩm).

## Categories

### Danh sách danh mục

```http
GET /dashboard/categories
Authorization: Bearer {token}
```

### Tạo danh mục

```http
POST /dashboard/categories
Authorization: Bearer {token}
```

**Request:**
```json
{
  "name": "Cà phê",
  "imageUrl": "https://...",
  "sortOrder": 1
}
```

### Cập nhật danh mục

```http
PUT /dashboard/categories/:id
Authorization: Bearer {token}
```

### Xóa danh mục

```http
DELETE /dashboard/categories/:id
Authorization: Bearer {token}
```

## Products

### Danh sách sản phẩm

```http
GET /dashboard/products
Authorization: Bearer {token}
```

**Query:**
```
?categoryId=xxx&search=cafe&isAvailable=true
```

### Tạo sản phẩm

```http
POST /dashboard/products
Authorization: Bearer {token}
```

**Request:**
```json
{
  "categoryId": "cat-uuid",
  "name": "Cà phê sữa",
  "price": 29000,
  "description": "Cà phê pha phin truyền thống",
  "imageUrl": "https://...",
  "isAvailable": true,
  "sortOrder": 1
}
```

### Cập nhật sản phẩm

```http
PUT /dashboard/products/:id
Authorization: Bearer {token}
```

### Đánh dấu hết hàng

```http
PATCH /dashboard/products/:id/availability
Authorization: Bearer {token}
```

**Request:**
```json
{
  "isAvailable": false
}
```

### Xóa sản phẩm

```http
DELETE /dashboard/products/:id
Authorization: Bearer {token}
```
