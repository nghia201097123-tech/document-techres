-- Migration: Add label size and font configuration fields
-- Date: 2026-01-16
-- Description: Add fields for label size, font scale, and max toppings configuration

-- Add label_width_mm column
ALTER TABLE kitchens ADD COLUMN IF NOT EXISTS label_width_mm INTEGER DEFAULT 72;

-- Add label_height_mm column
ALTER TABLE kitchens ADD COLUMN IF NOT EXISTS label_height_mm INTEGER DEFAULT 30;

-- Add label_gap_mm column
ALTER TABLE kitchens ADD COLUMN IF NOT EXISTS label_gap_mm INTEGER DEFAULT 3;

-- Add label_font_scale column (float for scale factor 0.5 - 2.0)
ALTER TABLE kitchens ADD COLUMN IF NOT EXISTS label_font_scale FLOAT DEFAULT 1.0;

-- Add label_max_toppings column (0 = auto based on size)
ALTER TABLE kitchens ADD COLUMN IF NOT EXISTS label_max_toppings INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN kitchens.label_width_mm IS 'Label width in millimeters (e.g., 40, 50, 60, 72, 80, 100)';
COMMENT ON COLUMN kitchens.label_height_mm IS 'Label height in millimeters (e.g., 30, 40, 50, 80)';
COMMENT ON COLUMN kitchens.label_gap_mm IS 'Gap between labels in millimeters (typically 2-5mm)';
COMMENT ON COLUMN kitchens.label_font_scale IS 'Font scale factor (0.5 = smaller, 1.0 = default, 2.0 = larger)';
COMMENT ON COLUMN kitchens.label_max_toppings IS 'Maximum toppings per label (0 = auto based on label size)';

-- Recommended values based on label size:
-- 40x30mm: max_toppings = 2, font_scale = 1.0
-- 50x30mm: max_toppings = 2, font_scale = 1.0
-- 60x40mm: max_toppings = 3, font_scale = 1.0
-- 72x30mm: max_toppings = 2, font_scale = 1.0
-- 80x50mm: max_toppings = 5, font_scale = 1.0
-- 100x50mm: max_toppings = 6, font_scale = 1.0
-- 100x80mm: max_toppings = 10, font_scale = 1.0
