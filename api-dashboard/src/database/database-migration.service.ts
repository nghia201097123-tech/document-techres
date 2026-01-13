import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseMigrationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseMigrationService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    await this.runMigrations();
  }

  private async runMigrations() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 0. Create base tables for microservices (without FK constraints to external databases)
      await this.createBaseTables(queryRunner);

      // 0.1 Add missing columns to base tables (for entities compatibility)
      await this.addMissingColumnsToBaseTables(queryRunner);

      // 1. Drop old enum type if exists
      this.logger.log('Checking for old enum types...');
      await queryRunner.query(`DROP TYPE IF EXISTS product_type_old CASCADE`);
      await queryRunner.query(`DROP TYPE IF EXISTS table_status_old CASCADE`);
      this.logger.log('Old enum types cleaned up');

      // 2. Create table_status enum if not exists
      this.logger.log('Creating table_status enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning', 'maintenance');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // 3. Check if areas table exists
      const areasExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'areas'
        );
      `);

      if (!areasExists[0].exists) {
        this.logger.log('Creating areas table...');
        await queryRunner.query(`
          CREATE TABLE areas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            branch_id UUID NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_areas_tenant_id ON areas(tenant_id);
          CREATE INDEX idx_areas_tenant_branch ON areas(tenant_id, branch_id);
        `);
        this.logger.log('Areas table created successfully');
      }

      // 4. Check if tables table exists
      const tablesExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'tables'
        );
      `);

      if (!tablesExists[0].exists) {
        this.logger.log('Creating tables table...');
        await queryRunner.query(`
          CREATE TABLE tables (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            branch_id UUID NOT NULL,
            area_id UUID NOT NULL,
            name VARCHAR(50) NOT NULL,
            capacity INTEGER DEFAULT 4,
            status table_status NOT NULL DEFAULT 'available',
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_tables_tenant_id ON tables(tenant_id);
          CREATE INDEX idx_tables_tenant_branch ON tables(tenant_id, branch_id);
          CREATE INDEX idx_tables_tenant_area ON tables(tenant_id, area_id);
        `);
        this.logger.log('Tables table created successfully');
      }

      // 5. Create selling_type enum if not exists
      this.logger.log('Creating selling_type enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE selling_type AS ENUM ('portion', 'weight');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // 6. Add new columns to products table
      const hasPreparationTime = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'preparation_time'
        );
      `);

      if (!hasPreparationTime[0].exists) {
        this.logger.log('Adding new columns to products table...');
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS selling_type selling_type DEFAULT 'portion',
          ADD COLUMN IF NOT EXISTS unit VARCHAR(50),
          ADD COLUMN IF NOT EXISTS print_dish BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS print_label BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS print_seafood BOOLEAN DEFAULT FALSE
        `);
        this.logger.log('New columns added to products table');
      }

      // 7. Check if product_notes table exists
      const productNotesExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'product_notes'
        );
      `);

      if (!productNotesExists[0].exists) {
        this.logger.log('Creating product_notes table...');
        await queryRunner.query(`
          CREATE TABLE product_notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_product_notes_tenant ON product_notes(tenant_id);
        `);
        this.logger.log('Product notes table created successfully');
      }

      // 8. Check if product_note_assignments table exists
      const noteAssignmentsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'product_note_assignments'
        );
      `);

      if (!noteAssignmentsExists[0].exists) {
        this.logger.log('Creating product_note_assignments table...');
        await queryRunner.query(`
          CREATE TABLE product_note_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            note_id UUID NOT NULL REFERENCES product_notes(id) ON DELETE CASCADE,
            sort_order INTEGER DEFAULT 0,
            UNIQUE(product_id, note_id)
          );
          CREATE INDEX idx_product_note_assignments_tenant ON product_note_assignments(tenant_id);
          CREATE INDEX idx_product_note_assignments_product ON product_note_assignments(tenant_id, product_id);
        `);
        this.logger.log('Product note assignments table created successfully');
      }

      // 9. Migrate to shared topping groups structure
      // Check if topping_groups has product_id column (old structure)
      const hasProductIdInToppingGroups = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'topping_groups' AND column_name = 'product_id'
        );
      `);

      if (hasProductIdInToppingGroups[0].exists) {
        this.logger.log('Migrating topping_groups to shared structure...');
        // Drop old tables and recreate with new structure
        await queryRunner.query(`DROP TABLE IF EXISTS product_toppings CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS topping_groups CASCADE`);
      }

      // 10. Check if topping_groups table exists (new shared structure)
      const toppingGroupsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'topping_groups'
        );
      `);

      if (!toppingGroupsExists[0].exists) {
        this.logger.log('Creating shared topping_groups table...');
        await queryRunner.query(`
          CREATE TABLE topping_groups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            is_required BOOLEAN DEFAULT FALSE,
            min_selection INTEGER DEFAULT 0,
            max_selection INTEGER DEFAULT 10,
            is_active BOOLEAN DEFAULT TRUE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_topping_groups_tenant ON topping_groups(tenant_id);
        `);
        this.logger.log('Shared topping_groups table created successfully');
      }

      // 11. Check if topping_group_items table exists
      const toppingGroupItemsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'topping_group_items'
        );
      `);

      if (!toppingGroupItemsExists[0].exists) {
        this.logger.log('Creating topping_group_items table...');
        await queryRunner.query(`
          CREATE TABLE topping_group_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            group_id UUID NOT NULL REFERENCES topping_groups(id) ON DELETE CASCADE,
            topping_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            price_adjustment DECIMAL(15,2) DEFAULT 0,
            max_quantity INTEGER DEFAULT 5,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(group_id, topping_id)
          );
          CREATE INDEX idx_topping_group_items_tenant ON topping_group_items(tenant_id);
          CREATE INDEX idx_topping_group_items_group ON topping_group_items(tenant_id, group_id);
        `);
        this.logger.log('Topping group items table created successfully');
      }

      // 12. Check if product_topping_groups table exists (junction table)
      const productToppingGroupsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'product_topping_groups'
        );
      `);

      if (!productToppingGroupsExists[0].exists) {
        this.logger.log('Creating product_topping_groups junction table...');
        await queryRunner.query(`
          CREATE TABLE product_topping_groups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            group_id UUID NOT NULL REFERENCES topping_groups(id) ON DELETE CASCADE,
            sort_order INTEGER DEFAULT 0,
            UNIQUE(product_id, group_id)
          );
          CREATE INDEX idx_product_topping_groups_tenant ON product_topping_groups(tenant_id);
          CREATE INDEX idx_product_topping_groups_product ON product_topping_groups(tenant_id, product_id);
        `);
        this.logger.log('Product topping groups junction table created successfully');
      }

      // 13. Check if kitchens table exists
      const kitchensExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'kitchens'
        );
      `);

      if (!kitchensExists[0].exists) {
        this.logger.log('Creating kitchens table...');
        await queryRunner.query(`
          CREATE TABLE kitchens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            branch_id UUID NOT NULL,
            name VARCHAR(100) NOT NULL,
            printer_name VARCHAR(100),
            printer_ip VARCHAR(50),
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_kitchens_tenant ON kitchens(tenant_id);
          CREATE INDEX idx_kitchens_tenant_branch ON kitchens(tenant_id, branch_id);
        `);
        this.logger.log('Kitchens table created successfully');
      }

      // 15. Check if units table exists
      const unitsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'units'
        );
      `);

      if (!unitsExists[0].exists) {
        this.logger.log('Creating units table...');
        await queryRunner.query(`
          CREATE TABLE units (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            brand_id UUID NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_units_tenant ON units(tenant_id);
          CREATE INDEX idx_units_tenant_brand ON units(tenant_id, brand_id);
        `);
        this.logger.log('Units table created successfully');
      }

      // 16. Check if product_kitchens table exists
      const productKitchensExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'product_kitchens'
        );
      `);

      if (!productKitchensExists[0].exists) {
        this.logger.log('Creating product_kitchens table...');
        await queryRunner.query(`
          CREATE TABLE product_kitchens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            kitchen_id UUID NOT NULL REFERENCES kitchens(id) ON DELETE CASCADE,
            UNIQUE(product_id, kitchen_id)
          );
          CREATE INDEX idx_product_kitchens_tenant ON product_kitchens(tenant_id);
          CREATE INDEX idx_product_kitchens_product ON product_kitchens(tenant_id, product_id);
          CREATE INDEX idx_product_kitchens_kitchen ON product_kitchens(tenant_id, kitchen_id);
        `);
        this.logger.log('Product kitchens table created successfully');
      }

      // 17. Create print_mode enum if not exists
      this.logger.log('Creating print_mode enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE print_mode AS ENUM ('individual', 'list');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // 18. Add new columns to kitchens table
      const hasPrinterPort = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'kitchens' AND column_name = 'printer_port'
        );
      `);

      if (!hasPrinterPort[0].exists) {
        this.logger.log('Adding printer config columns to kitchens table...');
        await queryRunner.query(`
          ALTER TABLE kitchens
          ADD COLUMN IF NOT EXISTS printer_port INTEGER DEFAULT 9100,
          ADD COLUMN IF NOT EXISTS paper_size VARCHAR(50) DEFAULT '80mm',
          ADD COLUMN IF NOT EXISTS print_mode print_mode DEFAULT 'list'
        `);
        this.logger.log('Printer config columns added to kitchens table');
      }

      // 19. Convert paper_size from enum to varchar if needed
      const paperSizeType = await queryRunner.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'kitchens' AND column_name = 'paper_size'
      `);
      if (paperSizeType.length > 0 && paperSizeType[0].data_type === 'USER-DEFINED') {
        this.logger.log('Converting paper_size from enum to varchar...');
        await queryRunner.query(`
          ALTER TABLE kitchens
          ALTER COLUMN paper_size TYPE VARCHAR(50) USING paper_size::text
        `);
        this.logger.log('paper_size column converted to varchar');
      }

      // 19.1. Add kitchen_type column to kitchens table
      const hasKitchenType = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'kitchens' AND column_name = 'kitchen_type'
        );
      `);

      if (!hasKitchenType[0].exists) {
        this.logger.log('Adding kitchen_type column to kitchens table...');
        await queryRunner.query(`
          ALTER TABLE kitchens
          ADD COLUMN kitchen_type VARCHAR(50) DEFAULT 'kitchen'
        `);
        this.logger.log('kitchen_type column added to kitchens table');
      }

      // 19.2. Add paper_width column to kitchens table (integer for mm)
      const hasPaperWidth = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'kitchens' AND column_name = 'paper_width'
        );
      `);

      if (!hasPaperWidth[0].exists) {
        this.logger.log('Adding paper_width column to kitchens table...');
        await queryRunner.query(`
          ALTER TABLE kitchens
          ADD COLUMN paper_width INTEGER DEFAULT 80
        `);
        this.logger.log('paper_width column added to kitchens table');
      }

      // 19.3. Update print_mode to new values (TICKET, LABEL, BOTH)
      const printModeType = await queryRunner.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'kitchens' AND column_name = 'print_mode'
      `);

      if (printModeType.length > 0) {
        this.logger.log('Updating print_mode column to support new values...');
        // First convert to varchar if it's an enum
        if (printModeType[0].data_type === 'USER-DEFINED') {
          await queryRunner.query(`
            ALTER TABLE kitchens
            ALTER COLUMN print_mode TYPE VARCHAR(20) USING
              CASE
                WHEN print_mode::text = 'list' THEN 'TICKET'
                WHEN print_mode::text = 'individual' THEN 'LABEL'
                ELSE 'TICKET'
              END
          `);
        } else {
          // If already varchar, just update the values
          await queryRunner.query(`
            UPDATE kitchens SET print_mode = 'TICKET' WHERE print_mode = 'list' OR print_mode IS NULL
          `);
          await queryRunner.query(`
            UPDATE kitchens SET print_mode = 'LABEL' WHERE print_mode = 'individual'
          `);
        }

        // Set new default
        await queryRunner.query(`
          ALTER TABLE kitchens
          ALTER COLUMN print_mode SET DEFAULT 'TICKET'
        `);

        this.logger.log('print_mode column updated to support TICKET/LABEL/BOTH');
      }

      // Drop old print_mode enum if exists
      await queryRunner.query(`DROP TYPE IF EXISTS print_mode CASCADE`);

      // 20. Add parent_id column to departments table for hierarchy support
      const hasParentId = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'departments' AND column_name = 'parent_id'
        );
      `);

      if (!hasParentId[0].exists) {
        this.logger.log('Adding parent_id column to departments table...');
        await queryRunner.query(`
          ALTER TABLE departments
          ADD COLUMN parent_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_department_parent ON departments(parent_id)
        `);
        this.logger.log('parent_id column added to departments table');
      }

      // 21. Check if department_permissions table exists
      const deptPermissionsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'department_permissions'
        );
      `);

      if (!deptPermissionsExists[0].exists) {
        this.logger.log('Creating department_permissions table...');
        await queryRunner.query(`
          CREATE TABLE department_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
            permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(department_id, permission_id)
          );
          CREATE INDEX idx_dept_perm_tenant ON department_permissions(tenant_id);
          CREATE INDEX idx_dept_perm_department ON department_permissions(department_id);
        `);
        this.logger.log('Department permissions table created successfully');
      }

      // 22. Check if staff_permissions table exists
      const staffPermissionsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'staff_permissions'
        );
      `);

      if (!staffPermissionsExists[0].exists) {
        this.logger.log('Creating staff_permissions table...');
        await queryRunner.query(`
          CREATE TABLE staff_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
            permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(staff_id, permission_id)
          );
          CREATE INDEX idx_staff_perm_tenant ON staff_permissions(tenant_id);
          CREATE INDEX idx_staff_perm_staff ON staff_permissions(staff_id);
        `);
        this.logger.log('Staff permissions table created successfully');
      }

      // 22.5. Check if staff_branches table exists
      const staffBranchesExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'staff_branches'
        );
      `);

      if (!staffBranchesExists[0].exists) {
        this.logger.log('Creating staff_branches table...');
        await queryRunner.query(`
          CREATE TABLE staff_branches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
            branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
            brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
            is_default BOOLEAN DEFAULT FALSE,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(staff_id, branch_id)
          );
          CREATE INDEX idx_staff_branches_tenant ON staff_branches(tenant_id);
          CREATE INDEX idx_staff_branches_staff ON staff_branches(staff_id);
          CREATE INDEX idx_staff_branches_branch ON staff_branches(branch_id);
        `);
        this.logger.log('Staff branches table created successfully');
      }

      // 23. Seed F&B permissions
      await this.seedFnBPermissions(queryRunner);

      // 24. Create combo_items table for combo products
      const comboItemsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'combo_items'
        );
      `);

      if (!comboItemsExists[0].exists) {
        this.logger.log('Creating combo_items table...');
        await queryRunner.query(`
          CREATE TABLE combo_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            combo_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(combo_id, product_id)
          );
          CREATE INDEX idx_combo_items_tenant ON combo_items(tenant_id);
          CREATE INDEX idx_combo_items_combo ON combo_items(combo_id);
        `);
        this.logger.log('Combo items table created successfully');
      }

      // 25. Create surcharges table
      const surchargesExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'surcharges'
        );
      `);

      if (!surchargesExists[0].exists) {
        this.logger.log('Creating surcharges table...');
        await queryRunner.query(`
          CREATE TABLE surcharges (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            brand_id UUID NOT NULL,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            amount DECIMAL(15,2) DEFAULT 0,
            vat_rate DECIMAL(5,2) DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_surcharges_tenant ON surcharges(tenant_id);
          CREATE INDEX idx_surcharges_tenant_brand ON surcharges(tenant_id, brand_id);
        `);
        this.logger.log('Surcharges table created successfully');
      }

      // 26. Create adjustment_type enum and seasonal_prices table
      this.logger.log('Creating adjustment_type enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE adjustment_type AS ENUM ('percentage', 'fixed');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      const seasonalPricesExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'seasonal_prices'
        );
      `);

      if (!seasonalPricesExists[0].exists) {
        this.logger.log('Creating seasonal_prices table...');
        await queryRunner.query(`
          CREATE TABLE seasonal_prices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            branch_id UUID NOT NULL ,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            adjustment_type adjustment_type DEFAULT 'percentage',
            adjustment_value DECIMAL(15,2) DEFAULT 0,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_seasonal_prices_tenant ON seasonal_prices(tenant_id);
          CREATE INDEX idx_seasonal_prices_tenant_branch ON seasonal_prices(tenant_id, branch_id);
        `);
        this.logger.log('Seasonal prices table created successfully');
      }

      // 27. Create gift_items table
      const giftItemsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'gift_items'
        );
      `);

      if (!giftItemsExists[0].exists) {
        this.logger.log('Creating gift_items table...');
        await queryRunner.query(`
          CREATE TABLE gift_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            branch_id UUID NOT NULL ,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            product_id UUID REFERENCES products(id) ON DELETE SET NULL,
            max_quantity INTEGER DEFAULT 1,
            min_order_amount DECIMAL(15,2) DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_gift_items_tenant ON gift_items(tenant_id);
          CREATE INDEX idx_gift_items_tenant_branch ON gift_items(tenant_id, branch_id);
        `);
        this.logger.log('Gift items table created successfully');
      }

      // 28. Create voucher_type enum and vouchers table
      this.logger.log('Creating voucher_type enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE voucher_type AS ENUM ('percentage', 'fixed');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      const vouchersExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'vouchers'
        );
      `);

      if (!vouchersExists[0].exists) {
        this.logger.log('Creating vouchers table...');
        await queryRunner.query(`
          CREATE TABLE vouchers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            brand_id UUID NOT NULL ,
            code VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            voucher_type voucher_type DEFAULT 'percentage',
            discount_value DECIMAL(15,2) DEFAULT 0,
            max_discount DECIMAL(15,2),
            min_order_amount DECIMAL(15,2) DEFAULT 0,
            usage_limit INTEGER,
            usage_count INTEGER DEFAULT 0,
            start_date DATE,
            end_date DATE,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_vouchers_tenant ON vouchers(tenant_id);
          CREATE INDEX idx_vouchers_tenant_brand ON vouchers(tenant_id, brand_id);
          CREATE INDEX idx_vouchers_code ON vouchers(code);
        `);
        this.logger.log('Vouchers table created successfully');
      }

      // 29. Create seasonal_price_products junction table
      const seasonalPriceProductsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'seasonal_price_products'
        );
      `);

      if (!seasonalPriceProductsExists[0].exists) {
        this.logger.log('Creating seasonal_price_products table...');
        await queryRunner.query(`
          CREATE TABLE seasonal_price_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            seasonal_price_id UUID NOT NULL REFERENCES seasonal_prices(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(seasonal_price_id, product_id)
          );
          CREATE INDEX idx_seasonal_price_products_tenant ON seasonal_price_products(tenant_id);
          CREATE INDEX idx_seasonal_price_products_tenant_sp ON seasonal_price_products(tenant_id, seasonal_price_id);
          CREATE INDEX idx_seasonal_price_products_tenant_prod ON seasonal_price_products(tenant_id, product_id);
        `);
        this.logger.log('Seasonal price products table created successfully');
      }

      // 30. Create coupon_type enum and coupons table
      this.logger.log('Creating coupon_type enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      const couponsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'coupons'
        );
      `);

      if (!couponsExists[0].exists) {
        this.logger.log('Creating coupons table...');
        await queryRunner.query(`
          CREATE TABLE coupons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            branch_id UUID NOT NULL ,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            coupon_type coupon_type DEFAULT 'percentage',
            discount_value DECIMAL(15,2) DEFAULT 0,
            max_discount DECIMAL(15,2),
            min_order_amount DECIMAL(15,2) DEFAULT 0,
            usage_limit INTEGER,
            usage_count INTEGER DEFAULT 0,
            daily_limit INTEGER,
            daily_usage_count INTEGER DEFAULT 0,
            last_usage_date DATE,
            requires_approval BOOLEAN DEFAULT FALSE,
            approval_threshold DECIMAL(15,2),
            start_date DATE,
            end_date DATE,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_coupons_tenant ON coupons(tenant_id);
          CREATE INDEX idx_coupons_tenant_branch ON coupons(tenant_id, branch_id);
          CREATE INDEX idx_coupons_code ON coupons(code);
        `);
        this.logger.log('Coupons table created successfully');
      }

      // 31. Create branch_products table
      const branchProductsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'branch_products'
        );
      `);

      if (!branchProductsExists[0].exists) {
        this.logger.log('Creating branch_products table...');
        await queryRunner.query(`
          CREATE TABLE branch_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            branch_id UUID NOT NULL ,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            is_available BOOLEAN DEFAULT TRUE,
            custom_price DECIMAL(15,2),
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(branch_id, product_id)
          );
          CREATE INDEX idx_branch_products_tenant ON branch_products(tenant_id);
          CREATE INDEX idx_branch_products_tenant_branch ON branch_products(tenant_id, branch_id);
          CREATE INDEX idx_branch_products_tenant_product ON branch_products(tenant_id, product_id);
        `);
        this.logger.log('Branch products table created successfully');
      }

      // 32. Create uploaded_file_type enum and uploaded_files table
      this.logger.log('Creating uploaded_file_type enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE uploaded_file_type AS ENUM ('image', 'video', 'document', 'other');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      const uploadedFilesExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'uploaded_files'
        );
      `);

      if (!uploadedFilesExists[0].exists) {
        this.logger.log('Creating uploaded_files table...');
        await queryRunner.query(`
          CREATE TABLE uploaded_files (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50),
            original_name VARCHAR(500) NOT NULL,
            file_name VARCHAR(500) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            file_size BIGINT NOT NULL,
            file_type uploaded_file_type DEFAULT 'other',
            bucket VARCHAR(100) NOT NULL,
            object_name VARCHAR(500) NOT NULL,
            full_url TEXT NOT NULL,
            short_code VARCHAR(16) NOT NULL UNIQUE,
            folder VARCHAR(200),
            uploaded_by VARCHAR(50),
            is_public BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_uploaded_files_tenant ON uploaded_files(tenant_id);
          CREATE INDEX idx_uploaded_files_short_code ON uploaded_files(short_code);
          CREATE INDEX idx_uploaded_files_file_type ON uploaded_files(file_type);
        `);
        this.logger.log('Uploaded files table created successfully');
      }

      // 33. Create payment_method_type enum and payment_methods table
      this.logger.log('Creating payment_method_type enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE payment_method_type AS ENUM ('cash', 'bank_transfer', 'credit_card', 'e_wallet', 'qr_code');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      const paymentMethodsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'payment_methods'
        );
      `);

      if (!paymentMethodsExists[0].exists) {
        this.logger.log('Creating payment_methods table...');
        await queryRunner.query(`
          CREATE TABLE payment_methods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            brand_id UUID NOT NULL ,
            name VARCHAR(100) NOT NULL,
            type payment_method_type NOT NULL,
            description TEXT,
            icon_url TEXT,
            config JSONB,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_payment_methods_tenant ON payment_methods(tenant_id);
          CREATE INDEX idx_payment_methods_tenant_brand ON payment_methods(tenant_id, brand_id);
        `);
        this.logger.log('Payment methods table created successfully');
      }

      // 34. Create bank_accounts table
      const bankAccountsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'bank_accounts'
        );
      `);

      if (!bankAccountsExists[0].exists) {
        this.logger.log('Creating bank_accounts table...');
        await queryRunner.query(`
          CREATE TABLE bank_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            brand_id UUID NOT NULL ,
            branch_id UUID ,
            bank_code VARCHAR(50) NOT NULL,
            bank_name VARCHAR(255) NOT NULL,
            account_number VARCHAR(50) NOT NULL,
            account_name VARCHAR(255) NOT NULL,
            bank_bin VARCHAR(20),
            transfer_template VARCHAR(255),
            webhook_url TEXT,
            webhook_secret VARCHAR(255),
            api_key VARCHAR(255),
            api_secret VARCHAR(255),
            static_qr_url TEXT,
            is_primary BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_bank_accounts_tenant ON bank_accounts(tenant_id);
          CREATE INDEX idx_bank_accounts_tenant_brand ON bank_accounts(tenant_id, brand_id);
        `);
        this.logger.log('Bank accounts table created successfully');
      }

      // 35. Create einvoice_provider enum and einvoice_configs table
      this.logger.log('Creating einvoice_provider enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE einvoice_provider AS ENUM ('fpt', 'vnpt', 'misa', 'viettel', 'mifi', 'invoice', 'hilo');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      const einvoiceConfigsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'einvoice_configs'
        );
      `);

      if (!einvoiceConfigsExists[0].exists) {
        this.logger.log('Creating einvoice_configs table...');
        await queryRunner.query(`
          CREATE TABLE einvoice_configs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            brand_id UUID NOT NULL ,
            branch_id UUID ,
            provider einvoice_provider NOT NULL,
            tax_code VARCHAR(20) NOT NULL,
            company_name VARCHAR(255) NOT NULL,
            company_address TEXT,
            invoice_template VARCHAR(50),
            invoice_series VARCHAR(20),
            api_url TEXT,
            api_username VARCHAR(255),
            api_password VARCHAR(255),
            api_token TEXT,
            config JSONB,
            auto_issue BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_einvoice_configs_tenant ON einvoice_configs(tenant_id);
          CREATE INDEX idx_einvoice_configs_tenant_brand ON einvoice_configs(tenant_id, brand_id);
        `);
        this.logger.log('E-Invoice configs table created successfully');
      }

      // 36. Create transaction_type enum
      this.logger.log('Creating transaction_type enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE transaction_type AS ENUM ('income', 'expense');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // 37. Create transaction_voucher_status enum
      this.logger.log('Creating transaction_voucher_status enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE transaction_voucher_status AS ENUM ('draft', 'pending', 'approved', 'cancelled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // 38. Create transaction_payment_type enum
      this.logger.log('Creating transaction_payment_type enum...');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE transaction_payment_type AS ENUM ('cash', 'bank');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // 39. Create transaction_categories table
      const transactionCategoriesExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'transaction_categories'
        );
      `);

      if (!transactionCategoriesExists[0].exists) {
        this.logger.log('Creating transaction_categories table...');
        await queryRunner.query(`
          CREATE TABLE transaction_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            code VARCHAR(50) NOT NULL,
            type transaction_type NOT NULL,
            description TEXT,
            is_system BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_transaction_categories_tenant ON transaction_categories(tenant_id);
          CREATE INDEX idx_transaction_categories_type ON transaction_categories(tenant_id, type);
          CREATE INDEX idx_transaction_categories_code ON transaction_categories(tenant_id, code);
        `);
        this.logger.log('Transaction categories table created successfully');
      }

      // 40. Create transaction_vouchers table
      const transactionVouchersExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'transaction_vouchers'
        );
      `);

      if (!transactionVouchersExists[0].exists) {
        this.logger.log('Creating transaction_vouchers table...');
        await queryRunner.query(`
          CREATE TABLE transaction_vouchers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            brand_id UUID NOT NULL,
            branch_id UUID NOT NULL,
            voucher_number VARCHAR(50) NOT NULL,
            transaction_type transaction_type NOT NULL,
            voucher_date DATE NOT NULL,
            category_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL,
            amount DECIMAL(15,2) NOT NULL DEFAULT 0,
            payment_type transaction_payment_type NOT NULL DEFAULT 'cash',
            payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
            bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
            counterparty_name VARCHAR(255),
            counterparty_address TEXT,
            counterparty_tax_code VARCHAR(50),
            reason TEXT NOT NULL,
            notes TEXT,
            attachments JSONB,
            status transaction_voucher_status NOT NULL DEFAULT 'draft',
            created_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
            approved_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
            approved_at TIMESTAMP,
            cancelled_reason TEXT,
            reference_code VARCHAR(100),
            reference_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_transaction_vouchers_tenant ON transaction_vouchers(tenant_id);
          CREATE INDEX idx_transaction_vouchers_branch ON transaction_vouchers(tenant_id, branch_id);
          CREATE INDEX idx_transaction_vouchers_type ON transaction_vouchers(tenant_id, transaction_type);
          CREATE INDEX idx_transaction_vouchers_status ON transaction_vouchers(tenant_id, status);
          CREATE INDEX idx_transaction_vouchers_date ON transaction_vouchers(tenant_id, voucher_date);
          CREATE INDEX idx_transaction_vouchers_number ON transaction_vouchers(voucher_number);
        `);
        this.logger.log('Transaction vouchers table created successfully');
      }

      // 41. Add item discount columns to bill_templates table
      const hasBillTemplatesTable = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'bill_templates'
        );
      `);

      if (hasBillTemplatesTable[0].exists) {
        const hasShowItemDiscount = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'bill_templates' AND column_name = 'show_item_discount'
          );
        `);

        if (!hasShowItemDiscount[0].exists) {
          this.logger.log('Adding item discount columns to bill_templates table...');
          await queryRunner.query(`
            ALTER TABLE bill_templates
            ADD COLUMN IF NOT EXISTS show_item_discount BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS show_total_item_discount BOOLEAN DEFAULT TRUE
          `);
          this.logger.log('Item discount columns added to bill_templates table');
        }
      }

      this.logger.log('Database migration completed successfully');
    } catch (error) {
      this.logger.error('Database migration failed:', error.message);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create base tables for microservices architecture
   * These tables store local copies of master data (synced from api-admin/techres_master)
   * No foreign key constraints to external databases
   */
  private async createBaseTables(queryRunner: any) {
    // Create companies table
    const companiesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'companies'
      );
    `);

    if (!companiesExists[0].exists) {
      this.logger.log('Creating companies table...');
      await queryRunner.query(`
        CREATE TABLE companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          logo_url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_companies_code ON companies(code);
      `);
      this.logger.log('Companies table created successfully');
    }

    // Create brands table
    const brandsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'brands'
      );
    `);

    if (!brandsExists[0].exists) {
      this.logger.log('Creating brands table...');
      await queryRunner.query(`
        CREATE TABLE brands (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(50) NOT NULL,
          company_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          logo_url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_brands_tenant ON brands(tenant_id);
        CREATE INDEX idx_brands_company ON brands(company_id);
      `);
      this.logger.log('Brands table created successfully');
    }

    // Create branches table
    const branchesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'branches'
      );
    `);

    if (!branchesExists[0].exists) {
      this.logger.log('Creating branches table...');
      await queryRunner.query(`
        CREATE TABLE branches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(50) NOT NULL,
          brand_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          phone VARCHAR(20),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_branches_tenant ON branches(tenant_id);
        CREATE INDEX idx_branches_brand ON branches(brand_id);
      `);
      this.logger.log('Branches table created successfully');
    }

    // Create departments table
    const departmentsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'departments'
      );
    `);

    if (!departmentsExists[0].exists) {
      this.logger.log('Creating departments table...');
      await queryRunner.query(`
        CREATE TABLE departments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(50) NOT NULL,
          branch_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          parent_id UUID,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_departments_tenant ON departments(tenant_id);
        CREATE INDEX idx_departments_branch ON departments(branch_id);
        CREATE INDEX idx_departments_parent ON departments(parent_id);
      `);
      this.logger.log('Departments table created successfully');
    }

    // Create staff table
    const staffExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'staff'
      );
    `);

    if (!staffExists[0].exists) {
      this.logger.log('Creating staff table...');
      await queryRunner.query(`
        CREATE TABLE staff (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(50) NOT NULL,
          branch_id UUID NOT NULL,
          department_id UUID,
          code VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(255),
          avatar_url TEXT,
          role VARCHAR(50) DEFAULT 'staff',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_staff_tenant ON staff(tenant_id);
        CREATE INDEX idx_staff_branch ON staff(branch_id);
        CREATE INDEX idx_staff_department ON staff(department_id);
      `);
      this.logger.log('Staff table created successfully');
    }

    // Create permissions table
    const permissionsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'permissions'
      );
    `);

    if (!permissionsExists[0].exists) {
      this.logger.log('Creating permissions table...');
      await queryRunner.query(`
        CREATE TABLE permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(100) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          module VARCHAR(100),
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_permissions_code ON permissions(code);
        CREATE INDEX idx_permissions_module ON permissions(module);
      `);
      this.logger.log('Permissions table created successfully');
    }

    // Create categories table
    const categoriesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'categories'
      );
    `);

    if (!categoriesExists[0].exists) {
      this.logger.log('Creating categories table...');
      await queryRunner.query(`
        CREATE TABLE categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(50) NOT NULL,
          brand_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          image_url TEXT,
          parent_id UUID,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_categories_tenant ON categories(tenant_id);
        CREATE INDEX idx_categories_brand ON categories(brand_id);
        CREATE INDEX idx_categories_parent ON categories(parent_id);
      `);
      this.logger.log('Categories table created successfully');
    }

    // Create products table
    const productsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'products'
      );
    `);

    if (!productsExists[0].exists) {
      this.logger.log('Creating products table...');
      await queryRunner.query(`
        CREATE TYPE product_type AS ENUM ('single', 'combo', 'topping', 'raw_material');
        CREATE TABLE products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(50) NOT NULL,
          brand_id UUID NOT NULL,
          category_id UUID,
          code VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          image_url TEXT,
          price DECIMAL(15,2) DEFAULT 0,
          product_type product_type DEFAULT 'single',
          is_available BOOLEAN DEFAULT TRUE,
          is_active BOOLEAN DEFAULT TRUE,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_products_tenant ON products(tenant_id);
        CREATE INDEX idx_products_brand ON products(brand_id);
        CREATE INDEX idx_products_category ON products(category_id);
        CREATE INDEX idx_products_code ON products(code);
      `);
      this.logger.log('Products table created successfully');
    }

    // Create provinces table (for location data)
    const provincesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'provinces'
      );
    `);

    if (!provincesExists[0].exists) {
      this.logger.log('Creating provinces table...');
      await queryRunner.query(`
        CREATE TABLE provinces (
          code VARCHAR(20) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          name_en VARCHAR(255),
          full_name VARCHAR(255),
          full_name_en VARCHAR(255),
          code_name VARCHAR(100),
          division_type VARCHAR(50),
          phone_code VARCHAR(10)
        );
        CREATE INDEX idx_provinces_name ON provinces(name);
      `);
      this.logger.log('Provinces table created successfully');
    }

    // Create wards table (for location data - includes both district and ward level)
    const wardsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'wards'
      );
    `);

    if (!wardsExists[0].exists) {
      this.logger.log('Creating wards table...');
      await queryRunner.query(`
        CREATE TABLE wards (
          code VARCHAR(20) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          name_en VARCHAR(255),
          full_name VARCHAR(255),
          full_name_en VARCHAR(255),
          code_name VARCHAR(100),
          division_type VARCHAR(50),
          short_codename VARCHAR(100),
          province_code VARCHAR(20) REFERENCES provinces(code)
        );
        CREATE INDEX idx_wards_name ON wards(name);
        CREATE INDEX idx_wards_province ON wards(province_code);
      `);
      this.logger.log('Wards table created successfully');
    } else {
      // Add short_codename column if missing
      await queryRunner.query(`
        ALTER TABLE wards ADD COLUMN IF NOT EXISTS short_codename VARCHAR(100)
      `);
    }

    this.logger.log('Base tables created successfully');
  }

  /**
   * Add missing columns to base tables for entity compatibility
   * This ensures all columns expected by TypeORM entities exist in the database
   */
  private async addMissingColumnsToBaseTables(queryRunner: any) {
    this.logger.log('Adding missing columns to base tables...');

    // Add missing columns to companies table (match Company entity)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE subscription_plan AS ENUM ('basic', 'standard', 'premium', 'enterprise');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS alias VARCHAR(20),
      ADD COLUMN IF NOT EXISTS tax_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS address_detail TEXT,
      ADD COLUMN IF NOT EXISTS province_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS ward_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS representative VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10
    `);

    // Check if subscription_plan column exists in companies
    const hasSubscriptionPlan = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'subscription_plan'
      );
    `);
    if (!hasSubscriptionPlan[0].exists) {
      await queryRunner.query(`
        ALTER TABLE companies ADD COLUMN subscription_plan subscription_plan DEFAULT 'basic'
      `);
    }

    // Add missing columns to brands table
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE business_model AS ENUM ('full_system', 'ccb_only');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE brands
      ADD COLUMN IF NOT EXISTS code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS description TEXT
    `);

    // Check if business_model column exists
    const hasBrandBusinessModel = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'brands' AND column_name = 'business_model'
      );
    `);
    if (!hasBrandBusinessModel[0].exists) {
      await queryRunner.query(`
        ALTER TABLE brands ADD COLUMN business_model business_model DEFAULT 'full_system'
      `);
    }

    // Add missing columns to branches table
    await queryRunner.query(`
      ALTER TABLE branches
      ADD COLUMN IF NOT EXISTS package_id UUID,
      ADD COLUMN IF NOT EXISTS code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS address_detail TEXT,
      ADD COLUMN IF NOT EXISTS province_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS ward_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS manager VARCHAR(255),
      ADD COLUMN IF NOT EXISTS open_time VARCHAR(10),
      ADD COLUMN IF NOT EXISTS close_time VARCHAR(10),
      ADD COLUMN IF NOT EXISTS max_connections INTEGER DEFAULT 3
    `);

    // Check if business_model column exists in branches
    const hasBranchBusinessModel = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'branches' AND column_name = 'business_model'
      );
    `);
    if (!hasBranchBusinessModel[0].exists) {
      await queryRunner.query(`
        ALTER TABLE branches ADD COLUMN business_model business_model DEFAULT 'ccb_only'
      `);
    }

    // Add missing columns to staff table
    await queryRunner.query(`
      ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS brand_id UUID,
      ADD COLUMN IF NOT EXISTS birth_date DATE,
      ADD COLUMN IF NOT EXISTS gender VARCHAR(10),
      ADD COLUMN IF NOT EXISTS id_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS birth_place VARCHAR(255),
      ADD COLUMN IF NOT EXISTS province_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS district_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS ward_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS username VARCHAR(50),
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
    `);

    // Add missing columns to products table
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'single',
      ADD COLUMN IF NOT EXISTS search_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(50)
    `);

    // Create indexes for search optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_search_name ON products(search_name);
      CREATE INDEX IF NOT EXISTS idx_products_abbreviation ON products(abbreviation);
    `);

    // Add missing columns to categories table
    await queryRunner.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'single'
    `);

    // Add missing columns to departments table
    await queryRunner.query(`
      ALTER TABLE departments
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0
    `);

    this.logger.log('Missing columns added to base tables');
  }

  private async seedFnBPermissions(queryRunner: any) {
    this.logger.log('Seeding F&B permissions...');

    const permissions = [
      // Dashboard
      { code: 'dashboard.view', name: 'Xem tổng quan', module: 'Dashboard', description: 'Xem báo cáo tổng quan doanh thu' },

      // Đơn hàng (Orders)
      { code: 'orders.view', name: 'Xem đơn hàng', module: 'Đơn hàng', description: 'Xem danh sách đơn hàng' },
      { code: 'orders.create', name: 'Tạo đơn hàng', module: 'Đơn hàng', description: 'Tạo đơn hàng mới' },
      { code: 'orders.edit', name: 'Sửa đơn hàng', module: 'Đơn hàng', description: 'Chỉnh sửa đơn hàng' },
      { code: 'orders.cancel', name: 'Hủy đơn hàng', module: 'Đơn hàng', description: 'Hủy đơn hàng' },
      { code: 'orders.discount', name: 'Giảm giá đơn hàng', module: 'Đơn hàng', description: 'Áp dụng giảm giá cho đơn hàng' },
      { code: 'orders.void', name: 'Void món', module: 'Đơn hàng', description: 'Void/xóa món trong đơn hàng' },
      { code: 'orders.transfer', name: 'Chuyển bàn', module: 'Đơn hàng', description: 'Chuyển đơn sang bàn khác' },
      { code: 'orders.merge', name: 'Gộp bàn', module: 'Đơn hàng', description: 'Gộp nhiều bàn thành một' },
      { code: 'orders.split', name: 'Tách hóa đơn', module: 'Đơn hàng', description: 'Tách một hóa đơn thành nhiều' },

      // Thanh toán (Payments)
      { code: 'payments.process', name: 'Thanh toán', module: 'Thanh toán', description: 'Xử lý thanh toán' },
      { code: 'payments.refund', name: 'Hoàn tiền', module: 'Thanh toán', description: 'Thực hiện hoàn tiền' },
      { code: 'payments.view_history', name: 'Xem lịch sử thanh toán', module: 'Thanh toán', description: 'Xem lịch sử thanh toán' },

      // Bàn (Tables)
      { code: 'tables.view', name: 'Xem bàn', module: 'Bàn', description: 'Xem sơ đồ bàn' },
      { code: 'tables.manage', name: 'Quản lý bàn', module: 'Bàn', description: 'Thêm, sửa, xóa bàn' },
      { code: 'tables.manage_areas', name: 'Quản lý khu vực', module: 'Bàn', description: 'Thêm, sửa, xóa khu vực' },

      // Thực đơn (Menu)
      { code: 'menu.view', name: 'Xem thực đơn', module: 'Thực đơn', description: 'Xem danh sách món' },
      { code: 'menu.manage_products', name: 'Quản lý món', module: 'Thực đơn', description: 'Thêm, sửa, xóa món' },
      { code: 'menu.manage_categories', name: 'Quản lý danh mục', module: 'Thực đơn', description: 'Thêm, sửa, xóa danh mục' },
      { code: 'menu.manage_toppings', name: 'Quản lý topping', module: 'Thực đơn', description: 'Quản lý nhóm topping' },
      { code: 'menu.manage_notes', name: 'Quản lý ghi chú', module: 'Thực đơn', description: 'Quản lý ghi chú món ăn' },
      { code: 'menu.change_price', name: 'Thay đổi giá', module: 'Thực đơn', description: 'Thay đổi giá bán món' },
      { code: 'menu.toggle_availability', name: 'Bật/tắt món', module: 'Thực đơn', description: 'Bật hoặc tắt trạng thái món' },

      // Bếp (Kitchen)
      { code: 'kitchen.view', name: 'Xem bếp', module: 'Bếp', description: 'Xem màn hình bếp' },
      { code: 'kitchen.manage', name: 'Quản lý bếp', module: 'Bếp', description: 'Thêm, sửa, xóa bếp/trạm' },
      { code: 'kitchen.complete_order', name: 'Hoàn thành món', module: 'Bếp', description: 'Đánh dấu món đã làm xong' },

      // Kho hàng (Inventory)
      { code: 'inventory.view', name: 'Xem tồn kho', module: 'Kho hàng', description: 'Xem số lượng tồn kho' },
      { code: 'inventory.import', name: 'Nhập kho', module: 'Kho hàng', description: 'Tạo phiếu nhập kho' },
      { code: 'inventory.export', name: 'Xuất kho', module: 'Kho hàng', description: 'Tạo phiếu xuất kho' },
      { code: 'inventory.transfer', name: 'Chuyển kho', module: 'Kho hàng', description: 'Chuyển hàng giữa các kho' },
      { code: 'inventory.stocktake', name: 'Kiểm kê', module: 'Kho hàng', description: 'Thực hiện kiểm kê' },

      // Nhân sự (HR)
      { code: 'hr.view_staff', name: 'Xem nhân viên', module: 'Nhân sự', description: 'Xem danh sách nhân viên' },
      { code: 'hr.manage_staff', name: 'Quản lý nhân viên', module: 'Nhân sự', description: 'Thêm, sửa, xóa nhân viên' },
      { code: 'hr.manage_departments', name: 'Quản lý bộ phận', module: 'Nhân sự', description: 'Thêm, sửa, xóa bộ phận' },
      { code: 'hr.assign_permissions', name: 'Phân quyền', module: 'Nhân sự', description: 'Phân quyền cho nhân viên và bộ phận' },
      { code: 'hr.view_attendance', name: 'Xem chấm công', module: 'Nhân sự', description: 'Xem bảng chấm công' },
      { code: 'hr.manage_attendance', name: 'Quản lý chấm công', module: 'Nhân sự', description: 'Chỉnh sửa chấm công' },
      { code: 'hr.view_salary', name: 'Xem lương', module: 'Nhân sự', description: 'Xem bảng lương' },

      // Khách hàng (Customers)
      { code: 'customers.view', name: 'Xem khách hàng', module: 'Khách hàng', description: 'Xem danh sách khách hàng' },
      { code: 'customers.manage', name: 'Quản lý khách hàng', module: 'Khách hàng', description: 'Thêm, sửa, xóa khách hàng' },
      { code: 'customers.view_points', name: 'Xem điểm thưởng', module: 'Khách hàng', description: 'Xem điểm tích lũy' },
      { code: 'customers.manage_points', name: 'Điều chỉnh điểm', module: 'Khách hàng', description: 'Cộng/trừ điểm khách hàng' },

      // Báo cáo (Reports)
      { code: 'reports.revenue', name: 'Báo cáo doanh thu', module: 'Báo cáo', description: 'Xem báo cáo doanh thu' },
      { code: 'reports.products', name: 'Báo cáo món bán', module: 'Báo cáo', description: 'Xem báo cáo món bán chạy' },
      { code: 'reports.staff', name: 'Báo cáo nhân viên', module: 'Báo cáo', description: 'Xem báo cáo nhân viên' },
      { code: 'reports.inventory', name: 'Báo cáo kho', module: 'Báo cáo', description: 'Xem báo cáo tồn kho' },
      { code: 'reports.export', name: 'Xuất báo cáo', module: 'Báo cáo', description: 'Xuất báo cáo ra file' },

      // Cài đặt (Settings)
      { code: 'settings.view', name: 'Xem cài đặt', module: 'Cài đặt', description: 'Xem cài đặt hệ thống' },
      { code: 'settings.general', name: 'Cài đặt chung', module: 'Cài đặt', description: 'Thay đổi cài đặt chung' },
      { code: 'settings.payment', name: 'Cài đặt thanh toán', module: 'Cài đặt', description: 'Cấu hình phương thức thanh toán' },
      { code: 'settings.printer', name: 'Cài đặt in', module: 'Cài đặt', description: 'Cấu hình máy in' },
      { code: 'settings.units', name: 'Quản lý đơn vị', module: 'Cài đặt', description: 'Quản lý đơn vị tính' },

      // Ca làm việc (Shifts)
      { code: 'shifts.view', name: 'Xem ca làm', module: 'Ca làm việc', description: 'Xem thông tin ca làm việc' },
      { code: 'shifts.open', name: 'Mở ca', module: 'Ca làm việc', description: 'Mở ca làm việc mới' },
      { code: 'shifts.close', name: 'Đóng ca', module: 'Ca làm việc', description: 'Đóng ca và kiểm tiền' },
      { code: 'shifts.cash_in', name: 'Nạp tiền quỹ', module: 'Ca làm việc', description: 'Nạp tiền vào quỹ ca' },
      { code: 'shifts.cash_out', name: 'Rút tiền quỹ', module: 'Ca làm việc', description: 'Rút tiền từ quỹ ca' },
    ];

    for (const perm of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (code, name, module, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET name = $2, module = $3, description = $4`,
        [perm.code, perm.name, perm.module, perm.description],
      );
    }

    this.logger.log(`Seeded ${permissions.length} F&B permissions`);
  }
}
