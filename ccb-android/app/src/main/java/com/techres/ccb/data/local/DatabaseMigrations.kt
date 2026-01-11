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
     * All migrations in order
     */
    val ALL_MIGRATIONS = arrayOf(
        MIGRATION_9_10
    )
}
