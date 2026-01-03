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
            branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
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
            branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
            area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
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

      // 13. Check if units table exists
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
            brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
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

      this.logger.log('Database migration completed successfully');
    } catch (error) {
      this.logger.error('Database migration failed:', error.message);
    } finally {
      await queryRunner.release();
    }
  }
}
