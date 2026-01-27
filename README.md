# TechRes FNB System

Hệ thống quản lý F&B (Food & Beverage) đa chi nhánh, hỗ trợ offline-first.

## APISIX Gateway Architecture

Hệ thống sử dụng APISIX Gateway để điều hướng request đến các microservices.

### Gateway Configuration

**Gateway URL:** `http://172.16.10.118:7080`

Request format:
```
x-svc-id: <port>        # Header chứa port của service đích
Method: 0               # HTTP Method (0=GET, 1=POST, etc.)
Token: Bearer <token>   # Auth token
Request: <url>          # Full request URL
Body: <json>            # Request body
```

### Service Port Mapping

| Service | Port | Description |
|---------|------|-------------|
| web-admin | 1500 | Web Admin Dashboard |
| web-dashboard | 1501 | Web Dashboard (Tenant) |
| api-admin | 1502 | Admin API |
| api-dashboard | 1503 | Dashboard API |
| api-master-data | 1504 | Master Data API |
| api-upload | 1505 | Upload Service |
| api-oauth | 1506 | OAuth Service |
| socket-service | 1507 | Socket/Realtime Service |
| webhook-service | 1508 | Webhook Handler |

### API Call Example

Web Admin gọi API thông qua Gateway:
```typescript
// services/api.ts
const GATEWAY_URL = "http://172.16.10.118:7080";

const apiClient = axios.create({
  baseURL: GATEWAY_URL,
  headers: {
    "x-svc-id": "1502", // api-admin port
  },
});
```

## Cấu trúc Repository

```
├── document-techres/    # Documentation website (Docusaurus)
├── web-admin/           # Web Admin dashboard (Next.js) - Port 1500
├── web-dashboard/       # Web Dashboard (Next.js) - Port 1501
├── api-admin/           # Admin API (NestJS) - Port 1502
├── api-dashboard/       # Dashboard API (NestJS) - Port 1503
├── api-master-data/     # Master Data API (NestJS) - Port 1504
├── api-upload/          # Upload Service (NestJS) - Port 1505
├── api-oauth/           # OAuth Service (NestJS) - Port 1506
├── socket-service/      # Socket Service (NestJS) - Port 1507
├── webhook-service/     # Webhook Service (NestJS) - Port 1508
└── api-gateway/         # Internal Gateway (legacy)
```

## Services

### 1. Document TechRes

Website tài liệu hệ thống, bao gồm:
- Kiến trúc hệ thống
- Database schema
- API documentation
- Hướng dẫn sử dụng

**Khởi chạy:**
```bash
cd document-techres
npm install
npm run start
```

### 2. Web Admin (Port 1500)

Dashboard quản trị hệ thống, bao gồm:
- Quản lý Công ty
- Quản lý Thương hiệu
- Quản lý Chi nhánh
- Quản lý Gói App Food
- Danh mục Thu/Chi
- Phân quyền
- Quản trị viên

**Khởi chạy:**
```bash
cd web-admin
npm install
npm run dev
```

### 3. Web Dashboard (Port 1501)

Dashboard cho tenant, bao gồm:
- Quản lý Menu
- Quản lý Bàn
- Quản lý Nhân viên
- Báo cáo
- Cài đặt

**Khởi chạy:**
```bash
cd web-dashboard
npm install
npm run dev
```

## Mô hình kinh doanh

| Mô hình | Ứng dụng | Mô tả |
|---------|----------|-------|
| Order Only | POS Order | Chỉ gọi món, không tính tiền |
| CCB Only | POS Thu Ngân | Chỉ thu ngân, không quản lý bếp |
| Full System | POS Order + CCB + Dashboard | Đầy đủ tính năng |

## Gói App Food

| Gói | Chi nhánh | Mô tả |
|-----|-----------|-------|
| Basic | 3 | Cơ bản |
| Standard | 10 | Tiêu chuẩn |
| Premium | 30 | Cao cấp |
| Enterprise | Unlimited | Doanh nghiệp |

## Tech Stack

- **Document**: Docusaurus 3.x
- **Web Admin**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- **State Management**: Zustand
- **API Client**: Axios, React Query