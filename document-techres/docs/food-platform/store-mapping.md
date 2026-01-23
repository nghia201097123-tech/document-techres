---
sidebar_position: 3
---

# Mapping cửa hàng (Store Mapping)

Chi tiết về quy trình mapping cửa hàng bên Merchant với chi nhánh bên TechRes sau khi liên kết tài khoản.

## Tổng quan

Sau khi liên kết tài khoản merchant thành công, hệ thống cần **mapping** giữa:
- **Merchant Store**: Cửa hàng trên platform (GrabFood, ShopeeFood, BeFood)
- **TechRes Branch**: Chi nhánh trong hệ thống TechRes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MERCHANT ACCOUNT                                 │
│                     (VD: Cà phê TechRes Corp)                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Merchant Stores (trên GrabFood)                                 │    │
│  │  ├── Store #GR-001: "Cà phê TechRes Quận 1"                      │    │
│  │  ├── Store #GR-002: "Cà phê TechRes Quận 3"                      │    │
│  │  ├── Store #GR-003: "Cà phê TechRes Thủ Đức"                     │    │
│  │  └── Store #GR-004: "Cà phê TechRes Bình Thạnh"                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                               MAPPING
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         TECHRES TENANT                                   │
│                        (Công ty Cà phê ABC)                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  TechRes Branches                                                │    │
│  │  ├── Branch #1: "Chi nhánh Quận 1"      ←── mapped to GR-001     │    │
│  │  ├── Branch #2: "Chi nhánh Quận 3"      ←── mapped to GR-002     │    │
│  │  ├── Branch #3: "Chi nhánh Thủ Đức"     ←── mapped to GR-003     │    │
│  │  └── Branch #4: "Chi nhánh Bình Thạnh"  ←── mapped to GR-004     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tại sao cần Store Mapping?

### Vấn đề

1. **Một tài khoản merchant** có thể quản lý **nhiều cửa hàng** trên platform
2. **Một tenant TechRes** có **nhiều chi nhánh**
3. Khi CCB của chi nhánh A poll đơn hàng → chỉ được lấy đơn của cửa hàng mapped với chi nhánh A

### Giải pháp

```
CCB Chi nhánh Quận 1 poll API
        │
        ▼
Backend kiểm tra: Chi nhánh này mapped với Store nào?
        │
        ▼
Tìm thấy: Branch #1 ←→ Store #GR-001
        │
        ▼
Chỉ fetch đơn hàng từ Store #GR-001
        │
        ▼
Trả về cho CCB Chi nhánh Quận 1
```

## Flow Mapping sau Login

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 1: Login thành công                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ✓ Đăng nhập GrabFood thành công!                                │    │
│  │                                                                  │    │
│  │  Tài khoản: merchant@techres.vn                                  │    │
│  │  Platform: GrabFood                                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 2: Gọi API lấy danh sách cửa hàng                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  GET /merchant/stores                                            │    │
│  │  Authorization: Bearer {access_token}                            │    │
│  │                                                                  │    │
│  │  Response:                                                       │    │
│  │  {                                                               │    │
│  │    "stores": [                                                   │    │
│  │      { "id": "GR-001", "name": "Cà phê TechRes Quận 1",         │    │
│  │        "address": "123 Nguyễn Huệ, Q1", "isActive": true },     │    │
│  │      { "id": "GR-002", "name": "Cà phê TechRes Quận 3",         │    │
│  │        "address": "456 Võ Văn Tần, Q3", "isActive": true },     │    │
│  │      { "id": "GR-003", "name": "Cà phê TechRes Thủ Đức",        │    │
│  │        "address": "789 Võ Văn Ngân", "isActive": false }        │    │
│  │    ]                                                             │    │
│  │  }                                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 3: Hiển thị UI mapping                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Chọn cửa hàng để mapping với chi nhánh TechRes                  │    │
│  │                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ Cửa hàng GrabFood          │  Chi nhánh TechRes             ││    │
│  │  ├─────────────────────────────┼───────────────────────────────┤│    │
│  │  │ ✓ Cà phê TechRes Quận 1    │  [Chi nhánh Quận 1 ▼]         ││    │
│  │  │   123 Nguyễn Huệ, Q1       │                               ││    │
│  │  ├─────────────────────────────┼───────────────────────────────┤│    │
│  │  │ ✓ Cà phê TechRes Quận 3    │  [Chi nhánh Quận 3 ▼]         ││    │
│  │  │   456 Võ Văn Tần, Q3       │                               ││    │
│  │  ├─────────────────────────────┼───────────────────────────────┤│    │
│  │  │ ○ Cà phê TechRes Thủ Đức   │  [Không mapping    ▼]         ││    │
│  │  │   (Đang tạm ngưng)         │                               ││    │
│  │  └─────────────────────────────┴───────────────────────────────┘│    │
│  │                                                                  │    │
│  │  [Hủy]                                    [Lưu mapping]          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 4: Lưu mapping vào Database                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  INSERT INTO food_platform_store_mappings                        │    │
│  │  VALUES                                                          │    │
│  │    (account_id, 'GR-001', branch_id=1, ...),                     │    │
│  │    (account_id, 'GR-002', branch_id=2, ...)                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### food_platform_store_mappings

```sql
CREATE TABLE food_platform_store_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Account reference
  account_id UUID NOT NULL REFERENCES food_platform_accounts(id) ON DELETE CASCADE,
  tenant_id VARCHAR(50) NOT NULL,

  -- Merchant store info
  external_store_id VARCHAR(100) NOT NULL,    -- Store ID trên platform (GR-001)
  external_store_name VARCHAR(255) NOT NULL,  -- Tên cửa hàng trên platform
  external_store_address TEXT,                -- Địa chỉ trên platform
  external_store_phone VARCHAR(20),
  is_store_active BOOLEAN DEFAULT true,       -- Trạng thái trên platform

  -- TechRes branch mapping
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  branch_name VARCHAR(255),                   -- Cache tên chi nhánh

  -- Mapping status
  is_active BOOLEAN NOT NULL DEFAULT true,    -- Bật/tắt mapping

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMP,                   -- Lần cuối sync store info

  -- Constraints
  CONSTRAINT uq_store_mapping UNIQUE (account_id, external_store_id),
  CONSTRAINT uq_branch_platform UNIQUE (branch_id, account_id) -- 1 branch chỉ map 1 store/platform
);

-- Indexes
CREATE INDEX idx_store_mappings_account ON food_platform_store_mappings(account_id);
CREATE INDEX idx_store_mappings_branch ON food_platform_store_mappings(branch_id);
CREATE INDEX idx_store_mappings_external ON food_platform_store_mappings(external_store_id);
```

### Relationship Diagram

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│  food_platform_accounts     │      │  branches                   │
├─────────────────────────────┤      ├─────────────────────────────┤
│  id (PK)                    │      │  id (PK)                    │
│  tenant_id                  │      │  tenant_id                  │
│  platform                   │      │  name                       │
│  access_token               │      │  address                    │
│  ...                        │      │  ...                        │
└──────────────┬──────────────┘      └──────────────┬──────────────┘
               │                                     │
               │ 1                                   │ 1
               │                                     │
               │ N                                   │ N
               ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    food_platform_store_mappings                      │
├─────────────────────────────────────────────────────────────────────┤
│  id (PK)                                                             │
│  account_id (FK) ─────────────────────────────────────────────────┐ │
│  branch_id (FK) ─────────────────────────────────────────────────┐│ │
│  external_store_id                                               ││ │
│  external_store_name                                             ││ │
│  is_active                                                       ││ │
└──────────────────────────────────────────────────────────────────┴┴─┘

Relationships:
- 1 Account có thể có nhiều Store Mappings (1:N)
- 1 Branch có thể được map với nhiều Stores từ các platforms khác nhau
- 1 Branch chỉ được map với 1 Store/platform (UNIQUE constraint)
```

## API Endpoints

### Lấy danh sách stores từ platform

```http
GET /api/food-platforms/{accountId}/stores
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "stores": [
    {
      "externalStoreId": "GR-001",
      "name": "Cà phê TechRes Quận 1",
      "address": "123 Nguyễn Huệ, Q1",
      "phone": "028-1234-5678",
      "isActive": true,
      "currentMapping": {
        "branchId": 1,
        "branchName": "Chi nhánh Quận 1"
      }
    },
    {
      "externalStoreId": "GR-002",
      "name": "Cà phê TechRes Quận 3",
      "address": "456 Võ Văn Tần, Q3",
      "phone": "028-2345-6789",
      "isActive": true,
      "currentMapping": null
    }
  ]
}
```

### Lưu store mappings

```http
POST /api/food-platforms/{accountId}/store-mappings
Authorization: Bearer {token}
Content-Type: application/json

{
  "mappings": [
    {
      "externalStoreId": "GR-001",
      "externalStoreName": "Cà phê TechRes Quận 1",
      "externalStoreAddress": "123 Nguyễn Huệ, Q1",
      "branchId": 1
    },
    {
      "externalStoreId": "GR-002",
      "externalStoreName": "Cà phê TechRes Quận 3",
      "externalStoreAddress": "456 Võ Văn Tần, Q3",
      "branchId": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã lưu 2 mapping thành công",
  "mappings": [
    {
      "id": "...",
      "externalStoreId": "GR-001",
      "branchId": 1,
      "branchName": "Chi nhánh Quận 1"
    },
    {
      "id": "...",
      "externalStoreId": "GR-002",
      "branchId": 2,
      "branchName": "Chi nhánh Quận 3"
    }
  ]
}
```

### Lấy mappings của branch

```http
GET /api/branches/{branchId}/food-platform-mappings
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "mappings": [
    {
      "platform": "grab",
      "accountId": "...",
      "externalStoreId": "GR-001",
      "externalStoreName": "Cà phê TechRes Quận 1",
      "isActive": true
    },
    {
      "platform": "shopee_food",
      "accountId": "...",
      "externalStoreId": "SF-001",
      "externalStoreName": "TechRes Coffee Q1",
      "isActive": true
    }
  ]
}
```

## Service Implementation

### Store Mapping Service

```typescript
// store-mapping.service.ts
@Injectable()
export class StoreMappingService {
  constructor(
    private readonly storeMappingRepo: Repository<FoodPlatformStoreMapping>,
    private readonly platformApiService: PlatformApiService,
    private readonly branchService: BranchService,
  ) {}

  /**
   * Fetch stores từ platform sau khi login thành công
   */
  async fetchStoresFromPlatform(account: FoodPlatformAccount): Promise<MerchantStore[]> {
    switch (account.platform) {
      case 'grab':
        return this.fetchGrabStores(account);
      case 'shopee_food':
        return this.fetchShopeeStores(account);
      case 'befood':
        return this.fetchBeFoodStores(account);
    }
  }

  private async fetchGrabStores(account: FoodPlatformAccount): Promise<MerchantStore[]> {
    const response = await axios.get(`${GRAB_API_BASE}/merchant/v2/stores`, {
      headers: { 'Authorization': `Bearer ${account.accessToken}` },
    });

    return response.data.stores.map(store => ({
      externalStoreId: store.storeID,
      name: store.name,
      address: store.address.fullAddress,
      phone: store.phone,
      isActive: store.status === 'ACTIVE',
    }));
  }

  /**
   * Lưu mappings cho account
   */
  async saveMappings(
    accountId: string,
    mappings: CreateStoreMappingDto[]
  ): Promise<FoodPlatformStoreMapping[]> {
    const account = await this.accountRepo.findOneOrFail({ where: { id: accountId } });

    // Validate branches belong to same tenant
    const branchIds = mappings.map(m => m.branchId);
    const branches = await this.branchService.findByIds(branchIds);

    for (const branch of branches) {
      if (branch.tenantId !== account.tenantId) {
        throw new BadRequestException(`Branch ${branch.id} không thuộc tenant này`);
      }
    }

    // Check for duplicate branch mappings
    const existingMappings = await this.storeMappingRepo.find({
      where: {
        branchId: In(branchIds),
        account: { platform: account.platform },
      },
    });

    if (existingMappings.length > 0) {
      const conflictBranches = existingMappings.map(m => m.branchId);
      throw new BadRequestException(
        `Các chi nhánh ${conflictBranches.join(', ')} đã được mapping với platform này`
      );
    }

    // Create mappings
    const entities = mappings.map(dto => this.storeMappingRepo.create({
      accountId,
      tenantId: account.tenantId,
      externalStoreId: dto.externalStoreId,
      externalStoreName: dto.externalStoreName,
      externalStoreAddress: dto.externalStoreAddress,
      branchId: dto.branchId,
      branchName: branches.find(b => b.id === dto.branchId)?.name,
      isActive: true,
    }));

    return this.storeMappingRepo.save(entities);
  }

  /**
   * Lấy store mapping cho branch và platform
   */
  async getMappingForBranch(
    branchId: number,
    platform: FoodPlatformType
  ): Promise<FoodPlatformStoreMapping | null> {
    return this.storeMappingRepo.findOne({
      where: {
        branchId,
        isActive: true,
        account: { platform, isActive: true },
      },
      relations: ['account'],
    });
  }

  /**
   * Lấy tất cả mappings active cho branch
   */
  async getAllMappingsForBranch(branchId: number): Promise<FoodPlatformStoreMapping[]> {
    return this.storeMappingRepo.find({
      where: {
        branchId,
        isActive: true,
      },
      relations: ['account'],
    });
  }
}
```

### Cập nhật Order Polling với Store Filter

```typescript
// food-orders.service.ts
async pollOrdersForBranch(branchId: number, lastPollAt?: number) {
  // 1. Lấy tất cả store mappings của branch này
  const mappings = await this.storeMappingService.getAllMappingsForBranch(branchId);

  if (mappings.length === 0) {
    return {
      newOrders: [],
      updatedOrders: [],
      message: 'Chưa có cửa hàng nào được mapping với chi nhánh này',
    };
  }

  // 2. Poll từng store mapping (song song)
  const results = await Promise.allSettled(
    mappings.map(mapping => this.pollFromStore(mapping, lastPollAt))
  );

  // 3. Aggregate và return
  const allOrders = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  const { newOrders, updatedOrders } = await this.syncOrdersToDb(allOrders, branchId);

  return { newOrders, updatedOrders };
}

/**
 * Poll orders từ một store cụ thể
 */
private async pollFromStore(
  mapping: FoodPlatformStoreMapping,
  lastPollAt?: number
): Promise<RawFoodOrder[]> {
  const account = mapping.account;

  // Refresh token nếu cần
  await this.refreshTokenIfNeeded(account);

  // Gọi API platform với store_id filter
  switch (account.platform) {
    case 'grab':
      return this.pollGrabOrdersForStore(account, mapping.externalStoreId, lastPollAt);
    case 'shopee_food':
      return this.pollShopeeOrdersForStore(account, mapping.externalStoreId, lastPollAt);
    case 'befood':
      return this.pollBeFoodOrdersForStore(account, mapping.externalStoreId, lastPollAt);
  }
}

private async pollGrabOrdersForStore(
  account: FoodPlatformAccount,
  storeId: string,
  since?: number
): Promise<RawFoodOrder[]> {
  const response = await axios.get(`${GRAB_API_BASE}/merchant/v2/orders`, {
    headers: {
      'Authorization': `Bearer ${account.accessToken}`,
    },
    params: {
      storeID: storeId,  // Filter theo store cụ thể
      status: 'new,accepted,preparing,ready,delivering',
      updatedSince: since ? new Date(since).toISOString() : undefined,
      limit: 50,
    },
  });

  return response.data.orders.map(order =>
    this.transformGrabOrder(order, account, storeId)
  );
}
```

## Polling Flow với Store Mapping

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CCB Chi nhánh Quận 1 (Branch ID: 1)                                     │
│  Gọi: GET /food-orders/poll?branchId=1                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API-DASHBOARD                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  1. Query store mappings cho Branch ID: 1                        │    │
│  │                                                                  │    │
│  │  SELECT * FROM food_platform_store_mappings                      │    │
│  │  WHERE branch_id = 1 AND is_active = true                        │    │
│  │                                                                  │    │
│  │  Results:                                                        │    │
│  │  ├── GrabFood Store: GR-001 (Account: acc-001)                   │    │
│  │  ├── ShopeeFood Store: SF-001 (Account: acc-002)                 │    │
│  │  └── BeFood Store: BF-001 (Account: acc-003)                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Poll song song từ 3 stores                                              │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐      │
│  │ Grab API          │ │ Shopee API        │ │ BeFood API        │      │
│  │ storeID: GR-001   │ │ shop_id: SF-001   │ │ store_id: BF-001  │      │
│  │                   │ │                   │ │                   │      │
│  │ → 3 orders        │ │ → 2 orders        │ │ → 1 order         │      │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘      │
│                                                                          │
│  Total: 6 orders (chỉ của cửa hàng mapped với Chi nhánh Quận 1)         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Response về CCB Chi nhánh Quận 1                                        │
│  {                                                                       │
│    "newOrders": [...],      // Chỉ đơn của GR-001, SF-001, BF-001       │
│    "updatedOrders": [...]                                                │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## UI Mapping trên Web Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Cài đặt > Tích hợp Food Platform > GrabFood                             │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Tài khoản: merchant@techres.vn                    [Đã kết nối] │    │
│  │  Platform: GrabFood                                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  MAPPING CỬA HÀNG                              [+ Thêm mapping] │    │
│  │                                                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ Cửa hàng Grab              Chi nhánh TechRes      Trạng thái││    │
│  │  ├─────────────────────────────────────────────────────────────┤│    │
│  │  │ 🏪 Cà phê TechRes Q1       Chi nhánh Quận 1      🟢 Active  ││    │
│  │  │    123 Nguyễn Huệ, Q1                            [Sửa] [Xóa]││    │
│  │  ├─────────────────────────────────────────────────────────────┤│    │
│  │  │ 🏪 Cà phê TechRes Q3       Chi nhánh Quận 3      🟢 Active  ││    │
│  │  │    456 Võ Văn Tần, Q3                            [Sửa] [Xóa]││    │
│  │  ├─────────────────────────────────────────────────────────────┤│    │
│  │  │ 🏪 Cà phê TechRes Thủ Đức  (Chưa mapping)        ⚪ Inactive││    │
│  │  │    789 Võ Văn Ngân, Thủ Đức                      [+ Map]    ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Validation Rules

| Rule | Description |
|------|-------------|
| **1 Branch - 1 Store/Platform** | Mỗi chi nhánh chỉ được map với 1 cửa hàng của mỗi platform |
| **Same Tenant** | Chỉ mapping được với branches cùng tenant |
| **Active Account Required** | Account phải CONNECTED và active |
| **Store Must Exist** | Store phải tồn tại trên platform |

## Error Handling

```typescript
// Common errors
enum StoreMappingError {
  BRANCH_ALREADY_MAPPED = 'Chi nhánh này đã được mapping với platform này',
  STORE_NOT_FOUND = 'Không tìm thấy cửa hàng trên platform',
  BRANCH_NOT_FOUND = 'Không tìm thấy chi nhánh',
  TENANT_MISMATCH = 'Chi nhánh không thuộc tenant này',
  ACCOUNT_INACTIVE = 'Tài khoản platform không hoạt động',
}
```

## Sync Store Info

```typescript
// Cron job sync store info hàng ngày
@Cron('0 2 * * *') // 2 AM
async syncStoreInfo(): Promise<void> {
  const mappings = await this.storeMappingRepo.find({
    where: { isActive: true },
    relations: ['account'],
  });

  for (const mapping of mappings) {
    try {
      const storeInfo = await this.platformApiService.getStoreInfo(
        mapping.account,
        mapping.externalStoreId
      );

      await this.storeMappingRepo.update(mapping.id, {
        externalStoreName: storeInfo.name,
        externalStoreAddress: storeInfo.address,
        externalStorePhone: storeInfo.phone,
        isStoreActive: storeInfo.isActive,
        lastSyncedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to sync store ${mapping.externalStoreId}`, error);
    }
  }
}
```

## Tiếp theo

- [Mapping sản phẩm](./product-mapping.md) - Mapping món ăn (Future)
- [Polling đơn hàng](./order-polling.md) - Cơ chế polling với store filter
