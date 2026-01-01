-- =============================================
-- TechRes Web Admin Database Schema
-- Database: techres_admin
-- =============================================

-- Create database
-- Run this separately: CREATE DATABASE techres_admin;

-- =============================================
-- COMPANIES
-- =============================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    tax_code VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    representative VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- =============================================
-- BRANDS
-- =============================================
CREATE TYPE business_model AS ENUM ('order_only', 'ccb_only', 'full_system');

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    business_model business_model NOT NULL DEFAULT 'full_system',
    logo TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_brands_company_id ON brands(company_id);
CREATE INDEX idx_brands_code ON brands(code);
CREATE INDEX idx_brands_is_active ON brands(is_active);

-- =============================================
-- PACKAGES (App Food)
-- =============================================
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    max_branches INTEGER NOT NULL DEFAULT 3, -- -1 for unlimited
    monthly_price DECIMAL(15, 2) DEFAULT 0,
    yearly_price DECIMAL(15, 2) DEFAULT 0,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default packages
INSERT INTO packages (name, code, max_branches, monthly_price, yearly_price, features) VALUES
('Basic', 'BASIC', 3, 500000, 5000000, '{"orderManagement": true, "inventoryManagement": false, "reporting": true, "multipleUsers": false, "apiAccess": false, "prioritySupport": false}'),
('Standard', 'STANDARD', 10, 1500000, 15000000, '{"orderManagement": true, "inventoryManagement": true, "reporting": true, "multipleUsers": true, "apiAccess": false, "prioritySupport": false}'),
('Premium', 'PREMIUM', 30, 3000000, 30000000, '{"orderManagement": true, "inventoryManagement": true, "reporting": true, "multipleUsers": true, "apiAccess": true, "prioritySupport": true}'),
('Enterprise', 'ENTERPRISE', -1, 0, 0, '{"orderManagement": true, "inventoryManagement": true, "reporting": true, "multipleUsers": true, "apiAccess": true, "prioritySupport": true}')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- BRANCHES
-- =============================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    package_id UUID REFERENCES packages(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    manager VARCHAR(255),
    open_time TIME,
    close_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_branches_brand_id ON branches(brand_id);
CREATE INDEX idx_branches_package_id ON branches(package_id);
CREATE INDEX idx_branches_code ON branches(code);
CREATE INDEX idx_branches_is_active ON branches(is_active);

-- =============================================
-- TRANSACTION CATEGORIES
-- =============================================
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

CREATE TABLE IF NOT EXISTS transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type transaction_type NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transaction_categories_type ON transaction_categories(type);
CREATE INDEX idx_transaction_categories_is_active ON transaction_categories(is_active);

-- Insert default categories
INSERT INTO transaction_categories (name, code, type, description, is_system) VALUES
('Doanh thu bán hàng', 'SALES_REVENUE', 'income', 'Thu nhập từ bán hàng trực tiếp', true),
('Thu phí dịch vụ', 'SERVICE_FEE', 'income', 'Thu phí dịch vụ đặt bàn, ship...', false),
('Chi phí nguyên vật liệu', 'RAW_MATERIAL', 'expense', 'Chi phí mua nguyên vật liệu', true),
('Chi phí lương nhân viên', 'SALARY', 'expense', 'Lương và phụ cấp nhân viên', true),
('Chi phí điện nước', 'UTILITIES', 'expense', 'Tiền điện, nước, internet...', false),
('Chi phí thuê mặt bằng', 'RENT', 'expense', 'Tiền thuê mặt bằng hàng tháng', false)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- PERMISSION GROUPS
-- =============================================
CREATE TABLE IF NOT EXISTS permission_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default groups
INSERT INTO permission_groups (name, code, description) VALUES
('Super Admin', 'super_admin', 'Toàn quyền quản trị hệ thống'),
('Support', 'support', 'Nhân viên hỗ trợ khách hàng'),
('Viewer', 'viewer', 'Chỉ xem, không chỉnh sửa')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- PERMISSIONS
-- =============================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT
);

-- Insert default permissions
INSERT INTO permissions (code, name, module, description) VALUES
-- Company
('company.view', 'Xem công ty', 'company', 'Xem danh sách và chi tiết công ty'),
('company.create', 'Tạo công ty', 'company', 'Thêm công ty mới vào hệ thống'),
('company.edit', 'Sửa công ty', 'company', 'Chỉnh sửa thông tin công ty'),
('company.delete', 'Xóa công ty', 'company', 'Xóa công ty khỏi hệ thống'),
-- Brand
('brand.view', 'Xem thương hiệu', 'brand', 'Xem danh sách và chi tiết thương hiệu'),
('brand.create', 'Tạo thương hiệu', 'brand', 'Thêm thương hiệu mới'),
('brand.edit', 'Sửa thương hiệu', 'brand', 'Chỉnh sửa thông tin thương hiệu'),
('brand.delete', 'Xóa thương hiệu', 'brand', 'Xóa thương hiệu khỏi hệ thống'),
-- Branch
('branch.view', 'Xem chi nhánh', 'branch', 'Xem danh sách và chi tiết chi nhánh'),
('branch.create', 'Tạo chi nhánh', 'branch', 'Thêm chi nhánh mới'),
('branch.edit', 'Sửa chi nhánh', 'branch', 'Chỉnh sửa thông tin chi nhánh'),
('branch.delete', 'Xóa chi nhánh', 'branch', 'Xóa chi nhánh khỏi hệ thống'),
-- Package
('package.view', 'Xem gói', 'package', 'Xem danh sách và chi tiết gói App Food'),
('package.create', 'Tạo gói', 'package', 'Thêm gói App Food mới'),
('package.edit', 'Sửa gói', 'package', 'Chỉnh sửa thông tin gói'),
('package.delete', 'Xóa gói', 'package', 'Xóa gói App Food'),
-- Category
('category.view', 'Xem danh mục', 'category', 'Xem danh sách danh mục thu/chi'),
('category.create', 'Tạo danh mục', 'category', 'Thêm danh mục thu/chi mới'),
('category.edit', 'Sửa danh mục', 'category', 'Chỉnh sửa danh mục thu/chi'),
('category.delete', 'Xóa danh mục', 'category', 'Xóa danh mục thu/chi'),
-- Permission
('permission.view', 'Xem quyền', 'permission', 'Xem danh sách quyền và nhóm quyền'),
('permission.manage', 'Quản lý quyền', 'permission', 'Quản lý nhóm quyền và phân quyền'),
-- Admin
('admin.view', 'Xem quản trị viên', 'admin', 'Xem danh sách quản trị viên'),
('admin.create', 'Tạo quản trị viên', 'admin', 'Thêm quản trị viên mới'),
('admin.edit', 'Sửa quản trị viên', 'admin', 'Chỉnh sửa thông tin quản trị viên'),
('admin.delete', 'Xóa quản trị viên', 'admin', 'Xóa quản trị viên'),
-- Report
('report.view', 'Xem báo cáo', 'report', 'Xem các báo cáo hệ thống'),
('report.export', 'Xuất báo cáo', 'report', 'Xuất báo cáo ra file')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- PERMISSION GROUP PERMISSIONS (Many-to-Many)
-- =============================================
CREATE TABLE IF NOT EXISTS permission_group_permissions (
    permission_group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (permission_group_id, permission_id)
);

-- Assign all permissions to Super Admin
INSERT INTO permission_group_permissions (permission_group_id, permission_id)
SELECT pg.id, p.id
FROM permission_groups pg, permissions p
WHERE pg.code = 'super_admin'
ON CONFLICT DO NOTHING;

-- Assign view permissions to Support
INSERT INTO permission_group_permissions (permission_group_id, permission_id)
SELECT pg.id, p.id
FROM permission_groups pg, permissions p
WHERE pg.code = 'support' AND p.code LIKE '%.view'
ON CONFLICT DO NOTHING;

-- Assign view permissions to Viewer
INSERT INTO permission_group_permissions (permission_group_id, permission_id)
SELECT pg.id, p.id
FROM permission_groups pg, permissions p
WHERE pg.code = 'viewer' AND p.code LIKE '%.view'
ON CONFLICT DO NOTHING;

-- =============================================
-- ADMIN USERS
-- =============================================
CREATE TYPE admin_role AS ENUM ('super_admin', 'support');

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role admin_role NOT NULL DEFAULT 'support',
    permission_group_id UUID REFERENCES permission_groups(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);

-- Insert default super admin (password: Admin@123)
-- Password hash for 'Admin@123' using bcrypt
INSERT INTO admin_users (email, password_hash, name, role, permission_group_id)
SELECT 'admin@techres.vn', '$2b$10$rQZ5z8xKjKjKjKjKjKjKjOKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjK', 'Super Admin', 'super_admin', pg.id
FROM permission_groups pg WHERE pg.code = 'super_admin'
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transaction_categories_updated_at BEFORE UPDATE ON transaction_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permission_groups_updated_at BEFORE UPDATE ON permission_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VIEWS FOR CONVENIENCE
-- =============================================

-- Brand with company name and branch count
CREATE OR REPLACE VIEW v_brands AS
SELECT
    b.*,
    c.name as company_name,
    (SELECT COUNT(*) FROM branches br WHERE br.brand_id = b.id) as branch_count
FROM brands b
JOIN companies c ON c.id = b.company_id;

-- Branch with brand and company info
CREATE OR REPLACE VIEW v_branches AS
SELECT
    br.*,
    b.name as brand_name,
    c.name as company_name,
    p.name as package_name
FROM branches br
JOIN brands b ON b.id = br.brand_id
JOIN companies c ON c.id = b.company_id
LEFT JOIN packages p ON p.id = br.package_id;

-- Permission group with permission count
CREATE OR REPLACE VIEW v_permission_groups AS
SELECT
    pg.*,
    (SELECT COUNT(*) FROM permission_group_permissions pgp WHERE pgp.permission_group_id = pg.id) as permission_count,
    (SELECT COUNT(*) FROM admin_users au WHERE au.permission_group_id = pg.id) as user_count
FROM permission_groups pg;

-- Admin user with permission group name
CREATE OR REPLACE VIEW v_admin_users AS
SELECT
    au.id,
    au.email,
    au.name,
    au.phone,
    au.role,
    au.permission_group_id,
    pg.name as permission_group_name,
    au.is_active,
    au.last_login,
    au.created_at,
    au.updated_at
FROM admin_users au
LEFT JOIN permission_groups pg ON pg.id = au.permission_group_id;
