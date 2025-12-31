---
sidebar_position: 1
---

# Tổng quan API

Tổng quan về các API của TechRes.

## Base URL

Tất cả các API request sử dụng base URL:

```
https://api.techres.example.com/v1
```

## Authentication

API sử dụng Bearer Token để xác thực:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.techres.example.com/v1/users
```

Xem chi tiết tại [Authentication](/docs/api/authentication).

## Response Format

Tất cả responses đều trả về JSON:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success"
}
```

### Error Response

Khi có lỗi:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request không hợp lệ"
  }
}
```

## HTTP Status Codes

| Status Code | Mô tả |
|-------------|-------|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 400 | Request không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không có quyền |
| 404 | Không tìm thấy |
| 500 | Lỗi server |

## Rate Limiting

API có giới hạn số request:

- **Free tier**: 100 requests/phút
- **Pro tier**: 1000 requests/phút
- **Enterprise**: Không giới hạn

## Tiếp theo

- [Endpoints](/docs/api/endpoints) - Danh sách các endpoints
- [Authentication](/docs/api/authentication) - Chi tiết về xác thực
