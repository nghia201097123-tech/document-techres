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
            branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
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

      // 23. Seed F&B permissions
      await this.seedFnBPermissions(queryRunner);

      this.logger.log('Database migration completed successfully');
    } catch (error) {
      this.logger.error('Database migration failed:', error.message);
    } finally {
      await queryRunner.release();
    }
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
