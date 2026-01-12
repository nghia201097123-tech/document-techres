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
     * All migrations in order
     */
    val ALL_MIGRATIONS = arrayOf(
        MIGRATION_9_10,
        MIGRATION_10_11
    )
}
