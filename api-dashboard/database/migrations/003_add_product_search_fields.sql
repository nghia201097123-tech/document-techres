-- Migration: Add search fields to products table for advanced search
-- Date: 2026-01-11

-- Add search_name column (accent-free name for Vietnamese search)
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_name VARCHAR(255);

-- Add abbreviation column (short name for quick search, e.g., "ccdc" for "Cơm chiên dương châu")
ALTER TABLE products ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(50);

-- Create indexes for search optimization
CREATE INDEX IF NOT EXISTS idx_products_search_name ON products(search_name);
CREATE INDEX IF NOT EXISTS idx_products_abbreviation ON products(abbreviation);

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Migration completed: search_name and abbreviation columns added to products table';
END $$;
