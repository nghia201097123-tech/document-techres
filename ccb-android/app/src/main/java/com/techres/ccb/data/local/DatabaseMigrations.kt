package com.techres.ccb.data.local

import android.util.Log
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * Database migrations for CCBDatabase
 */
object DatabaseMigrations {
    private const val TAG = "DatabaseMigrations"

    /**
     * Migration from version 9 to 10
     * Adds search_name and abbreviation columns to products table
     */
    val MIGRATION_9_10 = object : Migration(9, 10) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 9 to 10...")

            // Add search_name column (nullable) if not exists
            try {
                db.execSQL("ALTER TABLE products ADD COLUMN search_name TEXT DEFAULT NULL")
                Log.d(TAG, "Added search_name column")
            } catch (e: Exception) {
                Log.d(TAG, "search_name column may already exist: ${e.message}")
            }

            // Add abbreviation column (nullable) if not exists
            try {
                db.execSQL("ALTER TABLE products ADD COLUMN abbreviation TEXT DEFAULT NULL")
                Log.d(TAG, "Added abbreviation column")
            } catch (e: Exception) {
                Log.d(TAG, "abbreviation column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 9 to 10 complete")
        }
    }

    /**
     * Migration from version 10 to 11
     * Adds kitchens table
     */
    val MIGRATION_10_11 = object : Migration(10, 11) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 10 to 11...")

            // Create kitchens table
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS kitchens (
                    id TEXT NOT NULL PRIMARY KEY,
                    branch_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    kitchen_type TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    printer_ip TEXT,
                    printer_port INTEGER NOT NULL DEFAULT 9100,
                    printer_name TEXT,
                    is_printer_connected INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'synced',
                    synced_at TEXT,
                    version INTEGER NOT NULL DEFAULT 1
                )
            """.trimIndent())

            // Create indices
            db.execSQL("CREATE INDEX IF NOT EXISTS index_kitchens_branch_id ON kitchens(branch_id)")
            db.execSQL("CREATE INDEX IF NOT EXISTS index_kitchens_is_active ON kitchens(is_active)")

            Log.d(TAG, "Migration 10 to 11 complete - Created kitchens table")
        }
    }

    /**
     * Migration from version 11 to 12
     * Adds bill_templates and bill_printer_configs tables
     */
    val MIGRATION_11_12 = object : Migration(11, 12) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 11 to 12...")

            // Create bill_templates table
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS bill_templates (
                    id TEXT NOT NULL PRIMARY KEY,
                    branch_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    template_type TEXT NOT NULL DEFAULT 'classic',
                    description TEXT,
                    show_logo INTEGER NOT NULL DEFAULT 1,
                    logo_url TEXT,
                    store_name TEXT NOT NULL,
                    store_address TEXT,
                    store_phone TEXT,
                    tax_code TEXT,
                    header_text TEXT,
                    bill_title TEXT NOT NULL DEFAULT 'HÓA ĐƠN BÁN HÀNG',
                    show_order_number INTEGER NOT NULL DEFAULT 1,
                    show_table_name INTEGER NOT NULL DEFAULT 1,
                    show_staff_name INTEGER NOT NULL DEFAULT 1,
                    show_customer_name INTEGER NOT NULL DEFAULT 1,
                    show_date_time INTEGER NOT NULL DEFAULT 1,
                    date_format TEXT NOT NULL DEFAULT 'dd/MM/yyyy HH:mm',
                    show_item_code INTEGER NOT NULL DEFAULT 0,
                    show_item_note INTEGER NOT NULL DEFAULT 1,
                    show_unit_price INTEGER NOT NULL DEFAULT 1,
                    show_quantity INTEGER NOT NULL DEFAULT 1,
                    show_subtotal INTEGER NOT NULL DEFAULT 1,
                    show_discount INTEGER NOT NULL DEFAULT 1,
                    show_discount_percent INTEGER NOT NULL DEFAULT 1,
                    show_service_fee INTEGER NOT NULL DEFAULT 1,
                    show_vat INTEGER NOT NULL DEFAULT 1,
                    show_vat_details INTEGER NOT NULL DEFAULT 1,
                    show_price_before_vat INTEGER NOT NULL DEFAULT 1,
                    show_price_after_vat INTEGER NOT NULL DEFAULT 1,
                    vat_label TEXT NOT NULL DEFAULT 'VAT',
                    price_before_vat_label TEXT NOT NULL DEFAULT 'Giá trước thuế',
                    price_after_vat_label TEXT NOT NULL DEFAULT 'Giá sau thuế',
                    show_payment_method INTEGER NOT NULL DEFAULT 1,
                    show_received_amount INTEGER NOT NULL DEFAULT 1,
                    show_change_amount INTEGER NOT NULL DEFAULT 1,
                    show_qr_code INTEGER NOT NULL DEFAULT 0,
                    qr_code_type TEXT NOT NULL DEFAULT 'order_id',
                    qr_code_content TEXT,
                    show_barcode INTEGER NOT NULL DEFAULT 0,
                    thank_you_message TEXT NOT NULL DEFAULT 'Cảm ơn quý khách!',
                    comeback_message TEXT NOT NULL DEFAULT 'Hẹn gặp lại!',
                    footer_text TEXT,
                    show_wifi_info INTEGER NOT NULL DEFAULT 0,
                    wifi_name TEXT,
                    wifi_password TEXT,
                    paper_width INTEGER NOT NULL DEFAULT 80,
                    font_size TEXT NOT NULL DEFAULT 'normal',
                    separator_char TEXT NOT NULL DEFAULT '-',
                    double_separator_char TEXT NOT NULL DEFAULT '=',
                    cut_paper INTEGER NOT NULL DEFAULT 1,
                    open_cash_drawer INTEGER NOT NULL DEFAULT 0,
                    beep_after_print INTEGER NOT NULL DEFAULT 0,
                    number_of_copies INTEGER NOT NULL DEFAULT 1,
                    is_default INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'synced',
                    synced_at TEXT
                )
            """.trimIndent())

            // Create indices for bill_templates
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bill_templates_branch_id ON bill_templates(branch_id)")
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bill_templates_is_active ON bill_templates(is_active)")
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bill_templates_is_default ON bill_templates(is_default)")

            Log.d(TAG, "Created bill_templates table")

            // Create bill_printer_configs table
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS bill_printer_configs (
                    id TEXT NOT NULL PRIMARY KEY,
                    branch_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    connection_type TEXT NOT NULL DEFAULT 'network',
                    printer_ip TEXT,
                    printer_port INTEGER NOT NULL DEFAULT 9100,
                    printer_mac TEXT,
                    printer_usb_path TEXT,
                    template_id TEXT,
                    paper_width INTEGER NOT NULL DEFAULT 80,
                    auto_print_on_payment INTEGER NOT NULL DEFAULT 1,
                    print_preview INTEGER NOT NULL DEFAULT 0,
                    number_of_copies INTEGER NOT NULL DEFAULT 1,
                    cut_paper INTEGER NOT NULL DEFAULT 1,
                    open_cash_drawer INTEGER NOT NULL DEFAULT 1,
                    beep_after_print INTEGER NOT NULL DEFAULT 1,
                    retry_count INTEGER NOT NULL DEFAULT 3,
                    retry_delay_ms INTEGER NOT NULL DEFAULT 1000,
                    connection_timeout_ms INTEGER NOT NULL DEFAULT 5000,
                    is_default INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'synced',
                    synced_at TEXT,
                    is_connected INTEGER NOT NULL DEFAULT 0,
                    last_print_at TEXT,
                    last_error TEXT
                )
            """.trimIndent())

            // Create indices for bill_printer_configs
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bill_printer_configs_branch_id ON bill_printer_configs(branch_id)")
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bill_printer_configs_is_active ON bill_printer_configs(is_active)")
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bill_printer_configs_is_default ON bill_printer_configs(is_default)")

            Log.d(TAG, "Migration 11 to 12 complete - Created bill_templates and bill_printer_configs tables")
        }
    }

    /**
     * Migration from version 12 to 13
     * Adds min_select and max_select columns to product_toppings table
     */
    val MIGRATION_12_13 = object : Migration(12, 13) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 12 to 13...")

            // Add min_select column (default 0)
            try {
                db.execSQL("ALTER TABLE product_toppings ADD COLUMN min_select INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added min_select column to product_toppings")
            } catch (e: Exception) {
                Log.d(TAG, "min_select column may already exist: ${e.message}")
            }

            // Add max_select column (default 99)
            try {
                db.execSQL("ALTER TABLE product_toppings ADD COLUMN max_select INTEGER NOT NULL DEFAULT 99")
                Log.d(TAG, "Added max_select column to product_toppings")
            } catch (e: Exception) {
                Log.d(TAG, "max_select column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 12 to 13 complete - Added min_select/max_select to product_toppings")
        }
    }

    /**
     * Migration from version 13 to 14
     * Adds discount/coupon fields to coupons, orders, and order_items tables
     * for Vietnamese tax law compliance
     */
    val MIGRATION_13_14 = object : Migration(13, 14) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 13 to 14...")

            // ============ COUPONS TABLE ============
            // Add apply_to column (bill, item, category)
            try {
                db.execSQL("ALTER TABLE coupons ADD COLUMN apply_to TEXT NOT NULL DEFAULT 'bill'")
                Log.d(TAG, "Added apply_to column to coupons")
            } catch (e: Exception) {
                Log.d(TAG, "apply_to column may already exist: ${e.message}")
            }

            // Add activation_type column (manual, auto)
            try {
                db.execSQL("ALTER TABLE coupons ADD COLUMN activation_type TEXT NOT NULL DEFAULT 'manual'")
                Log.d(TAG, "Added activation_type column to coupons")
            } catch (e: Exception) {
                Log.d(TAG, "activation_type column may already exist: ${e.message}")
            }

            // Add min_quantity column
            try {
                db.execSQL("ALTER TABLE coupons ADD COLUMN min_quantity INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added min_quantity column to coupons")
            } catch (e: Exception) {
                Log.d(TAG, "min_quantity column may already exist: ${e.message}")
            }

            // Add product_ids column (JSON string)
            try {
                db.execSQL("ALTER TABLE coupons ADD COLUMN product_ids TEXT DEFAULT NULL")
                Log.d(TAG, "Added product_ids column to coupons")
            } catch (e: Exception) {
                Log.d(TAG, "product_ids column may already exist: ${e.message}")
            }

            // Add category_ids column (JSON string)
            try {
                db.execSQL("ALTER TABLE coupons ADD COLUMN category_ids TEXT DEFAULT NULL")
                Log.d(TAG, "Added category_ids column to coupons")
            } catch (e: Exception) {
                Log.d(TAG, "category_ids column may already exist: ${e.message}")
            }

            // Add is_combinable column
            try {
                db.execSQL("ALTER TABLE coupons ADD COLUMN is_combinable INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added is_combinable column to coupons")
            } catch (e: Exception) {
                Log.d(TAG, "is_combinable column may already exist: ${e.message}")
            }

            // Add priority column
            try {
                db.execSQL("ALTER TABLE coupons ADD COLUMN priority INTEGER NOT NULL DEFAULT 100")
                Log.d(TAG, "Added priority column to coupons")
            } catch (e: Exception) {
                Log.d(TAG, "priority column may already exist: ${e.message}")
            }

            // ============ ORDERS TABLE ============
            // Add coupon_id column
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN coupon_id TEXT DEFAULT NULL")
                Log.d(TAG, "Added coupon_id column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "coupon_id column may already exist: ${e.message}")
            }

            // Add coupon_code column
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN coupon_code TEXT DEFAULT NULL")
                Log.d(TAG, "Added coupon_code column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "coupon_code column may already exist: ${e.message}")
            }

            // Add coupon_ids column (JSON string for multiple coupons)
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN coupon_ids TEXT DEFAULT NULL")
                Log.d(TAG, "Added coupon_ids column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "coupon_ids column may already exist: ${e.message}")
            }

            // Add applied_coupons_json column
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN applied_coupons_json TEXT DEFAULT NULL")
                Log.d(TAG, "Added applied_coupons_json column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "applied_coupons_json column may already exist: ${e.message}")
            }

            // Add discount_requires_approval column
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN discount_requires_approval INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added discount_requires_approval column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "discount_requires_approval column may already exist: ${e.message}")
            }

            // Add discount_approval_status column
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN discount_approval_status TEXT DEFAULT NULL")
                Log.d(TAG, "Added discount_approval_status column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "discount_approval_status column may already exist: ${e.message}")
            }

            // Add discount_approved_by column
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN discount_approved_by TEXT DEFAULT NULL")
                Log.d(TAG, "Added discount_approved_by column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "discount_approved_by column may already exist: ${e.message}")
            }

            // Add discount_approved_at column
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN discount_approved_at TEXT DEFAULT NULL")
                Log.d(TAG, "Added discount_approved_at column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "discount_approved_at column may already exist: ${e.message}")
            }

            // ============ ORDER_ITEMS TABLE ============
            // Add category_id column
            try {
                db.execSQL("ALTER TABLE order_items ADD COLUMN category_id TEXT DEFAULT NULL")
                Log.d(TAG, "Added category_id column to order_items")
            } catch (e: Exception) {
                Log.d(TAG, "category_id column may already exist: ${e.message}")
            }

            // Add original_price column
            try {
                db.execSQL("ALTER TABLE order_items ADD COLUMN original_price REAL NOT NULL DEFAULT 0.0")
                Log.d(TAG, "Added original_price column to order_items")
            } catch (e: Exception) {
                Log.d(TAG, "original_price column may already exist: ${e.message}")
            }

            // Add discount_type column
            try {
                db.execSQL("ALTER TABLE order_items ADD COLUMN discount_type TEXT DEFAULT NULL")
                Log.d(TAG, "Added discount_type column to order_items")
            } catch (e: Exception) {
                Log.d(TAG, "discount_type column may already exist: ${e.message}")
            }

            // Add discount_value column
            try {
                db.execSQL("ALTER TABLE order_items ADD COLUMN discount_value REAL NOT NULL DEFAULT 0.0")
                Log.d(TAG, "Added discount_value column to order_items")
            } catch (e: Exception) {
                Log.d(TAG, "discount_value column may already exist: ${e.message}")
            }

            // Add coupon_id column
            try {
                db.execSQL("ALTER TABLE order_items ADD COLUMN coupon_id TEXT DEFAULT NULL")
                Log.d(TAG, "Added coupon_id column to order_items")
            } catch (e: Exception) {
                Log.d(TAG, "coupon_id column may already exist: ${e.message}")
            }

            // Add coupon_code column
            try {
                db.execSQL("ALTER TABLE order_items ADD COLUMN coupon_code TEXT DEFAULT NULL")
                Log.d(TAG, "Added coupon_code column to order_items")
            } catch (e: Exception) {
                Log.d(TAG, "coupon_code column may already exist: ${e.message}")
            }

            // Add price_before_vat column
            try {
                db.execSQL("ALTER TABLE order_items ADD COLUMN price_before_vat REAL NOT NULL DEFAULT 0.0")
                Log.d(TAG, "Added price_before_vat column to order_items")
            } catch (e: Exception) {
                Log.d(TAG, "price_before_vat column may already exist: ${e.message}")
            }

            // Add price_after_vat column
            try {
                db.execSQL("ALTER TABLE order_items ADD COLUMN price_after_vat REAL NOT NULL DEFAULT 0.0")
                Log.d(TAG, "Added price_after_vat column to order_items")
            } catch (e: Exception) {
                Log.d(TAG, "price_after_vat column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 13 to 14 complete - Added discount/coupon fields")
        }
    }

    /**
     * Migration from version 14 to 15
     * Adds time tracking and 4 discount types columns to bill_templates table
     */
    val MIGRATION_14_15 = object : Migration(14, 15) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 14 to 15...")

            // ============ TIME TRACKING CONFIG ============
            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN show_check_in_time INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added show_check_in_time column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "show_check_in_time column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN show_check_out_time INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added show_check_out_time column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "show_check_out_time column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN check_in_label TEXT NOT NULL DEFAULT 'Giờ vào'")
                Log.d(TAG, "Added check_in_label column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "check_in_label column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN check_out_label TEXT NOT NULL DEFAULT 'Giờ ra'")
                Log.d(TAG, "Added check_out_label column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "check_out_label column may already exist: ${e.message}")
            }

            // ============ DISCOUNT CONFIG (4 loại giảm giá) ============
            // 1. Giảm giá món (Item Discount)
            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN show_item_discount INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added show_item_discount column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "show_item_discount column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN show_total_item_discount INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added show_total_item_discount column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "show_total_item_discount column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN item_discount_label TEXT NOT NULL DEFAULT 'Giảm giá món'")
                Log.d(TAG, "Added item_discount_label column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "item_discount_label column may already exist: ${e.message}")
            }

            // 2. Giảm giá hóa đơn (Bill Discount)
            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN show_bill_discount INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added show_bill_discount column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "show_bill_discount column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN bill_discount_label TEXT NOT NULL DEFAULT 'Giảm giá hóa đơn'")
                Log.d(TAG, "Added bill_discount_label column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "bill_discount_label column may already exist: ${e.message}")
            }

            // 3. Coupon
            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN show_coupon_discount INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added show_coupon_discount column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "show_coupon_discount column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN coupon_discount_label TEXT NOT NULL DEFAULT 'Mã giảm giá'")
                Log.d(TAG, "Added coupon_discount_label column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "coupon_discount_label column may already exist: ${e.message}")
            }

            // 4. Voucher
            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN show_voucher_discount INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added show_voucher_discount column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "show_voucher_discount column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN voucher_discount_label TEXT NOT NULL DEFAULT 'Voucher'")
                Log.d(TAG, "Added voucher_discount_label column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "voucher_discount_label column may already exist: ${e.message}")
            }

            // Tổng giảm giá
            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN show_total_discount INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added show_total_discount column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "show_total_discount column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE bill_templates ADD COLUMN total_discount_label TEXT NOT NULL DEFAULT 'Tổng giảm giá'")
                Log.d(TAG, "Added total_discount_label column to bill_templates")
            } catch (e: Exception) {
                Log.d(TAG, "total_discount_label column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 14 to 15 complete - Added time tracking and discount config columns to bill_templates")
        }
    }

    /**
     * Migration from version 15 to 16
     * Adds printer protocol and label size columns to kitchens table for TSPL/ESC/POS support
     */
    val MIGRATION_15_16 = object : Migration(15, 16) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 15 to 16...")

            // ============ KITCHENS TABLE - PRINT MODE & PAPER WIDTH ============
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN print_mode TEXT NOT NULL DEFAULT 'TICKET'")
                Log.d(TAG, "Added print_mode column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "print_mode column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN paper_width INTEGER NOT NULL DEFAULT 80")
                Log.d(TAG, "Added paper_width column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "paper_width column may already exist: ${e.message}")
            }

            // ============ KITCHENS TABLE - PRINTER PROTOCOL ============
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN printer_protocol TEXT NOT NULL DEFAULT 'ESCPOS'")
                Log.d(TAG, "Added printer_protocol column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "printer_protocol column may already exist: ${e.message}")
            }

            // ============ KITCHENS TABLE - LABEL SIZE (for TSPL printers) ============
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_width_mm INTEGER NOT NULL DEFAULT 72")
                Log.d(TAG, "Added label_width_mm column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "label_width_mm column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_height_mm INTEGER NOT NULL DEFAULT 30")
                Log.d(TAG, "Added label_height_mm column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "label_height_mm column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_gap_mm INTEGER NOT NULL DEFAULT 3")
                Log.d(TAG, "Added label_gap_mm column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "label_gap_mm column may already exist: ${e.message}")
            }

            // ============ KITCHENS TABLE - PRINT DENSITY ============
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN print_density INTEGER NOT NULL DEFAULT 8")
                Log.d(TAG, "Added print_density column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "print_density column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 15 to 16 complete - Added printer protocol and label size columns to kitchens")
        }
    }

    /**
     * Migration from version 16 to 17
     * Adds kitchen_ids column to products table for kitchen routing
     */
    val MIGRATION_16_17 = object : Migration(16, 17) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 16 to 17...")

            // Add kitchen_ids column to products (comma-separated list of kitchen IDs)
            try {
                db.execSQL("ALTER TABLE products ADD COLUMN kitchen_ids TEXT DEFAULT NULL")
                Log.d(TAG, "Added kitchen_ids column to products")
            } catch (e: Exception) {
                Log.d(TAG, "kitchen_ids column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 16 to 17 complete - Added kitchen_ids to products for kitchen routing")
        }
    }

    /**
     * Migration from version 17 to 18
     * Adds ticket and label printing config columns to kitchens table
     */
    val MIGRATION_17_18 = object : Migration(17, 18) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 17 to 18...")

            // Ticket printing config
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_cut_after_print INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added ticket_cut_after_print column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_cut_after_print column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_print_items_separately INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added ticket_print_items_separately column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_print_items_separately column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_copies INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added ticket_copies column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_copies column may already exist: ${e.message}")
            }

            // Label printing config
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_print_price INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added label_print_price column")
            } catch (e: Exception) {
                Log.d(TAG, "label_print_price column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_print_store_name INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added label_print_store_name column")
            } catch (e: Exception) {
                Log.d(TAG, "label_print_store_name column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_print_order_number INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added label_print_order_number column")
            } catch (e: Exception) {
                Log.d(TAG, "label_print_order_number column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_print_table_name INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added label_print_table_name column")
            } catch (e: Exception) {
                Log.d(TAG, "label_print_table_name column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_print_time INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added label_print_time column")
            } catch (e: Exception) {
                Log.d(TAG, "label_print_time column may already exist: ${e.message}")
            }

            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_store_name TEXT DEFAULT NULL")
                Log.d(TAG, "Added label_store_name column")
            } catch (e: Exception) {
                Log.d(TAG, "label_store_name column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 17 to 18 complete - Added ticket and label printing configs to kitchens")
        }
    }

    /**
     * Migration from version 18 to 19
     * Adds label_reverse, label_font_scale and label_max_toppings columns to kitchens table
     */
    val MIGRATION_18_19 = object : Migration(18, 19) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 18 to 19...")

            // Add label_reverse column
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_reverse INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added label_reverse column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "label_reverse column may already exist: ${e.message}")
            }

            // Add label_font_scale column (float, default 1.0)
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_font_scale REAL NOT NULL DEFAULT 1.0")
                Log.d(TAG, "Added label_font_scale column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "label_font_scale column may already exist: ${e.message}")
            }

            // Add label_max_toppings column (int, default 0 = auto based on label size)
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN label_max_toppings INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added label_max_toppings column to kitchens")
            } catch (e: Exception) {
                Log.d(TAG, "label_max_toppings column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 18 to 19 complete - Added label_reverse, label_font_scale, label_max_toppings to kitchens")
        }
    }

    /**
     * Migration from version 19 to 20
     * Adds extended ticket printing config columns to kitchens table
     */
    val MIGRATION_19_20 = object : Migration(19, 20) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 19 to 20...")

            // ticket_print_order_number (default true)
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_print_order_number INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added ticket_print_order_number column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_print_order_number column may already exist: ${e.message}")
            }

            // ticket_print_table_name (default true)
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_print_table_name INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added ticket_print_table_name column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_print_table_name column may already exist: ${e.message}")
            }

            // ticket_print_time (default true)
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_print_time INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added ticket_print_time column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_print_time column may already exist: ${e.message}")
            }

            // ticket_print_store_name (default false)
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_print_store_name INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added ticket_print_store_name column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_print_store_name column may already exist: ${e.message}")
            }

            // ticket_store_name (nullable)
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_store_name TEXT DEFAULT NULL")
                Log.d(TAG, "Added ticket_store_name column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_store_name column may already exist: ${e.message}")
            }

            // ticket_print_notes (default true)
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_print_notes INTEGER NOT NULL DEFAULT 1")
                Log.d(TAG, "Added ticket_print_notes column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_print_notes column may already exist: ${e.message}")
            }

            // ticket_font_size (default "medium")
            try {
                db.execSQL("ALTER TABLE kitchens ADD COLUMN ticket_font_size TEXT NOT NULL DEFAULT 'medium'")
                Log.d(TAG, "Added ticket_font_size column")
            } catch (e: Exception) {
                Log.d(TAG, "ticket_font_size column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 19 to 20 complete - Added extended ticket printing config columns to kitchens")
        }
    }

    /**
     * All migrations in order
     */
    val ALL_MIGRATIONS = arrayOf(
        MIGRATION_9_10,
        MIGRATION_10_11,
        MIGRATION_11_12,
        MIGRATION_12_13,
        MIGRATION_13_14,
        MIGRATION_14_15,
        MIGRATION_15_16,
        MIGRATION_16_17,
        MIGRATION_17_18,
        MIGRATION_18_19,
        MIGRATION_19_20
    )
}
