---
sidebar_position: 5
---

# Mapping sản phẩm (Product Mapping)

:::info Tính năng tương lai
Tính năng này sẽ được phát triển sau khi hoàn thiện các flow cơ bản. Document này mô tả business requirement và thiết kế sơ bộ.
:::

## Tổng quan

Mapping sản phẩm/món ăn giữa **Merchant Menu** (trên food platform) và **TechRes Menu** (trong hệ thống POS) để:
1. **Xuất định lượng**: Biết được món nào trên platform tương ứng với món nào trong kho để trừ nguyên liệu
2. **Báo cáo thống nhất**: Gộp doanh thu từ các nguồn vào cùng một sản phẩm
3. **Quản lý tồn kho**: Tự động tắt món trên platform khi hết nguyên liệu

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MERCHANT MENU (GrabFood)                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Menu Items                                                      │    │
│  │  ├── M001: Cà phê sữa đá (Size S/M/L)                            │    │
│  │  ├── M002: Cà phê đen đá                                         │    │
│  │  ├── M003: Trà sữa trân châu                                     │    │
│  │  ├── M004: Bánh mì thịt                                          │    │
│  │  └── M005: Combo sáng (Bánh mì + Cà phê)                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                               MAPPING
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      TECHRES MENU (Brand Level)                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Products                                                        │    │
│  │  ├── SP001: Cà phê sữa          ←── mapped to M001               │    │
│  │  │   └── Định lượng: 20g cà phê + 30ml sữa + 50ml đá             │    │
│  │  ├── SP002: Cà phê đen          ←── mapped to M002               │    │
│  │  │   └── Định lượng: 20g cà phê + 50ml đá                        │    │
│  │  ├── SP003: Trà sữa             ←── mapped to M003               │    │
│  │  │   └── Định lượng: 30g trà + 50ml sữa + 20g trân châu          │    │
│  │  ├── SP004: Bánh mì             ←── mapped to M004               │    │
│  │  │   └── Định lượng: 1 ổ bánh mì + 50g thịt + rau...             │    │
│  │  └── SP005: Combo sáng          ←── mapped to M005               │    │
│  │      └── Gồm: SP004 + SP001                                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Business Requirements

### Use Case 1: Xuất định lượng

```
Khi đơn hàng GrabFood có:
  - 2x Cà phê sữa đá (M001)
  - 1x Bánh mì thịt (M004)

Hệ thống cần:
  1. Map M001 → SP001 (Cà phê sữa)
  2. Map M004 → SP004 (Bánh mì)
  3. Tính định lượng nguyên liệu cần xuất:
     - Cà phê: 2 x 20g = 40g
     - Sữa: 2 x 30ml = 60ml
     - Bánh mì: 1 ổ
     - Thịt: 50g
     - ...
```

### Use Case 2: Báo cáo doanh thu

```
Báo cáo doanh thu sản phẩm SP001 (Cà phê sữa):
├── Bán tại quán (POS): 500 ly
├── GrabFood (M001): 200 ly
├── ShopeeFood (SF001): 150 ly
└── BeFood (BF001): 50 ly
───────────────────────────
Tổng: 900 ly
```

### Use Case 3: Đồng bộ tồn kho

```
Khi SP001 hết hàng trong TechRes:
  → Tự động tắt M001 trên GrabFood
  → Tự động tắt SF001 trên ShopeeFood
  → Tự động tắt BF001 trên BeFood
```

## Proposed Database Schema

### food_platform_product_mappings

```sql
CREATE TABLE food_platform_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Store mapping reference
  store_mapping_id UUID NOT NULL REFERENCES food_platform_store_mappings(id),
  tenant_id VARCHAR(50) NOT NULL,

  -- Merchant product info
  external_product_id VARCHAR(100) NOT NULL,    -- Product ID trên platform
  external_product_name VARCHAR(255) NOT NULL,  -- Tên sản phẩm trên platform
  external_product_price BIGINT,                -- Giá trên platform
  external_category VARCHAR(255),               -- Danh mục trên platform

  -- TechRes product mapping
  product_id INTEGER REFERENCES products(id),   -- FK to TechRes products
  product_name VARCHAR(255),                    -- Cache tên sản phẩm TechRes

  -- Mapping type
  mapping_type VARCHAR(20) DEFAULT 'direct',    -- direct, combo, variant
  variant_mapping JSONB,                        -- For size/options mapping

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_synced BOOLEAN DEFAULT false,              -- Đã sync stock chưa

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_product_mapping UNIQUE (store_mapping_id, external_product_id)
);
```

### Variant Mapping Example

```json
{
  "externalProductId": "M001",
  "externalProductName": "Cà phê sữa đá",
  "mappingType": "variant",
  "variantMapping": {
    "Size S": {
      "techresProductId": "SP001-S",
      "multiplier": 0.8
    },
    "Size M": {
      "techresProductId": "SP001-M",
      "multiplier": 1.0
    },
    "Size L": {
      "techresProductId": "SP001-L",
      "multiplier": 1.2
    }
  }
}
```

## Proposed UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Cài đặt > Tích hợp Food Platform > GrabFood > Mapping sản phẩm         │
│                                                                          │
│  Chi nhánh: [Chi nhánh Quận 1 ▼]    Cửa hàng: Cà phê TechRes Q1         │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  🔍 Tìm kiếm sản phẩm...                    [Tự động mapping]   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Sản phẩm GrabFood          │  Sản phẩm TechRes      │ Trạng thái│    │
│  ├────────────────────────────┼────────────────────────┼───────────┤    │
│  │ ☕ Cà phê sữa đá           │  [Cà phê sữa      ▼]   │ ✓ Mapped  │    │
│  │    35,000đ                 │  SP001                 │           │    │
│  ├────────────────────────────┼────────────────────────┼───────────┤    │
│  │ ☕ Cà phê đen đá           │  [Cà phê đen      ▼]   │ ✓ Mapped  │    │
│  │    30,000đ                 │  SP002                 │           │    │
│  ├────────────────────────────┼────────────────────────┼───────────┤    │
│  │ 🧋 Trà sữa trân châu       │  [Chọn sản phẩm  ▼]   │ ⚠ Chưa map│    │
│  │    45,000đ                 │                        │           │    │
│  ├────────────────────────────┼────────────────────────┼───────────┤    │
│  │ 🥖 Bánh mì thịt            │  [Bánh mì         ▼]   │ ✓ Mapped  │    │
│  │    25,000đ                 │  SP004                 │           │    │
│  └────────────────────────────┴────────────────────────┴───────────┘    │
│                                                                          │
│  Mapped: 3/4 sản phẩm                     [Hủy]  [Lưu thay đổi]         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Auto-Mapping Algorithm

```typescript
// Pseudo code for auto-mapping by product name similarity
async function autoMapProducts(storeMapping: StoreMapping): Promise<ProductMapping[]> {
  // 1. Get all products from platform
  const platformProducts = await fetchPlatformProducts(storeMapping);

  // 2. Get all TechRes products for this tenant
  const techresProducts = await getTechResProducts(storeMapping.tenantId);

  // 3. Match by similarity
  const mappings: ProductMapping[] = [];

  for (const platformProduct of platformProducts) {
    const bestMatch = findBestMatch(platformProduct.name, techresProducts);

    if (bestMatch.similarity > 0.8) { // 80% match threshold
      mappings.push({
        externalProductId: platformProduct.id,
        externalProductName: platformProduct.name,
        productId: bestMatch.product.id,
        productName: bestMatch.product.name,
        confidence: bestMatch.similarity,
      });
    }
  }

  return mappings;
}

function findBestMatch(name: string, products: Product[]): MatchResult {
  // Use Levenshtein distance or similar algorithm
  let bestMatch = { product: null, similarity: 0 };

  for (const product of products) {
    const similarity = calculateSimilarity(
      normalize(name),
      normalize(product.name)
    );

    if (similarity > bestMatch.similarity) {
      bestMatch = { product, similarity };
    }
  }

  return bestMatch;
}
```

## Integration with Order Processing

```typescript
// Khi xử lý đơn hàng từ food platform
async function processOrderWithMapping(order: FoodOrder): Promise<void> {
  for (const item of order.items) {
    // 1. Find product mapping
    const mapping = await findProductMapping(
      order.storeMappingId,
      item.externalProductId
    );

    if (mapping) {
      // 2. Link to TechRes product
      item.techresProductId = mapping.productId;

      // 3. Calculate ingredient consumption (định lượng)
      if (mapping.product.hasRecipe) {
        const ingredients = await calculateIngredients(
          mapping.productId,
          item.quantity,
          item.options // size, add-ons, etc.
        );

        // 4. Queue for inventory deduction
        await queueInventoryDeduction(order.branchId, ingredients);
      }
    } else {
      // Flag as unmapped for review
      item.needsMapping = true;
    }
  }
}
```

## Implementation Phases

### Phase 1: Basic Mapping (Current Scope)
- [ ] Store mapping only
- [ ] Orders fetched without product linking

### Phase 2: Product Mapping (Future)
- [ ] Database schema
- [ ] Manual mapping UI
- [ ] Auto-mapping algorithm

### Phase 3: Inventory Integration (Future)
- [ ] Link to recipe/định lượng system
- [ ] Auto-deduct inventory on order
- [ ] Sync stock availability to platforms

### Phase 4: Advanced Features (Future)
- [ ] Variant/modifier mapping
- [ ] Combo product mapping
- [ ] Auto-disable when out of stock
- [ ] Price sync (optional)

## Notes

:::warning Lưu ý quan trọng
Product Mapping là tính năng phức tạp, cần xem xét kỹ các yếu tố:
- Tên sản phẩm có thể khác nhau giữa các platform
- Size/options mapping phức tạp
- Combo products cần mapping đặc biệt
- Định lượng có thể khác nhau theo chi nhánh
:::

## Tiếp theo

Sau khi hoàn thiện các flow cơ bản (liên kết, polling, sync), sẽ tiếp tục phát triển tính năng Product Mapping.
