package com.techres.ccb.data.repository

import com.techres.ccb.data.local.entity.*
import com.techres.ccb.data.remote.api.MasterDataApi
import com.techres.ccb.data.remote.dto.FullSyncData
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Represents progress of each sync step
 */
data class SyncStepProgress(
    val step: SyncStep,
    val status: SyncStepStatus,
    val count: Int = 0
)

enum class SyncStep {
    FETCHING,      // Đang tải dữ liệu
    CATEGORIES,    // Danh mục
    PRODUCTS,      // Sản phẩm
    AREAS,         // Khu vực
    TABLES,        // Bàn
    STAFF          // Nhân viên
}

enum class SyncStepStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    ERROR
}

@Singleton
class SyncRepository @Inject constructor(
    private val api: MasterDataApi,
    private val authRepository: AuthRepository,
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository,
    private val tableRepository: TableRepository,
    private val staffRepository: StaffRepository
) {
    suspend fun performFullSync(): Result<Unit> {
        return performFullSyncWithProgress(null)
    }

    /**
     * Perform full sync with progress callback for each step
     */
    suspend fun performFullSyncWithProgress(
        onProgress: ((SyncStepProgress) -> Unit)?
    ): Result<Unit> {
        return try {
            val token = authRepository.getAccessToken()
                ?: return Result.failure(Exception("No access token"))
            val branchId = authRepository.getBranchId()
                ?: return Result.failure(Exception("No branch ID"))

            // Step: Fetching data
            onProgress?.invoke(SyncStepProgress(SyncStep.FETCHING, SyncStepStatus.IN_PROGRESS))

            val response = api.getFullSyncData("Bearer $token", branchId)
            if (response.isSuccessful && response.body() != null) {
                val syncResponse = response.body()!!
                if (syncResponse.success && syncResponse.data != null) {
                    onProgress?.invoke(SyncStepProgress(SyncStep.FETCHING, SyncStepStatus.COMPLETED))
                    saveSyncDataWithProgress(branchId, syncResponse.data, syncResponse.syncTime, onProgress)
                    Result.success(Unit)
                } else {
                    onProgress?.invoke(SyncStepProgress(SyncStep.FETCHING, SyncStepStatus.ERROR))
                    Result.failure(Exception(syncResponse.message ?: "Sync failed"))
                }
            } else {
                onProgress?.invoke(SyncStepProgress(SyncStep.FETCHING, SyncStepStatus.ERROR))
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun saveSyncDataWithProgress(
        branchId: String,
        syncData: FullSyncData,
        syncTime: String,
        onProgress: ((SyncStepProgress) -> Unit)?
    ) {
        // Sync categories
        onProgress?.invoke(SyncStepProgress(SyncStep.CATEGORIES, SyncStepStatus.IN_PROGRESS))
        val categories = syncData.categories.map { dto ->
            CategoryEntity(
                id = dto.id,
                branchId = branchId,
                name = dto.name,
                description = dto.description,
                imageUrl = dto.imageUrl,
                sortOrder = dto.sortOrder,
                isActive = dto.isActive,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        }
        categoryRepository.syncCategories(branchId, categories)
        onProgress?.invoke(SyncStepProgress(SyncStep.CATEGORIES, SyncStepStatus.COMPLETED, categories.size))

        // Sync products
        onProgress?.invoke(SyncStepProgress(SyncStep.PRODUCTS, SyncStepStatus.IN_PROGRESS))
        val products = syncData.products.map { dto ->
            ProductEntity(
                id = dto.id,
                branchId = branchId,
                categoryId = dto.categoryId,
                code = dto.code,
                name = dto.name,
                description = dto.description,
                imageUrl = dto.imageUrl,
                price = dto.price,
                costPrice = dto.costPrice,
                vatRate = dto.vatRate,
                unit = dto.unit,
                type = dto.type,
                isAvailable = dto.isAvailable,
                isActive = dto.isActive,
                sortOrder = dto.sortOrder,
                preparationTime = dto.preparationTime,
                printToKitchen = dto.printToKitchen,
                printToBar = dto.printToBar,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        }
        productRepository.syncProducts(branchId, products)
        onProgress?.invoke(SyncStepProgress(SyncStep.PRODUCTS, SyncStepStatus.COMPLETED, products.size))

        // Sync areas
        onProgress?.invoke(SyncStepProgress(SyncStep.AREAS, SyncStepStatus.IN_PROGRESS))
        val areas = syncData.areas.map { dto ->
            AreaEntity(
                id = dto.id,
                branchId = branchId,
                name = dto.name,
                description = dto.description,
                sortOrder = dto.sortOrder,
                isActive = dto.isActive,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        }
        tableRepository.syncAreas(branchId, areas)
        onProgress?.invoke(SyncStepProgress(SyncStep.AREAS, SyncStepStatus.COMPLETED, areas.size))

        // Sync tables
        onProgress?.invoke(SyncStepProgress(SyncStep.TABLES, SyncStepStatus.IN_PROGRESS))
        val tables = syncData.tables.map { dto ->
            TableEntity(
                id = dto.id,
                branchId = branchId,
                areaId = dto.areaId,
                name = dto.name,
                capacity = dto.capacity,
                status = "available",
                sortOrder = dto.sortOrder,
                isActive = dto.isActive,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        }
        tableRepository.syncTables(branchId, tables)
        onProgress?.invoke(SyncStepProgress(SyncStep.TABLES, SyncStepStatus.COMPLETED, tables.size))

        // Sync staff
        onProgress?.invoke(SyncStepProgress(SyncStep.STAFF, SyncStepStatus.IN_PROGRESS))
        val staffList = syncData.staff.map { dto ->
            StaffEntity(
                id = dto.id,
                branchId = branchId,
                code = dto.code,
                name = dto.name,
                phone = dto.phone,
                email = dto.email,
                avatarUrl = dto.avatarUrl,
                pinCode = dto.pinCode,
                role = dto.role,
                permissions = dto.permissions,
                isActive = dto.isActive,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        }
        staffRepository.syncStaff(branchId, staffList)
        onProgress?.invoke(SyncStepProgress(SyncStep.STAFF, SyncStepStatus.COMPLETED, staffList.size))
    }
}
