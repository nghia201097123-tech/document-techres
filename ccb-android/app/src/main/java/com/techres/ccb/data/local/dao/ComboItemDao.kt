package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.techres.ccb.data.local.entity.ComboItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ComboItemDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: ComboItemEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entities: List<ComboItemEntity>)

    /**
     * Lấy tất cả các món con của một combo
     * Note: Không cần JOIN với products vì ComboItemEntity đã có productName
     */
    @Query("""
        SELECT * FROM combo_items
        WHERE combo_id = :comboId AND is_active = 1
        ORDER BY sort_order
    """)
    fun getItemsByCombo(comboId: String): Flow<List<ComboItemEntity>>

    /**
     * Lấy tất cả các món con của một combo (sync version)
     * Note: Không cần JOIN với products vì ComboItemEntity đã có productName
     */
    @Query("""
        SELECT * FROM combo_items
        WHERE combo_id = :comboId AND is_active = 1
        ORDER BY sort_order
    """)
    fun getItemsByComboSync(comboId: String): List<ComboItemEntity>

    /**
     * Lấy tất cả combo items (debug)
     */
    @Query("SELECT * FROM combo_items")
    fun getAllDebug(): List<ComboItemEntity>

    /**
     * Lấy tất cả các món con của nhiều combo
     */
    @Query("""
        SELECT * FROM combo_items
        WHERE combo_id IN (:comboIds) AND is_active = 1
        ORDER BY combo_id, sort_order
    """)
    fun getItemsByComboIds(comboIds: List<String>): Flow<List<ComboItemEntity>>

    /**
     * Lấy tất cả các món con của nhiều combo (sync version)
     */
    @Query("""
        SELECT * FROM combo_items
        WHERE combo_id IN (:comboIds) AND is_active = 1
        ORDER BY combo_id, sort_order
    """)
    fun getItemsByComboIdsSync(comboIds: List<String>): List<ComboItemEntity>

    /**
     * Kiểm tra sản phẩm có phải là combo không
     */
    @Query("SELECT COUNT(*) > 0 FROM combo_items WHERE combo_id = :productId")
    suspend fun isCombo(productId: String): Boolean

    /**
     * Lấy danh sách productId là combo
     */
    @Query("SELECT DISTINCT combo_id FROM combo_items WHERE is_active = 1")
    fun getAllComboIds(): Flow<List<String>>

    /**
     * Lấy danh sách productId là combo (sync version)
     */
    @Query("SELECT DISTINCT combo_id FROM combo_items WHERE is_active = 1")
    fun getAllComboIdsSync(): List<String>

    /**
     * Xóa tất cả combo items của một combo
     */
    @Query("DELETE FROM combo_items WHERE combo_id = :comboId")
    suspend fun deleteByCombo(comboId: String)

    /**
     * Xóa tất cả combo items
     */
    @Query("DELETE FROM combo_items")
    suspend fun deleteAll()

    /**
     * Đếm số món con trong combo
     */
    @Query("SELECT COUNT(*) FROM combo_items WHERE combo_id = :comboId AND is_active = 1")
    suspend fun countItemsInCombo(comboId: String): Int

    /**
     * Đếm tổng số combo items
     */
    @Query("SELECT COUNT(*) FROM combo_items")
    suspend fun countAll(): Int
}
