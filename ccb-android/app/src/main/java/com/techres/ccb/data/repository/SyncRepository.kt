package com.techres.ccb.data.repository

import android.util.Log
import com.techres.ccb.data.local.dao.BankAccountDao
import com.techres.ccb.data.local.dao.BillPrinterConfigDao
import com.techres.ccb.data.local.dao.BillTemplateDao
import com.techres.ccb.data.local.dao.ComboItemDao
import com.techres.ccb.data.local.dao.CouponDao
import com.techres.ccb.data.local.dao.SurchargeDao
import com.techres.ccb.data.local.dao.OrderDao
import com.techres.ccb.data.local.dao.ProductNoteDao
import com.techres.ccb.data.local.dao.ProductToppingDao
import com.techres.ccb.data.local.dao.SeasonalPriceDao
import com.techres.ccb.data.local.dao.SeasonalPriceProductDao
import com.techres.ccb.data.local.dao.TableDao
import com.techres.ccb.data.local.entity.*
import com.techres.ccb.data.remote.api.MasterDataApi
import com.techres.ccb.data.remote.dto.FullSyncData
import com.techres.ccb.util.StringUtils
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
    KITCHENS,         // Bếp
    SEASONAL_PRICES,  // Giá thời vụ
    COUPONS,          // Mã giảm giá
    SURCHARGES,       // Phụ thu
    PRODUCT_NOTES,    // Ghi chú món ăn
    BILL_TEMPLATES,   // Mẫu hóa đơn
    BANK_ACCOUNTS     // Tài khoản ngân hàng
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
    private val kitchenRepository: KitchenRepository,
    private val productToppingDao: ProductToppingDao,
    private val comboItemDao: ComboItemDao,
    private val seasonalPriceDao: SeasonalPriceDao,
    private val seasonalPriceProductDao: SeasonalPriceProductDao,
    private val couponDao: CouponDao,
    private val productNoteDao: ProductNoteDao,
    private val orderDao: OrderDao,
    private val tableDao: TableDao,
    private val billTemplateDao: BillTemplateDao,
    private val billPrinterConfigDao: BillPrinterConfigDao,
    private val surchargeDao: SurchargeDao,
    private val bankAccountDao: BankAccountDao
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
            val brandId = authRepository.getBrandId()
                ?: return Result.failure(Exception("No brand ID"))

            // Step: Fetching data
            onProgress?.invoke(SyncStepProgress(SyncStep.FETCHING, SyncStepStatus.IN_PROGRESS))

            val response = api.getFullSyncData("Bearer $token", branchId)
            if (response.isSuccessful && response.body() != null) {
                val syncResponse = response.body()!!
                if (syncResponse.success && syncResponse.data != null) {
                    onProgress?.invoke(SyncStepProgress(SyncStep.FETCHING, SyncStepStatus.COMPLETED))
                    saveSyncDataWithProgress(branchId, brandId, syncResponse.data, syncResponse.syncTime, onProgress)
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
        brandId: String,
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
                productType = dto.productType,
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
        // Build set of valid category IDs to validate product.categoryId (avoid FK constraint error)
        val validCategoryIds = categories.map { it.id }.toSet()
        val products = syncData.products.map { dto ->
            // Auto-generate searchName and abbreviation if API doesn't provide them
            val productName = dto.name ?: ""
            val searchName = dto.searchName ?: StringUtils.removeVietnameseAccents(productName)
            val abbreviation = dto.abbreviation ?: StringUtils.generateAbbreviation(productName)
            // Validate categoryId - set to null if category doesn't exist (avoid FK constraint error)
            val validCategoryId = if (dto.categoryId != null && validCategoryIds.contains(dto.categoryId)) {
                dto.categoryId
            } else {
                if (dto.categoryId != null) {
                    Log.w("SyncRepository", "Product '${productName}' has invalid categoryId=${dto.categoryId}, setting to null")
                }
                null
            }

            ProductEntity(
                id = dto.id,
                branchId = branchId,
                categoryId = validCategoryId,
                code = dto.code ?: "",
                name = productName,
                searchName = searchName,
                abbreviation = abbreviation,
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
                kitchenIds = dto.kitchenIds,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        }
        // Debug log for searchName and abbreviation
        products.forEach { product ->
            Log.d("SyncRepository", "Syncing product: ${product.name}, searchName=${product.searchName}, abbreviation=${product.abbreviation}")
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
                        minSelect = group.minSelect,
                        maxSelect = group.maxSelect,
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

        // Debug log for topping groups
        Log.d("SyncRepository", "Topping groups from API: ${syncData.toppingGroups?.size ?: 0}")
        syncData.toppingGroups?.forEach { group ->
            val productCount = group.productIds?.size ?: 0
            Log.d("SyncRepository", "  - Group: ${group.name}, minSelect=${group.minSelect}, maxSelect=${group.maxSelect}, products=$productCount, toppings=${group.toppings.size}")
            if (productCount == 0) {
                Log.w("SyncRepository", "  WARNING: Group '${group.name}' has no products assigned! Min/max limits will not work.")
            }
        }
        Log.d("SyncRepository", "ProductToppings from groups: ${productToppingsFromGroups.size}, from products: ${productToppingsFromProducts.size}")

        // Combine both sources (prefer toppingGroups if available)
        val productToppings = if (productToppingsFromGroups.isNotEmpty()) {
            Log.d("SyncRepository", "Using toppingGroups structure (new)")
            productToppingsFromGroups
        } else {
            Log.d("SyncRepository", "Using products[].toppings structure (old) - minSelect/maxSelect defaults to 0/99")
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
        Log.d("SyncRepository", "Syncing combo items: ${syncData.comboItems?.size ?: 0} from API")
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
        if (comboItemsList.isNotEmpty()) {
            Log.d("SyncRepository", "Saved ${comboItemsList.size} combo items to database")
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

        // IMPORTANT: Save active orders' table relationships BEFORE sync
        // because syncTables() deletes all tables, triggering foreign key SET NULL on orders.table_id
        val activeOrdersWithTables = orderDao.getAllActiveOrdersWithTable()
        val orderTableMap = activeOrdersWithTables.associate { it.id to (it.tableId to it.tableName) }
        Log.d("SyncRepository", "Saved ${orderTableMap.size} active orders' table relationships before sync")

        // Also get orders that have table_name but NULL table_id (lost from previous sync without fix)
        val ordersWithTableNameOnly = orderDao.getAllActiveOrdersWithTableName()
            .filter { it.tableId == null && it.tableName != null }
        Log.d("SyncRepository", "Found ${ordersWithTableNameOnly.size} orders with table_name but NULL table_id")

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

        // Create lookup maps for restoring table relationships
        val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            .format(java.util.Date())
        val syncedTableIds = tables.map { it.id }.toSet()
        val syncedTablesByName = tables.associateBy { it.name.lowercase().trim() }

        // Restore table relationships to orders that lost them due to foreign key constraint
        for ((orderId, tableInfo) in orderTableMap) {
            val (tableId, tableName) = tableInfo
            if (tableId != null && tableId in syncedTableIds) {
                // Restore table_id back to the order
                orderDao.updateTableId(orderId, tableId, tableName, now)
                Log.d("SyncRepository", "Restored table $tableId ($tableName) to order $orderId")
            } else {
                Log.w("SyncRepository", "Table $tableId not found in synced tables for order $orderId")
            }
        }

        // Restore table relationships for orders that have table_name but lost table_id
        // This handles orders from previous sessions where the fix wasn't applied
        for (order in ordersWithTableNameOnly) {
            val tableName = order.tableName ?: continue
            val matchedTable = syncedTablesByName[tableName.lowercase().trim()]
            if (matchedTable != null) {
                orderDao.updateTableId(order.id, matchedTable.id, tableName, now)
                Log.d("SyncRepository", "Restored table by name: ${matchedTable.id} ($tableName) to order ${order.orderNumber}")
            } else {
                Log.w("SyncRepository", "Could not find table by name '$tableName' for order ${order.orderNumber}")
            }
        }

        // Restore table statuses based on active orders (important for shift handover)
        val restoredCount = restoreTableStatusesFromOrders(tables)
        if (restoredCount > 0) {
            Log.d("SyncRepository", "Restored $restoredCount table statuses from active orders")
        }
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

        // Sync kitchens
        onProgress?.invoke(SyncStepProgress(SyncStep.KITCHENS, SyncStepStatus.IN_PROGRESS))
        Log.d("SyncRepository", "=== Syncing kitchens ===")
        syncData.kitchens?.forEach { dto ->
            Log.d("SyncRepository", "Kitchen from API: ${dto.name}")
            Log.d("SyncRepository", "  printMode from API: '${dto.printMode}'")
            Log.d("SyncRepository", "  printerIp: ${dto.printerIp}:${dto.printerPort}")
            Log.d("SyncRepository", "  printerProtocol: ${dto.printerProtocol}")
        }
        val kitchensList = syncData.kitchens?.map { dto ->
            KitchenEntity(
                id = dto.id,
                branchId = branchId,
                name = dto.name ?: "",
                description = dto.description,
                kitchenType = dto.kitchenType,
                // Printer config from dashboard (for new kitchens - existing ones will be preserved by syncKitchens)
                printerName = dto.printerName,
                printerIp = dto.printerIp,
                printerPort = dto.printerPort ?: 9100,
                printerProtocol = dto.printerProtocol ?: "ESCPOS",
                paperWidth = dto.paperWidth ?: 80,
                printMode = dto.printMode ?: "TICKET",
                printDensity = dto.printDensity ?: 8,
                labelWidthMm = dto.labelWidthMm ?: 72,
                labelHeightMm = dto.labelHeightMm ?: 30,
                labelGapMm = dto.labelGapMm ?: 3,
                labelFontScale = dto.labelFontScale ?: 1.0f,
                labelMaxToppings = dto.labelMaxToppings ?: 0,
                // Ticket printing config (with null-safety for backward compatibility)
                ticketCutAfterPrint = dto.ticketCutAfterPrint ?: true,
                ticketPrintItemsSeparately = dto.ticketPrintItemsSeparately ?: false,
                ticketCopies = dto.ticketCopies ?: 1,
                ticketPrintOrderNumber = dto.ticketPrintOrderNumber ?: true,
                ticketPrintTableName = dto.ticketPrintTableName ?: true,
                ticketPrintTime = dto.ticketPrintTime ?: true,
                ticketPrintStoreName = dto.ticketPrintStoreName ?: false,
                ticketStoreName = dto.ticketStoreName,
                ticketPrintNotes = dto.ticketPrintNotes ?: true,
                ticketFontSize = dto.ticketFontSize ?: "medium",
                ticketPrintPrice = dto.ticketPrintPrice ?: false,
                // Label printing config
                labelPrintPrice = dto.labelPrintPrice,
                labelPrintStoreName = dto.labelPrintStoreName,
                labelPrintOrderNumber = dto.labelPrintOrderNumber,
                labelPrintTableName = dto.labelPrintTableName,
                labelPrintTime = dto.labelPrintTime,
                labelStoreName = dto.labelStoreName,
                labelReverse = dto.labelReverse,
                // Line spacing config
                ticketLineSpacing = dto.ticketLineSpacing ?: 0.4f,
                labelLineSpacing = dto.labelLineSpacing ?: 1.0f,
                sortOrder = dto.sortOrder,
                isActive = dto.isActive,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        } ?: emptyList()
        kitchenRepository.syncKitchens(branchId, kitchensList)
        Log.d("SyncRepository", "Synced ${kitchensList.size} kitchens")
        onProgress?.invoke(SyncStepProgress(SyncStep.KITCHENS, SyncStepStatus.COMPLETED, kitchensList.size))

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
            // Convert productIds/categoryIds lists to JSON strings for Room storage
            val productIdsJson = dto.productIds?.let {
                com.google.gson.Gson().toJson(it)
            }
            val categoryIdsJson = dto.categoryIds?.let {
                com.google.gson.Gson().toJson(it)
            }

            CouponEntity(
                id = dto.id,
                branchId = branchId,
                code = dto.code ?: "",
                name = dto.name ?: "",
                description = dto.description,
                couponType = dto.couponType,
                applyTo = dto.applyTo,
                activationType = dto.activationType,
                discountValue = dto.discountValue,
                maxDiscount = dto.maxDiscount,
                minOrderAmount = dto.minOrderAmount,
                minQuantity = dto.minQuantity,
                productIds = productIdsJson,
                categoryIds = categoryIdsJson,
                isCombinable = dto.isCombinable,
                priority = dto.priority,
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

        // Sync surcharges (phụ thu)
        onProgress?.invoke(SyncStepProgress(SyncStep.SURCHARGES, SyncStepStatus.IN_PROGRESS))
        val surchargesList = syncData.surcharges?.map { dto ->
            SurchargeEntity(
                id = dto.id,
                branchId = branchId,
                name = dto.name,
                description = dto.description,
                amount = dto.amount,
                vatRate = dto.vatRate,
                sortOrder = dto.sortOrder,
                isActive = dto.isActive,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        } ?: emptyList()
        surchargeDao.syncSurcharges(branchId, surchargesList)
        onProgress?.invoke(SyncStepProgress(SyncStep.SURCHARGES, SyncStepStatus.COMPLETED, surchargesList.size))

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

        // Sync bill templates (at brand level - shared across branches)
        onProgress?.invoke(SyncStepProgress(SyncStep.BILL_TEMPLATES, SyncStepStatus.IN_PROGRESS))
        val billTemplatesList = syncData.billTemplates?.map { dto ->
            BillTemplateEntity(
                id = dto.id,
                brandId = brandId,
                name = dto.name,
                templateType = dto.templateType,
                description = dto.description,
                // Header config
                showLogo = dto.showLogo,
                logoUrl = dto.logoUrl,
                storeName = dto.storeName,
                storeAddress = dto.storeAddress,
                storePhone = dto.storePhone,
                taxCode = dto.taxCode,
                headerText = dto.headerText,
                // Content config
                billTitle = dto.billTitle,
                showOrderNumber = dto.showOrderNumber,
                showTableName = dto.showTableName,
                showStaffName = dto.showStaffName,
                showCustomerName = dto.showCustomerName,
                showDateTime = dto.showDateTime,
                dateFormat = dto.dateFormat,
                // Time tracking config
                showCheckInTime = dto.showCheckInTime,
                showCheckOutTime = dto.showCheckOutTime,
                checkInLabel = dto.checkInLabel,
                checkOutLabel = dto.checkOutLabel,
                // Items config
                showItemCode = dto.showItemCode,
                showItemNote = dto.showItemNote,
                showOrderNote = dto.showOrderNote,
                itemDisplayLayout = dto.itemDisplayLayout ?: "standard",
                showUnitPrice = dto.showUnitPrice,
                showQuantity = dto.showQuantity,
                // Price config
                showSubtotal = dto.showSubtotal,
                // Discount config (4 loại giảm giá)
                showItemDiscount = dto.showItemDiscount,
                showTotalItemDiscount = dto.showTotalItemDiscount,
                itemDiscountLabel = dto.itemDiscountLabel,
                showBillDiscount = dto.showBillDiscount,
                billDiscountLabel = dto.billDiscountLabel,
                showCouponDiscount = dto.showCouponDiscount,
                couponDiscountLabel = dto.couponDiscountLabel,
                showVoucherDiscount = dto.showVoucherDiscount,
                voucherDiscountLabel = dto.voucherDiscountLabel,
                showTotalDiscount = dto.showTotalDiscount,
                totalDiscountLabel = dto.totalDiscountLabel,
                showDiscount = dto.showDiscount,
                showDiscountPercent = dto.showDiscountPercent,
                showServiceFee = dto.showServiceFee,
                showVat = dto.showVat,
                showVatDetails = dto.showVatDetails,
                showPriceBeforeVat = dto.showPriceBeforeVat,
                showPriceAfterVat = dto.showPriceAfterVat,
                vatLabel = dto.vatLabel,
                priceBeforeVatLabel = dto.priceBeforeVatLabel,
                priceAfterVatLabel = dto.priceAfterVatLabel,
                // Payment config
                showPaymentMethod = dto.showPaymentMethod,
                showReceivedAmount = dto.showReceivedAmount,
                showChangeAmount = dto.showChangeAmount,
                // Footer config
                showQrCode = dto.showQrCode,
                qrCodeType = dto.qrCodeType,
                qrCodeContent = dto.qrCodeContent,
                showBarcode = dto.showBarcode,
                thankYouMessage = dto.thankYouMessage,
                comebackMessage = dto.comebackMessage,
                footerText = dto.footerText,
                showWifiInfo = dto.showWifiInfo,
                wifiName = dto.wifiName,
                wifiPassword = dto.wifiPassword,
                // Style config
                paperWidth = dto.paperWidth,
                fontSize = dto.fontSize,
                lineSpacing = dto.lineSpacing,
                separatorChar = dto.separatorChar,
                doubleSeparatorChar = dto.doubleSeparatorChar,
                cutPaper = dto.cutPaper,
                openCashDrawer = dto.openCashDrawer,
                beepAfterPrint = dto.beepAfterPrint,
                numberOfCopies = dto.numberOfCopies,
                // Status
                isDefault = dto.isDefault,
                isActive = dto.isActive,
                sortOrder = dto.sortOrder,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        } ?: emptyList()

        billTemplateDao.deleteByBrand(brandId)
        if (billTemplatesList.isNotEmpty()) {
            billTemplateDao.insertAll(billTemplatesList)
            Log.d("SyncRepository", "Saved ${billTemplatesList.size} bill templates to database for brandId=$brandId")
        }
        onProgress?.invoke(SyncStepProgress(SyncStep.BILL_TEMPLATES, SyncStepStatus.COMPLETED, billTemplatesList.size))

        // Sync bill printer configs (after templates since configs may reference templates)
        val billPrinterConfigsList = syncData.billPrinterConfigs?.map { dto ->
            BillPrinterConfigEntity(
                id = dto.id,
                branchId = branchId,
                name = dto.name,
                description = dto.description,
                // Connection config
                connectionType = dto.connectionType,
                printerIp = dto.printerIp,
                printerPort = dto.printerPort,
                printerMac = dto.printerMac,
                printerUsbPath = dto.printerUsbPath,
                // Template config
                templateId = dto.templateId,
                // Print config
                paperWidth = dto.paperWidth,
                fontSize = dto.fontSize,
                lineSpacing = dto.lineSpacing,
                autoPrintOnPayment = dto.autoPrintOnPayment,
                printPreview = dto.printPreview,
                numberOfCopies = dto.numberOfCopies,
                cutPaper = dto.cutPaper,
                openCashDrawer = dto.openCashDrawer,
                beepAfterPrint = dto.beepAfterPrint,
                // Retry config
                retryCount = dto.retryCount,
                retryDelayMs = dto.retryDelayMs,
                connectionTimeoutMs = dto.connectionTimeoutMs,
                // Status
                isDefault = dto.isDefault,
                isActive = dto.isActive,
                sortOrder = dto.sortOrder,
                createdAt = dto.createdAt,
                updatedAt = dto.updatedAt,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        } ?: emptyList()

        billPrinterConfigDao.deleteByBranch(branchId)
        if (billPrinterConfigsList.isNotEmpty()) {
            billPrinterConfigDao.insertAll(billPrinterConfigsList)
            Log.d("SyncRepository", "Saved ${billPrinterConfigsList.size} bill printer configs to database")
        }

        // Sync bank accounts
        onProgress?.invoke(SyncStepProgress(SyncStep.BANK_ACCOUNTS, SyncStepStatus.IN_PROGRESS))
        val bankAccountsList = syncData.bankAccounts?.map { dto ->
            BankAccountEntity(
                id = dto.id,
                branchId = branchId,
                bankCode = dto.bankCode,
                bankName = dto.bankName,
                bankBin = dto.bankBin,
                accountNumber = dto.accountNumber,
                accountName = dto.accountName,
                transferTemplate = dto.transferTemplate,
                staticQrUrl = dto.staticQrUrl,
                // PayOS Integration
                paymentPartner = dto.paymentPartner,
                payosClientId = dto.payosClientId,
                payosApiKey = dto.payosApiKey,
                payosChecksumKey = dto.payosChecksumKey,
                isPrimary = dto.isPrimary,
                isActive = dto.isActive,
                syncStatus = "synced",
                syncedAt = syncTime
            )
        } ?: emptyList()

        bankAccountDao.syncBankAccounts(branchId, bankAccountsList)
        if (bankAccountsList.isNotEmpty()) {
            Log.d("SyncRepository", "Saved ${bankAccountsList.size} bank accounts to database")
        }
        onProgress?.invoke(SyncStepProgress(SyncStep.BANK_ACCOUNTS, SyncStepStatus.COMPLETED, bankAccountsList.size))
    }

    /**
     * Restore table statuses based on active orders.
     * This is important for shift handover - when syncing after login,
     * tables with active orders should show as "occupied" instead of "available".
     *
     * Note: This should be called AFTER restoring table_ids to orders,
     * because syncTables() triggers foreign key SET NULL on orders.table_id
     *
     * @return Number of tables that were restored to "occupied" status
     */
    private suspend fun restoreTableStatusesFromOrders(tables: List<TableEntity>): Int {
        var restoredCount = 0
        val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            .format(java.util.Date())

        // Get all active orders that have a table assigned (should have table_ids restored by now)
        val activeOrders = orderDao.getAllActiveOrdersWithTable()
        Log.d("SyncRepository", "restoreTableStatuses: Found ${activeOrders.size} active orders with tables")

        // Create a map of synced table IDs for quick lookup
        val syncedTablesMap = tables.associateBy { it.id }
        Log.d("SyncRepository", "restoreTableStatuses: ${tables.size} synced tables")

        for (order in activeOrders) {
            val tableId = order.tableId
            if (tableId != null) {
                Log.d("SyncRepository", "restoreTableStatuses: Order ${order.orderNumber} -> tableId=$tableId, tableName=${order.tableName}, status=${order.status}")

                // Check if this table exists in our synced tables
                val syncedTable = syncedTablesMap[tableId]
                if (syncedTable != null) {
                    tableDao.updateStatus(tableId, "occupied", order.id, now)
                    restoredCount++
                    Log.d("SyncRepository", "restoreTableStatuses: ✓ Updated ${syncedTable.name} ($tableId) to OCCUPIED")
                } else {
                    Log.w("SyncRepository", "restoreTableStatuses: ✗ Table $tableId NOT FOUND in synced tables for order ${order.orderNumber}")
                }
            }
        }
        Log.d("SyncRepository", "restoreTableStatuses: Restored $restoredCount tables to occupied status")
        return restoredCount
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
        kitchenRepository.clearByBranch(branchId)
        seasonalPriceDao.deleteAllByBranch(branchId)
        seasonalPriceProductDao.deleteAllByBranch(branchId)
        couponDao.deleteAllByBranch(branchId)
        surchargeDao.deleteAllByBranch(branchId)
        // Bill templates are at brand level, get brandId from authRepository
        val brandId = authRepository.getBrandId()
        if (brandId != null) {
            billTemplateDao.deleteByBrand(brandId)
        }
        billPrinterConfigDao.deleteByBranch(branchId)
        bankAccountDao.deleteAllByBranch(branchId)
    }
}
