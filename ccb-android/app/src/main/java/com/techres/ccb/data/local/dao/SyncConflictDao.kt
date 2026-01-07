package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.techres.ccb.data.local.entity.SyncConflictEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncConflictDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(conflict: SyncConflictEntity): Long

    @Update
    suspend fun update(conflict: SyncConflictEntity)

    @Query("SELECT * FROM sync_conflicts WHERE id = :id")
    suspend fun getById(id: Long): SyncConflictEntity?

    @Query("SELECT * FROM sync_conflicts WHERE entity_id = :entityId AND entity_type = :entityType")
    suspend fun getByEntityId(entityId: String, entityType: String): SyncConflictEntity?

    @Query("SELECT * FROM sync_conflicts WHERE status = 'pending' ORDER BY created_at DESC")
    fun getPendingConflicts(): Flow<List<SyncConflictEntity>>

    @Query("SELECT * FROM sync_conflicts WHERE status = 'pending' ORDER BY created_at DESC")
    suspend fun getPendingConflictsList(): List<SyncConflictEntity>

    @Query("SELECT COUNT(*) FROM sync_conflicts WHERE status = 'pending'")
    fun getPendingCount(): Flow<Int>

    @Query("SELECT * FROM sync_conflicts ORDER BY created_at DESC LIMIT :limit")
    fun getRecentConflicts(limit: Int = 100): Flow<List<SyncConflictEntity>>

    @Query("""
        UPDATE sync_conflicts SET
            status = 'resolved',
            resolved_data = :resolvedData,
            resolved_by = :resolvedBy,
            resolution_notes = :notes,
            resolved_at = :resolvedAt
        WHERE id = :id
    """)
    suspend fun markResolved(
        id: Long,
        resolvedData: String,
        resolvedBy: String,
        notes: String? = null,
        resolvedAt: Long = System.currentTimeMillis()
    )

    @Query("UPDATE sync_conflicts SET status = 'ignored' WHERE id = :id")
    suspend fun markIgnored(id: Long)

    @Query("DELETE FROM sync_conflicts WHERE status = 'resolved' AND resolved_at < :cutoffTime")
    suspend fun deleteOldResolved(cutoffTime: Long)

    @Query("DELETE FROM sync_conflicts WHERE entity_id = :entityId AND entity_type = :entityType")
    suspend fun deleteByEntity(entityId: String, entityType: String)
}
