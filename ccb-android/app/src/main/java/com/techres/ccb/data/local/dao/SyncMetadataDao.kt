package com.techres.ccb.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.techres.ccb.data.local.entity.SyncMetadataEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncMetadataDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(metadata: SyncMetadataEntity)

    @Update
    suspend fun update(metadata: SyncMetadataEntity)

    @Query("SELECT * FROM sync_metadata WHERE entity_type = :entityType")
    suspend fun get(entityType: String): SyncMetadataEntity?

    @Query("SELECT * FROM sync_metadata WHERE entity_type = :entityType")
    fun getFlow(entityType: String): Flow<SyncMetadataEntity?>

    @Query("SELECT * FROM sync_metadata")
    suspend fun getAll(): List<SyncMetadataEntity>

    @Query("SELECT * FROM sync_metadata")
    fun getAllFlow(): Flow<List<SyncMetadataEntity>>

    @Query("""
        UPDATE sync_metadata SET
            last_sync_at = :lastSyncAt,
            server_version = :serverVersion,
            last_sync_status = :status,
            total_records = :totalRecords,
            updated_at = :updatedAt
        WHERE entity_type = :entityType
    """)
    suspend fun updateSyncSuccess(
        entityType: String,
        lastSyncAt: Long,
        serverVersion: Int,
        status: String = "success",
        totalRecords: Int,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Query("""
        UPDATE sync_metadata SET
            last_sync_status = 'failed',
            last_sync_error = :error,
            updated_at = :updatedAt
        WHERE entity_type = :entityType
    """)
    suspend fun updateSyncFailed(
        entityType: String,
        error: String,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Query("""
        UPDATE sync_metadata SET
            last_sync_status = 'in_progress',
            updated_at = :updatedAt
        WHERE entity_type = :entityType
    """)
    suspend fun markInProgress(
        entityType: String,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Query("DELETE FROM sync_metadata WHERE entity_type = :entityType")
    suspend fun delete(entityType: String)

    @Query("DELETE FROM sync_metadata")
    suspend fun deleteAll()

    @Query("SELECT last_sync_at FROM sync_metadata WHERE entity_type = :entityType")
    suspend fun getLastSyncTime(entityType: String): Long?

    @Query("SELECT server_version FROM sync_metadata WHERE entity_type = :entityType")
    suspend fun getServerVersion(entityType: String): Int?
}
