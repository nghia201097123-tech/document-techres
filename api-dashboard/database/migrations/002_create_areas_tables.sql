-- Migration: Create areas and tables for restaurant floor management
-- Date: 2026-01-03

-- Create table_status enum if not exists
DO $$ BEGIN
    CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create areas table
CREATE TABLE IF NOT EXISTS areas (
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

-- Create indexes for areas
CREATE INDEX IF NOT EXISTS idx_areas_tenant_id ON areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_areas_tenant_branch ON areas(tenant_id, branch_id);

-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
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

-- Create indexes for tables
CREATE INDEX IF NOT EXISTS idx_tables_tenant_id ON tables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tables_tenant_branch ON tables(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_tables_tenant_area ON tables(tenant_id, area_id);

-- Add triggers to update updated_at
DROP TRIGGER IF EXISTS update_areas_updated_at ON areas;
CREATE TRIGGER update_areas_updated_at
    BEFORE UPDATE ON areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Migration completed: areas and tables created successfully';
END $$;
