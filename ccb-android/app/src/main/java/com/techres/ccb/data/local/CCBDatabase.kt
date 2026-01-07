package com.techres.ccb.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.techres.ccb.data.local.dao.*
import com.techres.ccb.data.local.entity.*

@Database(
    entities = [
        CategoryEntity::class,
        ProductEntity::class,
        AreaEntity::class,
        TableEntity::class,
        StaffEntity::class,
        OrderEntity::class,
        OrderItemEntity::class,
        ShiftEntity::class,
        // New entities for sync and offline support
        PaymentEntity::class,
        VoucherEntity::class,
        SyncQueueEntity::class,
        SyncMetadataEntity::class,
        SyncConflictEntity::class
    ],
    version = 2,
    exportSchema = true
)
abstract class CCBDatabase : RoomDatabase() {

    // Existing DAOs
    abstract fun categoryDao(): CategoryDao
    abstract fun productDao(): ProductDao
    abstract fun areaDao(): AreaDao
    abstract fun tableDao(): TableDao
    abstract fun staffDao(): StaffDao
    abstract fun orderDao(): OrderDao
    abstract fun orderItemDao(): OrderItemDao
    abstract fun shiftDao(): ShiftDao

    // New DAOs for sync and offline support
    abstract fun paymentDao(): PaymentDao
    abstract fun voucherDao(): VoucherDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun syncMetadataDao(): SyncMetadataDao
    abstract fun syncConflictDao(): SyncConflictDao

    companion object {
        const val DATABASE_NAME = "ccb_database"
    }
}
