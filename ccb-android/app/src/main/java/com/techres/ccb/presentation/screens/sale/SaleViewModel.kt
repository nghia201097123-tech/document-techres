package com.techres.ccb.presentation.screens.sale

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.ComboItemDao
import com.techres.ccb.data.local.dao.CouponDao
import com.techres.ccb.data.local.dao.ProductToppingDao
import com.techres.ccb.data.local.dao.ProductNoteDao
import com.techres.ccb.data.local.dao.SeasonalPriceDao
import com.techres.ccb.data.local.dao.SeasonalPriceProductDao
import com.techres.ccb.data.local.entity.ComboItemEntity
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.local.entity.CouponEntity
import com.techres.ccb.data.local.entity.ProductEntity
import com.techres.ccb.data.local.entity.ProductToppingEntity
import com.techres.ccb.data.local.entity.ProductNoteEntity
import com.techres.ccb.data.local.entity.SeasonalPriceEntity
import com.techres.ccb.data.local.entity.SeasonalPriceProductEntity
import com.techres.ccb.data.local.entity.SurchargeEntity
import com.techres.ccb.data.local.dao.SurchargeDao
import com.techres.ccb.presentation.screens.sale.dialogs.AppliedDiscount
import com.techres.ccb.presentation.screens.sale.dialogs.SelectedSurcharge
import com.techres.ccb.presentation.screens.sale.dialogs.DiscountTarget
import com.techres.ccb.util.DiscountCalculator
import com.techres.ccb.util.OrderItemForDiscount
import com.techres.ccb.data.local.dao.BillPrinterConfigDao
import com.techres.ccb.data.local.dao.BillTemplateDao
import com.techres.ccb.data.printer.BillData
import com.techres.ccb.data.printer.BillItem
import com.techres.ccb.data.printer.BillTopping
import com.techres.ccb.data.printer.BillVariant
import com.techres.ccb.data.printer.HybridBillPrintService
import com.techres.ccb.data.printer.PrinterResult
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.CategoryRepository
import com.techres.ccb.data.repository.KitchenRepository
import com.techres.ccb.data.repository.OrderRepository
import com.techres.ccb.data.repository.ProductRepository
import com.techres.ccb.data.repository.ShiftRepository
import com.techres.ccb.data.repository.TableRepository
import com.techres.ccb.data.printer.OrderPrintingService
import com.techres.ccb.presentation.screens.table.TableViewModel
import com.techres.ccb.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import javax.inject.Inject

// Product types for grouping categories
enum class SaleProductType(val value: String, val label: String) {
    ALL("all", "Tất cả"),
    FOOD("food", "Đồ ăn"),
    DRINK("drink", "Đồ uống"),
    COMBO("combo", "Combo"),
    OTHER("other", "Khác");

    companion object {
        fun fromValue(value: String): SaleProductType {
            return entries.find { it.value == value } ?: OTHER
        }
    }
}

data class SaleUiState(
    // Categories & Products
    val categories: List<Category> = emptyList(),
    val products: List<Product> = emptyList(),
    val selectedProductType: SaleProductType = SaleProductType.ALL,
    val selectedCategoryId: String = "all",
    val searchQuery: String = "",

    // Tables
    val tables: List<Table> = emptyList(),

    // Cart (for new items to add)
    val cartItems: List<CartItem> = emptyList(),
    val orderType: OrderType = OrderType.DINE_IN,
    val selectedTable: Table? = null,
    val selectedCustomer: Customer? = null,

    // Current active order for selected table
    val currentOrder: OrderEntity? = null,
    val currentOrderItems: List<OrderItemEntity> = emptyList(),
    val tempBillPrintCount: Int = 0,         // Số lần in bill tạm

    // Available notes for quick selection
    val availableNotes: List<ProductNoteEntity> = emptyList(),

    // Discount/Coupon
    val billDiscountAmount: Long = 0,                // Giảm giá hóa đơn (riêng biệt với item discounts)
    val billDiscountDescription: String? = null,     // Mô tả giảm giá HĐ (VD: "Giảm 10%")
    val couponCode: String = "",                     // Mã coupon nhập vào
    val appliedDiscounts: List<AppliedDiscount> = emptyList(),  // Danh sách coupon đã áp dụng
    val couponError: String? = null,                 // Lỗi khi áp dụng coupon
    val isApplyingCoupon: Boolean = false,           // Đang xử lý áp dụng coupon
    val availableCoupons: List<CouponEntity> = emptyList(),     // Coupon có thể áp dụng
    val itemDiscounts: Map<String, Long> = emptyMap(),          // Giảm giá theo món: itemId -> discountAmount
    val itemDiscountTypes: Map<String, String> = emptyMap(),    // Loại giảm giá theo món: itemId -> "percent" hoặc "fixed"
    val vatAmount: Long = 0,                         // Tiền VAT

    // Surcharges (Phụ thu)
    val availableSurcharges: List<SurchargeEntity> = emptyList(),  // Danh sách phụ thu có thể chọn
    val selectedSurcharges: List<SelectedSurcharge> = emptyList(), // Phụ thu đã chọn cho đơn
    val showSurchargeDialog: Boolean = false,                       // Hiển thị dialog chọn phụ thu
    val showCustomItemDialog: Boolean = false,                      // Hiển thị dialog thêm món ngoài menu

    // Tax
    val taxRate: Double = 8.0,  // VAT 8% cho F&B (Nghị định 174/2025)
    val pricesIncludeVat: Boolean = true,  // Giá sản phẩm đã bao gồm VAT

    // UI State - Start with loading=true to show indicator on first render
    val isLoading: Boolean = true,
    val showVariantDialog: Boolean = false,
    val selectedProductForVariant: Product? = null,
    val showPaymentDialog: Boolean = false,
    val pendingPaymentDialog: Boolean = false, // Block product clicks while waiting for payment dialog
    val showTableDialog: Boolean = false,
    val showCustomerDialog: Boolean = false,
    val showNoteDialog: Boolean = false,
    val selectedCartItemForNote: String? = null,
    val notesForSelectedProduct: List<ProductNoteEntity> = emptyList(), // Notes for the product being edited
    val selectedCartItemForTopping: String? = null, // For adding toppings to existing cart item

    // Cancel order confirmation dialog
    val showCancelOrderDialog: Boolean = false,

    // Order note dialog (ghi chú tổng bill)
    val showOrderNoteDialog: Boolean = false,
    val orderNoteInput: String = "",

    // Remove order item confirmation dialog
    val showRemoveItemDialog: Boolean = false,
    val itemToRemove: OrderItemEntity? = null, // Item pending removal

    // Reprint menu
    val showReprintMenu: Boolean = false,
    val reprintItemId: String? = null, // null = all items, specific ID = single item

    // Messages
    val successMessage: String? = null,
    val errorMessage: String? = null
) {
    // Computed properties
    val subtotal: Long
        get() = cartItems.sumOf { it.totalPrice }

    // Tổng giảm giá món
    val itemDiscountTotal: Long
        get() = itemDiscounts.values.sum()

    // Tổng giảm giá (món + hóa đơn + coupon)
    val discountAmount: Long
        get() = billDiscountAmount + itemDiscountTotal + totalCouponDiscount

    // Tổng tiền giảm giá từ các coupon đã áp dụng
    val totalCouponDiscount: Long
        get() = appliedDiscounts.sumOf { it.discountAmount }

    // Tổng phụ thu
    val surchargeAmount: Long
        get() = selectedSurcharges.sumOf { it.totalAmount.toLong() }

    /**
     * Tổng tiền sau giảm giá và phụ thu
     * Vì giá sản phẩm đã bao gồm VAT nên KHÔNG cộng thêm VAT
     */
    val totalAmount: Long
        get() = (subtotal - discountAmount + surchargeAmount).coerceAtLeast(0L)

    /**
     * Tiền VAT (tách ra từ tổng để hiển thị trên hóa đơn)
     * Công thức: VAT = Tổng - (Tổng / (1 + VAT_rate))
     * Ví dụ: 48,000đ có VAT 8% → VAT = 48,000 - 48,000/1.08 = 3,556đ
     */
    val taxAmount: Long
        get() {
            if (!pricesIncludeVat) {
                // Nếu giá chưa bao gồm VAT, tính VAT thêm
                return (totalAmount * taxRate / 100.0).toLong()
            }
            // Giá đã bao gồm VAT - tách VAT ra để hiển thị
            val priceBeforeVat = totalAmount / (1 + taxRate / 100.0)
            return (totalAmount - priceBeforeVat).toLong()
        }

    /**
     * Giá trước VAT (để hiển thị trên hóa đơn)
     */
    val priceBeforeVat: Long
        get() = totalAmount - taxAmount

    /**
     * Get categories filtered by selected product type, sorted by order
     */
    val filteredCategories: List<Category>
        get() = if (selectedProductType == SaleProductType.ALL) {
            categories.sortedBy { it.order }
        } else {
            // Always include "Tất cả" category (order=-1), then filter by product type and sort
            val allCategory = categories.find { it.id == "all" }
            val filtered = categories
                .filter { it.productType == selectedProductType.value }
                .sortedBy { it.order }
            if (allCategory != null) listOf(allCategory) + filtered else filtered
        }

    /**
     * Check if product type has categories
     */
    fun hasCategories(productType: SaleProductType): Boolean {
        return if (productType == SaleProductType.ALL) {
            categories.isNotEmpty()
        } else {
            categories.any { it.productType == productType.value }
        }
    }

    val cartItemCount: Int
        get() = cartItems.sumOf { it.quantity }

    val canPlaceOrder: Boolean
        get() = cartItems.isNotEmpty() && cartItemsWithMissingRequiredToppings.isEmpty()

    /**
     * List of cart items that are missing required topping selections
     * Returns pairs of (cartItemId, list of missing group names)
     */
    val cartItemsWithMissingRequiredToppings: List<Pair<String, List<String>>>
        get() = cartItems.mapNotNull { cartItem ->
            val missingGroups = cartItem.product.variants
                .filter { group -> group.isRequired }
                .filter { group ->
                    // Check if any option from this required group is selected
                    val hasSelection = cartItem.selectedVariants.any { selectedVariant ->
                        group.options.any { it.name == selectedVariant.name }
                    }
                    !hasSelection
                }
                .map { it.name }

            if (missingGroups.isNotEmpty()) {
                cartItem.id to missingGroups
            } else {
                null
            }
        }

    /**
     * Message to show when cart items are missing required toppings
     */
    val missingRequiredToppingsMessage: String?
        get() {
            val missing = cartItemsWithMissingRequiredToppings
            if (missing.isEmpty()) return null

            return missing.joinToString("; ") { (_, groups) ->
                "Thiếu: ${groups.joinToString(", ")}"
            }
        }

    val canCheckout: Boolean
        get() = currentOrder != null

    val hasActiveOrder: Boolean
        get() = currentOrder != null

    // Total from current order + new cart items
    val orderSubtotal: Long
        get() = (currentOrder?.subtotal?.toLong() ?: 0L) + subtotal

    val orderTotal: Long
        get() = (currentOrder?.totalAmount?.toLong() ?: 0L) + totalAmount
}

@HiltViewModel
class SaleViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository,
    private val tableRepository: TableRepository,
    private val orderRepository: OrderRepository,
    private val shiftRepository: ShiftRepository,
    private val kitchenRepository: KitchenRepository,
    private val productToppingDao: ProductToppingDao,
    private val comboItemDao: ComboItemDao,
    private val productNoteDao: ProductNoteDao,
    private val couponDao: CouponDao,
    private val billTemplateDao: BillTemplateDao,
    private val billPrinterConfigDao: BillPrinterConfigDao,
    private val seasonalPriceDao: SeasonalPriceDao,
    private val seasonalPriceProductDao: SeasonalPriceProductDao,
    private val surchargeDao: SurchargeDao
) : ViewModel() {

    companion object {
        private const val TAG = "SaleViewModel"
    }

    private val _uiState = MutableStateFlow(SaleUiState())
    val uiState: StateFlow<SaleUiState> = _uiState.asStateFlow()

    private var branchId: String = ""

    // Cache product entities để load topping info
    private var productEntityMap: Map<String, ProductEntity> = emptyMap()

    // Cache topping category IDs to filter out topping products
    private var toppingCategoryIds: Set<String> = emptySet()

    // OPTIMIZATION: Cache all products with variants for fast category switching
    private var allProductsCache: List<Product> = emptyList()

    // Cache seasonal price adjustments: productId -> SeasonalPriceEntity
    private var seasonalPriceMap: Map<String, SeasonalPriceEntity> = emptyMap()

    // OPTIMIZATION: Pre-computed products by category for instant switching
    private var productsByCategoryCache: Map<String, List<Product>> = emptyMap()

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                branchId = authRepository.getBranchId() ?: ""
                Log.d(TAG, "loadInitialData - branchId: $branchId")

                if (branchId.isEmpty()) {
                    _uiState.update { it.copy(isLoading = false, errorMessage = "Không tìm thấy chi nhánh") }
                    return@launch
                }

                // OPTIMIZATION: Load all data in PARALLEL using async
                withContext(Dispatchers.IO) {
                    val startTime = System.currentTimeMillis()

                    // Launch all queries in parallel
                    val categoriesDeferred = async { categoryRepository.getAllCategories(branchId).first() }
                    val allProductsDeferred = async { productRepository.getAllProducts(branchId).first() }
                    val areasDeferred = async { tableRepository.getAllAreas(branchId).first() }
                    val tablesDeferred = async { tableRepository.getAllTables(branchId).first() }
                    val notesDeferred = async { productNoteDao.getActiveNotes(branchId).first() }

                    // Load seasonal prices (giá thời vụ)
                    val currentDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                    val seasonalPricesDeferred = async { seasonalPriceDao.getValidSeasonalPrices(branchId, currentDate) }

                    // Load surcharges (phụ thu)
                    val surchargesDeferred = async { surchargeDao.getActiveSurchargesList(branchId) }

                    // Await all results
                    val categoryEntities = categoriesDeferred.await()
                    val allProducts = allProductsDeferred.await()
                    val areas = areasDeferred.await()
                    val tableEntities = tablesDeferred.await()
                    val notes = notesDeferred.await()
                    val seasonalPrices = seasonalPricesDeferred.await()
                    val surcharges = surchargesDeferred.await()

                    // Build seasonal price map: productId -> SeasonalPriceEntity
                    seasonalPriceMap = if (seasonalPrices.isNotEmpty()) {
                        val priceMap = mutableMapOf<String, SeasonalPriceEntity>()
                        seasonalPrices.forEach { sp ->
                            val products = seasonalPriceProductDao.getBySeasonalPriceId(sp.id)
                            products.forEach { spp ->
                                // Nếu có nhiều giá thời vụ cho 1 sản phẩm, lấy cái có sortOrder nhỏ nhất (đã sort)
                                if (!priceMap.containsKey(spp.productId)) {
                                    priceMap[spp.productId] = sp
                                }
                            }
                        }
                        Log.d(TAG, "loadInitialData - Seasonal prices: ${priceMap.size} products affected")
                        priceMap
                    } else {
                        emptyMap()
                    }

                    Log.d(TAG, "loadInitialData - Parallel queries completed in ${System.currentTimeMillis() - startTime}ms")

                    // Process categories
                    toppingCategoryIds = categoryEntities
                        .filter { it.name.lowercase().contains("topping") }
                        .map { it.id }
                        .toSet()

                    val categoryList = mutableListOf(
                        Category(id = "all", name = "Tất cả", icon = "🍽️", productType = "all", order = -1)
                    )
                    categoryList.addAll(categoryEntities
                        .filter { !it.name.lowercase().contains("topping") }
                        .map { entity ->
                            Category(
                                id = entity.id,
                                name = entity.name,
                                icon = entity.imageUrl,
                                productType = entity.productType,
                                order = entity.sortOrder
                            )
                        })

                    // OPTIMIZATION: Cache all products (load only ONCE)
                    productEntityMap = allProducts.associateBy { it.id }

                    // Filter products (exclude toppings)
                    val productEntities = allProducts
                        .filter { it.type != "topping" }
                        .filter { it.categoryId !in toppingCategoryIds }

                    // OPTIMIZATION: Build products WITHOUT variants first (fast display)
                    val productList = productEntities.map { entity ->
                        // Tính giá thời vụ nếu có
                        val basePrice = entity.price.toLong()
                        val seasonalPrice = seasonalPriceMap[entity.id]
                        val finalPrice = if (seasonalPrice != null) {
                            calculateSeasonalPrice(basePrice, seasonalPrice)
                        } else {
                            basePrice
                        }

                        Product(
                            id = entity.id,
                            code = entity.code,
                            name = entity.name,
                            searchName = entity.searchName,
                            abbreviation = entity.abbreviation,
                            categoryId = entity.categoryId ?: "",
                            price = finalPrice,
                            vatRate = entity.vatRate,
                            imageUrl = entity.imageUrl,
                            description = entity.description,
                            isActive = entity.isActive,
                            hasVariants = false, // Will be updated later
                            variants = emptyList()
                        )
                    }

                    // Process tables
                    val areaMap = areas.associateBy { it.id }
                    val tableList = tableEntities.map { entity ->
                        Table(
                            id = entity.id,
                            name = entity.name,
                            areaId = entity.areaId ?: "",
                            areaName = entity.areaId?.let { areaMap[it]?.name } ?: "Khu vực chung",
                            capacity = entity.capacity,
                            status = when (entity.status.lowercase()) {
                                "occupied" -> TableStatus.OCCUPIED
                                "reserved" -> TableStatus.RESERVED
                                "cleaning" -> TableStatus.CLEANING
                                else -> TableStatus.AVAILABLE
                            },
                            currentOrderId = entity.currentOrderId
                        )
                    }

                    Log.d(TAG, "loadInitialData - Processed ${categoryList.size} categories, ${productList.size} products, ${tableList.size} tables in ${System.currentTimeMillis() - startTime}ms")

                    // Update UI immediately with products (no variants yet)
                    _uiState.update { state ->
                        state.copy(
                            categories = categoryList.toList(),
                            products = productList,
                            tables = tableList,
                            availableNotes = notes,
                            availableSurcharges = surcharges,
                            isLoading = false
                        )
                    }

                    // OPTIMIZATION: Load variants in background AFTER UI is displayed
                    val productIds = productEntities.map { it.id }
                    val allToppings = productToppingDao.getToppingsForProductsSync(productIds)
                    val toppingsByProduct = allToppings.groupBy { it.productId }

                    // Update products with variants
                    val productsWithVariants = productList.map { product ->
                        val productToppings = toppingsByProduct[product.id] ?: emptyList()
                        val variantGroups = buildVariantGroups(productToppings)
                        product.copy(
                            hasVariants = variantGroups.isNotEmpty(),
                            variants = variantGroups
                        )
                    }

                    // OPTIMIZATION: Cache all products for fast category switching
                    allProductsCache = productsWithVariants

                    // OPTIMIZATION: Pre-compute products by category for INSTANT switching
                    val categoryMap = mutableMapOf<String, List<Product>>()
                    categoryMap["all"] = productsWithVariants
                    productsWithVariants.groupBy { it.categoryId }.forEach { (catId, products) ->
                        categoryMap[catId] = products
                    }
                    productsByCategoryCache = categoryMap

                    // Update UI with variants
                    _uiState.update { state ->
                        state.copy(products = productsWithVariants)
                    }

                    Log.d(TAG, "loadInitialData - Complete with variants in ${System.currentTimeMillis() - startTime}ms, ${allToppings.size} topping mappings, cached ${productsByCategoryCache.size} categories")
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadInitialData - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = "Lỗi tải dữ liệu: ${e.message}")
                }
            }
        }
    }

    /**
     * Refresh tables from database to get latest status
     */
    private fun refreshTables() {
        viewModelScope.launch {
            try {
                val branchId = authRepository.getBranchId() ?: return@launch

                withContext(Dispatchers.IO) {
                    val areas = tableRepository.getAllAreas(branchId).first()
                    val tableEntities = tableRepository.getAllTables(branchId).first()
                    val areaMap = areas.associateBy { it.id }

                    val tableList = tableEntities.map { entity ->
                        Table(
                            id = entity.id,
                            name = entity.name,
                            areaId = entity.areaId ?: "",
                            areaName = entity.areaId?.let { areaMap[it]?.name } ?: "Khu vực chung",
                            capacity = entity.capacity,
                            status = when (entity.status.lowercase()) {
                                "occupied" -> TableStatus.OCCUPIED
                                "reserved" -> TableStatus.RESERVED
                                "cleaning" -> TableStatus.CLEANING
                                else -> TableStatus.AVAILABLE
                            },
                            currentOrderId = entity.currentOrderId
                        )
                    }

                    _uiState.update { it.copy(tables = tableList) }
                }

                Log.d(TAG, "refreshTables - Tables refreshed")
            } catch (e: Exception) {
                Log.e(TAG, "refreshTables - Error: ${e.message}", e)
            }
        }
    }

    /**
     * Build variant groups từ topping entities
     */
    private fun buildVariantGroups(toppings: List<ProductToppingEntity>): List<ProductVariantGroup> {
        if (toppings.isEmpty()) return emptyList()

        // Group by group name
        val groupedByName = toppings.groupBy { it.groupName }

        return groupedByName.map { (groupName, groupToppings) ->
            val firstTopping = groupToppings.first()

            ProductVariantGroup(
                id = "${groupName}_${UUID.randomUUID()}",
                name = groupName,
                type = mapGroupType(firstTopping.groupType),
                isRequired = firstTopping.isRequired,
                isMultiple = firstTopping.isMultiple,
                minSelect = firstTopping.minSelect,
                maxSelect = firstTopping.maxSelect,
                options = groupToppings.mapNotNull { topping ->
                    val toppingProduct = productEntityMap[topping.toppingId]
                    if (toppingProduct != null) {
                        // Tính giá topping: nếu có extraPrice thì dùng, không thì dùng giá sản phẩm
                        // Áp dụng giá thời vụ cho cả topping
                        val basePrice = if (topping.extraPrice > 0) {
                            topping.extraPrice.toLong()
                        } else {
                            toppingProduct.price.toLong()
                        }
                        val seasonalPrice = seasonalPriceMap[topping.toppingId]
                        val finalPrice = if (seasonalPrice != null && topping.extraPrice <= 0) {
                            // Chỉ áp dụng giá thời vụ nếu dùng giá sản phẩm (không có extraPrice riêng)
                            calculateSeasonalPrice(basePrice, seasonalPrice)
                        } else {
                            basePrice
                        }

                        ProductVariantOption(
                            id = topping.toppingId,
                            name = toppingProduct.name,
                            price = finalPrice,
                            isDefault = topping.isDefault,
                            vatRate = toppingProduct.vatRate
                        )
                    } else null
                }.sortedBy { it.name }
            )
        }.sortedBy { it.name }
    }

    private fun mapGroupType(type: String): VariantType {
        return when (type.lowercase()) {
            "size" -> VariantType.SIZE
            "sugar" -> VariantType.SUGAR
            "ice" -> VariantType.ICE
            "topping" -> VariantType.TOPPING
            else -> VariantType.OTHER
        }
    }

    // ===== CATEGORY & SEARCH =====

    fun selectProductType(productType: SaleProductType) {
        // When changing product type, reset category to "all" and filter products
        val state = _uiState.value

        // Get category IDs for selected product type
        val categoryIdsForType = if (productType == SaleProductType.ALL) {
            state.categories.map { it.id }.toSet()
        } else {
            state.categories.filter { it.productType == productType.value }.map { it.id }.toSet() + "all"
        }

        // Filter products by product type (through category)
        val products = if (productType == SaleProductType.ALL) {
            allProductsCache
        } else {
            allProductsCache.filter { product ->
                product.categoryId in categoryIdsForType ||
                state.categories.find { it.id == product.categoryId }?.productType == productType.value
            }
        }

        _uiState.update {
            it.copy(
                selectedProductType = productType,
                selectedCategoryId = "all",
                products = products,
                searchQuery = ""
            )
        }
    }

    fun selectCategory(categoryId: String) {
        val state = _uiState.value
        val productType = state.selectedProductType

        Log.d(TAG, "selectCategory - categoryId: $categoryId, productType: $productType, cacheSize: ${productsByCategoryCache.size}, cacheKeys: ${productsByCategoryCache.keys}")

        // OPTIMIZATION: Use pre-computed cache - NO database query, INSTANT switching
        val products = if (categoryId == "all") {
            // "All" category: show all products filtered by product type
            if (productType == SaleProductType.ALL) {
                allProductsCache
            } else {
                allProductsCache.filter { product ->
                    state.categories.find { it.id == product.categoryId }?.productType == productType.value
                }
            }
        } else {
            // Specific category: show products for that category
            productsByCategoryCache[categoryId] ?: emptyList()
        }

        Log.d(TAG, "selectCategory - Found ${products.size} products for category $categoryId")

        _uiState.update {
            it.copy(
                selectedCategoryId = categoryId,
                products = products,
                searchQuery = ""
            )
        }
    }

    fun searchProducts(query: String) {
        // OPTIMIZATION: Search from cache - NO database query
        val categoryId = _uiState.value.selectedCategoryId
        val baseProducts = if (query.isBlank()) {
            // Return products for selected category, or empty if category has no products
            if (categoryId == "all") {
                allProductsCache
            } else {
                productsByCategoryCache[categoryId] ?: emptyList()
            }
        } else {
            // Search in all products cache - supports Vietnamese accent-free and abbreviation search
            val lowerQuery = query.lowercase()
            allProductsCache.filter { product ->
                product.name.lowercase().contains(lowerQuery) ||
                product.code.lowercase().contains(lowerQuery) ||
                product.searchName?.lowercase()?.contains(lowerQuery) == true ||
                product.abbreviation?.lowercase()?.contains(lowerQuery) == true
            }
        }

        _uiState.update { state ->
            state.copy(
                searchQuery = query,
                products = baseProducts
            )
        }
    }

    /**
     * Build products with variants from entity list
     */
    private fun buildProductsWithVariants(entities: List<ProductEntity>): List<Product> {
        val productIds = entities.map { it.id }
        val allToppings = productToppingDao.getToppingsForProductsSync(productIds)
        val toppingsByProduct = allToppings.groupBy { it.productId }

        return entities.map { entity ->
            val productToppings = toppingsByProduct[entity.id] ?: emptyList()
            val variantGroups = buildVariantGroups(productToppings)

            // Tính giá thời vụ nếu có
            val basePrice = entity.price.toLong()
            val seasonalPrice = seasonalPriceMap[entity.id]
            val finalPrice = if (seasonalPrice != null) {
                calculateSeasonalPrice(basePrice, seasonalPrice)
            } else {
                basePrice
            }

            Product(
                id = entity.id,
                code = entity.code,
                name = entity.name,
                searchName = entity.searchName,
                abbreviation = entity.abbreviation,
                categoryId = entity.categoryId ?: "",
                price = finalPrice,
                vatRate = entity.vatRate,
                imageUrl = entity.imageUrl,
                description = entity.description,
                isActive = entity.isActive,
                hasVariants = variantGroups.isNotEmpty(),
                variants = variantGroups
            )
        }
    }

    // ===== CART OPERATIONS =====

    fun addToCart(product: Product) {
        // Prevent adding to cart when payment dialog is showing or pending
        if (_uiState.value.showPaymentDialog || _uiState.value.pendingPaymentDialog) return

        if (product.hasVariants && product.variants.isNotEmpty()) {
            // Show variant dialog with product-specific notes
            showVariantDialog(product)
        } else {
            // Add directly to cart
            addItemToCart(product, emptyList(), null)
        }
    }

    fun addItemToCart(
        product: Product,
        selectedVariants: List<SelectedVariant>,
        note: String?
    ) {
        viewModelScope.launch {
            // Load combo items if this product is a combo
            val comboItems = withContext(Dispatchers.IO) {
                val entities = comboItemDao.getItemsByComboSync(product.id)
                if (entities.isNotEmpty()) {
                    Log.d(TAG, "addItemToCart - Found ${entities.size} combo items for ${product.name}")
                }
                entities.map { entity ->
                    ComboChildItem(
                        productId = entity.productId,
                        productName = entity.productName,
                        productCode = entity.productCode,
                        quantity = entity.quantity
                    )
                }
            }

            if (comboItems.isNotEmpty()) {
                Log.d(TAG, "addItemToCart - Product ${product.name} is a combo with ${comboItems.size} child items")
            } else {
                Log.d(TAG, "addItemToCart - Product ${product.name} is NOT a combo (no child items found)")
            }

            _uiState.update { state ->
                val existingItemIndex = state.cartItems.indexOfFirst { item ->
                    item.product.id == product.id &&
                    item.selectedVariants == selectedVariants &&
                    item.note == note
                }

                val updatedCart = if (existingItemIndex >= 0) {
                    // Increase quantity of existing item
                    state.cartItems.mapIndexed { index, item ->
                        if (index == existingItemIndex) {
                            item.copy(quantity = item.quantity + 1)
                        } else {
                            item
                        }
                    }
                } else {
                    // Add new item with combo children
                    state.cartItems + CartItem(
                        product = product,
                        quantity = 1,
                        selectedVariants = selectedVariants,
                        note = note,
                        comboItems = comboItems
                    )
                }

                state.copy(
                    cartItems = updatedCart,
                    showVariantDialog = false,
                    selectedProductForVariant = null
                )
            }
        }
    }

    fun updateCartItemQuantity(cartItemId: String, newQuantity: Int) {
        if (newQuantity <= 0) {
            removeFromCart(cartItemId)
            return
        }

        _uiState.update { state ->
            state.copy(
                cartItems = state.cartItems.map { item ->
                    if (item.id == cartItemId) {
                        item.copy(quantity = newQuantity)
                    } else {
                        item
                    }
                }
            )
        }
    }

    fun increaseQuantity(cartItemId: String) {
        _uiState.update { state ->
            state.copy(
                cartItems = state.cartItems.map { item ->
                    if (item.id == cartItemId) {
                        item.copy(quantity = item.quantity + 1)
                    } else {
                        item
                    }
                }
            )
        }
    }

    fun decreaseQuantity(cartItemId: String) {
        val currentItem = _uiState.value.cartItems.find { it.id == cartItemId }
        if (currentItem != null && currentItem.quantity <= 1) {
            removeFromCart(cartItemId)
        } else {
            _uiState.update { state ->
                state.copy(
                    cartItems = state.cartItems.map { item ->
                        if (item.id == cartItemId) {
                            item.copy(quantity = item.quantity - 1)
                        } else {
                            item
                        }
                    }
                )
            }
        }
    }

    fun removeFromCart(cartItemId: String) {
        _uiState.update { state ->
            state.copy(
                cartItems = state.cartItems.filter { it.id != cartItemId }
            )
        }
    }

    /**
     * Remove a specific variant/topping from a cart item
     * Note: totalPrice is a computed property that auto-calculates from selectedVariants
     * Allows deletion of required toppings - the "Đặt món" button will be disabled
     * until user selects a new option for required groups
     *
     * @param cartItemId The cart item ID
     * @param groupId The variant group ID (to uniquely identify when names are same across groups)
     * @param optionId The variant option ID (unique identifier for each option)
     */
    fun removeCartItemVariant(cartItemId: String, groupId: String, optionId: String) {
        val state = _uiState.value
        val cartItem = state.cartItems.find { it.id == cartItemId } ?: return

        // Find which group this variant belongs to using groupId
        val variantGroup = cartItem.product.variants.find { group ->
            group.id == groupId
        }

        // Find the variant name for logging
        val variantToRemove = cartItem.selectedVariants.find { it.optionId == optionId }
        val variantName = variantToRemove?.name ?: "unknown"

        // Proceed with removal - use optionId for unique identification
        // This fixes the bug where two toppings with the same name would both be deleted
        _uiState.update { s ->
            val updatedCartItems = s.cartItems.map { item ->
                if (item.id == cartItemId) {
                    val updatedVariants = item.selectedVariants.filter {
                        it.optionId != optionId
                    }
                    item.copy(selectedVariants = updatedVariants)
                } else {
                    item
                }
            }
            s.copy(cartItems = updatedCartItems)
        }

        // Show info message if this was a required group
        if (variantGroup != null && variantGroup.isRequired) {
            // Check if there's still a selection in this group after removal
            val updatedCartItem = _uiState.value.cartItems.find { it.id == cartItemId }
            val hasRemainingSelection = updatedCartItem?.selectedVariants?.any { selectedVariant ->
                selectedVariant.groupId == groupId
            } ?: false

            if (!hasRemainingSelection) {
                Log.d(TAG, "removeCartItemVariant - Removed required topping $variantName from ${variantGroup.name}, order button disabled")
            }
        }

        Log.d(TAG, "removeCartItemVariant - Removed $variantName (optionId: $optionId, group: $groupId) from cart item $cartItemId")
    }

    fun clearCart() {
        _uiState.update { state ->
            state.copy(
                cartItems = emptyList(),
                billDiscountAmount = 0,
                billDiscountDescription = null,
                itemDiscounts = emptyMap(),
                selectedTable = null,
                selectedCustomer = null
            )
        }
    }

    /**
     * Huỷ thêm món - xoá giỏ hàng khi đang ở chế độ thêm món vào order
     */
    fun cancelAddingItems() {
        _uiState.update { state ->
            state.copy(
                cartItems = emptyList(),
                billDiscountAmount = 0,
                billDiscountDescription = null,
                itemDiscounts = emptyMap()
            )
        }
        Log.d(TAG, "cancelAddingItems - Cart cleared")
    }

    // ===== CANCEL ORDER CONFIRMATION =====

    fun showCancelOrderConfirmation() {
        _uiState.update { it.copy(showCancelOrderDialog = true) }
    }

    fun hideCancelOrderConfirmation() {
        _uiState.update { it.copy(showCancelOrderDialog = false) }
    }

    fun confirmCancelOrder(reason: String = "") {
        hideCancelOrderConfirmation()
        cancelOrder(reason)
    }

    // ===== REPRINT MENU =====

    fun showReprintMenuForItem(itemId: String) {
        _uiState.update { it.copy(showReprintMenu = true, reprintItemId = itemId) }
    }

    fun showReprintMenuForAllItems() {
        _uiState.update { it.copy(showReprintMenu = true, reprintItemId = null) }
    }

    fun hideReprintMenu() {
        _uiState.update { it.copy(showReprintMenu = false, reprintItemId = null) }
    }

    /**
     * In lại tem cho món (1 món hoặc tất cả)
     * Async: Hiển thị thành công ngay, in ngầm trong background
     * @param itemId ID món cần in, null = in tất cả
     */
    fun reprintLabels(itemId: String? = null) {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return

        val itemsToReprint = if (itemId != null) {
            state.currentOrderItems.filter { it.id == itemId && !it.isComboChild }
        } else {
            state.currentOrderItems.filter { !it.isComboChild }
        }

        if (itemsToReprint.isEmpty()) {
            _uiState.update { it.copy(errorMessage = "Không có món nào để in lại tem") }
            hideReprintMenu()
            return
        }

        // Show success immediately (async printing)
        val count = if (itemId != null) 1 else itemsToReprint.size
        _uiState.update { it.copy(successMessage = "Đang in lại $count tem...") }
        hideReprintMenu()

        // Print in background - don't wait for result
        viewModelScope.launch {
            try {
                val kitchens = withContext(Dispatchers.IO) {
                    kitchenRepository.getAllKitchensSync(branchId)
                }

                // Find kitchen that can print labels
                val labelKitchen = kitchens.find { it.isActive && it.shouldPrintLabel() }
                if (labelKitchen == null) {
                    Log.w(TAG, "reprintLabels: No label printer configured")
                    return@launch
                }

                // Build label data
                val labels = itemsToReprint.map { item ->
                    val (options, toppings, note) = parseItemNotes(item.notes)
                    com.techres.ccb.data.printer.LabelPrintService.LabelData(
                        itemName = item.productName,
                        itemCode = item.productCode,
                        quantity = item.quantity,
                        size = options["Size"],
                        sugar = options["Đường"],
                        ice = options["Đá"],
                        toppings = toppings,
                        note = note,
                        tableName = currentOrder.tableName,
                        orderNumber = currentOrder.orderNumber,
                        orderTime = try {
                            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                                .parse(currentOrder.createdAt) ?: Date()
                        } catch (e: Exception) { Date() }
                    )
                }

                val result = com.techres.ccb.data.printer.LabelPrintService.printMultipleLabels(labelKitchen, labels)

                // Log result only (async - user already notified)
                when (result) {
                    is PrinterResult.Success -> {
                        Log.d(TAG, "reprintLabels: Successfully printed $count labels")
                    }
                    is PrinterResult.Error -> {
                        Log.e(TAG, "reprintLabels: Print error - ${result.message}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "reprintLabels error: ${e.message}", e)
            }
        }
    }

    /**
     * In lại phiếu bếp cho món (1 món hoặc tất cả)
     * Async: Hiển thị thành công ngay, in ngầm trong background
     * @param itemId ID món cần in, null = in tất cả
     */
    fun reprintKitchenTickets(itemId: String? = null) {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return

        val itemsToReprint = if (itemId != null) {
            state.currentOrderItems.filter { it.id == itemId && !it.isComboChild }
        } else {
            state.currentOrderItems.filter { !it.isComboChild }
        }

        if (itemsToReprint.isEmpty()) {
            _uiState.update { it.copy(errorMessage = "Không có món nào để in lại") }
            hideReprintMenu()
            return
        }

        // Show success immediately (async printing)
        val count = if (itemId != null) 1 else itemsToReprint.size
        _uiState.update { it.copy(successMessage = "Đang in lại $count phiếu bếp...") }
        hideReprintMenu()

        // Print in background - don't wait for result
        viewModelScope.launch {
            try {
                val kitchens = withContext(Dispatchers.IO) {
                    kitchenRepository.getAllKitchensSync(branchId)
                }
                val products = productEntityMap.values.toList()

                if (kitchens.isEmpty() || products.isEmpty()) {
                    Log.w(TAG, "reprintKitchenTickets: No kitchens or products configured")
                    return@launch
                }

                val result = OrderPrintingService.reprintOrderToKitchens(
                    order = currentOrder,
                    orderItems = itemsToReprint,
                    kitchens = kitchens,
                    products = products
                )

                // Log result only (async - user already notified)
                if (result.success) {
                    Log.d(TAG, "reprintKitchenTickets: Success - ${result.message}")
                } else {
                    Log.e(TAG, "reprintKitchenTickets: Failed - ${result.message}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "reprintKitchenTickets error: ${e.message}", e)
            }
        }
    }

    /**
     * Parse item notes để lấy options và toppings
     */
    private fun parseItemNotes(notes: String?): Triple<Map<String, String>, List<String>, String?> {
        if (notes.isNullOrBlank()) return Triple(emptyMap(), emptyList(), null)

        val options = mutableMapOf<String, String>()
        val toppings = mutableListOf<String>()
        var note: String? = null

        try {
            val mainPart = if (notes.contains(" | ")) notes.split(" | ")[0] else notes

            mainPart.split(",").map { it.trim() }.forEach { part ->
                when {
                    part.startsWith("+") -> {
                        var toppingText = part.removePrefix("+").trim()
                        // Remove price suffix
                        toppingText = toppingText.replace(Regex("\\s*\\(\\+?\\d+\\)$"), "")
                        if (toppingText.isNotBlank()) toppings.add(toppingText)
                    }
                    part.contains(":") -> {
                        val colonIndex = part.indexOf(":")
                        val key = part.substring(0, colonIndex).trim()
                        var value = part.substring(colonIndex + 1).trim()
                        value = value.replace(Regex("\\s*\\(\\+?\\d+\\)$"), "")

                        // Clean up redundant group name from value
                        // e.g., "Size: Size L" -> "Size: L"
                        val keyLower = key.lowercase()
                        val valueLower = value.lowercase()
                        if (valueLower.startsWith(keyLower) || valueLower.startsWith("size ")) {
                            val prefixesToRemove = listOf(
                                key, keyLower,
                                "size", "Size",
                                "đường", "Đường",
                                "đá", "Đá",
                                "mức đá", "Mức đá", "MỨC ĐÁ"
                            )
                            for (prefix in prefixesToRemove) {
                                if (value.startsWith(prefix, ignoreCase = true)) {
                                    value = value.substring(prefix.length).trim()
                                    break
                                }
                            }
                        }

                        when (key.lowercase()) {
                            "ghi chú", "note" -> note = value
                            // Normalize ice level keys
                            "mức đá", "muc da", "đá", "da", "ice", "độ đá" -> options["Đá"] = value
                            // Normalize sugar level keys
                            "mức đường", "đường", "sugar", "độ đường" -> options["Đường"] = value
                            else -> options[key] = value
                        }
                    }
                }
            }

            if (notes.contains(" | Ghi chú:")) {
                note = notes.split(" | Ghi chú:").getOrNull(1)?.trim()
            }
        } catch (e: Exception) {
            Log.e(TAG, "parseItemNotes error: ${e.message}")
        }

        return Triple(options, toppings, note)
    }

    fun updateCartItemNote(cartItemId: String, note: String?) {
        _uiState.update { state ->
            state.copy(
                cartItems = state.cartItems.map { item ->
                    if (item.id == cartItemId) {
                        item.copy(note = note)
                    } else {
                        item
                    }
                }
            )
        }
    }

    // ===== ORDER TYPE & TABLE =====

    fun setOrderType(orderType: OrderType) {
        viewModelScope.launch {
            val currentState = _uiState.value
            val existingOrder = currentState.currentOrder

            // If there's an existing order and we're changing type away from DINE_IN,
            // update the order to remove table association
            if (existingOrder != null && orderType != OrderType.DINE_IN && currentState.selectedTable != null) {
                Log.d(TAG, "setOrderType - Updating order ${existingOrder.orderNumber} from DINE_IN to ${orderType.name}")

                val updatedOrder = existingOrder.copy(
                    tableId = null,
                    tableName = null,
                    orderType = orderType.dbValue,
                    updatedAt = java.time.Instant.now().toString()
                )

                // Save to database
                withContext(Dispatchers.IO) {
                    orderRepository.updateOrder(updatedOrder)
                }

                _uiState.update { state ->
                    state.copy(
                        orderType = orderType,
                        selectedTable = null,
                        currentOrder = updatedOrder
                        // Keep currentOrderItems, cartItems, discounts unchanged!
                    )
                }
            } else {
                // No existing order or just switching type - simple update
                _uiState.update { state ->
                    state.copy(
                        orderType = orderType,
                        selectedTable = if (orderType != OrderType.DINE_IN) null else state.selectedTable
                    )
                }
            }
        }
    }

    /**
     * Load an existing order by ID (used when navigating from order detail to add more items)
     */
    fun loadExistingOrder(orderId: String) {
        viewModelScope.launch {
            try {
                val order = withContext(Dispatchers.IO) {
                    orderRepository.getOrderById(orderId)
                }

                if (order == null) {
                    Log.e(TAG, "loadExistingOrder - Order not found: $orderId")
                    _uiState.update { it.copy(errorMessage = "Không tìm thấy đơn hàng") }
                    return@launch
                }

                val orderItems = withContext(Dispatchers.IO) {
                    orderRepository.getOrderItemsSync(orderId)
                }

                // Find the table if order has tableId
                val selectedTable = if (!order.tableId.isNullOrEmpty()) {
                    _uiState.value.tables.find { it.id == order.tableId }
                } else null

                // Determine order type based on table
                val orderType = if (selectedTable != null) OrderType.DINE_IN else OrderType.TAKE_AWAY

                // Restore item discounts from order items
                val restoredItemDiscounts = orderItems
                    .filter { it.discountAmount > 0 }
                    .associate { it.id to it.discountAmount.toLong() }

                // Calculate total item discount
                val totalItemDiscount = restoredItemDiscounts.values.sum()

                // Calculate bill discount (total discount - item discounts)
                // Note: order.discountAmount có thể bao gồm cả item discount và bill discount
                val restoredBillDiscount = (order.discountAmount - totalItemDiscount).coerceAtLeast(0.0).toLong()

                Log.d(TAG, "loadExistingOrder - Restoring discounts: totalDiscount=${order.discountAmount}, " +
                    "itemDiscounts=$totalItemDiscount, billDiscount=$restoredBillDiscount")

                _uiState.update { state ->
                    state.copy(
                        currentOrder = order,
                        currentOrderItems = orderItems,
                        selectedTable = selectedTable,
                        orderType = orderType,
                        cartItems = emptyList(), // Clear cart when loading existing order
                        // Restore discount states
                        itemDiscounts = restoredItemDiscounts,
                        billDiscountAmount = restoredBillDiscount,
                        billDiscountDescription = order.discountReason
                    )
                }

                Log.d(TAG, "loadExistingOrder - Loaded order: ${order.orderNumber}, items: ${orderItems.size}")
            } catch (e: Exception) {
                Log.e(TAG, "loadExistingOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi tải đơn hàng: ${e.message}") }
            }
        }
    }

    /**
     * Select a table by ID (used when navigating from TableScreen)
     */
    fun selectTableById(tableId: String) {
        Log.d(TAG, "selectTableById - Requested tableId: $tableId")
        viewModelScope.launch {
            // Find the table in the loaded tables list
            val table = _uiState.value.tables.find { it.id == tableId }
            if (table != null) {
                Log.d(TAG, "selectTableById - Found table: name=${table.name}, id=${table.id}, areaId=${table.areaId}, areaName=${table.areaName}")
                selectTable(table)
                // Also set order type to DINE_IN
                _uiState.update { it.copy(orderType = OrderType.DINE_IN) }
            } else {
                // Tables might not be loaded yet, try to load them first
                Log.w(TAG, "selectTableById - Table not found in current list (${_uiState.value.tables.size} tables), trying to reload")
                refreshTables()
                // Delay to allow tables to load
                kotlinx.coroutines.delay(500)
                val tableAfterLoad = _uiState.value.tables.find { it.id == tableId }
                if (tableAfterLoad != null) {
                    Log.d(TAG, "selectTableById - Found after reload: name=${tableAfterLoad.name}, id=${tableAfterLoad.id}, areaId=${tableAfterLoad.areaId}, areaName=${tableAfterLoad.areaName}")
                    selectTable(tableAfterLoad)
                    _uiState.update { it.copy(orderType = OrderType.DINE_IN) }
                } else {
                    Log.e(TAG, "selectTableById - Table not found after reload: $tableId")
                    // Log all available table IDs for debugging
                    val availableIds = _uiState.value.tables.map { "${it.id}:${it.name}:${it.areaName}" }
                    Log.e(TAG, "selectTableById - Available tables: $availableIds")
                    _uiState.update { it.copy(errorMessage = "Không tìm thấy bàn") }
                }
            }
        }
    }

    fun selectTable(table: Table) {
        viewModelScope.launch {
            val currentState = _uiState.value
            val existingOrder = currentState.currentOrder
            val existingOrderItems = currentState.currentOrderItems

            // Check if new table has an active order
            val tableActiveOrder = withContext(Dispatchers.IO) {
                orderRepository.getActiveOrderByTable(table.id)
            }

            // CASE 1: Current order exists and is switching table/type
            // (e.g., changing from "Mang về" to "Tại bàn" or switching between tables)
            if (existingOrder != null && tableActiveOrder == null) {
                // Update current order's table - DON'T clear items!
                Log.d(TAG, "selectTable - Updating existing order ${existingOrder.orderNumber} to table ${table.name}")

                val updatedOrder = existingOrder.copy(
                    tableId = table.id,
                    tableName = table.name,
                    orderType = "dine_in",
                    updatedAt = java.time.Instant.now().toString()
                )

                // Save to database
                withContext(Dispatchers.IO) {
                    orderRepository.updateOrder(updatedOrder)
                }

                _uiState.update { state ->
                    state.copy(
                        selectedTable = table,
                        showTableDialog = false,
                        currentOrder = updatedOrder,
                        orderType = OrderType.DINE_IN
                        // Keep currentOrderItems, cartItems, discounts unchanged!
                    )
                }
                return@launch
            }

            // CASE 2: Current order exists AND new table also has an active order
            // This is a conflict - show warning
            if (existingOrder != null && tableActiveOrder != null && existingOrder.id != tableActiveOrder.id) {
                Log.w(TAG, "selectTable - Conflict: current order ${existingOrder.orderNumber}, table has ${tableActiveOrder.orderNumber}")
                _uiState.update { it.copy(
                    errorMessage = "Bàn ${table.name} đã có đơn hàng ${tableActiveOrder.orderNumber}. Vui lòng chọn bàn khác hoặc hoàn tất đơn hiện tại.",
                    showTableDialog = false
                ) }
                return@launch
            }

            // CASE 3: No current order - load table's active order (or empty state)
            val orderItems = if (tableActiveOrder != null) {
                withContext(Dispatchers.IO) {
                    orderRepository.getOrderItemsSync(tableActiveOrder.id)
                }
            } else {
                emptyList()
            }

            // Restore discount states from order/items
            val restoredItemDiscounts: Map<String, Long>
            val restoredBillDiscount: Long
            val restoredBillDescription: String?

            if (tableActiveOrder != null) {
                // Build item discounts map from order items
                restoredItemDiscounts = orderItems
                    .filter { it.discountAmount > 0 }
                    .associate { it.id to it.discountAmount.toLong() }

                val totalItemDiscount = restoredItemDiscounts.values.sum()
                restoredBillDiscount = (tableActiveOrder.discountAmount - totalItemDiscount).coerceAtLeast(0.0).toLong()
                restoredBillDescription = tableActiveOrder.discountReason

                Log.d(TAG, "selectTable - Restoring discounts: total=${tableActiveOrder.discountAmount}, " +
                    "items=$totalItemDiscount, bill=$restoredBillDiscount")
            } else {
                restoredItemDiscounts = emptyMap()
                restoredBillDiscount = 0L
                restoredBillDescription = null
            }

            Log.d(TAG, "selectTable - table: ${table.name}, activeOrder: ${tableActiveOrder?.orderNumber}, items: ${orderItems.size}")

            _uiState.update { state ->
                state.copy(
                    selectedTable = table,
                    showTableDialog = false,
                    currentOrder = tableActiveOrder,
                    currentOrderItems = orderItems,
                    // Clear cart when switching tables with active order
                    cartItems = if (tableActiveOrder != null) emptyList() else state.cartItems,
                    // Reset temp bill print count when switching tables
                    tempBillPrintCount = 0,
                    // Restore discount states
                    itemDiscounts = restoredItemDiscounts,
                    billDiscountAmount = restoredBillDiscount,
                    billDiscountDescription = restoredBillDescription
                )
            }
        }
    }

    fun showTableDialog() {
        _uiState.update { state ->
            state.copy(showTableDialog = true)
        }
    }

    fun hideTableDialog() {
        _uiState.update { state ->
            state.copy(showTableDialog = false)
        }
    }

    // ===== CUSTOMER =====

    fun selectCustomer(customer: Customer) {
        _uiState.update { state ->
            state.copy(
                selectedCustomer = customer,
                showCustomerDialog = false
            )
        }
    }

    fun clearCustomer() {
        _uiState.update { state ->
            state.copy(selectedCustomer = null)
        }
    }

    fun showCustomerDialog() {
        _uiState.update { state ->
            state.copy(showCustomerDialog = true)
        }
    }

    fun hideCustomerDialog() {
        _uiState.update { state ->
            state.copy(showCustomerDialog = false)
        }
    }

    // ===== ORDER NOTE (GHI CHÚ TỔNG BILL) =====

    fun showOrderNoteDialog() {
        val currentNote = _uiState.value.currentOrder?.notes ?: ""
        _uiState.update { state ->
            state.copy(
                showOrderNoteDialog = true,
                orderNoteInput = currentNote
            )
        }
    }

    fun hideOrderNoteDialog() {
        _uiState.update { state ->
            state.copy(showOrderNoteDialog = false)
        }
    }

    fun updateOrderNoteInput(note: String) {
        _uiState.update { state ->
            state.copy(orderNoteInput = note)
        }
    }

    fun saveOrderNote() {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return
        val note = state.orderNoteInput.trim().ifEmpty { null }

        viewModelScope.launch {
            try {
                val updatedAt = java.time.Instant.now().toString()
                orderRepository.updateOrderNotes(currentOrder.id, note, updatedAt)

                // Update local state
                _uiState.update { it.copy(
                    currentOrder = it.currentOrder?.copy(notes = note),
                    showOrderNoteDialog = false
                )}
            } catch (e: Exception) {
                Log.e(TAG, "Failed to save order note", e)
            }
        }
    }

    // ===== DISCOUNT / COUPON =====

    /**
     * Tổng tiền order thực tế = currentOrder.subtotal + cart.subtotal
     */
    private fun getOrderSubtotal(): Long {
        val state = _uiState.value
        val orderSubtotal = state.currentOrder?.subtotal?.toLong() ?: 0L
        return orderSubtotal + state.subtotal
    }

    /**
     * Áp dụng giảm giá hóa đơn (số tiền cố định)
     * Giới hạn giảm giá để tổng không bị âm
     * Lưu discount vào database nếu có order đang hoạt động
     */
    fun applyDiscount(amount: Long, reason: String?) {
        val orderSubtotal = getOrderSubtotal()
        val state = _uiState.value
        val maxBillDiscount = (orderSubtotal - state.itemDiscountTotal - state.totalCouponDiscount).coerceAtLeast(0L)
        val finalAmount = amount.coerceAtMost(maxBillDiscount)
        Log.d(TAG, "applyDiscount - requested: $amount, maxAllowed: $maxBillDiscount, applied: $finalAmount")

        // Update UI state
        _uiState.update { s ->
            s.copy(
                billDiscountAmount = finalAmount,
                billDiscountDescription = reason
            )
        }

        // Lưu vào database nếu có currentOrder
        saveOrderDiscountToDatabase(finalAmount, reason)
    }

    /**
     * Áp dụng giảm giá hóa đơn theo phần trăm
     * Tính % trên số tiền còn lại sau khi đã trừ giảm giá món và coupon
     * Giới hạn giảm giá để tổng không bị âm
     * Lưu discount vào database nếu có order đang hoạt động
     */
    fun applyPercentDiscount(percent: Int, reason: String?) {
        val orderSubtotal = getOrderSubtotal()
        val state = _uiState.value
        // Số tiền còn lại sau khi trừ giảm giá món và coupon
        val remainingAmount = (orderSubtotal - state.itemDiscountTotal - state.totalCouponDiscount).coerceAtLeast(0L)
        // Tính % giảm giá trên số tiền còn lại (không phải trên subtotal gốc)
        val discountAmount = (remainingAmount * percent / 100)
        Log.d(TAG, "applyPercentDiscount - percent: $percent%, subtotal: $orderSubtotal, remaining: $remainingAmount, calculated: $discountAmount")

        // Update UI state
        _uiState.update { s ->
            s.copy(
                billDiscountAmount = discountAmount,
                billDiscountDescription = reason
            )
        }

        // Lưu vào database nếu có currentOrder
        saveOrderDiscountToDatabase(discountAmount, reason)
    }

    /**
     * Lưu bill discount và total discount vào order trong database
     */
    private fun saveOrderDiscountToDatabase(billDiscountAmount: Long, reason: String?) {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return

        viewModelScope.launch {
            try {
                val now = getCurrentTimestamp()
                // Total discount = item discounts + bill discount + coupon discount
                val totalDiscount = state.itemDiscountTotal + billDiscountAmount + state.totalCouponDiscount

                val updatedOrder = currentOrder.copy(
                    discountAmount = totalDiscount.toDouble(),
                    discountReason = reason,
                    totalAmount = (currentOrder.subtotal - totalDiscount).coerceAtLeast(0.0),
                    updatedAt = now
                )

                withContext(Dispatchers.IO) {
                    orderRepository.updateOrder(updatedOrder)
                }

                Log.d(TAG, "saveOrderDiscountToDatabase - Saved: billDiscount=$billDiscountAmount, totalDiscount=$totalDiscount")

                // Update currentOrder trong UI state
                _uiState.update { s ->
                    s.copy(currentOrder = updatedOrder)
                }
            } catch (e: Exception) {
                Log.e(TAG, "saveOrderDiscountToDatabase - Error: ${e.message}", e)
            }
        }
    }

    /**
     * Xóa tất cả giảm giá (hóa đơn + món)
     */
    fun clearDiscount() {
        _uiState.update { state ->
            state.copy(
                billDiscountAmount = 0,
                billDiscountDescription = null,
                couponCode = "",
                appliedDiscounts = emptyList(),
                couponError = null,
                itemDiscounts = emptyMap()
            )
        }
    }

    /**
     * Xóa chỉ giảm giá hóa đơn
     */
    fun clearBillDiscount() {
        _uiState.update { state ->
            state.copy(
                billDiscountAmount = 0,
                billDiscountDescription = null
            )
        }
    }

    /**
     * Xóa tất cả giảm giá món
     */
    fun clearItemDiscounts() {
        _uiState.update { state ->
            state.copy(
                itemDiscounts = emptyMap(),
                itemDiscountTypes = emptyMap()
            )
        }
    }

    /**
     * Áp dụng giảm giá cho một món cụ thể
     * Giới hạn giảm giá không vượt quá giá của món và tổng đơn hàng
     * Lưu discount vào database nếu item thuộc order đã tồn tại
     * @param discountType: "percent" nếu giảm %, "fixed" nếu giảm tiền cố định
     */
    fun applyItemDiscount(itemId: String, amount: Long, discountType: String = "fixed") {
        val orderSubtotal = getOrderSubtotal()
        val state = _uiState.value

        // Tìm giá của món từ cartItems hoặc currentOrderItems
        val itemPrice = state.cartItems.find { it.id == itemId }?.totalPrice
            ?: state.currentOrderItems.find { it.id == itemId }?.totalPrice?.toLong()
            ?: 0L

        // Tính tổng giảm giá các món khác (không bao gồm món hiện tại)
        val otherItemDiscounts = state.itemDiscounts
            .filterKeys { it != itemId }
            .values.sum()

        // Số tiền tối đa có thể giảm cho món này
        // = min(giá món, orderSubtotal - otherItemDiscounts - billDiscount - couponDiscount)
        val maxItemDiscount = minOf(
            itemPrice,
            (orderSubtotal - otherItemDiscounts - state.billDiscountAmount - state.totalCouponDiscount).coerceAtLeast(0L)
        )

        val finalAmount = amount.coerceAtMost(maxItemDiscount)
        Log.d(TAG, "applyItemDiscount - itemId: $itemId, requested: $amount, type: $discountType, itemPrice: $itemPrice, maxAllowed: $maxItemDiscount, applied: $finalAmount")

        // Update UI state
        _uiState.update { s ->
            val newItemDiscounts = s.itemDiscounts.toMutableMap()
            val newItemDiscountTypes = s.itemDiscountTypes.toMutableMap()
            if (finalAmount > 0) {
                newItemDiscounts[itemId] = finalAmount
                newItemDiscountTypes[itemId] = discountType
            } else {
                newItemDiscounts.remove(itemId)
                newItemDiscountTypes.remove(itemId)
            }
            s.copy(itemDiscounts = newItemDiscounts, itemDiscountTypes = newItemDiscountTypes)
        }

        // Lưu discount vào database nếu item thuộc currentOrderItems (order đã tồn tại)
        val orderItem = state.currentOrderItems.find { it.id == itemId }
        if (orderItem != null) {
            viewModelScope.launch {
                try {
                    val now = getCurrentTimestamp()
                    val updatedItem = orderItem.copy(
                        discountAmount = finalAmount.toDouble(),
                        updatedAt = now
                    )
                    withContext(Dispatchers.IO) {
                        orderRepository.updateOrderItem(updatedItem)
                    }
                    Log.d(TAG, "applyItemDiscount - Saved item discount to database: $itemId = $finalAmount")

                    // Update currentOrderItems với discount mới
                    _uiState.update { s ->
                        s.copy(
                            currentOrderItems = s.currentOrderItems.map {
                                if (it.id == itemId) updatedItem else it
                            }
                        )
                    }

                    // Cập nhật total discount trong order
                    val updatedState = _uiState.value
                    saveOrderDiscountToDatabase(updatedState.billDiscountAmount, updatedState.billDiscountDescription)
                } catch (e: Exception) {
                    Log.e(TAG, "applyItemDiscount - Error saving to database: ${e.message}", e)
                }
            }
        }
    }

    /**
     * Xóa giảm giá của một món
     */
    fun clearItemDiscount(itemId: String) {
        applyItemDiscount(itemId, 0)
    }

    /**
     * Cập nhật mã coupon đang nhập
     */
    fun setCouponCode(code: String) {
        _uiState.update { state ->
            state.copy(
                couponCode = code.uppercase(),
                couponError = null
            )
        }
    }

    /**
     * Áp dụng coupon từ mã đã nhập
     * Tự động thay thế coupon cũ nếu có (không cần huỷ trước)
     */
    fun applyCoupon() {
        val state = _uiState.value
        val code = state.couponCode.trim()

        if (code.isEmpty()) {
            _uiState.update { it.copy(couponError = "Vui lòng nhập mã giảm giá") }
            return
        }

        // Nếu coupon này đã được áp dụng rồi thì không làm gì
        if (state.appliedDiscounts.any { it.code.equals(code, ignoreCase = true) }) {
            _uiState.update { it.copy(couponCode = "") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isApplyingCoupon = true, couponError = null) }

            try {
                val currentDate = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                    .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                    .format(java.util.Date())

                val coupon = withContext(Dispatchers.IO) {
                    couponDao.getValidCouponByCode(code, branchId, currentDate)
                }

                if (coupon == null) {
                    _uiState.update {
                        it.copy(
                            isApplyingCoupon = false,
                            couponError = "Mã giảm giá không hợp lệ hoặc đã hết hạn"
                        )
                    }
                    return@launch
                }

                // Kiểm tra giới hạn tổng lượt dùng
                if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit!!) {
                    _uiState.update {
                        it.copy(
                            isApplyingCoupon = false,
                            couponError = "Mã giảm giá đã hết lượt sử dụng (${coupon.usageCount}/${coupon.usageLimit})"
                        )
                    }
                    return@launch
                }

                // Kiểm tra giới hạn lượt dùng trong ngày
                if (coupon.dailyLimit != null && coupon.dailyUsageCount >= coupon.dailyLimit!!) {
                    _uiState.update {
                        it.copy(
                            isApplyingCoupon = false,
                            couponError = "Mã giảm giá đã hết lượt sử dụng hôm nay (${coupon.dailyUsageCount}/${coupon.dailyLimit})"
                        )
                    }
                    return@launch
                }

                // Kiểm tra giá trị đơn hàng tối thiểu
                val orderAmount = state.currentOrder?.subtotal ?: state.subtotal.toDouble()
                if (orderAmount < coupon.minOrderAmount) {
                    _uiState.update {
                        it.copy(
                            isApplyingCoupon = false,
                            couponError = "Đơn hàng tối thiểu ${formatCurrencyVN(coupon.minOrderAmount.toLong())} để áp dụng mã này"
                        )
                    }
                    return@launch
                }

                // Tính số tiền còn lại sau khi trừ giảm giá món và giảm giá bill
                // Thứ tự ưu tiên: 1. Giảm giá món → 2. Giảm giá bill → 3. Coupon
                val remainingAmount = (orderAmount - state.itemDiscountTotal - state.billDiscountAmount).coerceAtLeast(0.0)

                // Tính số tiền giảm từ coupon (trên số tiền còn lại, không phải subtotal gốc)
                val discountAmount = calculateCouponDiscountAmount(coupon, remainingAmount)

                // Tạo discount mới
                val appliedDiscount = AppliedDiscount(
                    couponId = coupon.id,
                    code = coupon.code,
                    name = coupon.name,
                    discountType = coupon.couponType,
                    discountValue = coupon.discountValue,
                    discountAmount = discountAmount
                )

                // Thay thế tất cả coupon cũ bằng coupon mới (chỉ cho phép 1 coupon tại 1 thời điểm)
                val newAppliedDiscounts = listOf(appliedDiscount)
                val totalCouponDiscount = discountAmount

                // Tính VAT (tách từ giá đã bao gồm VAT)
                // VAT = giá - (giá ÷ (1 + taxRate/100))
                val subtotal = state.currentOrder?.subtotal?.toLong() ?: state.subtotal
                val totalAllDiscounts = state.itemDiscountTotal + state.billDiscountAmount + totalCouponDiscount
                val priceAfterDiscount = (subtotal - totalAllDiscounts).coerceAtLeast(0L)
                val priceBeforeVat = (priceAfterDiscount / (1 + state.taxRate / 100.0)).toLong()
                val vatAmount = priceAfterDiscount - priceBeforeVat

                _uiState.update {
                    it.copy(
                        isApplyingCoupon = false,
                        couponCode = "",
                        couponError = null,
                        appliedDiscounts = newAppliedDiscounts,
                        vatAmount = vatAmount,
                        availableCoupons = it.availableCoupons + coupon,
                        successMessage = "Đã áp dụng mã ${coupon.code}"
                    )
                }

                Log.d(TAG, "applyCoupon - Applied coupon: ${coupon.code}, discount: $discountAmount on remaining: $remainingAmount (replaced previous coupons)")
            } catch (e: Exception) {
                Log.e(TAG, "applyCoupon - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isApplyingCoupon = false,
                        couponError = "Lỗi áp dụng mã giảm giá: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * Xóa coupon đã áp dụng
     */
    fun removeCoupon(couponId: String) {
        _uiState.update { state ->
            val newAppliedDiscounts = state.appliedDiscounts.filter { it.couponId != couponId }
            val totalDiscount = newAppliedDiscounts.sumOf { it.discountAmount }

            // Tính lại VAT (tách từ giá đã bao gồm VAT)
            val subtotal = state.currentOrder?.subtotal?.toLong() ?: state.subtotal
            val priceAfterDiscount = (subtotal - totalDiscount).coerceAtLeast(0L)
            val priceBeforeVat = (priceAfterDiscount / (1 + state.taxRate / 100.0)).toLong()
            val vatAmount = priceAfterDiscount - priceBeforeVat

            state.copy(
                appliedDiscounts = newAppliedDiscounts,
                vatAmount = vatAmount
            )
        }
        Log.d(TAG, "removeCoupon - Removed coupon: $couponId")
    }

    /**
     * Áp dụng coupon theo ID (từ danh sách available coupons)
     * Tự động thay thế coupon cũ nếu có (không cần huỷ trước)
     */
    fun applyCouponById(couponId: String) {
        val state = _uiState.value
        val coupon = state.availableCoupons.find { it.id == couponId }

        if (coupon == null) {
            _uiState.update { it.copy(couponError = "Không tìm thấy mã giảm giá") }
            return
        }

        // Nếu coupon này đã được áp dụng rồi thì không làm gì
        if (state.appliedDiscounts.any { it.couponId == couponId }) {
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isApplyingCoupon = true, couponError = null) }

            try {
                val orderAmount = state.currentOrder?.subtotal ?: state.subtotal.toDouble()

                // Kiểm tra giới hạn tổng lượt dùng
                if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit!!) {
                    _uiState.update {
                        it.copy(
                            isApplyingCoupon = false,
                            couponError = "Mã giảm giá đã hết lượt sử dụng (${coupon.usageCount}/${coupon.usageLimit})"
                        )
                    }
                    return@launch
                }

                // Kiểm tra giới hạn lượt dùng trong ngày
                if (coupon.dailyLimit != null && coupon.dailyUsageCount >= coupon.dailyLimit!!) {
                    _uiState.update {
                        it.copy(
                            isApplyingCoupon = false,
                            couponError = "Mã giảm giá đã hết lượt sử dụng hôm nay (${coupon.dailyUsageCount}/${coupon.dailyLimit})"
                        )
                    }
                    return@launch
                }

                // Kiểm tra giá trị đơn hàng tối thiểu
                if (orderAmount < coupon.minOrderAmount) {
                    _uiState.update {
                        it.copy(
                            isApplyingCoupon = false,
                            couponError = "Đơn hàng tối thiểu ${formatCurrencyVN(coupon.minOrderAmount.toLong())} để áp dụng mã này"
                        )
                    }
                    return@launch
                }

                // Tính số tiền còn lại sau khi trừ giảm giá món và giảm giá bill
                // Thứ tự ưu tiên: 1. Giảm giá món → 2. Giảm giá bill → 3. Coupon
                val remainingAmount = (orderAmount - state.itemDiscountTotal - state.billDiscountAmount).coerceAtLeast(0.0)

                // Tính số tiền giảm từ coupon (trên số tiền còn lại, không phải subtotal gốc)
                val discountAmount = calculateCouponDiscountAmount(coupon, remainingAmount)

                // Tạo discount mới
                val appliedDiscount = AppliedDiscount(
                    couponId = coupon.id,
                    code = coupon.code,
                    name = coupon.name,
                    discountType = coupon.couponType,
                    discountValue = coupon.discountValue,
                    discountAmount = discountAmount
                )

                // Thay thế tất cả coupon cũ bằng coupon mới (chỉ cho phép 1 coupon tại 1 thời điểm)
                val newAppliedDiscounts = listOf(appliedDiscount)
                val totalDiscount = discountAmount

                // Tính VAT (tách từ giá đã bao gồm VAT)
                val subtotal = state.currentOrder?.subtotal?.toLong() ?: state.subtotal
                val totalAllDiscounts = state.itemDiscountTotal + state.billDiscountAmount + totalDiscount
                val priceAfterDiscount = (subtotal - totalAllDiscounts).coerceAtLeast(0L)
                val priceBeforeVat = (priceAfterDiscount / (1 + state.taxRate / 100.0)).toLong()
                val vatAmount = priceAfterDiscount - priceBeforeVat

                _uiState.update {
                    it.copy(
                        isApplyingCoupon = false,
                        couponError = null,
                        appliedDiscounts = newAppliedDiscounts,
                        vatAmount = vatAmount,
                        successMessage = "Đã áp dụng mã ${coupon.code}"
                    )
                }

                Log.d(TAG, "applyCouponById - Applied coupon: ${coupon.code}, discount: $discountAmount (replaced previous coupons)")
            } catch (e: Exception) {
                Log.e(TAG, "applyCouponById - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        isApplyingCoupon = false,
                        couponError = "Lỗi áp dụng mã giảm giá: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * Tính số tiền giảm từ coupon
     */
    private fun calculateCouponDiscountAmount(coupon: CouponEntity, orderAmount: Double): Long {
        val discount = when (coupon.couponType) {
            "percentage" -> {
                val calculated = orderAmount * (coupon.discountValue / 100.0)
                // Áp dụng max discount nếu có
                coupon.maxDiscount?.let { max ->
                    calculated.coerceAtMost(max)
                } ?: calculated
            }
            "fixed" -> {
                coupon.discountValue.coerceAtMost(orderAmount)
            }
            else -> 0.0
        }
        return discount.toLong()
    }

    /**
     * Load coupon tự động áp dụng khi mở PaymentDialog
     * Hiển thị tất cả coupon có thể áp dụng (cả auto và manual)
     */
    fun loadAutoCoupons() {
        viewModelScope.launch {
            try {
                val currentDate = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                    .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                    .format(java.util.Date())

                val state = _uiState.value
                val orderAmount = state.currentOrder?.subtotal ?: state.subtotal.toDouble()

                // Lấy TẤT CẢ coupon đang active (bao gồm cả đủ và chưa đủ điều kiện)
                // để hiển thị cho user biết còn những coupon nào và cần gì để sử dụng
                val allCoupons = try {
                    withContext(Dispatchers.IO) {
                        couponDao.getValidCoupons(branchId, currentDate)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "loadAutoCoupons - Error fetching coupons: ${e.message}", e)
                    emptyList()
                }

                // Filter applicable coupons (for auto-apply logic)
                val allApplicableCoupons = allCoupons.filter { coupon ->
                    val usageOk = coupon.usageLimit == null || coupon.usageCount < coupon.usageLimit
                    val dailyOk = coupon.dailyLimit == null || coupon.dailyUsageCount < coupon.dailyLimit
                    val minAmountOk = coupon.minOrderAmount <= orderAmount
                    usageOk && dailyOk && minAmountOk
                }

                // Lọc chỉ auto coupon để tự động áp dụng
                val autoCoupons = allApplicableCoupons.filter {
                    it.activationType == "auto" && it.minOrderAmount <= orderAmount
                }

                // Áp dụng auto coupons
                val appliedDiscounts = mutableListOf<AppliedDiscount>()
                var totalDiscount = 0L

                for (coupon in autoCoupons) {
                    // Kiểm tra combinable
                    if (!coupon.isCombinable && appliedDiscounts.isNotEmpty()) {
                        continue
                    }
                    if (appliedDiscounts.any { applied ->
                        autoCoupons.find { it.id == applied.couponId }?.isCombinable == false
                    }) {
                        continue
                    }

                    val discountAmount = calculateCouponDiscountAmount(coupon, orderAmount)
                    appliedDiscounts.add(
                        AppliedDiscount(
                            couponId = coupon.id,
                            code = coupon.code,
                            name = coupon.name,
                            discountType = coupon.couponType,
                            discountValue = coupon.discountValue,
                            discountAmount = discountAmount
                        )
                    )
                    totalDiscount += discountAmount
                }

                // Tính VAT (tách từ giá đã bao gồm VAT)
                val subtotal = state.currentOrder?.subtotal?.toLong() ?: state.subtotal
                val priceAfterDiscount = (subtotal - totalDiscount).coerceAtLeast(0L)
                val priceBeforeVat = (priceAfterDiscount / (1 + state.taxRate / 100.0)).toLong()
                val vatAmount = priceAfterDiscount - priceBeforeVat

                _uiState.update { s ->
                    s.copy(
                        appliedDiscounts = appliedDiscounts,
                        vatAmount = vatAmount,
                        availableCoupons = allCoupons  // Hiển thị TẤT CẢ coupon (UI sẽ tính toán availability)
                    )
                }

                Log.d(TAG, "loadAutoCoupons - Applied ${appliedDiscounts.size} auto coupons, showing ${allCoupons.size} total coupons (${allApplicableCoupons.size} applicable)")
            } catch (e: Exception) {
                Log.e(TAG, "loadAutoCoupons - Error: ${e.message}", e)
                // Đảm bảo state được reset khi có lỗi
                _uiState.update { s ->
                    s.copy(availableCoupons = emptyList())
                }
            }
        }
    }

    private fun formatCurrencyVN(amount: Long): String {
        return String.format(java.util.Locale.US, "%,d", amount) + "đ"
    }

    // ===== VARIANT DIALOG =====

    fun showVariantDialog(product: Product) {
        // Prevent showing variant dialog when payment dialog is showing or pending
        if (_uiState.value.showPaymentDialog || _uiState.value.pendingPaymentDialog) return

        viewModelScope.launch {
            // Load notes for this specific product
            val productNotes = withContext(Dispatchers.IO) {
                productNoteDao.getNotesForProductSync(product.id)
            }

            Log.d(TAG, "showVariantDialog - Product: ${product.name} (${product.id}), Notes found: ${productNotes.size}")
            if (productNotes.isNotEmpty()) {
                productNotes.forEach { note ->
                    Log.d(TAG, "  - Note: ${note.name}")
                }
            }

            _uiState.update { state ->
                state.copy(
                    showVariantDialog = true,
                    selectedProductForVariant = product,
                    notesForSelectedProduct = productNotes
                )
            }
        }
    }

    fun hideVariantDialog() {
        _uiState.update { state ->
            state.copy(
                showVariantDialog = false,
                selectedProductForVariant = null,
                selectedCartItemForTopping = null,
                notesForSelectedProduct = emptyList()
            )
        }
    }

    /**
     * Show dialog to add more toppings to an existing cart item
     */
    fun showAddToppingDialog(cartItemId: String) {
        val cartItem = _uiState.value.cartItems.find { it.id == cartItemId } ?: return

        viewModelScope.launch {
            // Load notes for this specific product
            val productNotes = withContext(Dispatchers.IO) {
                productNoteDao.getNotesForProductSync(cartItem.product.id)
            }

            _uiState.update { state ->
                state.copy(
                    showVariantDialog = true,
                    selectedProductForVariant = cartItem.product,
                    selectedCartItemForTopping = cartItemId,
                    notesForSelectedProduct = productNotes
                )
            }
        }
    }

    /**
     * Add selected toppings to an existing cart item
     */
    fun addToppingsToCartItem(cartItemId: String, newVariants: List<SelectedVariant>) {
        _uiState.update { state ->
            val updatedCartItems = state.cartItems.map { item ->
                if (item.id == cartItemId) {
                    // Merge existing variants with new ones (avoid duplicates)
                    val existingNames = item.selectedVariants.map { it.name }.toSet()
                    val uniqueNewVariants = newVariants.filter { it.name !in existingNames }
                    val mergedVariants = item.selectedVariants + uniqueNewVariants
                    item.copy(selectedVariants = mergedVariants)
                } else {
                    item
                }
            }
            state.copy(
                cartItems = updatedCartItems,
                showVariantDialog = false,
                selectedProductForVariant = null,
                selectedCartItemForTopping = null
            )
        }
        Log.d(TAG, "addToppingsToCartItem - Added ${newVariants.size} toppings to cart item $cartItemId")
    }

    /**
     * Replace all variants on a cart item with new selection
     * Used when editing/updating toppings from the dialog
     */
    fun updateCartItemVariants(cartItemId: String, newVariants: List<SelectedVariant>) {
        _uiState.update { state ->
            val updatedCartItems = state.cartItems.map { item ->
                if (item.id == cartItemId) {
                    // Replace all variants with new selection
                    item.copy(selectedVariants = newVariants)
                } else {
                    item
                }
            }
            state.copy(
                cartItems = updatedCartItems,
                showVariantDialog = false,
                selectedProductForVariant = null,
                selectedCartItemForTopping = null
            )
        }
        Log.d(TAG, "updateCartItemVariants - Updated cart item $cartItemId with ${newVariants.size} variants")
    }

    // ===== NOTE DIALOG =====

    fun showNoteDialog(cartItemId: String) {
        viewModelScope.launch {
            // Find the cart item to get its product ID
            val cartItem = _uiState.value.cartItems.find { it.id == cartItemId }
            val productId = cartItem?.product?.id

            // Load notes for this specific product
            val productNotes = if (productId != null) {
                withContext(Dispatchers.IO) {
                    productNoteDao.getNotesForProductSync(productId)
                }
            } else {
                emptyList()
            }

            _uiState.update { state ->
                state.copy(
                    showNoteDialog = true,
                    selectedCartItemForNote = cartItemId,
                    notesForSelectedProduct = productNotes
                )
            }
        }
    }

    fun hideNoteDialog() {
        _uiState.update { state ->
            state.copy(
                showNoteDialog = false,
                selectedCartItemForNote = null,
                notesForSelectedProduct = emptyList()
            )
        }
    }

    fun applyNoteToCartItem(cartItemId: String, note: String?) {
        updateCartItemNote(cartItemId, note?.takeIf { it.isNotBlank() })
        hideNoteDialog()
    }

    // ===== ORDER MANAGEMENT =====

    private fun getCurrentTimestamp(): String {
        // Use Instant.now() to get proper UTC timestamp in ISO-8601 format
        return java.time.Instant.now().toString()
    }

    /**
     * Expand combo items - tạo order items cho cả món combo và các món con
     * Món con sẽ được gửi xuống bếp để chế biến
     */
    private suspend fun expandComboItems(
        cartItem: CartItem,
        orderId: String,
        now: String
    ): List<OrderItemEntity> {
        val orderItems = mutableListOf<OrderItemEntity>()

        // Build variants string with group names for proper parsing
        // Format: "Size: L, Đường: NHIỀU, + Trân châu (+10000)"
        // - Options (Size, Đường, Đá) use "GroupName: Value" format
        // - Everything else (toppings) starts with "+"
        val variantsWithPrices = cartItem.selectedVariants.joinToString(", ") { variant ->
            val groupNameLower = variant.groupName.lowercase()

            // Detect if this is an OPTION (Size, Sugar, Ice) - NOT a topping
            val isOptionGroup = groupNameLower.contains("size") ||
                                groupNameLower.contains("kích thước") ||
                                groupNameLower.contains("đường") ||
                                groupNameLower.contains("sugar") ||
                                groupNameLower.contains("độ đường") ||
                                groupNameLower.contains("mức đường") ||
                                groupNameLower.contains("đá") ||
                                groupNameLower.contains("ice") ||
                                groupNameLower.contains("độ đá") ||
                                groupNameLower.contains("mức đá")

            if (!isOptionGroup) {
                // NOT an option -> treat as TOPPING (use "+" prefix)
                if (variant.price > 0) {
                    "+ ${variant.name} (+${variant.price})"
                } else {
                    "+ ${variant.name}"
                }
            } else {
                // This is an option (Size, Sugar, Ice) - use "GroupName: Value" format
                val displayGroupName = when {
                    groupNameLower.contains("size") || groupNameLower.contains("kích thước") -> "Size"
                    groupNameLower.contains("đường") || groupNameLower.contains("sugar") ||
                    groupNameLower.contains("độ đường") || groupNameLower.contains("mức đường") -> "Đường"
                    groupNameLower.contains("đá") || groupNameLower.contains("ice") ||
                    groupNameLower.contains("độ đá") || groupNameLower.contains("mức đá") -> "Đá"
                    else -> variant.groupName
                }
                if (variant.price > 0) {
                    "$displayGroupName: ${variant.name} (+${variant.price})"
                } else {
                    "$displayGroupName: ${variant.name}"
                }
            }
        }

        // Combine variants and user note into notes field
        val variantsAndNote = buildString {
            if (variantsWithPrices.isNotEmpty()) {
                append(variantsWithPrices)
            }
            if (!cartItem.note.isNullOrEmpty()) {
                if (isNotEmpty()) append(" | ")
                append("Ghi chú: ${cartItem.note}")
            }
        }.ifEmpty { null }

        // Get combo child items
        val comboItems = withContext(Dispatchers.IO) {
            comboItemDao.getItemsByComboSync(cartItem.product.id)
        }

        if (comboItems.isEmpty()) {
            // Not a combo - create single order item
            // originalPrice = giá đơn vị đầy đủ (bao gồm topping) để tính giảm giá đúng
            val fullUnitPrice = cartItem.totalPrice.toDouble() / cartItem.quantity
            orderItems.add(
                OrderItemEntity(
                    id = UUID.randomUUID().toString(),
                    orderId = orderId,
                    productId = cartItem.product.id,
                    productCode = cartItem.product.code,
                    productName = cartItem.product.name,
                    productImageUrl = cartItem.product.imageUrl,
                    quantity = cartItem.quantity,
                    unitPrice = cartItem.product.price.toDouble(),
                    originalPrice = fullUnitPrice, // Giá đầy đủ bao gồm topping
                    totalPrice = cartItem.totalPrice.toDouble(),
                    vatRate = cartItem.product.vatRate, // Copy VAT rate từ sản phẩm
                    notes = variantsAndNote,
                    status = "pending",
                    createdAt = now,
                    updatedAt = now
                )
            )
        } else {
            // This is a combo - create combo parent item
            val parentItemId = UUID.randomUUID().toString()
            val comboFullUnitPrice = cartItem.totalPrice.toDouble() / cartItem.quantity
            orderItems.add(
                OrderItemEntity(
                    id = parentItemId,
                    orderId = orderId,
                    productId = cartItem.product.id,
                    productCode = cartItem.product.code,
                    productName = cartItem.product.name,
                    productImageUrl = cartItem.product.imageUrl,
                    quantity = cartItem.quantity,
                    unitPrice = cartItem.product.price.toDouble(),
                    originalPrice = comboFullUnitPrice, // Giá đầy đủ bao gồm topping
                    totalPrice = cartItem.totalPrice.toDouble(),
                    vatRate = cartItem.product.vatRate, // Copy VAT rate từ sản phẩm
                    notes = variantsAndNote,
                    status = "pending",
                    isComboParent = true,
                    createdAt = now,
                    updatedAt = now
                )
            )

            // Create child items for kitchen (price = 0, marked as combo child)
            comboItems.forEach { comboItem ->
                orderItems.add(
                    OrderItemEntity(
                        id = UUID.randomUUID().toString(),
                        orderId = orderId,
                        productId = comboItem.productId,
                        productCode = comboItem.productCode ?: "",
                        productName = comboItem.productName,
                        productImageUrl = null,
                        quantity = cartItem.quantity * comboItem.quantity,  // Multiply by parent quantity
                        unitPrice = 0.0,  // Child items have no price (included in combo)
                        totalPrice = 0.0,
                        notes = "[Combo: ${cartItem.product.name}]",  // Mark as part of combo
                        status = "pending",
                        isComboChild = true,
                        comboParentId = parentItemId,  // Use parent's ORDER ITEM ID
                        createdAt = now,
                        updatedAt = now
                    )
                )
            }

            Log.d(TAG, "expandComboItems - Expanded combo ${cartItem.product.name} with ${comboItems.size} child items")
        }

        return orderItems
    }

    /**
     * Đặt món - Tạo order mới với status pending
     * Table status sẽ chuyển sang occupied
     */
    fun placeOrder() {
        val state = _uiState.value
        Log.d(TAG, "placeOrder - Starting: cartItems=${state.cartItems.size}, orderType=${state.orderType}, table=${state.selectedTable?.name}")

        if (state.cartItems.isEmpty()) {
            Log.w(TAG, "placeOrder - Cart is empty, returning")
            return
        }
        if (state.orderType == OrderType.DINE_IN && state.selectedTable == null) {
            Log.w(TAG, "placeOrder - Dine-in requires table selection")
            _uiState.update { it.copy(errorMessage = "Vui lòng chọn bàn trước khi đặt món") }
            return
        }

        viewModelScope.launch {
            try {
                val staffId = authRepository.getCurrentStaffId() ?: "unknown"
                val staffName = authRepository.getCurrentStaffName() ?: "Nhân viên"
                val currentShift = withContext(Dispatchers.IO) {
                    shiftRepository.getCurrentOpenShift(branchId)
                }
                val shiftId = currentShift?.id
                val now = getCurrentTimestamp()

                Log.d(TAG, "placeOrder - staffId=$staffId, shiftId=$shiftId, branchId=$branchId")
                Log.d(TAG, "placeOrder - SELECTED TABLE: id=${state.selectedTable?.id}, name=${state.selectedTable?.name}, areaId=${state.selectedTable?.areaId}, areaName=${state.selectedTable?.areaName}")

                val orderId = UUID.randomUUID().toString()
                val orderNumber = generateOrderNumber()

                // Create order entity
                val orderEntity = OrderEntity(
                    id = orderId,
                    branchId = branchId,
                    tableId = state.selectedTable?.id,
                    tableName = state.selectedTable?.name,
                    shiftId = shiftId,
                    staffId = staffId,
                    staffName = staffName,
                    customerName = state.selectedCustomer?.name,
                    customerPhone = state.selectedCustomer?.phone,
                    orderNumber = orderNumber,
                    status = "pending",
                    orderType = state.orderType.dbValue,
                    subtotal = state.subtotal.toDouble(),
                    discountAmount = state.discountAmount.toDouble(),
                    discountReason = state.billDiscountDescription,
                    totalAmount = state.totalAmount.toDouble(),
                    paymentStatus = "unpaid",
                    createdAt = now,
                    updatedAt = now,
                    idempotencyKey = UUID.randomUUID().toString()
                )

                // Create order items with combo expansion
                val orderItems = mutableListOf<OrderItemEntity>()
                state.cartItems.forEach { cartItem ->
                    val expandedItems = expandComboItems(cartItem, orderId, now)
                    orderItems.addAll(expandedItems)
                }

                // Save to database
                Log.d(TAG, "placeOrder - Saving order to database: orderId=$orderId, tableId=${orderEntity.tableId}, shiftId=${orderEntity.shiftId}")
                withContext(Dispatchers.IO) {
                    orderRepository.createOrder(orderEntity, orderItems)
                    Log.d(TAG, "placeOrder - Order saved successfully")

                    // Update table status to occupied
                    state.selectedTable?.let { table ->
                        Log.d(TAG, "placeOrder - Updating table status: tableId=${table.id}")
                        tableRepository.updateTableStatus(table.id, "occupied", orderId, now)
                    }
                }

                // Invalidate TableViewModel cache để TableScreen refresh ngay lập tức
                TableViewModel.invalidateCache()

                Log.d(TAG, "placeOrder - Created order: $orderNumber with ${orderItems.size} items")

                // Update UI state immediately - don't wait for printing
                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = orderEntity,
                        currentOrderItems = orderItems,
                        successMessage = "Đặt món thành công! $orderNumber"
                    )
                }

                // Refresh tables to show updated status
                refreshTables()

                // Print to kitchens in background - don't block success message
                val orderToPrint = orderEntity
                val itemsToPrint = orderItems.toList()
                viewModelScope.launch {
                    try {
                        val kitchens = withContext(Dispatchers.IO) {
                            kitchenRepository.getAllKitchensSync(branchId)
                        }
                        val products = productEntityMap.values.toList()

                        if (kitchens.isNotEmpty() && products.isNotEmpty()) {
                            val printResult = OrderPrintingService.printOrderToKitchens(
                                order = orderToPrint,
                                orderItems = itemsToPrint,
                                kitchens = kitchens,
                                products = products
                            )
                            Log.d(TAG, "placeOrder - Background print result: ${printResult.success}, ${printResult.message}")
                            if (!printResult.success && printResult.message.isNotBlank()) {
                                Log.w(TAG, "placeOrder - Print warning: ${printResult.message}")
                            }
                        } else {
                            Log.d(TAG, "placeOrder - Skipping print: kitchens=${kitchens.size}, products=${products.size}")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "placeOrder - Background print error: ${e.message}", e)
                    }
                }

            } catch (e: Exception) {
                Log.e(TAG, "placeOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi đặt món: ${e.message}") }
            }
        }
    }

    /**
     * Thêm món vào order hiện tại
     */
    fun addItemsToOrder() {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return
        if (state.cartItems.isEmpty()) return

        viewModelScope.launch {
            try {
                val now = getCurrentTimestamp()

                // Create new order items with combo expansion
                val newItems = mutableListOf<OrderItemEntity>()
                state.cartItems.forEach { cartItem ->
                    val expandedItems = expandComboItems(cartItem, currentOrder.id, now)
                    newItems.addAll(expandedItems)
                }

                // Calculate new totals
                val newSubtotal = currentOrder.subtotal + state.subtotal
                val newTotal = currentOrder.totalAmount + state.totalAmount

                // Update order in database
                withContext(Dispatchers.IO) {
                    newItems.forEach { orderRepository.addOrderItem(it) }

                    val updatedOrder = currentOrder.copy(
                        subtotal = newSubtotal,
                        totalAmount = newTotal,
                        updatedAt = now
                    )
                    orderRepository.updateOrder(updatedOrder)
                }

                // Reload order items
                val allItems = withContext(Dispatchers.IO) {
                    orderRepository.getOrderItemsSync(currentOrder.id)
                }

                Log.d(TAG, "addItemsToOrder - Added ${newItems.size} items to order ${currentOrder.orderNumber}")

                // Update UI immediately - don't wait for printing
                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = currentOrder.copy(subtotal = newSubtotal, totalAmount = newTotal, updatedAt = now),
                        currentOrderItems = allItems,
                        successMessage = "Đã thêm ${newItems.size} món"
                    )
                }

                // Print new items to kitchens in background - don't block success message
                val printOrder = currentOrder.copy(updatedAt = now)
                val itemsToPrint = newItems.toList()
                viewModelScope.launch {
                    try {
                        val kitchens = withContext(Dispatchers.IO) {
                            kitchenRepository.getAllKitchensSync(branchId)
                        }
                        val products = productEntityMap.values.toList()

                        if (kitchens.isNotEmpty() && products.isNotEmpty() && itemsToPrint.isNotEmpty()) {
                            val printResult = OrderPrintingService.printOrderToKitchens(
                                order = printOrder,
                                orderItems = itemsToPrint,
                                kitchens = kitchens,
                                products = products
                            )
                            Log.d(TAG, "addItemsToOrder - Background print result: ${printResult.success}, ${printResult.message}")
                            if (!printResult.success && printResult.message.isNotBlank()) {
                                Log.w(TAG, "addItemsToOrder - Print warning: ${printResult.message}")
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "addItemsToOrder - Background print error: ${e.message}", e)
                    }
                }

            } catch (e: Exception) {
                Log.e(TAG, "addItemsToOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi thêm món: ${e.message}") }
            }
        }
    }

    /**
     * In bill tạm - dùng để cho khách xem trước khi thanh toán
     * Mỗi lần in sẽ tăng số lần in và hiển thị thời gian in
     */
    fun printTemporaryBill() {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: run {
            _uiState.update { it.copy(errorMessage = "Không có order để in bill tạm") }
            return
        }

        viewModelScope.launch {
            try {
                // Tăng số lần in bill tạm
                val newPrintCount = state.tempBillPrintCount + 1
                _uiState.update { it.copy(tempBillPrintCount = newPrintCount) }

                withContext(Dispatchers.IO) {
                    // Get printer and template
                    var printerConfig = billPrinterConfigDao.getDefaultByBranch(branchId)
                    if (printerConfig == null) {
                        val activePrinters = billPrinterConfigDao.getAllByBranchSync(branchId)
                        printerConfig = activePrinters.firstOrNull()
                    }

                    if (printerConfig != null && printerConfig.isActive) {
                        var template = if (printerConfig.templateId != null) {
                            billTemplateDao.getById(printerConfig.templateId)
                        } else {
                            billTemplateDao.getDefaultByBranch(branchId)
                        }
                        if (template == null || !template.isActive) {
                            val activeTemplates = billTemplateDao.getAllByBranchSync(branchId)
                            template = activeTemplates.firstOrNull()
                        }

                        if (template != null && template.isActive) {
                            // Build temporary bill data
                            val billData = buildBillData(
                                order = currentOrder,
                                orderItems = state.currentOrderItems,
                                itemDiscounts = state.itemDiscounts,
                                itemDiscountTypes = state.itemDiscountTypes,
                                billDiscountAmount = state.billDiscountAmount,
                                surchargeAmount = state.surchargeAmount,
                                surcharges = state.selectedSurcharges,
                                appliedDiscounts = state.appliedDiscounts,
                                tableName = state.selectedTable?.name,
                                staffName = currentOrder.staffName,
                                customerName = currentOrder.customerName,
                                paymentMethod = "",
                                receivedAmount = 0.0,
                                changeAmount = 0.0
                            ).copy(
                                // Mark as temporary bill with print count and time
                                isTemporaryBill = true,
                                printCount = newPrintCount,
                                printTime = Date()
                            )

                            // Print temporary bill
                            val result = HybridBillPrintService.printBill(printerConfig, template, billData)
                            when (result) {
                                is PrinterResult.Success -> {
                                    Log.d(TAG, "printTemporaryBill - Success, printCount: $newPrintCount")
                                    withContext(Dispatchers.Main) {
                                        _uiState.update { it.copy(successMessage = "In bill tạm thành công (lần thứ $newPrintCount)") }
                                    }
                                }
                                is PrinterResult.Error -> {
                                    Log.e(TAG, "printTemporaryBill - Error: ${result.message}")
                                    withContext(Dispatchers.Main) {
                                        _uiState.update { it.copy(errorMessage = "Lỗi in bill tạm: ${result.message}") }
                                    }
                                }
                                else -> {}
                            }
                        } else {
                            withContext(Dispatchers.Main) {
                                _uiState.update { it.copy(errorMessage = "Không tìm thấy mẫu bill") }
                            }
                        }
                    } else {
                        withContext(Dispatchers.Main) {
                            _uiState.update { it.copy(errorMessage = "Không tìm thấy máy in") }
                        }
                    }
                }

            } catch (e: Exception) {
                Log.e(TAG, "printTemporaryBill - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi in bill tạm: ${e.message}") }
            }
        }
    }

    /**
     * Thanh toán và hoàn tất order
     * Đồng bộ: Order -> Order Items -> Table -> Shift Statistics -> Bill Print
     */
    fun completeOrder(
        paymentMethod: String = "cash",
        receivedAmount: Double = 0.0,
        changeAmount: Double = 0.0
    ) {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return

        viewModelScope.launch {
            try {
                val now = getCurrentTimestamp()

                // Calculate final amounts with applied discounts and surcharges
                val orderSubtotal = currentOrder.subtotal
                val finalDiscountAmount = state.discountAmount.toDouble()  // Includes bill + item + coupon discounts
                val finalSurchargeAmount = state.surchargeAmount.toDouble()  // Phụ thu
                val finalTotalAmount = (orderSubtotal + finalSurchargeAmount - finalDiscountAmount).coerceAtLeast(0.0)

                Log.d(TAG, "completeOrder - subtotal: $orderSubtotal, surcharge: $finalSurchargeAmount, discount: $finalDiscountAmount, total: $finalTotalAmount")

                // Lưu thông tin cần thiết cho việc in bill
                val completedOrder: OrderEntity
                val orderItemsForPrint = state.currentOrderItems
                val itemDiscountsForPrint = state.itemDiscounts
                val itemDiscountTypesForPrint = state.itemDiscountTypes  // Loại giảm giá: "percent" hoặc "fixed"
                val billDiscountForPrint = state.billDiscountAmount
                val surchargeForPrint = state.surchargeAmount  // Phụ thu
                val surchargesForPrint = state.selectedSurcharges  // Danh sách phụ thu (để tính VAT)
                val appliedDiscountsForPrint = state.appliedDiscounts  // Coupon/Voucher đã áp dụng
                val tableNameForPrint = state.selectedTable?.name

                withContext(Dispatchers.IO) {
                    // 1. Update order status to completed with correct discount, surcharge and total
                    completedOrder = currentOrder.copy(
                        status = "completed",
                        paymentStatus = "paid",
                        paymentMethod = paymentMethod,
                        discountAmount = finalDiscountAmount,
                        discountReason = state.billDiscountDescription,
                        surchargeAmount = finalSurchargeAmount,
                        totalAmount = finalTotalAmount,
                        paidAmount = finalTotalAmount,
                        completedAt = now,
                        updatedAt = now
                    )
                    orderRepository.updateOrder(completedOrder)

                    // 2. Update all order items status to completed (except cancelled items)
                    orderRepository.updateAllItemsStatusExcludeCancelled(currentOrder.id, "completed", now)

                    // 3. Update table status back to available
                    state.selectedTable?.let { table ->
                        tableRepository.updateTableStatus(table.id, "available", null, now)
                        // Invalidate TableViewModel cache để TableScreen refresh ngay lập tức
                        TableViewModel.invalidateCache()
                    }

                    // 4. Update shift statistics with correct discount
                    currentOrder.shiftId?.let { shiftId ->
                        shiftRepository.addOrderRevenue(
                            shiftId = shiftId,
                            orderTotal = finalTotalAmount,
                            discountAmount = finalDiscountAmount,
                            paymentMethod = paymentMethod,
                            updatedAt = now
                        )
                    }

                    // 5. Increment coupon usage count
                    state.appliedDiscounts.forEach { discount ->
                        couponDao.incrementUsage(discount.couponId)
                        couponDao.incrementDailyUsage(discount.couponId)
                        Log.d(TAG, "completeOrder - Incremented usage for coupon: ${discount.code}")
                    }
                }

                Log.d(TAG, "completeOrder - Completed order with full sync: ${currentOrder.orderNumber}")

                // Cập nhật UI ngay lập tức - không chờ in bill
                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = null,
                        currentOrderItems = emptyList(),
                        selectedTable = null,
                        selectedCustomer = null,
                        // Clear all discount states to prevent cache
                        itemDiscounts = emptyMap(),
                        billDiscountAmount = 0,
                        billDiscountDescription = null,
                        couponCode = "",
                        appliedDiscounts = emptyList(),
                        couponError = null,
                        // Clear surcharges
                        selectedSurcharges = emptyList(),
                        // Reset temp bill print count
                        tempBillPrintCount = 0,
                        successMessage = "Thanh toán thành công! ${currentOrder.orderNumber}"
                    )
                }

                // Refresh tables to show updated status
                refreshTables()

                // 5. In bill BẤT ĐỒNG BỘ - không block UI
                viewModelScope.launch(Dispatchers.IO) {
                    try {
                        Log.d(TAG, "completeOrder - Attempting to print bill async, branchId: $branchId")
                        // Try to get default printer, fallback to first active printer
                        var printerConfig = billPrinterConfigDao.getDefaultByBranch(branchId)
                        if (printerConfig == null) {
                            // Fallback: get first active printer for this branch
                            val activePrinters = billPrinterConfigDao.getAllByBranchSync(branchId)
                            printerConfig = activePrinters.firstOrNull()
                            Log.d(TAG, "completeOrder - No default printer, using first active: ${printerConfig?.id}")
                        }
                        Log.d(TAG, "completeOrder - printerConfig: ${printerConfig?.id}, isActive: ${printerConfig?.isActive}, ip: ${printerConfig?.printerIp}")

                        if (printerConfig != null && printerConfig.isActive) {
                            // Get template (from printer config or default for branch)
                            var template = if (printerConfig.templateId != null) {
                                billTemplateDao.getById(printerConfig.templateId)
                            } else {
                                billTemplateDao.getDefaultByBranch(branchId)
                            }
                            // Fallback: get first active template for this branch
                            if (template == null || !template.isActive) {
                                val activeTemplates = billTemplateDao.getAllByBranchSync(branchId)
                                template = activeTemplates.firstOrNull()
                                Log.d(TAG, "completeOrder - No default template, using first active: ${template?.id}")
                            }
                            Log.d(TAG, "completeOrder - template: ${template?.id}, isActive: ${template?.isActive}")

                            if (template != null && template.isActive) {
                                // Build bill data from order
                                val billData = buildBillData(
                                    order = completedOrder,
                                    orderItems = orderItemsForPrint,
                                    itemDiscounts = itemDiscountsForPrint,
                                    itemDiscountTypes = itemDiscountTypesForPrint,
                                    billDiscountAmount = billDiscountForPrint,
                                    surchargeAmount = surchargeForPrint,
                                    surcharges = surchargesForPrint,
                                    appliedDiscounts = appliedDiscountsForPrint,
                                    tableName = tableNameForPrint,
                                    staffName = completedOrder.staffName,
                                    customerName = completedOrder.customerName,
                                    paymentMethod = paymentMethod,
                                    receivedAmount = receivedAmount,
                                    changeAmount = changeAmount
                                )

                                // Print bill using Hybrid approach (supports Vietnamese diacritics)
                                val result = HybridBillPrintService.printBill(printerConfig, template, billData)
                                when (result) {
                                    is PrinterResult.Success -> {
                                        Log.d(TAG, "completeOrder - Bill printed successfully")
                                        // Update last print time
                                        billPrinterConfigDao.updateLastPrint(printerConfig.id, now)
                                    }
                                    is PrinterResult.Error -> {
                                        Log.e(TAG, "completeOrder - Bill print failed: ${result.message}")
                                        billPrinterConfigDao.updateLastError(printerConfig.id, result.message)
                                    }
                                }
                            } else {
                                Log.w(TAG, "completeOrder - No active bill template found, templateId: ${printerConfig.templateId}")
                            }
                        } else {
                            Log.w(TAG, "completeOrder - No printer configured or printer not active for branch: $branchId")
                        }
                    } catch (e: Exception) {
                        // Don't fail the payment if printing fails
                        Log.e(TAG, "completeOrder - Bill print error: ${e.message}", e)
                        e.printStackTrace()
                    }
                }

            } catch (e: Exception) {
                Log.e(TAG, "completeOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi thanh toán: ${e.message}") }
            }
        }
    }

    /**
     * Build BillData from order for printing
     * @param itemDiscounts Map of itemId -> discount amount (from UI state)
     * @param itemDiscountTypes Map of itemId -> discount type ("percent" or "fixed")
     * @param billDiscountAmount Giảm giá tổng bill (từ giảm giá thủ công hoặc %)
     * @param surchargeAmount Phụ thu (tổng tiền)
     * @param surcharges Danh sách phụ thu đã chọn (để tính VAT)
     */
    private fun buildBillData(
        order: OrderEntity,
        orderItems: List<OrderItemEntity>,
        itemDiscounts: Map<String, Long> = emptyMap(),
        itemDiscountTypes: Map<String, String> = emptyMap(),
        billDiscountAmount: Long = 0,
        surchargeAmount: Long = 0,
        surcharges: List<SelectedSurcharge> = emptyList(),
        appliedDiscounts: List<AppliedDiscount> = emptyList(),
        tableName: String?,
        staffName: String?,
        customerName: String?,
        paymentMethod: String,
        receivedAmount: Double,
        changeAmount: Double
    ): BillData {
        // Parse order date
        val orderDate = try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(order.createdAt) ?: Date()
        } catch (e: Exception) {
            Date()
        }

        // Convert order items to bill items (exclude combo children - they're already shown in combo parent)
        val filteredItems = orderItems.filter { !it.isComboChild }

        val billItems = filteredItems.map { item ->
            // Parse variants from notes field "Variant1:price1, Variant2:price2 | User note"
            // Format: "NHIỀU:0, Size L:10000 | Ghi chú: Ít đường"
            val parts = item.notes?.split(" | ") ?: emptyList()
            val variantsPart = parts.firstOrNull()?.takeIf { it.isNotEmpty() && !it.startsWith("Ghi chú:") } ?: ""
            val userNote = parts.getOrNull(1)?.removePrefix("Ghi chú: ")
                ?: parts.firstOrNull()?.takeIf { it.startsWith("Ghi chú:") }?.removePrefix("Ghi chú: ")

            // Parse as variants (shown with • prefix on bill)
            val variants = variantsPart.split(",")
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .map { variantStr ->
                    val colonIndex = variantStr.lastIndexOf(":")
                    if (colonIndex > 0) {
                        BillVariant(
                            name = variantStr.substring(0, colonIndex),
                            priceAdjustment = variantStr.substring(colonIndex + 1).toDoubleOrNull() ?: 0.0
                        )
                    } else {
                        BillVariant(name = variantStr, priceAdjustment = 0.0)
                    }
                }

            // Toppings - currently not stored separately, will be empty
            // In future, toppings can be stored in a separate field if needed
            val toppings = emptyList<BillTopping>()

            // Lấy giảm giá món từ UI state (itemDiscounts) hoặc từ OrderItemEntity
            val itemDiscountFromState = itemDiscounts[item.id]?.toDouble() ?: 0.0
            val itemDiscountFromEntity = item.discountAmount
            val finalItemDiscount = if (itemDiscountFromState > 0) itemDiscountFromState else itemDiscountFromEntity

            // Lấy loại giảm giá: "percent" hoặc "fixed"
            val itemDiscountType = itemDiscountTypes[item.id] ?: "fixed"

            // Dùng originalPrice nếu có, nếu không thì tính từ totalPrice (bao gồm topping)
            val itemOriginalPrice = if (item.originalPrice > 0) item.originalPrice else (item.totalPrice / item.quantity)
            val itemOriginalTotal = itemOriginalPrice * item.quantity
            // Chỉ tính discountPercent nếu discountType là "percent"
            val itemDiscountPercent = if (itemDiscountType == "percent" && finalItemDiscount > 0 && itemOriginalTotal > 0) {
                (finalItemDiscount / itemOriginalTotal) * 100
            } else {
                0.0
            }

            // Tính lại totalPrice nếu có giảm giá
            val finalTotalPrice = if (finalItemDiscount > 0) {
                itemOriginalTotal - finalItemDiscount
            } else {
                item.totalPrice
            }

            BillItem(
                code = item.productCode,
                name = item.productName,
                quantity = item.quantity,
                unitPrice = if (finalItemDiscount > 0) (finalTotalPrice / item.quantity) else item.unitPrice,
                originalPrice = itemOriginalPrice,
                discountAmount = finalItemDiscount,
                discountPercent = itemDiscountPercent,
                discountType = itemDiscountType,  // "percent" hoặc "fixed"
                totalPrice = finalTotalPrice,
                note = userNote,
                variants = variants,  // Variants with • prefix (size, ice level, etc.)
                toppings = toppings,  // Toppings with + prefix (add-ons)
                vatRate = item.vatRate // VAT rate của món này
            )
        }

        // Tính tổng giảm giá các MÓN (item-level discounts)
        val totalItemDiscount = billItems.sumOf { it.discountAmount }

        // Tính subtotal thực tế (tổng giá gốc các món TRƯỚC giảm giá)
        val calculatedSubtotal = billItems.sumOf { it.originalPrice * it.quantity }

        // Tính VAT cho TỪNG MÓN rồi cộng lại (mỗi món có VAT rate riêng)
        // Giá đã bao gồm VAT (inclusive): VAT = price - price/(1 + vatRate/100)
        var itemsVatAmount = 0.0
        var itemsPriceBeforeVat = 0.0
        billItems.forEach { item ->
            // Tính VAT cho từng món dựa trên vatRate của món đó
            val itemPriceBeforeVat = item.totalPrice / (1 + item.vatRate / 100)
            val itemVat = item.totalPrice - itemPriceBeforeVat
            itemsPriceBeforeVat += itemPriceBeforeVat
            itemsVatAmount += itemVat
        }

        // Tính VAT cho phụ thu (surcharges)
        var surchargesVatAmount = 0.0
        var surchargesPriceBeforeVat = 0.0
        surcharges.forEach { selected ->
            val surcharge = selected.surcharge
            val totalAmount = surcharge.amount * selected.quantity
            if (surcharge.vatRate > 0) {
                val priceBeforeVat = totalAmount / (1 + surcharge.vatRate / 100)
                surchargesPriceBeforeVat += priceBeforeVat
                surchargesVatAmount += (totalAmount - priceBeforeVat)
            } else {
                surchargesPriceBeforeVat += totalAmount
            }
        }

        // Tổng VAT và giá trước VAT
        val totalVatAmount = itemsVatAmount + surchargesVatAmount
        val totalPriceBeforeVat = itemsPriceBeforeVat + surchargesPriceBeforeVat

        // Tính totalAmount thực tế (sau tất cả giảm giá + phụ thu)
        val calculatedTotalAmount = (calculatedSubtotal + surchargeAmount - totalItemDiscount - billDiscountAmount).coerceAtLeast(0.0)

        // Nếu có giảm giá bill, VAT của món cũng giảm theo tỷ lệ (phụ thu không bị giảm)
        val totalItemsPrice = billItems.sumOf { it.totalPrice }
        val itemsAfterDiscount = (totalItemsPrice - totalItemDiscount - billDiscountAmount).coerceAtLeast(0.0)
        val discountRatio = if (totalItemsPrice > 0) itemsAfterDiscount / totalItemsPrice else 1.0

        // VAT của món giảm theo tỷ lệ, VAT của phụ thu giữ nguyên
        val itemsVatAfterDiscount = itemsVatAmount * discountRatio
        val itemsPriceBeforeVatAfterDiscount = itemsPriceBeforeVat * discountRatio

        // Tổng VAT = VAT món sau giảm + VAT phụ thu (không giảm)
        val vatAmount = itemsVatAfterDiscount + surchargesVatAmount
        val priceBeforeVat = itemsPriceBeforeVatAfterDiscount + surchargesPriceBeforeVat

        // Tính VAT rate trung bình để hiển thị trên bill (chỉ để hiển thị)
        val displayVatRate = if (priceBeforeVat > 0) {
            (vatAmount / priceBeforeVat) * 100
        } else {
            8.0 // Default F&B
        }

        // Map payment method to display text
        val paymentMethodDisplay = when (paymentMethod.lowercase()) {
            "cash" -> "Tiền mặt"
            "card" -> "Thẻ"
            "transfer" -> "Chuyển khoản"
            "momo" -> "MoMo"
            "zalopay" -> "ZaloPay"
            "vnpay" -> "VNPay"
            else -> paymentMethod
        }

        // ============ PHÂN TÁCH 4 LOẠI GIẢM GIÁ TỪ appliedDiscounts ============
        // 1. Giảm giá món (Item Discount) - đã tính ở trên: totalItemDiscount

        // 2. Giảm giá hóa đơn thủ công (Bill Discount) - từ billDiscountAmount
        val manualBillDiscount = billDiscountAmount.toDouble()

        // 3. Coupon - lọc từ appliedDiscounts (target = BILL là coupon áp dụng cho toàn bộ hóa đơn)
        val couponDiscounts = appliedDiscounts.filter {
            it.target == DiscountTarget.BILL
        }
        val firstCoupon = couponDiscounts.firstOrNull()
        val couponDiscountTotal = couponDiscounts.sumOf { it.discountAmount.toDouble() }
        val couponCodeValue = firstCoupon?.code

        // 4. Voucher - hiện tại chưa có trong appliedDiscounts, để dành cho tương lai
        val voucherDiscountTotal = 0.0
        val voucherCodeValue: String? = null

        // Tính bill discount percent (chỉ hiển thị nếu là giảm %)
        val billDiscountPercentValue = firstCoupon?.let {
            if (it.discountType == "percentage") it.discountValue else 0.0
        } ?: if (order.discountType == "percent" && order.discountValue > 0) {
            order.discountValue
        } else {
            0.0
        }

        // Tổng giảm giá tất cả loại
        val totalDiscountAmount = totalItemDiscount + manualBillDiscount + couponDiscountTotal + voucherDiscountTotal

        return BillData(
            orderNumber = order.orderNumber,
            orderDate = orderDate,
            tableName = tableName,
            staffName = staffName,
            customerName = customerName,
            items = billItems,
            subtotal = calculatedSubtotal, // Tạm tính (tổng giá gốc trước giảm giá)
            // 4 loại giảm giá mới
            itemDiscountAmount = totalItemDiscount, // 1. Giảm giá món
            billDiscountAmount = manualBillDiscount, // 2. Giảm giá hóa đơn thủ công
            billDiscountPercent = billDiscountPercentValue, // % nếu có
            couponDiscountAmount = couponDiscountTotal, // 3. Coupon từ appliedDiscounts
            couponCode = couponCodeValue, // Mã coupon đầu tiên
            voucherDiscountAmount = voucherDiscountTotal, // 4. Voucher (chưa implement)
            voucherCode = voucherCodeValue,
            totalDiscountAmount = totalDiscountAmount, // Tổng tất cả giảm giá
            // Legacy fields (để tương thích)
            totalItemDiscount = totalItemDiscount,
            discountAmount = manualBillDiscount + couponDiscountTotal, // Total order-level discount
            discountPercent = billDiscountPercentValue,
            // Phí và thuế
            surchargeAmount = surchargeAmount.toDouble(),
            serviceFee = 0.0,
            serviceFeePercent = 0.0,
            vatRate = displayVatRate, // VAT rate trung bình (tính từ tổng VAT / tổng giá trước VAT)
            vatAmount = vatAmount,
            priceBeforeVat = priceBeforeVat,
            priceAfterVat = calculatedTotalAmount,
            totalAmount = calculatedTotalAmount, // Tổng SAU tất cả giảm giá
            // Thanh toán
            paymentMethod = paymentMethodDisplay,
            receivedAmount = receivedAmount,
            // Tự tính tiền thừa nếu chưa có (receivedAmount - totalAmount)
            changeAmount = if (changeAmount > 0) changeAmount else (receivedAmount - calculatedTotalAmount).coerceAtLeast(0.0),
            // Ghi chú tổng bill
            orderNote = order.notes,
            // Time tracking - sử dụng createdAt làm giờ vào, completedAt làm giờ ra
            checkInTime = try {
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(order.createdAt)
            } catch (e: Exception) { null },
            checkOutTime = order.completedAt?.let {
                try {
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(it)
                } catch (e: Exception) { null }
            }
        )
    }

    /**
     * Huỷ order
     * Đồng bộ: Order -> Order Items -> Table -> Shift Statistics
     */
    fun cancelOrder(reason: String = "") {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return

        viewModelScope.launch {
            try {
                val now = getCurrentTimestamp()

                withContext(Dispatchers.IO) {
                    // 1. Update order status to cancelled
                    val cancelledOrder = currentOrder.copy(
                        status = "cancelled",
                        cancelReason = reason,
                        cancelledAt = now,
                        updatedAt = now
                    )
                    orderRepository.updateOrder(cancelledOrder)

                    // 2. Update all order items status to cancelled
                    orderRepository.updateAllItemsStatus(currentOrder.id, "cancelled", now)

                    // 3. Update table status back to available
                    state.selectedTable?.let { table ->
                        tableRepository.updateTableStatus(table.id, "available", null, now)
                        // Invalidate TableViewModel cache để TableScreen refresh ngay lập tức
                        TableViewModel.invalidateCache()
                    }

                    // 4. Update shift cancelled count
                    currentOrder.shiftId?.let { shiftId ->
                        shiftRepository.incrementCancelledCount(shiftId, now)
                    }
                }

                Log.d(TAG, "cancelOrder - Cancelled order with full sync: ${currentOrder.orderNumber}")

                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = null,
                        currentOrderItems = emptyList(),
                        selectedTable = null,
                        selectedCustomer = null,
                        successMessage = "Đã huỷ đơn hàng ${currentOrder.orderNumber}"
                    )
                }

                // Refresh tables to show updated status
                refreshTables()

            } catch (e: Exception) {
                Log.e(TAG, "cancelOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi huỷ đơn: ${e.message}") }
            }
        }
    }

    // ===== ORDER ITEM MANAGEMENT =====

    /**
     * Show confirmation dialog before removing an order item
     */
    fun showRemoveItemConfirmation(itemId: String) {
        val item = _uiState.value.currentOrderItems.find { it.id == itemId } ?: return
        _uiState.update { it.copy(showRemoveItemDialog = true, itemToRemove = item) }
    }

    /**
     * Hide remove item confirmation dialog
     */
    fun hideRemoveItemConfirmation() {
        _uiState.update { it.copy(showRemoveItemDialog = false, itemToRemove = null) }
    }

    /**
     * Cancel an order item (mark as cancelled instead of deleting for reporting)
     * Món sẽ được đánh dấu huỷ thay vì xoá để còn lưu báo cáo
     */
    fun confirmCancelOrderItem(reason: String) {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return
        val itemToCancel = state.itemToRemove ?: return

        hideRemoveItemConfirmation()

        viewModelScope.launch {
            try {
                val now = java.time.Instant.now().toString()

                withContext(Dispatchers.IO) {
                    // Update the item status to cancelled (instead of deleting)
                    val cancelledItem = itemToCancel.copy(
                        status = "cancelled",
                        cancelledAt = now,
                        cancelReason = reason.ifBlank { null },
                        updatedAt = now
                    )
                    orderRepository.updateOrderItem(cancelledItem)

                    // Update items list with cancelled item
                    val updatedItems = state.currentOrderItems.map {
                        if (it.id == itemToCancel.id) cancelledItem else it
                    }

                    // Calculate new order totals (exclude cancelled items)
                    val activeItems = updatedItems.filter { it.status != "cancelled" }
                    val newSubtotal = activeItems.sumOf { it.totalPrice }
                    val newTotal = newSubtotal // TODO: Apply discount/tax if needed

                    // Update order totals
                    val updatedOrder = currentOrder.copy(
                        subtotal = newSubtotal,
                        totalAmount = newTotal,
                        updatedAt = now
                    )
                    orderRepository.updateOrder(updatedOrder)

                    _uiState.update { s ->
                        s.copy(
                            currentOrder = updatedOrder,
                            currentOrderItems = updatedItems,
                            successMessage = "Đã huỷ ${itemToCancel.productName}"
                        )
                    }
                }

                Log.d(TAG, "confirmCancelOrderItem - Cancelled item: ${itemToCancel.productName}, reason: $reason")
            } catch (e: Exception) {
                Log.e(TAG, "confirmCancelOrderItem - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi huỷ món: ${e.message}") }
            }
        }
    }

    /**
     * Remove a specific topping from an order item
     * Toppings are stored in notes field as "Topping1:price1, Topping2:price2 | User note"
     */
    fun removeOrderItemTopping(itemId: String, toppingName: String) {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return
        val item = state.currentOrderItems.find { it.id == itemId } ?: return

        viewModelScope.launch {
            try {
                val now = java.time.Instant.now().toString()

                withContext(Dispatchers.IO) {
                    // Parse notes to find and remove the topping
                    val notes = item.notes ?: return@withContext
                    val parts = notes.split(" | ")
                    val variantsPart = parts.firstOrNull() ?: ""
                    val userNote = parts.getOrNull(1)

                    // Parse variants and find the one to remove
                    val variants = variantsPart.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    var toppingPrice = 0.0

                    val updatedVariants = variants.filter { variant ->
                        val colonIndex = variant.lastIndexOf(":")
                        val name = if (colonIndex > 0) variant.substring(0, colonIndex) else variant
                        if (name == toppingName) {
                            // Found the topping to remove, get its price
                            toppingPrice = if (colonIndex > 0) variant.substring(colonIndex + 1).toDoubleOrNull() ?: 0.0 else 0.0
                            false // Remove this topping
                        } else {
                            true // Keep this topping
                        }
                    }

                    // Rebuild notes
                    val newNotes = if (updatedVariants.isEmpty() && userNote == null) {
                        null
                    } else if (updatedVariants.isEmpty() && userNote != null) {
                        userNote
                    } else if (userNote != null) {
                        "${updatedVariants.joinToString(", ")} | $userNote"
                    } else {
                        updatedVariants.joinToString(", ")
                    }

                    // Calculate new item price (subtract topping price * quantity)
                    val newTotalPrice = item.totalPrice - (toppingPrice * item.quantity)

                    // Update item
                    val updatedItem = item.copy(
                        notes = newNotes,
                        totalPrice = newTotalPrice,
                        updatedAt = now
                    )
                    orderRepository.updateOrderItem(updatedItem)

                    // Update order totals
                    val updatedItems = state.currentOrderItems.map {
                        if (it.id == itemId) updatedItem else it
                    }
                    val newSubtotal = updatedItems.sumOf { it.totalPrice }
                    val newTotal = newSubtotal

                    val updatedOrder = currentOrder.copy(
                        subtotal = newSubtotal,
                        totalAmount = newTotal,
                        updatedAt = now
                    )
                    orderRepository.updateOrder(updatedOrder)

                    _uiState.update { s ->
                        s.copy(
                            currentOrder = updatedOrder,
                            currentOrderItems = updatedItems,
                            successMessage = "Đã xóa $toppingName"
                        )
                    }
                }

                Log.d(TAG, "removeOrderItemTopping - Removed topping: $toppingName from item: ${item.productName}")
            } catch (e: Exception) {
                Log.e(TAG, "removeOrderItemTopping - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi xóa topping: ${e.message}") }
            }
        }
    }

    // ===== PAYMENT DIALOG =====

    fun setPendingPaymentDialog(pending: Boolean) {
        _uiState.update { state ->
            state.copy(pendingPaymentDialog = pending)
        }
    }

    fun showPaymentDialog() {
        if (_uiState.value.currentOrder != null) {
            // Load auto coupons khi mở dialog thanh toán
            loadAutoCoupons()
            _uiState.update { state ->
                state.copy(
                    showPaymentDialog = true,
                    pendingPaymentDialog = false // Clear pending flag when dialog is shown
                )
            }
        }
    }

    fun hidePaymentDialog() {
        _uiState.update { state ->
            state.copy(
                showPaymentDialog = false,
                couponCode = "",
                couponError = null,
                isApplyingCoupon = false
            )
        }
    }

    fun processPayment(payments: List<Payment>) {
        hidePaymentDialog()
        // Use first payment method
        val payment = payments.firstOrNull()
        val method = payment?.method?.name?.lowercase() ?: "cash"
        // Convert Long to Double and use Payment's receivedAmount/changeAmount if available
        val receivedAmount = payment?.receivedAmount?.toDouble()
            ?: payment?.amount?.toDouble()
            ?: 0.0
        val changeAmount = payment?.changeAmount?.toDouble() ?: 0.0
        completeOrder(method, receivedAmount, changeAmount)
    }

    // ===== MESSAGES =====

    fun clearSuccessMessage() {
        _uiState.update { state ->
            state.copy(successMessage = null)
        }
    }

    fun clearErrorMessage() {
        _uiState.update { state ->
            state.copy(errorMessage = null)
        }
    }

    private fun generateOrderNumber(): String {
        val timestamp = System.currentTimeMillis()
        val random = (1000..9999).random()
        return "HD${timestamp % 1000000}$random"
    }

    /**
     * Tính giá thời vụ dựa trên giá gốc và cấu hình giảm giá/tăng giá
     * @param basePrice Giá gốc của sản phẩm
     * @param seasonalPrice Cấu hình giá thời vụ
     * @return Giá sau khi áp dụng điều chỉnh thời vụ
     */
    private fun calculateSeasonalPrice(basePrice: Long, seasonalPrice: SeasonalPriceEntity): Long {
        return when (seasonalPrice.adjustmentType.lowercase()) {
            "percentage" -> {
                // Điều chỉnh theo phần trăm (VD: +10% -> adjustmentValue = 10)
                val adjustment = basePrice * seasonalPrice.adjustmentValue / 100
                (basePrice + adjustment).toLong()
            }
            "fixed" -> {
                // Điều chỉnh số tiền cố định (VD: +5000đ -> adjustmentValue = 5000)
                (basePrice + seasonalPrice.adjustmentValue).toLong()
            }
            else -> basePrice
        }
    }

    // ============ CUSTOM ITEM FUNCTIONS ============

    /**
     * Hiển thị dialog thêm món ngoài menu
     */
    fun showCustomItemDialog() {
        _uiState.update { it.copy(showCustomItemDialog = true) }
    }

    /**
     * Ẩn dialog thêm món ngoài menu
     */
    fun hideCustomItemDialog() {
        _uiState.update { it.copy(showCustomItemDialog = false) }
    }

    /**
     * Thêm món ngoài menu vào giỏ hàng
     * @param name Tên món
     * @param price Giá tiền
     * @param quantity Số lượng
     * @param note Ghi chú (tùy chọn)
     */
    fun addCustomItem(name: String, price: Double, quantity: Int, note: String?) {
        viewModelScope.launch {
            try {
                // Tạo product giả cho món ngoài menu
                // ID bắt đầu bằng "custom_" để phân biệt với món trong menu
                val customProductId = "custom_${UUID.randomUUID()}"
                val customProduct = Product(
                    id = customProductId,
                    code = "CUSTOM",
                    name = name,
                    price = price.toLong(),
                    categoryId = "custom",
                    description = "Món ngoài menu",
                    imageUrl = null,
                    isActive = true,
                    vatRate = 8.0, // Default VAT rate
                    hasVariants = false,
                    variants = emptyList()
                )

                val customItem = CartItem(
                    product = customProduct,
                    quantity = quantity,
                    selectedVariants = emptyList(),
                    note = note,
                    comboItems = emptyList()
                )

                _uiState.update { state ->
                    state.copy(
                        cartItems = state.cartItems + customItem,
                        showCustomItemDialog = false,
                        successMessage = "Đã thêm: $name"
                    )
                }

                Log.d(TAG, "addCustomItem - Added custom item: $name, price: $price, qty: $quantity")
            } catch (e: Exception) {
                Log.e(TAG, "addCustomItem - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(
                        showCustomItemDialog = false,
                        errorMessage = "Lỗi thêm món: ${e.message}"
                    )
                }
            }
        }
    }

    // ============ SURCHARGE FUNCTIONS ============

    /**
     * Hiển thị dialog chọn phụ thu
     */
    fun showSurchargeDialog() {
        _uiState.update { it.copy(showSurchargeDialog = true) }
    }

    /**
     * Ẩn dialog chọn phụ thu
     */
    fun hideSurchargeDialog() {
        _uiState.update { it.copy(showSurchargeDialog = false) }
    }

    /**
     * Áp dụng các phụ thu đã chọn
     * @param surcharges Danh sách phụ thu với số lượng
     */
    fun applySurcharges(surcharges: List<SelectedSurcharge>) {
        _uiState.update { state ->
            val totalAmount = surcharges.sumOf { it.totalAmount }
            val message = if (surcharges.isEmpty()) {
                "Đã xoá phụ thu"
            } else {
                "Đã áp dụng ${surcharges.size} khoản phụ thu"
            }

            state.copy(
                selectedSurcharges = surcharges,
                showSurchargeDialog = false,
                successMessage = message
            )
        }

        Log.d(TAG, "applySurcharges - Applied ${surcharges.size} surcharges")
    }

    /**
     * Xoá tất cả phụ thu
     */
    fun clearSurcharges() {
        _uiState.update {
            it.copy(
                selectedSurcharges = emptyList(),
                successMessage = "Đã xoá phụ thu"
            )
        }
    }
}
