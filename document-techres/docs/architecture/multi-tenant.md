---
sidebar_position: 5
---

# Multi-Tenant Architecture

Hệ thống FNB POS được thiết kế theo mô hình **SaaS Multi-Tenant** với cơ chế phân tách dữ liệu chặt chẽ giữa các khách hàng (tenant).

## Tổng quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SAAS PLATFORM                                │
│                    (Single Database Instance)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐             │
│   │  TENANT A   │   │  TENANT B   │   │  TENANT C   │   ...       │
│   │  (Công ty A)│   │  (Công ty B)│   │  (Công ty C)│             │
│   │             │   │             │   │             │             │
│   │ tenant_id:  │   │ tenant_id:  │   │ tenant_id:  │             │
│   │ [mã cty A]  │   │ [mã cty B]  │   │ [mã cty C]  │             │
│   └─────────────┘   └─────────────┘   └─────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Đặc điểm chính

| Đặc điểm | Mô tả |
|----------|-------|
| **Shared Database** | Tất cả tenant dùng chung 1 database, phân biệt bằng `tenant_id` |
| **Shared Application** | Cùng codebase, cùng infrastructure cho tất cả tenant |
| **Data Isolation** | Dữ liệu được cô lập hoàn toàn theo tenant |
| **Scalable** | Dễ mở rộng khi thêm tenant mới |
| **Cost Effective** | Chi phí thấp hơn so với mô hình dedicated |

## Cấu trúc phân cấp

```
TENANT (tenant_id) ← Cấp cao nhất, đại diện cho 1 khách hàng SaaS
    │
    └── CÔNG TY (Company)
            │
            ├── THƯƠNG HIỆU 1 (Brand)
            │       ├── Chi nhánh A (Branch)
            │       ├── Chi nhánh B
            │       └── Chi nhánh C
            │
            └── THƯƠNG HIỆU 2 (Brand)
                    ├── Chi nhánh D
                    └── Chi nhánh E
```

### Quy tắc quan trọng

- **Tenant = Company**: Mỗi tenant là 1 công ty (quan hệ 1:1)
- **tenant_id = company.code**: Mã công ty là định danh tenant
- **Mọi dữ liệu có tenant_id**: Để phân biệt và filter dữ liệu

## Cơ chế Tenant ID

### Nguyên tắc cốt lõi

| Nguyên tắc | Mô tả |
|------------|-------|
| **Tenant = Company** | Mỗi tenant là 1 công ty, `tenant_id` = `company.code` |
| **Data Isolation** | Mọi query đều có điều kiện `WHERE tenant_id = ?` |
| **Row-Level Security** | PostgreSQL RLS đảm bảo không truy cập chéo tenant |
| **Tenant Context** | Mọi request đều phải xác định tenant từ đầu |

### Cách xác định Tenant

| Nguồn | Cách lấy tenant_id | Mô tả |
|-------|-------------------|-------|
| **Web Dashboard Login** | Input từ user | Nhập mã công ty ở màn hình login |
| **API Request** | Header `X-Tenant-ID` | `X-Tenant-ID: [mã công ty]` |
| **POS/Order App** | Lưu local sau khi login | Stored trong SQLite |
| **Subdomain** (tùy chọn) | Parse từ URL | `[tenant].pos.vn` → `[tenant]` |

## Tenant trong Database

### Bảng có tenant_id (Data riêng mỗi tenant)

- `brands` - Thương hiệu
- `branches` - Chi nhánh
- `departments` - Bộ phận
- `staff` - Nhân viên
- `categories` - Danh mục món
- `products` - Sản phẩm/Món ăn
- `product_toppings` - Topping
- `combo_items` - Combo
- `units` - Đơn vị
- `product_notes` - Ghi chú món
- `cancel_reasons` - Lý do hủy
- `coupons` - Mã giảm giá
- `areas` - Khu vực
- `tables` - Bàn
- `kitchen_stations` - Bếp
- `orders` - Đơn hàng
- `order_items` - Chi tiết đơn
- `shifts` - Ca làm việc
- `customers` - Khách hàng
- `transactions` - Thu/Chi
- `e_invoices` - Hóa đơn điện tử
- `daily_summaries` - Báo cáo ngày

### Bảng không có tenant_id (Data dùng chung)

- `companies` - Chính là bảng tenant
- `permission_groups` - Nhóm quyền (hệ thống)
- `permissions` - Quyền (hệ thống)
- `packages` - Gói dịch vụ
- `e_invoice_providers` - Đối tác HĐĐT
- `food_delivery_partners` - Grab, Be, Shopee (chung)
- `transaction_categories` - Hạng mục thu/chi hệ thống

### Schema mẫu

```sql
-- Công ty (đồng thời là Tenant)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,      -- Tenant ID (dùng để login)
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,                         -- Logo công ty
    tax_code VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    representative VARCHAR(255),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP,
    max_branches INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thương hiệu (thuộc Tenant/Công ty)
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES companies(code) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    logo_url TEXT,                         -- Logo thương hiệu
    description TEXT,
    business_model VARCHAR(50) DEFAULT 'full_system',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bật RLS cho brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_brands ON brands
    USING (tenant_id = current_setting('app.current_tenant'));

-- Chi nhánh (thuộc Thương hiệu)
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES companies(code) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    logo_url TEXT,                         -- Logo chi nhánh
    address TEXT,
    phone VARCHAR(20),
    business_model VARCHAR(50) DEFAULT 'ccb_only',
    max_connections INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_branches ON branches
    USING (tenant_id = current_setting('app.current_tenant'));

-- Nhân viên (thuộc Chi nhánh)
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES companies(code) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    brand_id UUID REFERENCES brands(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,                       -- Logo/Ảnh nhân viên
    username VARCHAR(50),
    password_hash VARCHAR(255),
    pin_code VARCHAR(10),
    role VARCHAR(50) DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_staff ON staff
    USING (tenant_id = current_setting('app.current_tenant'));
```

## Logo cho mọi cấp

Hệ thống hỗ trợ logo/avatar cho tất cả các cấp:

| Entity | Field | Mô tả |
|--------|-------|-------|
| **Company** | `logoUrl` | Logo công ty |
| **Brand** | `logoUrl` | Logo thương hiệu |
| **Branch** | `logoUrl` | Logo chi nhánh (mặc định dùng logo thương hiệu) |
| **Staff** | `avatarUrl` | Ảnh đại diện nhân viên |

## Tenant Context trong Application

### API Admin (NestJS)

```typescript
// TenantMiddleware
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1. Lấy tenant_id từ nhiều nguồn
    const tenantId =
      req.headers['x-tenant-id'] as string ||
      req.user?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID required');
    }

    // 2. Set tenant context
    req['tenantId'] = tenantId;

    // 3. Set cho PostgreSQL RLS (nếu cần)
    // await queryRunner.query(`SET app.current_tenant = '${tenantId}'`);

    next();
  }
}

// Service sử dụng tenant
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async findAll() {
    const tenantId = this.request['tenantId'];

    return this.productRepo.find({
      where: { tenantId },
    });
  }

  async create(dto: CreateProductDto) {
    const tenantId = this.request['tenantId'];

    return this.productRepo.save({
      ...dto,
      tenantId, // Bắt buộc set tenant_id
    });
  }
}
```

### Web Admin (Next.js)

```typescript
// API service với tenant context
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Không cần tenant context cho Web Admin (Super Admin)
// Web Admin quản lý tất cả tenant

// Nhưng khi gọi API cho 1 tenant cụ thể:
export const getTenantData = async (tenantId: string) => {
  return api.get('/data', {
    headers: {
      'X-Tenant-ID': tenantId,
    },
  });
};
```

### Web Dashboard (Next.js)

```typescript
// Auth store với tenant context
interface AuthState {
  tenantId: string | null;
  user: User | null;
  setTenant: (tenantId: string) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  tenantId: null,
  user: null,
  setTenant: (tenantId) => set({ tenantId }),
}));

// API service luôn gửi kèm tenant_id
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const { tenantId } = useAuthStore.getState();

  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }

  return config;
});
```

## Flow Onboarding Tenant mới

### Wizard 3 bước bắt buộc

Khi tạo công ty mới, **bắt buộc phải hoàn thành 3 bước liên tiếp**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TẠO CÔNG TY MỚI (Wizard)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [●] Bước 1        [ ] Bước 2        [ ] Bước 3                   │
│   Thông tin         Thương hiệu       Chi nhánh                    │
│   công ty           đầu tiên          đầu tiên                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Bước 1: Thông tin Công ty

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên công ty | ✅ | Tên đầy đủ |
| Mã công ty (Tenant ID) | ✅ | Mã viết tắt, dùng để login |
| Logo | | Logo công ty |
| Mã số thuế | | MST doanh nghiệp |
| Địa chỉ | | Địa chỉ trụ sở |
| Số điện thoại | | SĐT liên hệ |
| Email | | Email công ty |
| Người đại diện | | Họ tên người đại diện |
| Gói dịch vụ | ✅ | Basic / Standard / Premium / Enterprise |

### Bước 2: Thương hiệu đầu tiên (Bắt buộc)

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên thương hiệu | ✅ | Tên thương hiệu đầu tiên |
| Mã thương hiệu | ✅ | Mã viết tắt |
| Logo | | Logo thương hiệu |
| Mô tả | | Mô tả ngắn |
| Mô hình kinh doanh | ✅ | Order Only / CCB Only / Full System |

### Bước 3: Chi nhánh đầu tiên (Bắt buộc)

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên chi nhánh | ✅ | Tên chi nhánh đầu tiên |
| Mã chi nhánh | ✅ | Mã viết tắt |
| Logo | | Logo chi nhánh (mặc định dùng logo thương hiệu) |
| Địa chỉ | ✅ | Địa chỉ chi nhánh |
| Số điện thoại | | SĐT chi nhánh |
| Mô hình sử dụng | ✅ | Order Only / CCB Only / Full System |
| Số cổng kết nối | | Mặc định theo gói |

### Sau khi hoàn thành Wizard

- Hệ thống tự động tạo tài khoản Owner cho chi nhánh
- Username mặc định: `owner` hoặc email
- Password tạm thời được gửi qua email
- Tenant sẵn sàng sử dụng

**Lưu ý quan trọng:**
- Không thể lưu công ty nếu chưa hoàn thành cả 3 bước
- Sau khi tạo xong, có thể thêm thương hiệu/chi nhánh khác bình thường
- Nút "Quay lại" cho phép sửa bước trước
- Nút "Hủy" sẽ không lưu gì cả

## API Wizard

```typescript
// POST /api/companies/wizard
interface CreateCompanyWizardDto {
  company: {
    name: string;
    code: string;           // Tenant ID
    logoUrl?: string;
    taxCode?: string;
    address?: string;
    phone?: string;
    email?: string;
    representative?: string;
    subscriptionPlan: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
    maxBranches?: number;
    maxUsers?: number;
  };
  brand: {
    name: string;
    code: string;
    logoUrl?: string;
    description?: string;
    businessModel: 'ORDER_ONLY' | 'CCB_ONLY' | 'FULL_SYSTEM';
  };
  branch: {
    name: string;
    code: string;
    logoUrl?: string;       // Mặc định dùng brand.logoUrl
    address: string;
    phone?: string;
    email?: string;
    businessModel?: 'ORDER_ONLY' | 'CCB_ONLY' | 'FULL_SYSTEM';
    maxConnections?: number;
  };
  owner?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

// Response
interface CreateCompanyWizardResponseDto {
  company: { id: string; name: string; code: string; };
  brand: { id: string; name: string; code: string; };
  branch: { id: string; name: string; code: string; };
  owner?: {
    id: string;
    username: string;
    temporaryPassword: string;
  };
}
```

## Bảo mật Multi-Tenant

### Row-Level Security (RLS)

```sql
-- Bật RLS cho mọi bảng có tenant_id
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... và các bảng khác

-- Tạo policy
CREATE POLICY tenant_isolation ON brands
    USING (tenant_id = current_setting('app.current_tenant'));
```

### Validation trong Application

```typescript
// Guard kiểm tra tenant access
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request['tenantId'];

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    // Kiểm tra user có quyền access tenant này không
    const user = request.user;
    if (user.role !== 'SUPER_ADMIN' && user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    return true;
  }
}
```

## Best Practices

1. **Luôn filter theo tenant_id**: Mọi query đều phải có `WHERE tenant_id = ?`
2. **Validate tenant access**: Kiểm tra user có quyền access tenant không
3. **Không hardcode tenant**: Lấy tenant từ context, không từ URL/param
4. **Audit log theo tenant**: Log đầy đủ action và tenant
5. **Test cross-tenant access**: Đảm bảo không truy cập chéo tenant
6. **Backup theo tenant**: Hỗ trợ backup/restore từng tenant
