package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.techres.ccb.data.local.entity.SyncQueueEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncQueueDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: SyncQueueEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<SyncQueueEntity>)

    @Update
    suspend fun update(item: SyncQueueEntity)

    @Delete
    suspend fun delete(item: SyncQueueEntity)

    @Query("SELECT * FROM sync_queue WHERE id = :id")
    suspend fun getById(id: Long): SyncQueueEntity?

    @Query("SELECT * FROM sync_queue WHERE entity_id = :entityId AND entity_type = :entityType")
    suspend fun getByEntityId(entityId: String, entityType: String): SyncQueueEntity?

    @Query("""
        SELECT * FROM sync_queue
        WHERE status IN ('pending', 'failed')
        AND attempts < max_attempts
        AND (next_retry_at IS NULL OR next_retry_at <= :currentTime)
        ORDER BY priority DESC, created_at ASC
        LIMIT :limit
    """)
    suspend fun getPendingItems(currentTime: Long, limit: Int = 50): List<SyncQueueEntity>

    @Query("SELECT * FROM sync_queue WHERE status = :status ORDER BY priority DESC, created_at ASC")
    suspend fun getByStatus(status: String): List<SyncQueueEntity>

    @Query("SELECT * FROM sync_queue WHERE status = :status")
    fun getByStatusFlow(status: String): Flow<List<SyncQueueEntity>>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE status IN ('pending', 'failed')")
    fun getPendingCountFlow(): Flow<Int>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE status IN ('pending', 'failed')")
    suspend fun getPendingCount(): Int

    @Query("""
        UPDATE sync_queue SET
            status = :status,
            updated_at = :updatedAt
        WHERE id = :id
    """)
    suspend fun updateStatus(id: Long, status: String, updatedAt: Long = System.currentTimeMillis())

    @Query("""
        UPDATE sync_queue SET
            status = :status,
            last_error = :error,
            attempts = attempts + 1,
            next_retry_at = :nextRetryAt,
            updated_at = :updatedAt
        WHERE id = :id
    """)
    suspend fun updateError(
        id: Long,
        status: String,
        error: String,
        nextRetryAt: Long,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Query("""
        UPDATE sync_queue SET
            status = 'completed',
            completed_at = :completedAt,
            updated_at = :completedAt
        WHERE id = :id
    """)
    suspend fun markCompleted(id: Long, completedAt: Long = System.currentTimeMillis())

    @Query("UPDATE sync_queue SET status = 'dead_letter' WHERE id = :id")
    suspend fun moveToDeadLetter(id: Long)

    @Query("DELETE FROM sync_queue WHERE status = 'completed' AND completed_at < :cutoffTime")
    suspend fun deleteOldCompleted(cutoffTime: Long)

    @Query("DELETE FROM sync_queue WHERE entity_id = :entityId AND entity_type = :entityType")
    suspend fun deleteByEntity(entityId: String, entityType: String)

    @Query("SELECT * FROM sync_queue WHERE depends_on_id = :dependencyId")
    suspend fun getDependentItems(dependencyId: Long): List<SyncQueueEntity>

    @Query("SELECT * FROM sync_queue WHERE status = 'dead_letter' ORDER BY created_at DESC")
    fun getDeadLetterItems(): Flow<List<SyncQueueEntity>>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE status = 'dead_letter'")
    fun getDeadLetterCount(): Flow<Int>
}
