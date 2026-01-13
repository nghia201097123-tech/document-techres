-- Migration: Populate search_name and abbreviation for existing products
-- Date: 2026-01-11
-- This migration auto-generates search fields for products that don't have them

-- Create or replace function to remove Vietnamese diacritics
CREATE OR REPLACE FUNCTION remove_vietnamese_diacritics(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := input_text;

    -- Replace Vietnamese characters with ASCII equivalents
    -- Lowercase
    result := REPLACE(result, 'à', 'a');
    result := REPLACE(result, 'á', 'a');
    result := REPLACE(result, 'ả', 'a');
    result := REPLACE(result, 'ã', 'a');
    result := REPLACE(result, 'ạ', 'a');
    result := REPLACE(result, 'ă', 'a');
    result := REPLACE(result, 'ằ', 'a');
    result := REPLACE(result, 'ắ', 'a');
    result := REPLACE(result, 'ẳ', 'a');
    result := REPLACE(result, 'ẵ', 'a');
    result := REPLACE(result, 'ặ', 'a');
    result := REPLACE(result, 'â', 'a');
    result := REPLACE(result, 'ầ', 'a');
    result := REPLACE(result, 'ấ', 'a');
    result := REPLACE(result, 'ẩ', 'a');
    result := REPLACE(result, 'ẫ', 'a');
    result := REPLACE(result, 'ậ', 'a');

    result := REPLACE(result, 'è', 'e');
    result := REPLACE(result, 'é', 'e');
    result := REPLACE(result, 'ẻ', 'e');
    result := REPLACE(result, 'ẽ', 'e');
    result := REPLACE(result, 'ẹ', 'e');
    result := REPLACE(result, 'ê', 'e');
    result := REPLACE(result, 'ề', 'e');
    result := REPLACE(result, 'ế', 'e');
    result := REPLACE(result, 'ể', 'e');
    result := REPLACE(result, 'ễ', 'e');
    result := REPLACE(result, 'ệ', 'e');

    result := REPLACE(result, 'ì', 'i');
    result := REPLACE(result, 'í', 'i');
    result := REPLACE(result, 'ỉ', 'i');
    result := REPLACE(result, 'ĩ', 'i');
    result := REPLACE(result, 'ị', 'i');

    result := REPLACE(result, 'ò', 'o');
    result := REPLACE(result, 'ó', 'o');
    result := REPLACE(result, 'ỏ', 'o');
    result := REPLACE(result, 'õ', 'o');
    result := REPLACE(result, 'ọ', 'o');
    result := REPLACE(result, 'ô', 'o');
    result := REPLACE(result, 'ồ', 'o');
    result := REPLACE(result, 'ố', 'o');
    result := REPLACE(result, 'ổ', 'o');
    result := REPLACE(result, 'ỗ', 'o');
    result := REPLACE(result, 'ộ', 'o');
    result := REPLACE(result, 'ơ', 'o');
    result := REPLACE(result, 'ờ', 'o');
    result := REPLACE(result, 'ớ', 'o');
    result := REPLACE(result, 'ở', 'o');
    result := REPLACE(result, 'ỡ', 'o');
    result := REPLACE(result, 'ợ', 'o');

    result := REPLACE(result, 'ù', 'u');
    result := REPLACE(result, 'ú', 'u');
    result := REPLACE(result, 'ủ', 'u');
    result := REPLACE(result, 'ũ', 'u');
    result := REPLACE(result, 'ụ', 'u');
    result := REPLACE(result, 'ư', 'u');
    result := REPLACE(result, 'ừ', 'u');
    result := REPLACE(result, 'ứ', 'u');
    result := REPLACE(result, 'ử', 'u');
    result := REPLACE(result, 'ữ', 'u');
    result := REPLACE(result, 'ự', 'u');

    result := REPLACE(result, 'ỳ', 'y');
    result := REPLACE(result, 'ý', 'y');
    result := REPLACE(result, 'ỷ', 'y');
    result := REPLACE(result, 'ỹ', 'y');
    result := REPLACE(result, 'ỵ', 'y');

    result := REPLACE(result, 'đ', 'd');

    -- Uppercase
    result := REPLACE(result, 'À', 'A');
    result := REPLACE(result, 'Á', 'A');
    result := REPLACE(result, 'Ả', 'A');
    result := REPLACE(result, 'Ã', 'A');
    result := REPLACE(result, 'Ạ', 'A');
    result := REPLACE(result, 'Ă', 'A');
    result := REPLACE(result, 'Ằ', 'A');
    result := REPLACE(result, 'Ắ', 'A');
    result := REPLACE(result, 'Ẳ', 'A');
    result := REPLACE(result, 'Ẵ', 'A');
    result := REPLACE(result, 'Ặ', 'A');
    result := REPLACE(result, 'Â', 'A');
    result := REPLACE(result, 'Ầ', 'A');
    result := REPLACE(result, 'Ấ', 'A');
    result := REPLACE(result, 'Ẩ', 'A');
    result := REPLACE(result, 'Ẫ', 'A');
    result := REPLACE(result, 'Ậ', 'A');

    result := REPLACE(result, 'È', 'E');
    result := REPLACE(result, 'É', 'E');
    result := REPLACE(result, 'Ẻ', 'E');
    result := REPLACE(result, 'Ẽ', 'E');
    result := REPLACE(result, 'Ẹ', 'E');
    result := REPLACE(result, 'Ê', 'E');
    result := REPLACE(result, 'Ề', 'E');
    result := REPLACE(result, 'Ế', 'E');
    result := REPLACE(result, 'Ể', 'E');
    result := REPLACE(result, 'Ễ', 'E');
    result := REPLACE(result, 'Ệ', 'E');

    result := REPLACE(result, 'Ì', 'I');
    result := REPLACE(result, 'Í', 'I');
    result := REPLACE(result, 'Ỉ', 'I');
    result := REPLACE(result, 'Ĩ', 'I');
    result := REPLACE(result, 'Ị', 'I');

    result := REPLACE(result, 'Ò', 'O');
    result := REPLACE(result, 'Ó', 'O');
    result := REPLACE(result, 'Ỏ', 'O');
    result := REPLACE(result, 'Õ', 'O');
    result := REPLACE(result, 'Ọ', 'O');
    result := REPLACE(result, 'Ô', 'O');
    result := REPLACE(result, 'Ồ', 'O');
    result := REPLACE(result, 'Ố', 'O');
    result := REPLACE(result, 'Ổ', 'O');
    result := REPLACE(result, 'Ỗ', 'O');
    result := REPLACE(result, 'Ộ', 'O');
    result := REPLACE(result, 'Ơ', 'O');
    result := REPLACE(result, 'Ờ', 'O');
    result := REPLACE(result, 'Ớ', 'O');
    result := REPLACE(result, 'Ở', 'O');
    result := REPLACE(result, 'Ỡ', 'O');
    result := REPLACE(result, 'Ợ', 'O');

    result := REPLACE(result, 'Ù', 'U');
    result := REPLACE(result, 'Ú', 'U');
    result := REPLACE(result, 'Ủ', 'U');
    result := REPLACE(result, 'Ũ', 'U');
    result := REPLACE(result, 'Ụ', 'U');
    result := REPLACE(result, 'Ư', 'U');
    result := REPLACE(result, 'Ừ', 'U');
    result := REPLACE(result, 'Ứ', 'U');
    result := REPLACE(result, 'Ử', 'U');
    result := REPLACE(result, 'Ữ', 'U');
    result := REPLACE(result, 'Ự', 'U');

    result := REPLACE(result, 'Ỳ', 'Y');
    result := REPLACE(result, 'Ý', 'Y');
    result := REPLACE(result, 'Ỷ', 'Y');
    result := REPLACE(result, 'Ỹ', 'Y');
    result := REPLACE(result, 'Ỵ', 'Y');

    result := REPLACE(result, 'Đ', 'D');

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create or replace function to generate abbreviation from product name
-- Takes first letter of each word
CREATE OR REPLACE FUNCTION generate_abbreviation(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    words TEXT[];
    word TEXT;
    result TEXT := '';
    first_char TEXT;
BEGIN
    -- Split by whitespace
    words := regexp_split_to_array(TRIM(input_text), '\s+');

    FOREACH word IN ARRAY words
    LOOP
        IF LENGTH(word) > 0 THEN
            first_char := SUBSTRING(word, 1, 1);
            -- Convert Vietnamese character to ASCII
            first_char := remove_vietnamese_diacritics(first_char);
            result := result || first_char;
        END IF;
    END LOOP;

    RETURN LOWER(result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all products that have NULL search_name or abbreviation
UPDATE products
SET
    search_name = LOWER(remove_vietnamese_diacritics(name)),
    abbreviation = generate_abbreviation(name)
WHERE search_name IS NULL OR abbreviation IS NULL;

-- Log the number of updated products
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM products WHERE search_name IS NOT NULL;
    RAISE NOTICE 'Migration completed: Updated % products with search_name and abbreviation', updated_count;
END $$;
