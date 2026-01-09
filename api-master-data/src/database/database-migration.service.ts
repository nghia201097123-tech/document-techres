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
      this.logger.log('Starting database migration for api-master-data...');

      // Create categories table
      const categoriesExists = await this.tableExists(queryRunner, 'categories');
      if (!categoriesExists) {
        this.logger.log('Creating categories table...');
        await queryRunner.query(`
          CREATE TABLE categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            branch_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            display_order INT DEFAULT 0,
            image_url TEXT,
            is_active BOOLEAN DEFAULT true,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_categories_branch ON categories(branch_id);
        `);
      } else {
        await this.addColumnIfNotExists(queryRunner, 'categories', 'branch_id', 'UUID');
        await this.addColumnIfNotExists(queryRunner, 'categories', 'description', 'TEXT');
        await this.addColumnIfNotExists(queryRunner, 'categories', 'display_order', 'INT DEFAULT 0');
        await this.addColumnIfNotExists(queryRunner, 'categories', 'image_url', 'TEXT');
        await this.addColumnIfNotExists(queryRunner, 'categories', 'version', 'INT DEFAULT 1');
        await this.addColumnIfNotExists(queryRunner, 'categories', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      }

      // Create products table
      const productsExists = await this.tableExists(queryRunner, 'products');
      if (!productsExists) {
        this.logger.log('Creating products table...');
        await queryRunner.query(`
          CREATE TABLE products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            branch_id UUID NOT NULL,
            category_id UUID,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(12, 2) NOT NULL,
            cost_price DECIMAL(12, 2) DEFAULT 0,
            image_url TEXT,
            unit VARCHAR(20),
            vat_rate DECIMAL(5, 2) DEFAULT 10,
            type VARCHAR(50) DEFAULT 'food',
            is_available BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true,
            display_order INT DEFAULT 0,
            preparation_time INT DEFAULT 0,
            print_to_kitchen BOOLEAN DEFAULT true,
            print_to_bar BOOLEAN DEFAULT false,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_products_branch ON products(branch_id);
          CREATE INDEX idx_products_category ON products(category_id);
        `);
      } else {
        await this.addColumnIfNotExists(queryRunner, 'products', 'branch_id', 'UUID');
        await this.addColumnIfNotExists(queryRunner, 'products', 'cost_price', 'DECIMAL(12,2) DEFAULT 0');
        await this.addColumnIfNotExists(queryRunner, 'products', 'type', "VARCHAR(50) DEFAULT 'food'");
        await this.addColumnIfNotExists(queryRunner, 'products', 'is_available', 'BOOLEAN DEFAULT true');
        await this.addColumnIfNotExists(queryRunner, 'products', 'display_order', 'INT DEFAULT 0');
        await this.addColumnIfNotExists(queryRunner, 'products', 'preparation_time', 'INT DEFAULT 0');
        await this.addColumnIfNotExists(queryRunner, 'products', 'print_to_kitchen', 'BOOLEAN DEFAULT true');
        await this.addColumnIfNotExists(queryRunner, 'products', 'print_to_bar', 'BOOLEAN DEFAULT false');
        await this.addColumnIfNotExists(queryRunner, 'products', 'version', 'INT DEFAULT 1');
        await this.addColumnIfNotExists(queryRunner, 'products', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      }

      // Create areas table
      const areasExists = await this.tableExists(queryRunner, 'areas');
      if (!areasExists) {
        this.logger.log('Creating areas table...');
        await queryRunner.query(`
          CREATE TABLE areas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            branch_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            display_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_areas_branch ON areas(branch_id);
        `);
      } else {
        await this.addColumnIfNotExists(queryRunner, 'areas', 'branch_id', 'UUID');
        await this.addColumnIfNotExists(queryRunner, 'areas', 'description', 'TEXT');
        await this.addColumnIfNotExists(queryRunner, 'areas', 'display_order', 'INT DEFAULT 0');
        await this.addColumnIfNotExists(queryRunner, 'areas', 'version', 'INT DEFAULT 1');
        await this.addColumnIfNotExists(queryRunner, 'areas', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      }

      // Create tables table
      const tablesExists = await this.tableExists(queryRunner, 'tables');
      if (!tablesExists) {
        this.logger.log('Creating tables table...');
        await queryRunner.query(`
          CREATE TABLE tables (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            branch_id UUID NOT NULL,
            area_id UUID,
            name VARCHAR(50) NOT NULL,
            capacity INT DEFAULT 4,
            status VARCHAR(20) DEFAULT 'available',
            display_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_tables_branch ON tables(branch_id);
          CREATE INDEX idx_tables_area ON tables(area_id);
        `);
      } else {
        await this.addColumnIfNotExists(queryRunner, 'tables', 'branch_id', 'UUID');
        await this.addColumnIfNotExists(queryRunner, 'tables', 'display_order', 'INT DEFAULT 0');
        await this.addColumnIfNotExists(queryRunner, 'tables', 'version', 'INT DEFAULT 1');
        await this.addColumnIfNotExists(queryRunner, 'tables', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      }

      // Create staff table
      const staffExists = await this.tableExists(queryRunner, 'staff');
      if (!staffExists) {
        this.logger.log('Creating staff table...');
        await queryRunner.query(`
          CREATE TABLE staff (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            branch_id UUID NOT NULL,
            username VARCHAR(50),
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            email VARCHAR(255),
            pin_code VARCHAR(10),
            role VARCHAR(50) NOT NULL,
            permissions TEXT,
            avatar_url TEXT,
            is_active BOOLEAN DEFAULT true,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_staff_branch ON staff(branch_id);
          CREATE INDEX idx_staff_tenant ON staff(tenant_id);
        `);
      } else {
        await this.addColumnIfNotExists(queryRunner, 'staff', 'tenant_id', 'VARCHAR(50)');
        await this.addColumnIfNotExists(queryRunner, 'staff', 'branch_id', 'UUID');
        await this.addColumnIfNotExists(queryRunner, 'staff', 'email', 'VARCHAR(255)');
        await this.addColumnIfNotExists(queryRunner, 'staff', 'permissions', 'TEXT');
        await this.addColumnIfNotExists(queryRunner, 'staff', 'version', 'INT DEFAULT 1');
        await this.addColumnIfNotExists(queryRunner, 'staff', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      }

      // Create brands table
      const brandsExists = await this.tableExists(queryRunner, 'brands');
      if (!brandsExists) {
        this.logger.log('Creating brands table...');
        await queryRunner.query(`
          CREATE TABLE brands (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50),
            logo_url TEXT,
            is_active BOOLEAN DEFAULT true,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_brands_tenant ON brands(tenant_id);
        `);
      }

      // Create branches table
      const branchesExists = await this.tableExists(queryRunner, 'branches');
      if (!branchesExists) {
        this.logger.log('Creating branches table...');
        await queryRunner.query(`
          CREATE TABLE branches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(50) NOT NULL,
            brand_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            store_code VARCHAR(50),
            address TEXT,
            phone VARCHAR(20),
            status VARCHAR(20) DEFAULT 'active',
            is_active BOOLEAN DEFAULT true,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_branches_tenant ON branches(tenant_id);
          CREATE INDEX idx_branches_brand ON branches(brand_id);
        `);
      }

      // Create staff_branches table
      const staffBranchesExists = await this.tableExists(queryRunner, 'staff_branches');
      if (!staffBranchesExists) {
        this.logger.log('Creating staff_branches table...');
        await queryRunner.query(`
          CREATE TABLE staff_branches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            staff_id UUID NOT NULL,
            branch_id UUID NOT NULL,
            role VARCHAR(50),
            is_default BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(staff_id, branch_id)
          );
          CREATE INDEX idx_staff_branches_staff ON staff_branches(staff_id);
          CREATE INDEX idx_staff_branches_branch ON staff_branches(branch_id);
        `);
      }

      // Create devices table
      const devicesExists = await this.tableExists(queryRunner, 'devices');
      if (!devicesExists) {
        this.logger.log('Creating devices table...');
        await queryRunner.query(`
          CREATE TABLE devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id VARCHAR(255) NOT NULL UNIQUE,
            branch_id UUID NOT NULL,
            device_name VARCHAR(255),
            device_type VARCHAR(50),
            os_version VARCHAR(50),
            app_version VARCHAR(50),
            last_sync_at TIMESTAMP,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_devices_branch ON devices(branch_id);
        `);
      }

      this.logger.log('Database migration completed successfully');
    } catch (error) {
      this.logger.error('Database migration failed:', error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async tableExists(queryRunner: any, tableName: string): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = $1
      );
    `, [tableName]);
    return result[0].exists;
  }

  private async addColumnIfNotExists(
    queryRunner: any,
    tableName: string,
    columnName: string,
    columnDefinition: string
  ): Promise<void> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      );
    `, [tableName, columnName]);

    if (!result[0].exists) {
      this.logger.log(`Adding column ${columnName} to ${tableName}...`);
      await queryRunner.query(`
        ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}
      `);
    }
  }
}
