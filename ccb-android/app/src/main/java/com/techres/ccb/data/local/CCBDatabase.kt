package com.techres.ccb.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.techres.ccb.data.local.dao.*
import com.techres.ccb.data.local.entity.*

@Database(
    entities = [
        // Master data entities
        BrandEntity::class,
        BranchEntity::class,
        CategoryEntity::class,
        ProductEntity::class,
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
        CouponEntity::class
    ],
    version = 5,
    exportSchema = true
)
abstract class CCBDatabase : RoomDatabase() {

    // Master data DAOs
    abstract fun brandDao(): BrandDao
    abstract fun branchDao(): BranchDao
    abstract fun categoryDao(): CategoryDao
    abstract fun productDao(): ProductDao
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

    companion object {
        const val DATABASE_NAME = "ccb_database"
    }
}
