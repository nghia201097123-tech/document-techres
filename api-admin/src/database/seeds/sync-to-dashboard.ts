import { DataSource } from 'typeorm';

// Load dotenv if available
try {
  require('dotenv').config();
} catch {
  // dotenv not installed, use environment variables directly
}

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'http://localhost:4002';

interface CompanyData {
  id: string;
  code: string;
  name: string;
  logo_url: string;
  is_active: boolean;
}

interface BrandData {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  code: string;
  logo_url: string;
  description: string;
  business_model: string;
  is_active: boolean;
}

interface BranchData {
  id: string;
  tenant_id: string;
  brand_id: string;
  name: string;
  code: string;
  logo_url: string;
  address_detail: string;
  province_code: string;
  ward_code: string;
  phone: string;
  email: string;
  manager: string;
  open_time: string;
  close_time: string;
  business_model: string;
  is_active: boolean;
}

interface DepartmentData {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

interface StaffData {
  id: string;
  tenant_id: string;
  branch_id: string;
  company_id: string;
  brand_id: string;
  department_id: string;
  name: string;
  phone: string;
  email: string;
  avatar_url: string;
  role: string;
  username: string;
  is_active: boolean;
}

async function syncAllData() {
  console.log('🚀 Starting sync all data from techres_master to techres...');
  console.log(`📡 Dashboard API URL: ${DASHBOARD_API_URL}`);

  // Connect to techres_master database
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.CONFIG_POSTGRESQL_HOST_MASTER || '172.16.10.146',
    port: parseInt(process.env.CONFIG_POSTGRESQL_PORT_MASTER || '5432'),
    username: process.env.CONFIG_POSTGRESQL_USERNAME_MASTER || 'techres_master',
    password: process.env.CONFIG_POSTGRESQL_PASSWORD_MASTER || 'techres_master',
    database: process.env.CONFIG_POSTGRESQL_DB_NAME_MASTER || 'techres_master',
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ Connected to techres_master database');

  try {
    // 1. Get all companies
    const companies = await dataSource.query<CompanyData[]>(`
      SELECT id, code, name, logo_url, is_active
      FROM companies
      WHERE is_active = true
    `);
    console.log(`📦 Found ${companies.length} companies`);

    for (const company of companies) {
      console.log(`\n🏢 Processing company: ${company.name} (${company.code})`);
      const tenantId = company.code;

      // 2. Get brands for this company
      const brands = await dataSource.query<BrandData[]>(`
        SELECT id, tenant_id, company_id, name, code, logo_url, description, business_model, is_active
        FROM brands
        WHERE tenant_id = $1 AND is_active = true
      `, [tenantId]);
      console.log(`   📦 Found ${brands.length} brands`);

      if (brands.length === 0) {
        console.log(`   ⚠️ No brands found, skipping`);
        continue;
      }

      const firstBrand = brands[0];

      // 3. Get branches for first brand
      const branches = await dataSource.query<BranchData[]>(`
        SELECT id, tenant_id, brand_id, name, code, logo_url, address_detail,
               province_code, ward_code, phone, email, manager, open_time, close_time,
               business_model, is_active
        FROM branches
        WHERE tenant_id = $1 AND is_active = true
      `, [tenantId]);
      console.log(`   📦 Found ${branches.length} branches`);

      if (branches.length === 0) {
        console.log(`   ⚠️ No branches found, skipping`);
        continue;
      }

      const firstBranch = branches[0];

      // 4. Get departments
      const departments = await dataSource.query<DepartmentData[]>(`
        SELECT id, tenant_id, branch_id, name, code, description, is_active
        FROM departments
        WHERE tenant_id = $1 AND is_active = true
        LIMIT 1
      `, [tenantId]);

      // 5. Get staff
      const staff = await dataSource.query<StaffData[]>(`
        SELECT id, tenant_id, branch_id, company_id, brand_id, department_id,
               name, phone, email, avatar_url, role, username, is_active
        FROM staff
        WHERE tenant_id = $1 AND is_active = true
        LIMIT 1
      `, [tenantId]);

      // 6. Prepare sync data
      const syncData = {
        company: {
          id: company.id,
          code: company.code,
          name: company.name,
          logoUrl: company.logo_url,
          isActive: company.is_active,
        },
        brand: {
          id: firstBrand.id,
          tenantId: firstBrand.tenant_id,
          companyId: firstBrand.company_id,
          name: firstBrand.name,
          code: firstBrand.code,
          logoUrl: firstBrand.logo_url,
          description: firstBrand.description,
          businessModel: firstBrand.business_model,
          isActive: firstBrand.is_active,
        },
        branch: {
          id: firstBranch.id,
          tenantId: firstBranch.tenant_id,
          brandId: firstBranch.brand_id,
          name: firstBranch.name,
          code: firstBranch.code,
          logoUrl: firstBranch.logo_url,
          addressDetail: firstBranch.address_detail,
          provinceCode: firstBranch.province_code,
          wardCode: firstBranch.ward_code,
          phone: firstBranch.phone,
          email: firstBranch.email,
          manager: firstBranch.manager,
          openTime: firstBranch.open_time,
          closeTime: firstBranch.close_time,
          businessModel: firstBranch.business_model,
          isActive: firstBranch.is_active,
        },
        department: departments.length > 0 ? {
          id: departments[0].id,
          tenantId: departments[0].tenant_id,
          branchId: departments[0].branch_id,
          name: departments[0].name,
          code: departments[0].code,
          description: departments[0].description,
          isActive: departments[0].is_active,
        } : undefined,
        staff: staff.length > 0 ? {
          id: staff[0].id,
          tenantId: staff[0].tenant_id,
          branchId: staff[0].branch_id,
          companyId: staff[0].company_id,
          brandId: staff[0].brand_id,
          departmentId: staff[0].department_id,
          name: staff[0].name,
          phone: staff[0].phone,
          email: staff[0].email,
          avatarUrl: staff[0].avatar_url,
          role: staff[0].role,
          username: staff[0].username,
          isActive: staff[0].is_active,
        } : undefined,
        // Additional branches (all except first)
        additionalBranches: branches.slice(1).map(b => ({
          id: b.id,
          tenantId: b.tenant_id,
          brandId: b.brand_id,
          name: b.name,
          code: b.code,
          logoUrl: b.logo_url,
          addressDetail: b.address_detail,
          provinceCode: b.province_code,
          wardCode: b.ward_code,
          phone: b.phone,
          email: b.email,
          manager: b.manager,
          openTime: b.open_time,
          closeTime: b.close_time,
          businessModel: b.business_model,
          isActive: b.is_active,
        })),
      };

      // 7. Call sync API
      try {
        const response = await fetch(`${DASHBOARD_API_URL}/api/sync/company`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(syncData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ Synced: ${result.message}`);
        } else {
          const error = await response.text();
          console.log(`   ❌ Sync failed: ${response.status} - ${error}`);
        }
      } catch (error: any) {
        console.log(`   ❌ Sync error: ${error.message}`);
      }
    }

    console.log('\n✅ Sync completed!');

  } catch (error) {
    console.error('❌ Error syncing data:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

syncAllData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
