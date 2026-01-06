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
        ShiftEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class CCBDatabase : RoomDatabase() {

    abstract fun categoryDao(): CategoryDao
    abstract fun productDao(): ProductDao
    abstract fun areaDao(): AreaDao
    abstract fun tableDao(): TableDao
    abstract fun staffDao(): StaffDao
    abstract fun orderDao(): OrderDao
    abstract fun orderItemDao(): OrderItemDao
    abstract fun shiftDao(): ShiftDao

    companion object {
        const val DATABASE_NAME = "ccb_database"
    }
}
