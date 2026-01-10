package com.techres.ccb.data.local

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
        AreaEntity::class,
        TableEntity::class,
        StaffEntity::class,
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
        ProductNoteAssignmentEntity::class
    ],
    version = 7,
    exportSchema = true
)
abstract class CCBDatabase : RoomDatabase() {

    // Master data DAOs
    abstract fun brandDao(): BrandDao
    abstract fun branchDao(): BranchDao
    abstract fun categoryDao(): CategoryDao
    abstract fun productDao(): ProductDao
    abstract fun productToppingDao(): ProductToppingDao
    abstract fun areaDao(): AreaDao
    abstract fun tableDao(): TableDao
    abstract fun staffDao(): StaffDao

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

    /**
     * Clear only master data tables, preserving transaction data (orders, shifts, payments)
     * Master data: brands, branches, categories, products, toppings, areas, tables, staff,
     *              vouchers, seasonal prices, coupons, product notes, sync metadata
     * Preserved: orders, order_items, shifts, payments
     */
    fun clearMasterData() {
        val db: SupportSQLiteDatabase = openHelper.writableDatabase
        db.beginTransaction()
        try {
            // Clear master data tables
            db.execSQL("DELETE FROM brands")
            db.execSQL("DELETE FROM branches")
            db.execSQL("DELETE FROM categories")
            db.execSQL("DELETE FROM products")
            db.execSQL("DELETE FROM product_toppings")
            db.execSQL("DELETE FROM areas")
            db.execSQL("DELETE FROM tables")
            db.execSQL("DELETE FROM staff")

            // Clear support tables
            db.execSQL("DELETE FROM vouchers")
            db.execSQL("DELETE FROM sync_queue")
            db.execSQL("DELETE FROM sync_metadata")
            db.execSQL("DELETE FROM sync_conflicts")

            // Clear pricing tables
            db.execSQL("DELETE FROM seasonal_prices")
            db.execSQL("DELETE FROM seasonal_price_products")
            db.execSQL("DELETE FROM coupons")

            // Clear product notes
            db.execSQL("DELETE FROM product_notes")
            db.execSQL("DELETE FROM product_note_assignments")

            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    companion object {
        const val DATABASE_NAME = "ccb_database"
    }
}
