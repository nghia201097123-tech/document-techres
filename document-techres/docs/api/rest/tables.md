---
sidebar_position: 4
---

# Tables API

API quản lý khu vực và bàn.

## Areas

### Danh sách khu vực

```http
GET /dashboard/areas
Authorization: Bearer {token}
```

### Tạo khu vực

```http
POST /dashboard/areas
Authorization: Bearer {token}
```

**Request:**
```json
{
  "name": "Tầng 1",
  "sortOrder": 1
}
```

### Cập nhật khu vực

```http
PUT /dashboard/areas/:id
Authorization: Bearer {token}
```

### Xóa khu vực

```http
DELETE /dashboard/areas/:id
Authorization: Bearer {token}
```

## Tables

### Danh sách bàn

```http
GET /dashboard/tables
Authorization: Bearer {token}
```

**Query:**
```
?areaId=xxx
```

### Tạo bàn

```http
POST /dashboard/tables
Authorization: Bearer {token}
```

**Request:**
```json
{
  "areaId": "area-uuid",
  "name": "Bàn 1",
  "capacity": 4,
  "sortOrder": 1
}
```

### Cập nhật bàn

```http
PUT /dashboard/tables/:id
Authorization: Bearer {token}
```

### Xóa bàn

```http
DELETE /dashboard/tables/:id
Authorization: Bearer {token}
```
