---
sidebar_position: 2
---

# API Gateway

API Gateway là **entry point** cho tất cả requests từ các ứng dụng web (Web Admin, Web Dashboard).

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Framework** | NestJS |
| **Port** | 3000 |
| **Vai trò** | Proxy, Routing, Health Check |
| **Database** | **KHÔNG có** - chỉ làm proxy |

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│                               :3000                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│   │  Web Admin      │     │  Web Dashboard  │     │  Mobile Apps    │      │
│   │  (Next.js)      │     │  (Next.js)      │     │  (React Native) │      │
│   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘      │
│            │                       │                       │                │
│            └───────────────────────┼───────────────────────┘                │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                        PROXY ROUTER                              │      │
│   ├─────────────────────────────────────────────────────────────────┤      │
│   │                                                                 │      │
│   │   /api/admin/*     ────────────────────▶  API Admin  :3001     │      │
│   │   /api/dashboard/* ────────────────────▶  API Dashboard :3002  │      │
│   │   /api/upload/*    ────────────────────▶  API Upload :3003     │      │
│   │   /api/master/*    ────────────────────▶  API Master :3004     │      │
│   │                                                                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │  Middleware: CORS | Rate Limiting | Request Logging             │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Chức năng chính

### 1. Proxy Routing

Chuyển tiếp requests đến các backend services tương ứng.

| Route Pattern | Target Service | Port |
|---------------|----------------|------|
| `/api/admin/*` | API Admin | 3001 |
| `/api/dashboard/*` | API Dashboard | 3002 |
| `/api/upload/*` | API Upload | 3003 |
| `/api/master/*` | API Master Data | 3004 |

### 2. Health Check

Kiểm tra trạng thái của tất cả services.

```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-06T10:00:00.000Z",
  "services": {
    "api-admin": { "status": "healthy", "responseTime": 50 },
    "api-dashboard": { "status": "healthy", "responseTime": 45 },
    "api-upload": { "status": "healthy", "responseTime": 30 },
    "api-master": { "status": "healthy", "responseTime": 40 }
  }
}
```

### 3. CORS Handling

Cấu hình CORS cho cross-origin requests:

```typescript
// Allowed origins
const allowedOrigins = [
  'https://admin.fnbpos.com',
  'https://dashboard.fnbpos.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

// CORS config
{
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}
```

### 4. Rate Limiting

Giới hạn số requests để bảo vệ backend services:

| Tier | Limit | Window |
|------|-------|--------|
| Default | 100 req | 1 phút |
| Authenticated | 1000 req | 1 phút |
| Admin | 5000 req | 1 phút |

### 5. Request Logging

Log tất cả requests để monitoring:

```json
{
  "timestamp": "2025-01-06T10:00:00.000Z",
  "method": "GET",
  "path": "/api/dashboard/products",
  "statusCode": 200,
  "responseTime": 150,
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100",
  "userId": "uuid",
  "tenantId": "abcfood"
}
```

## API Endpoints

### Health

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Health check tổng hợp |
| GET | `/health/live` | Liveness probe (for K8s) |
| GET | `/health/ready` | Readiness probe (for K8s) |

### Metrics (Optional)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/metrics` | Prometheus metrics |

## Cấu trúc Project

```
api-gateway/
├── src/
│   ├── main.ts                    # Entry point
│   ├── app.module.ts              # Root module
│   ├── proxy/
│   │   ├── proxy.module.ts
│   │   ├── proxy.controller.ts    # Route handling
│   │   └── proxy.service.ts       # Proxy logic
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   └── health.service.ts
│   └── common/
│       ├── middleware/
│       │   ├── cors.middleware.ts
│       │   ├── rate-limit.middleware.ts
│       │   └── logging.middleware.ts
│       └── filters/
│           └── http-exception.filter.ts
├── package.json
└── .env
```

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Backend Services
API_ADMIN_URL=http://localhost:3001
API_DASHBOARD_URL=http://localhost:3002
API_UPLOAD_URL=http://localhost:3003
API_MASTER_URL=http://localhost:3004

# CORS
CORS_ORIGINS=https://admin.fnbpos.com,https://dashboard.fnbpos.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

## Proxy Configuration

```typescript
// proxy.service.ts
@Injectable()
export class ProxyService {
  private readonly routes: Map<string, string> = new Map([
    ['/api/admin', process.env.API_ADMIN_URL],
    ['/api/dashboard', process.env.API_DASHBOARD_URL],
    ['/api/upload', process.env.API_UPLOAD_URL],
    ['/api/master', process.env.API_MASTER_URL],
  ]);

  async proxy(req: Request, res: Response) {
    const targetUrl = this.getTargetUrl(req.path);

    // Forward request
    const response = await this.httpService.request({
      method: req.method,
      url: targetUrl + req.path.replace(/^\/api\/\w+/, ''),
      headers: this.forwardHeaders(req),
      data: req.body,
    });

    // Forward response
    res.status(response.status).json(response.data);
  }
}
```

## Error Handling

Gateway xử lý lỗi từ backend services:

```json
// Service unavailable
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Backend service is not available",
    "service": "api-dashboard"
  }
}

// Timeout
{
  "success": false,
  "error": {
    "code": "GATEWAY_TIMEOUT",
    "message": "Request timed out",
    "timeout": 30000
  }
}
```

## Docker Compose

```yaml
services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - API_ADMIN_URL=http://api-admin:3001
      - API_DASHBOARD_URL=http://api-dashboard:3002
      - API_UPLOAD_URL=http://api-upload:3003
      - API_MASTER_URL=http://api-master:3004
    depends_on:
      - api-admin
      - api-dashboard
      - api-upload
      - api-master
```

## Lưu ý

- **Không có database** - Gateway chỉ làm nhiệm vụ routing
- **Stateless** - Không lưu trạng thái, có thể scale horizontal
- **Single entry point** - Tất cả requests từ frontend đều qua Gateway
- **Circuit breaker** - Tự động ngắt kết nối đến service lỗi
