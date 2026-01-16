package com.techres.ccb.data.local

import android.util.Log
import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.techres.ccb.data.local.dao.*
import com.techres.ccb.data.local.entity.*

@Database(
    entities = [
        // Master data entities
        BrandEntity::class,
        BranchEntity::class,
        CategoryEntity::class,
        ProductEntity::class,
        ProductToppingEntity::class,
        ComboItemEntity::class,
        AreaEntity::class,
        TableEntity::class,
        StaffEntity::class,
        KitchenEntity::class,
        // Transaction entities
        OrderEntity::class,
        OrderItemEntity::class,
        ShiftEntity::class,
        PaymentEntity::class,
        // Support entities
        VoucherEntity::class,
        SyncQueueEntity::class,
        SyncMetadataEntity::class,
        SyncConflictEntity::class,
        // Pricing entities
        SeasonalPriceEntity::class,
        SeasonalPriceProductEntity::class,
        CouponEntity::class,
        // Product notes
        ProductNoteEntity::class,
        ProductNoteAssignmentEntity::class,
        // Bill printing
        BillTemplateEntity::class,
        BillPrinterConfigEntity::class
    ],
    version = 18,
    exportSchema = true
)
abstract class CCBDatabase : RoomDatabase() {

    // Master data DAOs
    abstract fun brandDao(): BrandDao
    abstract fun branchDao(): BranchDao
    abstract fun categoryDao(): CategoryDao
    abstract fun productDao(): ProductDao
    abstract fun productToppingDao(): ProductToppingDao
    abstract fun comboItemDao(): ComboItemDao
    abstract fun areaDao(): AreaDao
    abstract fun tableDao(): TableDao
    abstract fun staffDao(): StaffDao
    abstract fun kitchenDao(): KitchenDao

    // Transaction DAOs
    abstract fun orderDao(): OrderDao
    abstract fun orderItemDao(): OrderItemDao
    abstract fun shiftDao(): ShiftDao
    abstract fun paymentDao(): PaymentDao

    // Support DAOs
    abstract fun voucherDao(): VoucherDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun syncMetadataDao(): SyncMetadataDao
    abstract fun syncConflictDao(): SyncConflictDao

    // Pricing DAOs
    abstract fun seasonalPriceDao(): SeasonalPriceDao
    abstract fun seasonalPriceProductDao(): SeasonalPriceProductDao
    abstract fun couponDao(): CouponDao

    // Product notes DAOs
    abstract fun productNoteDao(): ProductNoteDao

    // Bill printing DAOs
    abstract fun billTemplateDao(): BillTemplateDao
    abstract fun billPrinterConfigDao(): BillPrinterConfigDao

    /**
     * Clear only master data tables, preserving transaction data (orders, shifts, payments)
     * Master data: brands, branches, categories, products, toppings, areas, tables, staff,
     *              vouchers, seasonal prices, coupons, product notes, sync metadata
     * Preserved: orders, order_items, shifts, payments
     */
    fun clearMasterData() {
        Log.d(TAG, "clearMasterData - Starting to clear master data...")
        val db: SupportSQLiteDatabase = openHelper.writableDatabase
        db.beginTransaction()
        try {
            // Clear master data tables
            Log.d(TAG, "clearMasterData - Clearing brands...")
            db.execSQL("DELETE FROM brands")
            Log.d(TAG, "clearMasterData - Clearing branches...")
            db.execSQL("DELETE FROM branches")
            Log.d(TAG, "clearMasterData - Clearing categories...")
            db.execSQL("DELETE FROM categories")
            Log.d(TAG, "clearMasterData - Clearing products...")
            db.execSQL("DELETE FROM products")
            Log.d(TAG, "clearMasterData - Clearing product_toppings...")
            db.execSQL("DELETE FROM product_toppings")
            Log.d(TAG, "clearMasterData - Clearing combo_items...")
            db.execSQL("DELETE FROM combo_items")
            Log.d(TAG, "clearMasterData - Clearing areas...")
            db.execSQL("DELETE FROM areas")
            Log.d(TAG, "clearMasterData - Clearing tables...")
            db.execSQL("DELETE FROM tables")
            Log.d(TAG, "clearMasterData - Clearing staff...")
            db.execSQL("DELETE FROM staff")
            Log.d(TAG, "clearMasterData - Clearing kitchens...")
            db.execSQL("DELETE FROM kitchens")

            // Clear support tables
            Log.d(TAG, "clearMasterData - Clearing vouchers...")
            db.execSQL("DELETE FROM vouchers")
            Log.d(TAG, "clearMasterData - Clearing sync_queue...")
            db.execSQL("DELETE FROM sync_queue")
            Log.d(TAG, "clearMasterData - Clearing sync_metadata...")
            db.execSQL("DELETE FROM sync_metadata")
            Log.d(TAG, "clearMasterData - Clearing sync_conflicts...")
            db.execSQL("DELETE FROM sync_conflicts")

            // Clear pricing tables
            Log.d(TAG, "clearMasterData - Clearing seasonal_prices...")
            db.execSQL("DELETE FROM seasonal_prices")
            Log.d(TAG, "clearMasterData - Clearing seasonal_price_products...")
            db.execSQL("DELETE FROM seasonal_price_products")
            Log.d(TAG, "clearMasterData - Clearing coupons...")
            db.execSQL("DELETE FROM coupons")

            // Clear product notes
            Log.d(TAG, "clearMasterData - Clearing product_notes...")
            db.execSQL("DELETE FROM product_notes")
            Log.d(TAG, "clearMasterData - Clearing product_note_assignments...")
            db.execSQL("DELETE FROM product_note_assignments")

            // Clear bill printing tables
            Log.d(TAG, "clearMasterData - Clearing bill_templates...")
            db.execSQL("DELETE FROM bill_templates")
            Log.d(TAG, "clearMasterData - Clearing bill_printer_configs...")
            db.execSQL("DELETE FROM bill_printer_configs")

            db.setTransactionSuccessful()
            Log.d(TAG, "clearMasterData - Transaction successful, committing...")
        } catch (e: Exception) {
            Log.e(TAG, "clearMasterData - Error: ${e.message}", e)
            throw e
        } finally {
            db.endTransaction()
            Log.d(TAG, "clearMasterData - Transaction ended")
        }
    }

    companion object {
        private const val TAG = "CCBDatabase"
        const val DATABASE_NAME = "ccb_database"
    }
}
