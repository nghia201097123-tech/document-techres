# TechRes FNB System

Hệ thống quản lý F&B (Food & Beverage) đa chi nhánh, hỗ trợ offline-first.

## Cấu trúc Repository

```
├── document-techres/    # Documentation website (Docusaurus)
└── web-admin/           # Web Admin dashboard (Next.js)
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

### 2. Web Admin

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
