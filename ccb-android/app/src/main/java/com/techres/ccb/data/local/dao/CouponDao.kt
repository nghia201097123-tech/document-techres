package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.techres.ccb.data.local.entity.CouponEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CouponDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(coupon: CouponEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(coupons: List<CouponEntity>)

    @Update
    suspend fun update(coupon: CouponEntity)

    @Query("SELECT * FROM coupons WHERE id = :id")
    suspend fun getById(id: String): CouponEntity?

    @Query("SELECT * FROM coupons WHERE code = :code AND branch_id = :branchId")
    suspend fun getByCode(code: String, branchId: String): CouponEntity?

    @Query("SELECT * FROM coupons WHERE branch_id = :branchId AND is_active = 1 ORDER BY sort_order ASC")
    fun getActiveCoupons(branchId: String): Flow<List<CouponEntity>>

    @Query("""
        SELECT * FROM coupons
        WHERE branch_id = :branchId
        AND is_active = 1
        AND (start_date IS NULL OR start_date <= :currentDate)
        AND (end_date IS NULL OR end_date >= :currentDate)
        ORDER BY sort_order ASC
    """)
    suspend fun getValidCoupons(branchId: String, currentDate: String): List<CouponEntity>

    @Query("""
        SELECT * FROM coupons
        WHERE code = :code
        AND branch_id = :branchId
        AND is_active = 1
        AND (start_date IS NULL OR start_date <= :currentDate)
        AND (end_date IS NULL OR end_date >= :currentDate)
    """)
    suspend fun getValidCouponByCode(code: String, branchId: String, currentDate: String): CouponEntity?

    /**
     * Lấy danh sách coupon tự động áp dụng (activationType = 'auto')
     * Sắp xếp theo priority (số nhỏ = ưu tiên cao)
     */
    @Query("""
        SELECT * FROM coupons
        WHERE branch_id = :branchId
        AND is_active = 1
        AND activation_type = 'auto'
        AND (start_date IS NULL OR start_date <= :currentDate)
        AND (end_date IS NULL OR end_date >= :currentDate)
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (daily_limit IS NULL OR daily_usage_count < daily_limit)
        ORDER BY priority ASC, sort_order ASC
    """)
    suspend fun getAutoCoupons(branchId: String, currentDate: String): List<CouponEntity>

    /**
     * Lấy coupon có thể áp dụng (bao gồm cả manual và auto)
     * cho một giá trị đơn hàng cụ thể
     */
    @Query("""
        SELECT * FROM coupons
        WHERE branch_id = :branchId
        AND is_active = 1
        AND (start_date IS NULL OR start_date <= :currentDate)
        AND (end_date IS NULL OR end_date >= :currentDate)
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (daily_limit IS NULL OR daily_usage_count < daily_limit)
        AND min_order_amount <= :orderAmount
        ORDER BY priority ASC, sort_order ASC
    """)
    suspend fun getApplicableCoupons(branchId: String, currentDate: String, orderAmount: Double): List<CouponEntity>

    /**
     * Lấy coupon áp dụng cho bill (apply_to = 'bill')
     */
    @Query("""
        SELECT * FROM coupons
        WHERE branch_id = :branchId
        AND is_active = 1
        AND apply_to = 'bill'
        AND (start_date IS NULL OR start_date <= :currentDate)
        AND (end_date IS NULL OR end_date >= :currentDate)
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (daily_limit IS NULL OR daily_usage_count < daily_limit)
        ORDER BY priority ASC, sort_order ASC
    """)
    suspend fun getBillLevelCoupons(branchId: String, currentDate: String): List<CouponEntity>

    /**
     * Lấy coupon áp dụng cho món cụ thể (apply_to = 'item')
     */
    @Query("""
        SELECT * FROM coupons
        WHERE branch_id = :branchId
        AND is_active = 1
        AND apply_to = 'item'
        AND (start_date IS NULL OR start_date <= :currentDate)
        AND (end_date IS NULL OR end_date >= :currentDate)
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (daily_limit IS NULL OR daily_usage_count < daily_limit)
        ORDER BY priority ASC, sort_order ASC
    """)
    suspend fun getItemLevelCoupons(branchId: String, currentDate: String): List<CouponEntity>

    /**
     * Lấy coupon áp dụng cho danh mục (apply_to = 'category')
     */
    @Query("""
        SELECT * FROM coupons
        WHERE branch_id = :branchId
        AND is_active = 1
        AND apply_to = 'category'
        AND (start_date IS NULL OR start_date <= :currentDate)
        AND (end_date IS NULL OR end_date >= :currentDate)
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (daily_limit IS NULL OR daily_usage_count < daily_limit)
        ORDER BY priority ASC, sort_order ASC
    """)
    suspend fun getCategoryLevelCoupons(branchId: String, currentDate: String): List<CouponEntity>

    @Query("UPDATE coupons SET usage_count = usage_count + 1 WHERE id = :id")
    suspend fun incrementUsage(id: String)

    @Query("UPDATE coupons SET daily_usage_count = daily_usage_count + 1 WHERE id = :id")
    suspend fun incrementDailyUsage(id: String)

    @Query("UPDATE coupons SET daily_usage_count = 0")
    suspend fun resetDailyUsageCount()

    @Query("DELETE FROM coupons WHERE branch_id = :branchId")
    suspend fun deleteAllByBranch(branchId: String)

    @Query("SELECT COUNT(*) FROM coupons WHERE branch_id = :branchId AND is_active = 1")
    suspend fun countActive(branchId: String): Int

    @Transaction
    suspend fun syncCoupons(branchId: String, coupons: List<CouponEntity>) {
        deleteAllByBranch(branchId)
        insertAll(coupons)
    }
}
