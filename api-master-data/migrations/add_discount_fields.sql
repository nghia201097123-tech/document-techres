-- Migration: Add discount/coupon fields for Vietnamese tax law compliance
-- Date: 2026-01-13
-- Description: Adds new columns to coupons table for advanced discount features

-- ============ COUPONS TABLE ============

-- Add apply_to column (bill, item, category)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS apply_to VARCHAR(20) NOT NULL DEFAULT 'bill';

-- Add activation_type column (manual, auto)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS activation_type VARCHAR(20) NOT NULL DEFAULT 'manual';

-- Add min_quantity column
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_quantity INTEGER NOT NULL DEFAULT 1;

-- Add product_ids column (JSON array)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS product_ids TEXT DEFAULT NULL;

-- Add category_ids column (JSON array)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids TEXT DEFAULT NULL;

-- Add is_combinable column
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_combinable BOOLEAN NOT NULL DEFAULT FALSE;

-- Add priority column
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 100;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'coupons'
AND column_name IN ('apply_to', 'activation_type', 'min_quantity', 'product_ids', 'category_ids', 'is_combinable', 'priority')
ORDER BY column_name;
