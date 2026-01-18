package com.techres.ccb.di

import android.content.Context
import androidx.room.Room
import com.techres.ccb.data.local.CCBDatabase
import com.techres.ccb.data.local.DatabaseMigrations
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
            .addMigrations(*DatabaseMigrations.ALL_MIGRATIONS)
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideBrandDao(database: CCBDatabase): BrandDao {
        return database.brandDao()
    }

    @Provides
    @Singleton
    fun provideBranchDao(database: CCBDatabase): BranchDao {
        return database.branchDao()
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
    fun provideProductToppingDao(database: CCBDatabase): ProductToppingDao {
        return database.productToppingDao()
    }

    @Provides
    @Singleton
    fun provideComboItemDao(database: CCBDatabase): ComboItemDao {
        return database.comboItemDao()
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
    fun provideKitchenDao(database: CCBDatabase): KitchenDao {
        return database.kitchenDao()
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

    // New DAOs for sync and offline support
    @Provides
    @Singleton
    fun providePaymentDao(database: CCBDatabase): PaymentDao {
        return database.paymentDao()
    }

    @Provides
    @Singleton
    fun provideVoucherDao(database: CCBDatabase): VoucherDao {
        return database.voucherDao()
    }

    @Provides
    @Singleton
    fun provideSyncQueueDao(database: CCBDatabase): SyncQueueDao {
        return database.syncQueueDao()
    }

    @Provides
    @Singleton
    fun provideSyncMetadataDao(database: CCBDatabase): SyncMetadataDao {
        return database.syncMetadataDao()
    }

    @Provides
    @Singleton
    fun provideSyncConflictDao(database: CCBDatabase): SyncConflictDao {
        return database.syncConflictDao()
    }

    // Pricing DAOs
    @Provides
    @Singleton
    fun provideSeasonalPriceDao(database: CCBDatabase): SeasonalPriceDao {
        return database.seasonalPriceDao()
    }

    @Provides
    @Singleton
    fun provideSeasonalPriceProductDao(database: CCBDatabase): SeasonalPriceProductDao {
        return database.seasonalPriceProductDao()
    }

    @Provides
    @Singleton
    fun provideCouponDao(database: CCBDatabase): CouponDao {
        return database.couponDao()
    }

    // Product notes DAO
    @Provides
    @Singleton
    fun provideProductNoteDao(database: CCBDatabase): ProductNoteDao {
        return database.productNoteDao()
    }

    // Bill printing DAOs
    @Provides
    @Singleton
    fun provideBillTemplateDao(database: CCBDatabase): BillTemplateDao {
        return database.billTemplateDao()
    }

    @Provides
    @Singleton
    fun provideBillPrinterConfigDao(database: CCBDatabase): BillPrinterConfigDao {
        return database.billPrinterConfigDao()
    }

    // Surcharge DAO
    @Provides
    @Singleton
    fun provideSurchargeDao(database: CCBDatabase): SurchargeDao {
        return database.surchargeDao()
    }
}
