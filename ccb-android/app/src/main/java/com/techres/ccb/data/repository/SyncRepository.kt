package com.techres.ccb.data.repository

import com.techres.ccb.data.local.entity.*
import com.techres.ccb.data.remote.api.MasterDataApi
import com.techres.ccb.data.remote.dto.FullSyncResponse
import javax.inject.Inject
import javax.inject.Singleton

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
        return try {
            val token = authRepository.getAccessToken()
                ?: return Result.failure(Exception("No access token"))
            val branchId = authRepository.getBranchId()
                ?: return Result.failure(Exception("No branch ID"))

            val response = api.getFullSyncData("Bearer $token", branchId)
            if (response.isSuccessful && response.body() != null) {
                val syncData = response.body()!!
                saveSyncData(branchId, syncData)
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun performIncrementalSync(since: String): Result<Unit> {
        return try {
            val token = authRepository.getAccessToken()
                ?: return Result.failure(Exception("No access token"))
            val branchId = authRepository.getBranchId()
                ?: return Result.failure(Exception("No branch ID"))

            val response = api.getIncrementalSyncData("Bearer $token", branchId, since)
            if (response.isSuccessful && response.body() != null) {
                val syncData = response.body()!!
                // Save incremental data (similar to full sync but merge instead of replace)
                saveSyncData(branchId, syncData)
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun saveSyncData(branchId: String, syncData: FullSyncResponse) {
        // Sync categories
        val categories = syncData.categories.map { dto ->
            CategoryEntity(
                id = dto.id,
                branchId = branchId,
                name = dto.name,
                displayOrder = dto.displayOrder,
                imageUrl = dto.imageUrl,
                isActive = dto.isActive,
                version = dto.version,
                syncStatus = "synced",
                syncedAt = syncData.syncedAt
            )
        }
        categoryRepository.syncCategories(branchId, categories)

        // Sync products
        val products = syncData.products.map { dto ->
            ProductEntity(
                id = dto.id,
                branchId = branchId,
                categoryId = dto.categoryId,
                code = dto.code,
                name = dto.name,
                description = dto.description,
                price = dto.price,
                imageUrl = dto.imageUrl,
                unit = dto.unit,
                vatRate = dto.vatRate,
                isActive = dto.isActive,
                displayOrder = dto.displayOrder,
                version = dto.version,
                syncStatus = "synced",
                syncedAt = syncData.syncedAt
            )
        }
        productRepository.syncProducts(branchId, products)

        // Sync areas
        val areas = syncData.areas.map { dto ->
            AreaEntity(
                id = dto.id,
                branchId = branchId,
                name = dto.name,
                displayOrder = dto.displayOrder,
                isActive = dto.isActive,
                version = dto.version,
                syncStatus = "synced",
                syncedAt = syncData.syncedAt
            )
        }
        tableRepository.syncAreas(branchId, areas)

        // Sync tables
        val tables = syncData.tables.map { dto ->
            TableEntity(
                id = dto.id,
                branchId = branchId,
                areaId = dto.areaId,
                name = dto.name,
                capacity = dto.capacity,
                status = dto.status,
                displayOrder = dto.displayOrder,
                isActive = dto.isActive,
                version = dto.version,
                syncStatus = "synced",
                syncedAt = syncData.syncedAt
            )
        }
        tableRepository.syncTables(branchId, tables)

        // Sync staff
        val staffList = syncData.staff.map { dto ->
            StaffEntity(
                id = dto.id,
                branchId = branchId,
                code = dto.code,
                name = dto.name,
                phone = dto.phone,
                pinCode = dto.pinCode,
                role = dto.role,
                avatarUrl = dto.avatarUrl,
                isActive = dto.isActive,
                version = dto.version,
                syncStatus = "synced",
                syncedAt = syncData.syncedAt
            )
        }
        staffRepository.syncStaff(branchId, staffList)
    }
}
