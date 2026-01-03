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

      // 5. Check if product_toppings table exists
      const productToppingsExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'product_toppings'
        );
      `);

      if (!productToppingsExists[0].exists) {
        this.logger.log('Creating product_toppings table...');
        await queryRunner.query(`
          CREATE TABLE product_toppings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            topping_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            is_required BOOLEAN DEFAULT FALSE,
            max_quantity INTEGER DEFAULT 5,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(product_id, topping_id)
          );
          CREATE INDEX idx_product_toppings_tenant ON product_toppings(tenant_id);
          CREATE INDEX idx_product_toppings_product ON product_toppings(tenant_id, product_id);
        `);
        this.logger.log('Product toppings table created successfully');
      }

      this.logger.log('Database migration completed successfully');
    } catch (error) {
      this.logger.error('Database migration failed:', error.message);
    } finally {
      await queryRunner.release();
    }
  }
}
