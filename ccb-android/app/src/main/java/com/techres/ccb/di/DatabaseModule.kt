package com.techres.ccb.di

import android.content.Context
import androidx.room.Room
import com.techres.ccb.data.local.CCBDatabase
import com.techres.ccb.data.local.dao.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(
        @ApplicationContext context: Context
    ): CCBDatabase {
        return Room.databaseBuilder(
            context,
            CCBDatabase::class.java,
            CCBDatabase.DATABASE_NAME
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideCategoryDao(database: CCBDatabase): CategoryDao {
        return database.categoryDao()
    }

    @Provides
    @Singleton
    fun provideProductDao(database: CCBDatabase): ProductDao {
        return database.productDao()
    }

    @Provides
    @Singleton
    fun provideAreaDao(database: CCBDatabase): AreaDao {
        return database.areaDao()
    }

    @Provides
    @Singleton
    fun provideTableDao(database: CCBDatabase): TableDao {
        return database.tableDao()
    }

    @Provides
    @Singleton
    fun provideStaffDao(database: CCBDatabase): StaffDao {
        return database.staffDao()
    }

    @Provides
    @Singleton
    fun provideOrderDao(database: CCBDatabase): OrderDao {
        return database.orderDao()
    }

    @Provides
    @Singleton
    fun provideOrderItemDao(database: CCBDatabase): OrderItemDao {
        return database.orderItemDao()
    }

    @Provides
    @Singleton
    fun provideShiftDao(database: CCBDatabase): ShiftDao {
        return database.shiftDao()
    }
}
