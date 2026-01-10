package com.techres.ccb.data.repository

import com.techres.ccb.data.local.dao.ComboItemDao
import com.techres.ccb.data.local.dao.CouponDao
import com.techres.ccb.data.local.dao.ProductNoteDao
import com.techres.ccb.data.local.dao.ProductToppingDao
import com.techres.ccb.data.local.dao.SeasonalPriceDao
import com.techres.ccb.data.local.dao.SeasonalPriceProductDao
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
    FETCHING,         // Đang tải dữ liệu
    CATEGORIES,       // Danh mục
    PRODUCTS,         // Sản phẩm
    PRODUCT_TOPPINGS, // Topping sản phẩm
    COMBO_ITEMS,      // Các món con trong combo
    AREAS,            // Khu vực
    TABLES,           // Bàn
    STAFF,            // Nhân viên
    SEASONAL_PRICES,  // Giá thời vụ
    COUPONS,          // Mã giảm giá
    PRODUCT_NOTES     // Ghi chú món ăn
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
    private val staffRepository: StaffRepository,
    private val productToppingDao: ProductToppingDao,
    private val comboItemDao: ComboItemDao,
    private val seasonalPriceDao: SeasonalPriceDao,
    private val seasonalPriceProductDao: SeasonalPriceProductDao,
    private val couponDao: CouponDao,
    private val productNoteDao: ProductNoteDao
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
                name = dto.name ?: "",
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
                code = dto.code ?: "",
                name = dto.name ?: "",
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

        // Sync product toppings
        onProgress?.invoke(SyncStepProgress(SyncStep.PRODUCT_TOPPINGS, SyncStepStatus.IN_PROGRESS))

        // Build product toppings from toppingGroups (new structure from TechRes Dashboard)
        val productToppingsFromGroups = syncData.toppingGroups?.flatMap { group ->
            val productIds = group.productIds ?: emptyList()
            productIds.flatMap { productId ->
                group.toppings.map { topping ->
                    ProductToppingEntity(
                        productId = productId,
                        toppingId = topping.id,
                        branchId = branchId,
                        groupName = group.name,
                        groupType = group.groupType,
                        isRequired = group.isRequired,
                        isMultiple = group.isMultiple,
                        extraPrice = topping.price,
                        isDefault = topping.isDefault,
                        sortOrder = topping.sortOrder,
                        createdAt = group.createdAt,
                        updatedAt = group.updatedAt
                    )
                }
            }
        } ?: emptyList()

        // Fall back to old structure: products[].toppings
        val productToppingsFromProducts = syncData.products.flatMap { dto ->
            dto.toppings?.map { toppingDto ->
                ProductToppingEntity(
                    productId = dto.id,
                    toppingId = toppingDto.toppingId,
                    branchId = branchId,
                    groupName = toppingDto.groupName,
                    groupType = toppingDto.groupType,
                    isRequired = toppingDto.isRequired,
                    isMultiple = toppingDto.isMultiple,
                    extraPrice = toppingDto.extraPrice,
                    isDefault = toppingDto.isDefault,
                    sortOrder = toppingDto.sortOrder,
                    createdAt = dto.createdAt,
                    updatedAt = dto.updatedAt
                )
            } ?: emptyList()
        }

        // Combine both sources (prefer toppingGroups if available)
        val productToppings = if (productToppingsFromGroups.isNotEmpty()) {
            productToppingsFromGroups
        } else {
            productToppingsFromProducts
        }

        // Clear existing toppings for this branch and insert new ones
        productToppingDao.deleteAllByBranch(branchId)
        if (productToppings.isNotEmpty()) {
            productToppingDao.insertAll(productToppings)
        }
        onProgress?.invoke(SyncStepProgress(SyncStep.PRODUCT_TOPPINGS, SyncStepStatus.COMPLETED, productToppings.size))

        // Sync combo items
        onProgress?.invoke(SyncStepProgress(SyncStep.COMBO_ITEMS, SyncStepStatus.IN_PROGRESS))
        val comboItemsList = syncData.comboItems?.map { dto ->
            ComboItemEntity(
                id = dto.id,
                comboId = dto.comboId,
                productId = dto.productId,
                productName = dto.productName,
                productCode = dto.productCode ?: "",
                quantity = dto.quantity,
                sortOrder = dto.sortOrder,
                isActive = dto.isActive
            )
        } ?: emptyList()

        // Clear existing combo items and insert new ones
        comboItemDao.deleteAll()
        if (comboItemsList.isNotEmpty()) {
            comboItemDao.insertAll(comboItemsList)
        }
        onProgress?.invoke(SyncStepProgress(SyncStep.COMBO_ITEMS, SyncStepStatus.COMPLETED, comboItemsList.size))

        // Sync areas
        onProgress?.invoke(SyncStepProgress(SyncStep.AREAS, SyncStepStatus.IN_PROGRESS))
        val areas = syncData.areas.map { dto ->
            AreaEntity(
                id = dto.id,
                branchId = branchId,
                name = dto.name ?: "",
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
                name = dto.name ?: "",
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
                code = dto.code ?: "",
                name = dto.name ?: "",
                phone = dto.phone,
                email = dto.email,
                avatarUrl = dto.avatarUrl,
                pinCode = dto.pinCode ?: "",
                role = dto.role ?: "staff",
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

        // Sync seasonal prices
        onProgress?.invoke(SyncStepProgress(SyncStep.SEASONAL_PRICES, SyncStepStatus.IN_PROGRESS))
        val seasonalPricesList = syncData.seasonalPrices?.map { dto ->
            SeasonalPriceEntity(
                id = dto.id,
                branchId = branchId,
                name = dto.name ?: "",
                description = dto.description,
                adjustmentType = dto.adjustmentType,
                adjustmentValue = dto.adjustmentValue,
                startDate = dto.startDate,
                endDate = dto.endDate,
                sortOrder = dto.sortOrder,
                isActive = dto.isActive,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        } ?: emptyList()

        val seasonalPriceProductsList = syncData.seasonalPrices?.flatMap { dto ->
            dto.products.map { productDto ->
                SeasonalPriceProductEntity(
                    seasonalPriceId = dto.id,
                    productId = productDto.productId
                )
            }
        } ?: emptyList()

        seasonalPriceDao.syncSeasonalPrices(branchId, seasonalPricesList)
        seasonalPriceProductDao.syncSeasonalPriceProducts(branchId, seasonalPriceProductsList)
        onProgress?.invoke(SyncStepProgress(SyncStep.SEASONAL_PRICES, SyncStepStatus.COMPLETED, seasonalPricesList.size))

        // Sync coupons
        onProgress?.invoke(SyncStepProgress(SyncStep.COUPONS, SyncStepStatus.IN_PROGRESS))
        val couponsList = syncData.coupons?.map { dto ->
            CouponEntity(
                id = dto.id,
                branchId = branchId,
                code = dto.code ?: "",
                name = dto.name ?: "",
                description = dto.description,
                couponType = dto.couponType,
                discountValue = dto.discountValue,
                maxDiscount = dto.maxDiscount,
                minOrderAmount = dto.minOrderAmount,
                usageLimit = dto.usageLimit,
                usageCount = dto.usageCount,
                dailyLimit = dto.dailyLimit,
                dailyUsageCount = dto.dailyUsageCount,
                requiresApproval = dto.requiresApproval,
                approvalThreshold = dto.approvalThreshold,
                startDate = dto.startDate,
                endDate = dto.endDate,
                sortOrder = dto.sortOrder,
                isActive = dto.isActive,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        } ?: emptyList()

        couponDao.syncCoupons(branchId, couponsList)
        onProgress?.invoke(SyncStepProgress(SyncStep.COUPONS, SyncStepStatus.COMPLETED, couponsList.size))

        // Sync product notes
        onProgress?.invoke(SyncStepProgress(SyncStep.PRODUCT_NOTES, SyncStepStatus.IN_PROGRESS))
        val productNotesList = syncData.productNotes?.map { dto ->
            ProductNoteEntity(
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
        } ?: emptyList()

        val productNoteAssignmentsList = syncData.productNotes?.flatMap { dto ->
            dto.productIds?.map { productId ->
                ProductNoteAssignmentEntity(
                    productId = productId,
                    noteId = dto.id,
                    branchId = branchId,
                    sortOrder = 0
                )
            } ?: emptyList()
        } ?: emptyList()

        productNoteDao.syncProductNotes(branchId, productNotesList)
        productNoteDao.syncProductNoteAssignments(branchId, productNoteAssignmentsList)
        onProgress?.invoke(SyncStepProgress(SyncStep.PRODUCT_NOTES, SyncStepStatus.COMPLETED, productNotesList.size))
    }

    /**
     * Clear all master data that was synced from server.
     * This does NOT clear app-created data like shifts and orders.
     * Called when user logs out.
     */
    suspend fun clearMasterData(branchId: String) {
        // Clear synced master data only - keep shifts, orders, etc.
        categoryRepository.clearByBranch(branchId)
        productToppingDao.deleteAllByBranch(branchId) // Delete toppings before products
        comboItemDao.deleteAll() // Delete combo items before products
        productNoteDao.deleteAllAssignmentsByBranch(branchId) // Delete note assignments before notes
        productNoteDao.deleteAllByBranch(branchId)
        productRepository.clearByBranch(branchId)
        tableRepository.clearByBranch(branchId)
        staffRepository.clearByBranch(branchId)
        seasonalPriceDao.deleteAllByBranch(branchId)
        seasonalPriceProductDao.deleteAllByBranch(branchId)
        couponDao.deleteAllByBranch(branchId)
    }
}
