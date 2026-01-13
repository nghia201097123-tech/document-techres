-- Migration: Add kitchen print mode and type fields
-- Date: 2026-01-13
-- Description: Add kitchen_type, paper_width columns and update print_mode

-- Add kitchen_type column
ALTER TABLE kitchens
ADD COLUMN IF NOT EXISTS kitchen_type VARCHAR(50) DEFAULT 'kitchen';

-- Add paper_width column
ALTER TABLE kitchens
ADD COLUMN IF NOT EXISTS paper_width INTEGER DEFAULT 80;

-- Update print_mode column type from enum to varchar (if needed)
-- First check if it's currently an enum type
DO $$
BEGIN
    -- Try to alter the column type
    -- This will convert existing 'list' to 'TICKET' and 'individual' to 'LABEL'
    ALTER TABLE kitchens
    ALTER COLUMN print_mode TYPE VARCHAR(20) USING
        CASE
            WHEN print_mode::text = 'list' THEN 'TICKET'
            WHEN print_mode::text = 'individual' THEN 'LABEL'
            ELSE 'TICKET'
        END;
EXCEPTION
    WHEN others THEN
        -- If column is already varchar, just update the values
        UPDATE kitchens SET print_mode = 'TICKET' WHERE print_mode = 'list' OR print_mode IS NULL;
        UPDATE kitchens SET print_mode = 'LABEL' WHERE print_mode = 'individual';
END $$;

-- Set default for print_mode
ALTER TABLE kitchens
ALTER COLUMN print_mode SET DEFAULT 'TICKET';

-- Drop the old enum type if it exists
DROP TYPE IF EXISTS printmode CASCADE;

-- Add comment for documentation
COMMENT ON COLUMN kitchens.kitchen_type IS 'Loại bếp: kitchen, bar, grill, dessert, seafood, hotpot, bakery, other';
COMMENT ON COLUMN kitchens.paper_width IS 'Khổ giấy in (mm): 58, 80, 110, 112';
COMMENT ON COLUMN kitchens.print_mode IS 'Chế độ in: TICKET (phiếu bếp), LABEL (tem), BOTH (cả hai)';
