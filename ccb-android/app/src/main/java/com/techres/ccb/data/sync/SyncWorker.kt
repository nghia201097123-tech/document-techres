package com.techres.ccb.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import timber.log.Timber
import java.util.concurrent.TimeUnit

/**
 * Push Sync Worker - Uploads local changes to server
 * Compatible with Android 6.0+ (WorkManager auto-fallbacks to AlarmManager)
 */
@HiltWorker
class PushSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val syncManager: SyncManager,
    private val deviceConfig: DeviceConfig
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val TAG = "PushSyncWorker"
        const val WORK_NAME = "push_sync_work"

        fun buildOneTimeRequest(): OneTimeWorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            return OneTimeWorkRequestBuilder<PushSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .addTag(TAG)
                .build()
        }
    }

    override suspend fun doWork(): Result {
        Timber.d("$TAG: Starting push sync")

        return try {
            val result = syncManager.processSyncQueue(deviceConfig.deviceId)

            when (result) {
                is SyncResult.Success -> {
                    Timber.d("$TAG: Push sync completed successfully")
                    Result.success()
                }
                is SyncResult.NetworkError -> {
                    Timber.w("$TAG: Network error, will retry")
                    Result.retry()
                }
                is SyncResult.AuthError -> {
                    Timber.e("$TAG: Auth error, needs user intervention")
                    Result.failure(workDataOf("error" to result.message))
                }
                else -> {
                    Timber.w("$TAG: Sync failed, will retry")
                    Result.retry()
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Push sync error")
            Result.retry()
        }
    }
}

/**
 * Pull Sync Worker - Downloads master data from server
 */
@HiltWorker
class PullSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val syncManager: SyncManager,
    private val deviceConfig: DeviceConfig
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val TAG = "PullSyncWorker"
        const val WORK_NAME = "pull_sync_work"
        const val KEY_BRANCH_ID = "branch_id"
        const val KEY_FORCE_FULL = "force_full"

        fun buildOneTimeRequest(branchId: String, forceFull: Boolean = false): OneTimeWorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            return OneTimeWorkRequestBuilder<PullSyncWorker>()
                .setConstraints(constraints)
                .setInputData(
                    workDataOf(
                        KEY_BRANCH_ID to branchId,
                        KEY_FORCE_FULL to forceFull
                    )
                )
                .addTag(TAG)
                .build()
        }

        fun buildPeriodicRequest(branchId: String): PeriodicWorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            return PeriodicWorkRequestBuilder<PullSyncWorker>(
                15, TimeUnit.MINUTES,  // Repeat interval
                5, TimeUnit.MINUTES    // Flex interval
            )
                .setConstraints(constraints)
                .setInputData(workDataOf(KEY_BRANCH_ID to branchId))
                .addTag(TAG)
                .build()
        }
    }

    override suspend fun doWork(): Result {
        val branchId = inputData.getString(KEY_BRANCH_ID)
            ?: return Result.failure(workDataOf("error" to "Missing branch ID"))

        val forceFull = inputData.getBoolean(KEY_FORCE_FULL, false)

        Timber.d("$TAG: Starting pull sync for branch $branchId (forceFull=$forceFull)")

        return try {
            val result = syncManager.pullMasterData(
                branchId = branchId,
                deviceId = deviceConfig.deviceId,
                forceFull = forceFull
            )

            when (result) {
                is SyncResult.Success -> {
                    Timber.d("$TAG: Pull sync completed successfully")
                    Result.success()
                }
                is SyncResult.NetworkError -> {
                    Timber.w("$TAG: Network error, will retry")
                    Result.retry()
                }
                is SyncResult.AuthError -> {
                    Timber.e("$TAG: Auth error, needs user intervention")
                    Result.failure(workDataOf("error" to result.message))
                }
                else -> {
                    Timber.w("$TAG: Sync failed, will retry")
                    Result.retry()
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Pull sync error")
            Result.retry()
        }
    }
}

/**
 * Sync Scheduler - Manages sync work scheduling
 */
class SyncScheduler(
    private val workManager: WorkManager
) {
    /**
     * Schedule immediate push sync
     */
    fun schedulePushSync() {
        workManager.enqueueUniqueWork(
            PushSyncWorker.WORK_NAME,
            ExistingWorkPolicy.KEEP,
            PushSyncWorker.buildOneTimeRequest()
        )
    }

    /**
     * Schedule immediate pull sync
     */
    fun schedulePullSync(branchId: String, forceFull: Boolean = false) {
        workManager.enqueueUniqueWork(
            PullSyncWorker.WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            PullSyncWorker.buildOneTimeRequest(branchId, forceFull)
        )
    }

    /**
     * Schedule periodic pull sync (every 15 minutes)
     */
    fun schedulePeriodicPullSync(branchId: String) {
        workManager.enqueueUniquePeriodicWork(
            "${PullSyncWorker.WORK_NAME}_periodic",
            ExistingPeriodicWorkPolicy.KEEP,
            PullSyncWorker.buildPeriodicRequest(branchId)
        )
    }

    /**
     * Cancel all sync work
     */
    fun cancelAllSync() {
        workManager.cancelAllWorkByTag(PushSyncWorker.TAG)
        workManager.cancelAllWorkByTag(PullSyncWorker.TAG)
    }

    /**
     * Cancel periodic pull sync
     */
    fun cancelPeriodicPullSync() {
        workManager.cancelUniqueWork("${PullSyncWorker.WORK_NAME}_periodic")
    }
}

/**
 * Device configuration holder
 */
interface DeviceConfig {
    val deviceId: String
    val deviceCode: String
    val branchId: String
}
