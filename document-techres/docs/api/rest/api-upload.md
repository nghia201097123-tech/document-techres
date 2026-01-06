---
sidebar_position: 5
---

# API Upload

API Upload là service quản lý **file uploads** - hình ảnh, video, documents với MinIO S3-compatible storage.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Framework** | NestJS |
| **Storage** | MinIO (S3-compatible) |
| **Port** | 3003 |
| **Max File Size** | 10MB (images), 100MB (videos) |
| **Base URL** | `/api/v1` |

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API UPLOAD                                      │
│                               :3003                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                         MODULES                                    │    │
│   ├───────────────────────────────────────────────────────────────────┤    │
│   │                                                                   │    │
│   │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │    │
│   │   │ Upload  │ │  Files  │ │  Short  │ │Presigned│               │    │
│   │   │         │ │         │ │  URLs   │ │  URLs   │               │    │
│   │   └─────────┘ └─────────┘ └─────────┘ └─────────┘               │    │
│   │                                                                   │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                      MinIO Storage                                 │    │
│   │                   (S3-compatible)                                  │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Cấu trúc Project

```
api-upload/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   └── modules/
│       ├── upload/
│       │   ├── upload.module.ts
│       │   ├── upload.controller.ts
│       │   ├── upload.service.ts
│       │   └── dto/
│       │       └── upload.dto.ts
│       ├── files/
│       │   ├── files.module.ts
│       │   ├── files.controller.ts
│       │   └── files.service.ts
│       ├── short-url/
│       │   ├── short-url.module.ts
│       │   ├── short-url.controller.ts
│       │   └── short-url.service.ts
│       └── presigned/
│           ├── presigned.module.ts
│           ├── presigned.controller.ts
│           └── presigned.service.ts
├── package.json
└── .env
```

---

## Upload

### POST /api/v1/upload

Upload file (single).

**Request:** `multipart/form-data`

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `file` | File | ✅ | File cần upload |
| `folder` | string | | Folder trong bucket (default: `general`) |
| `tenantId` | string | | Tenant ID để organize |

**Example (cURL):**
```bash
curl -X POST http://localhost:3003/api/v1/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg" \
  -F "folder=products" \
  -F "tenantId=abcfood"
```

**Response (201):**
```json
{
  "id": "uuid",
  "originalName": "image.jpg",
  "fileName": "1704520800000-a1b2c3d4.jpg",
  "mimeType": "image/jpeg",
  "size": 102400,
  "url": "https://storage.fnbpos.com/uploads/abcfood/products/1704520800000-a1b2c3d4.jpg",
  "shortUrl": "https://s.fnbpos.com/abc123",
  "thumbnailUrl": "https://storage.fnbpos.com/uploads/abcfood/products/1704520800000-a1b2c3d4_thumb.jpg"
}
```

### POST /api/v1/upload/multiple

Upload nhiều files.

**Request:** `multipart/form-data`

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `files` | File[] | ✅ | Nhiều files (max 10) |
| `folder` | string | | Folder trong bucket |
| `tenantId` | string | | Tenant ID |

**Response (201):**
```json
{
  "files": [
    {
      "id": "uuid1",
      "originalName": "image1.jpg",
      "url": "https://..."
    },
    {
      "id": "uuid2",
      "originalName": "image2.jpg",
      "url": "https://..."
    }
  ],
  "totalSize": 204800
}
```

### POST /api/v1/upload/image

Upload và xử lý ảnh (resize, compress).

**Request:** `multipart/form-data`

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `file` | File | ✅ | File ảnh |
| `folder` | string | | Folder |
| `width` | number | | Resize width |
| `height` | number | | Resize height |
| `quality` | number | | Quality 1-100 (default: 80) |
| `generateThumbnail` | boolean | | Tạo thumbnail (default: true) |

**Response (201):**
```json
{
  "id": "uuid",
  "url": "https://storage.fnbpos.com/uploads/products/image.jpg",
  "thumbnailUrl": "https://storage.fnbpos.com/uploads/products/image_thumb.jpg",
  "width": 800,
  "height": 600,
  "size": 51200
}
```

### POST /api/v1/upload/video

Upload video.

**Request:** `multipart/form-data`

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `file` | File | ✅ | File video (max 100MB) |
| `folder` | string | | Folder |
| `generateThumbnail` | boolean | | Tạo thumbnail từ video |

**Response (201):**
```json
{
  "id": "uuid",
  "url": "https://storage.fnbpos.com/uploads/videos/video.mp4",
  "thumbnailUrl": "https://storage.fnbpos.com/uploads/videos/video_thumb.jpg",
  "duration": 120,
  "size": 52428800
}
```

### POST /api/v1/upload/document

Upload document (PDF, Excel, Word).

**Supported formats:**
- PDF (`.pdf`)
- Excel (`.xlsx`, `.xls`)
- Word (`.docx`, `.doc`)
- CSV (`.csv`)

---

## Files Management

### GET /api/v1/files

Danh sách files.

**Query Parameters:**
| Param | Type | Mô tả |
|-------|------|-------|
| `page` | number | Trang |
| `limit` | number | Số items/trang |
| `folder` | string | Filter theo folder |
| `tenantId` | string | Filter theo tenant |
| `mimeType` | string | Filter theo loại file |
| `from` | date | Từ ngày upload |
| `to` | date | Đến ngày upload |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "originalName": "product.jpg",
      "fileName": "1704520800000-a1b2c3d4.jpg",
      "folder": "products",
      "mimeType": "image/jpeg",
      "size": 102400,
      "url": "https://...",
      "shortUrl": "https://s.fnbpos.com/abc123",
      "uploadedAt": "2025-01-06T10:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

### GET /api/v1/files/:id

Chi tiết file.

### DELETE /api/v1/files/:id

Xóa file.

### POST /api/v1/files/bulk-delete

Xóa nhiều files.

**Request:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Short URLs

### POST /api/v1/short-url

Tạo short URL cho file.

**Request:**
```json
{
  "url": "https://storage.fnbpos.com/uploads/products/long-file-name.jpg",
  "customCode": "my-product"
}
```

**Response (201):**
```json
{
  "shortUrl": "https://s.fnbpos.com/my-product",
  "originalUrl": "https://storage.fnbpos.com/uploads/products/long-file-name.jpg",
  "code": "my-product",
  "expiresAt": null
}
```

### GET /api/v1/short-url/:code

Redirect đến URL gốc.

### GET /api/v1/short-url/:code/stats

Thống kê lượt truy cập.

**Response:**
```json
{
  "code": "my-product",
  "hits": 150,
  "lastAccessed": "2025-01-06T10:00:00.000Z"
}
```

---

## Presigned URLs

Cho phép client upload trực tiếp lên MinIO mà không qua API.

### POST /api/v1/presigned/upload

Lấy presigned URL để upload.

**Request:**
```json
{
  "fileName": "product.jpg",
  "contentType": "image/jpeg",
  "folder": "products",
  "tenantId": "abcfood"
}
```

**Response (200):**
```json
{
  "uploadUrl": "https://minio.fnbpos.com/uploads/...",
  "fields": {
    "key": "abcfood/products/uuid.jpg",
    "bucket": "uploads",
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": "...",
    "X-Amz-Date": "20250106T100000Z",
    "Policy": "...",
    "X-Amz-Signature": "..."
  },
  "expiresIn": 3600,
  "fileUrl": "https://storage.fnbpos.com/uploads/abcfood/products/uuid.jpg"
}
```

**Client upload example:**
```javascript
// 1. Get presigned URL
const { uploadUrl, fields, fileUrl } = await api.getPresignedUrl({
  fileName: 'product.jpg',
  contentType: 'image/jpeg'
});

// 2. Upload directly to MinIO
const formData = new FormData();
Object.entries(fields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', file);

await fetch(uploadUrl, {
  method: 'POST',
  body: formData
});

// 3. Use fileUrl in your app
console.log('File uploaded:', fileUrl);
```

### POST /api/v1/presigned/download

Lấy presigned URL để download file private.

**Request:**
```json
{
  "fileKey": "abcfood/documents/report.pdf",
  "expiresIn": 3600
}
```

**Response (200):**
```json
{
  "downloadUrl": "https://minio.fnbpos.com/uploads/...",
  "expiresAt": "2025-01-06T11:00:00.000Z"
}
```

---

## Buckets

Cấu trúc buckets trong MinIO:

| Bucket | Mô tả | Access |
|--------|-------|--------|
| `uploads` | Files upload từ users | Public read |
| `documents` | Documents (PDF, Excel) | Private |
| `backups` | Database backups | Private |

### Folder Structure

```
uploads/
├── {tenantId}/
│   ├── products/
│   │   ├── image1.jpg
│   │   └── image1_thumb.jpg
│   ├── categories/
│   ├── staff/
│   │   └── avatars/
│   └── logos/
├── general/
│   └── ...
```

---

## Image Processing

API Upload tự động xử lý ảnh:

| Feature | Mô tả |
|---------|-------|
| **Auto-resize** | Resize ảnh lớn hơn 2000px |
| **Compression** | Nén ảnh với quality 80% |
| **Thumbnail** | Tạo thumbnail 200x200px |
| **Format conversion** | Convert sang WebP (optional) |
| **EXIF removal** | Xóa metadata EXIF |

```typescript
// Image processing options
interface ImageOptions {
  maxWidth?: number;      // Default: 2000
  maxHeight?: number;     // Default: 2000
  quality?: number;       // Default: 80
  format?: 'jpeg' | 'png' | 'webp';
  thumbnail?: {
    width: number;        // Default: 200
    height: number;       // Default: 200
  };
}
```

---

## File Validation

| Type | Allowed Extensions | Max Size |
|------|-------------------|----------|
| **Images** | jpg, jpeg, png, gif, webp | 10MB |
| **Videos** | mp4, webm, mov | 100MB |
| **Documents** | pdf, doc, docx, xls, xlsx, csv | 20MB |

```typescript
// Validation rules
const fileValidation = {
  images: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  videos: {
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxSize: 100 * 1024 * 1024, // 100MB
  },
  documents: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ],
    maxSize: 20 * 1024 * 1024, // 20MB
  }
};
```

---

## Environment Variables

```bash
# Server
PORT=3003
NODE_ENV=production

# MinIO
MINIO_ENDPOINT=minio.fnbpos.com
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=uploads

# Storage URLs
STORAGE_BASE_URL=https://storage.fnbpos.com
SHORT_URL_BASE=https://s.fnbpos.com

# Limits
MAX_FILE_SIZE=10485760
MAX_VIDEO_SIZE=104857600

# Image Processing
IMAGE_QUALITY=80
THUMBNAIL_WIDTH=200
THUMBNAIL_HEIGHT=200
```

---

## Docker Compose

```yaml
services:
  api-upload:
    build: ./api-upload
    ports:
      - "3003:3003"
    environment:
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
    depends_on:
      - minio

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

volumes:
  minio-data:
```

---

## Error Codes

| Code | HTTP Status | Mô tả |
|------|-------------|-------|
| `FILE_TOO_LARGE` | 413 | File vượt quá kích thước cho phép |
| `INVALID_FILE_TYPE` | 400 | Loại file không được hỗ trợ |
| `UPLOAD_FAILED` | 500 | Upload thất bại |
| `FILE_NOT_FOUND` | 404 | File không tồn tại |
| `STORAGE_ERROR` | 500 | Lỗi MinIO storage |
| `PRESIGNED_EXPIRED` | 400 | Presigned URL đã hết hạn |

---

## Security

- **Authentication:** Tất cả endpoints đều yêu cầu JWT token
- **Virus Scan:** Quét virus trước khi lưu (optional)
- **Rate Limiting:** 100 uploads/phút/user
- **File Validation:** Kiểm tra magic bytes, không chỉ extension
- **Path Traversal:** Ngăn chặn path traversal attacks
