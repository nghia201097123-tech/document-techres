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
     * Migration from version 20 to 21
     * Adds surcharges table for phụ thu (additional charges)
     */
    val MIGRATION_20_21 = object : Migration(20, 21) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 20 to 21...")

            // Create surcharges table
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS surcharges (
                    id TEXT NOT NULL PRIMARY KEY,
                    branch_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    amount REAL NOT NULL DEFAULT 0.0,
                    vat_rate REAL NOT NULL DEFAULT 0.0,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'synced',
                    synced_at TEXT,
                    version INTEGER NOT NULL DEFAULT 1
                )
            """.trimIndent())

            // Create indices
            db.execSQL("CREATE INDEX IF NOT EXISTS index_surcharges_branch_id ON surcharges(branch_id)")
            db.execSQL("CREATE INDEX IF NOT EXISTS index_surcharges_is_active ON surcharges(is_active)")

            Log.d(TAG, "Migration 20 to 21 complete - Created surcharges table")
        }
    }

    /**
     * Migration from version 21 to 22
     * Adds surcharges_json column to orders table for storing surcharge details
     */
    val MIGRATION_21_22 = object : Migration(21, 22) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 21 to 22...")

            // Add surcharges_json column to orders table
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN surcharges_json TEXT DEFAULT NULL")
                Log.d(TAG, "Added surcharges_json column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "surcharges_json column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 21 to 22 complete - Added surcharges_json to orders")
        }
    }

    /**
     * Migration from version 22 to 23
     * Adds pager_number column to orders table for thẻ rung (customer pager/buzzer)
     */
    val MIGRATION_22_23 = object : Migration(22, 23) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 22 to 23...")

            // Add pager_number column to orders table
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN pager_number INTEGER DEFAULT NULL")
                Log.d(TAG, "Added pager_number column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "pager_number column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 22 to 23 complete - Added pager_number to orders for thẻ rung feature")
        }
    }

    /**
     * Migration from version 23 to 24
     * Adds daily_order_number column to orders table for short display number
     */
    val MIGRATION_23_24 = object : Migration(23, 24) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 23 to 24...")

            // Add daily_order_number column to orders table
            try {
                db.execSQL("ALTER TABLE orders ADD COLUMN daily_order_number INTEGER NOT NULL DEFAULT 0")
                Log.d(TAG, "Added daily_order_number column to orders")
            } catch (e: Exception) {
                Log.d(TAG, "daily_order_number column may already exist: ${e.message}")
            }

            Log.d(TAG, "Migration 23 to 24 complete - Added daily_order_number for short display")
        }
    }

    /**
     * Migration from version 24 to 25
     * Adds bank_accounts table for bank transfer payment QR codes
     */
    val MIGRATION_24_25 = object : Migration(24, 25) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 24 to 25...")

            // Create bank_accounts table
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS bank_accounts (
                    id TEXT NOT NULL PRIMARY KEY,
                    branch_id TEXT NOT NULL,
                    bank_name TEXT NOT NULL,
                    bank_code TEXT,
                    account_number TEXT NOT NULL,
                    account_holder TEXT NOT NULL,
                    qr_template TEXT NOT NULL DEFAULT 'vietqr',
                    is_default INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'synced',
                    synced_at TEXT
                )
            """.trimIndent())

            // Create indices
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bank_accounts_branch_id ON bank_accounts(branch_id)")
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bank_accounts_is_active ON bank_accounts(is_active)")

            Log.d(TAG, "Migration 24 to 25 complete - Created bank_accounts table")
        }
    }

    /**
     * Migration from version 25 to 26
     * Renames branch_id to brand_id in bill_templates table
     * Bill templates are now built at brand level (shared across branches)
     */
    val MIGRATION_25_26 = object : Migration(25, 26) {
        override fun migrate(db: SupportSQLiteDatabase) {
            Log.d(TAG, "Running migration from 25 to 26...")
            Log.d(TAG, "Renaming branch_id to brand_id in bill_templates (templates are now at brand level)")

            // SQLite doesn't support ALTER TABLE RENAME COLUMN directly
            // We need to recreate the table with the new schema

            // 1. Create new table with brand_id
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS bill_templates_new (
                    id TEXT NOT NULL PRIMARY KEY,
                    brand_id TEXT NOT NULL,
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
                    show_check_in_time INTEGER NOT NULL DEFAULT 0,
                    show_check_out_time INTEGER NOT NULL DEFAULT 0,
                    check_in_label TEXT NOT NULL DEFAULT 'Giờ vào',
                    check_out_label TEXT NOT NULL DEFAULT 'Giờ ra',
                    show_item_code INTEGER NOT NULL DEFAULT 0,
                    show_item_note INTEGER NOT NULL DEFAULT 1,
                    show_order_note INTEGER NOT NULL DEFAULT 1,
                    item_display_layout TEXT NOT NULL DEFAULT 'standard',
                    show_unit_price INTEGER NOT NULL DEFAULT 1,
                    show_quantity INTEGER NOT NULL DEFAULT 1,
                    show_subtotal INTEGER NOT NULL DEFAULT 1,
                    show_item_discount INTEGER NOT NULL DEFAULT 1,
                    show_total_item_discount INTEGER NOT NULL DEFAULT 1,
                    item_discount_label TEXT NOT NULL DEFAULT 'Giảm giá món',
                    show_bill_discount INTEGER NOT NULL DEFAULT 1,
                    bill_discount_label TEXT NOT NULL DEFAULT 'Giảm giá hóa đơn',
                    show_coupon_discount INTEGER NOT NULL DEFAULT 1,
                    coupon_discount_label TEXT NOT NULL DEFAULT 'Mã giảm giá',
                    show_voucher_discount INTEGER NOT NULL DEFAULT 1,
                    voucher_discount_label TEXT NOT NULL DEFAULT 'Voucher',
                    show_total_discount INTEGER NOT NULL DEFAULT 1,
                    total_discount_label TEXT NOT NULL DEFAULT 'Tổng giảm giá',
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
                    line_spacing REAL NOT NULL DEFAULT 0.7,
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

            // 2. Copy data from old table, renaming branch_id to brand_id
            try {
                db.execSQL("""
                    INSERT INTO bill_templates_new (
                        id, brand_id, name, template_type, description,
                        show_logo, logo_url, store_name, store_address, store_phone, tax_code, header_text,
                        bill_title, show_order_number, show_table_name, show_staff_name, show_customer_name, show_date_time, date_format,
                        show_check_in_time, show_check_out_time, check_in_label, check_out_label,
                        show_item_code, show_item_note, show_unit_price, show_quantity,
                        show_subtotal, show_discount, show_discount_percent, show_service_fee, show_vat, show_vat_details,
                        show_price_before_vat, show_price_after_vat, vat_label, price_before_vat_label, price_after_vat_label,
                        show_payment_method, show_received_amount, show_change_amount,
                        show_qr_code, qr_code_type, qr_code_content, show_barcode,
                        thank_you_message, comeback_message, footer_text, show_wifi_info, wifi_name, wifi_password,
                        paper_width, font_size, separator_char, double_separator_char, cut_paper, open_cash_drawer, beep_after_print, number_of_copies,
                        is_default, is_active, sort_order, created_at, updated_at, sync_status, synced_at
                    )
                    SELECT
                        id, branch_id, name, template_type, description,
                        show_logo, logo_url, store_name, store_address, store_phone, tax_code, header_text,
                        bill_title, show_order_number, show_table_name, show_staff_name, show_customer_name, show_date_time, date_format,
                        COALESCE(show_check_in_time, 0), COALESCE(show_check_out_time, 0), COALESCE(check_in_label, 'Giờ vào'), COALESCE(check_out_label, 'Giờ ra'),
                        show_item_code, show_item_note, show_unit_price, show_quantity,
                        show_subtotal, show_discount, show_discount_percent, show_service_fee, show_vat, show_vat_details,
                        show_price_before_vat, show_price_after_vat, vat_label, price_before_vat_label, price_after_vat_label,
                        show_payment_method, show_received_amount, show_change_amount,
                        show_qr_code, qr_code_type, qr_code_content, show_barcode,
                        thank_you_message, comeback_message, footer_text, show_wifi_info, wifi_name, wifi_password,
                        paper_width, font_size, separator_char, double_separator_char, cut_paper, open_cash_drawer, beep_after_print, number_of_copies,
                        is_default, is_active, sort_order, created_at, updated_at, sync_status, synced_at
                    FROM bill_templates
                """.trimIndent())
                Log.d(TAG, "Copied data from bill_templates to bill_templates_new")
            } catch (e: Exception) {
                Log.d(TAG, "bill_templates may be empty or have different schema: ${e.message}")
            }

            // 3. Drop old table
            db.execSQL("DROP TABLE IF EXISTS bill_templates")

            // 4. Rename new table to original name
            db.execSQL("ALTER TABLE bill_templates_new RENAME TO bill_templates")

            // 5. Recreate indices with new column name
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bill_templates_brand_id ON bill_templates(brand_id)")
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bill_templates_is_active ON bill_templates(is_active)")
            db.execSQL("CREATE INDEX IF NOT EXISTS index_bill_templates_is_default ON bill_templates(is_default)")

            Log.d(TAG, "Migration 25 to 26 complete - Renamed branch_id to brand_id in bill_templates")
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
        MIGRATION_19_20,
        MIGRATION_20_21,
        MIGRATION_21_22,
        MIGRATION_22_23,
        MIGRATION_23_24,
        MIGRATION_24_25,
        MIGRATION_25_26
    )
}
