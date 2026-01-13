package com.techres.ccb.data.repository

import com.techres.ccb.data.local.dao.KitchenDao
import com.techres.ccb.data.local.entity.KitchenEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class KitchenRepository @Inject constructor(
    private val kitchenDao: KitchenDao
) {
    fun getAllKitchens(branchId: String): Flow<List<KitchenEntity>> {
        return kitchenDao.getAllByBranch(branchId)
    }

    suspend fun getAllKitchensSync(branchId: String): List<KitchenEntity> {
        return kitchenDao.getAllByBranchSync(branchId)
    }

    suspend fun getKitchenById(id: String): KitchenEntity? {
        return kitchenDao.getById(id)
    }

    suspend fun syncKitchens(branchId: String, kitchens: List<KitchenEntity>) {
        kitchenDao.syncKitchens(branchId, kitchens)
    }

    suspend fun updatePrinterConfig(
        kitchenId: String,
        ip: String?,
        port: Int,
        name: String?,
        isConnected: Boolean
    ) {
        kitchenDao.updatePrinterConfig(kitchenId, ip, port, name, isConnected)
    }

    suspend fun getKitchensCount(branchId: String): Int {
        return kitchenDao.getCount(branchId)
    }

    suspend fun clearByBranch(branchId: String) {
        kitchenDao.deleteAllByBranch(branchId)
    }

    /**
     * Insert debug/demo kitchen data for testing
     */
    suspend fun insertDebugKitchens(branchId: String) {
        val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())

        val debugKitchens = listOf(
            KitchenEntity(
                id = "kitchen-debug-1",
                branchId = branchId,
                name = "Bếp chính",
                description = "Bếp nấu món chính",
                kitchenType = "cooking",
                sortOrder = 1,
                isActive = true,
                createdAt = now,
                updatedAt = now
            ),
            KitchenEntity(
                id = "kitchen-debug-2",
                branchId = branchId,
                name = "Bếp nướng",
                description = "Bếp chế biến món nướng",
                kitchenType = "grill",
                sortOrder = 2,
                isActive = true,
                createdAt = now,
                updatedAt = now
            ),
            KitchenEntity(
                id = "kitchen-debug-3",
                branchId = branchId,
                name = "Quầy bar",
                description = "Pha chế đồ uống",
                kitchenType = "bar",
                sortOrder = 3,
                isActive = true,
                createdAt = now,
                updatedAt = now
            ),
            KitchenEntity(
                id = "kitchen-debug-4",
                branchId = branchId,
                name = "Quầy tráng miệng",
                description = "Món tráng miệng và bánh ngọt",
                kitchenType = "dessert",
                sortOrder = 4,
                isActive = true,
                createdAt = now,
                updatedAt = now
            )
        )

        kitchenDao.insertAll(debugKitchens)
    }
}
