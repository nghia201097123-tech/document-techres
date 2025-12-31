---
sidebar_position: 6
---

# Staff API

API quản lý nhân viên.

## Danh sách nhân viên

```http
GET /dashboard/staff
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "staff-uuid",
      "name": "Nguyễn Văn A",
      "phone": "0901234567",
      "role": "cashier",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Tạo nhân viên

```http
POST /dashboard/staff
Authorization: Bearer {token}
```

**Request:**
```json
{
  "name": "Trần Văn B",
  "phone": "0909876543",
  "pinCode": "1234",
  "role": "staff"
}
```

## Cập nhật nhân viên

```http
PUT /dashboard/staff/:id
Authorization: Bearer {token}
```

## Đổi PIN code

```http
PATCH /dashboard/staff/:id/pin
Authorization: Bearer {token}
```

**Request:**
```json
{
  "pinCode": "5678"
}
```

## Khóa/Mở khóa nhân viên

```http
PATCH /dashboard/staff/:id/status
Authorization: Bearer {token}
```

**Request:**
```json
{
  "isActive": false
}
```

## Xóa nhân viên

```http
DELETE /dashboard/staff/:id
Authorization: Bearer {token}
```
