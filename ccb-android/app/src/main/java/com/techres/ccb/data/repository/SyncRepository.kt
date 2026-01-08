package com.techres.ccb.data.repository

import com.techres.ccb.data.local.entity.*
import com.techres.ccb.data.remote.api.MasterDataApi
import com.techres.ccb.data.remote.dto.FullSyncData
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
                val syncResponse = response.body()!!
                if (syncResponse.success && syncResponse.data != null) {
                    saveSyncData(branchId, syncResponse.data, syncResponse.syncTime)
                    Result.success(Unit)
                } else {
                    Result.failure(Exception(syncResponse.message ?: "Sync failed"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun saveSyncData(branchId: String, syncData: FullSyncData, syncTime: String) {
        // Sync categories
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

        // Sync products
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

        // Sync areas
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

        // Sync tables
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

        // Sync staff
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
    }
}
