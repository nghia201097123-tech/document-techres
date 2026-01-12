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
     * All migrations in order
     */
    val ALL_MIGRATIONS = arrayOf(
        MIGRATION_9_10,
        MIGRATION_10_11,
        MIGRATION_11_12
    )
}
