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
}
