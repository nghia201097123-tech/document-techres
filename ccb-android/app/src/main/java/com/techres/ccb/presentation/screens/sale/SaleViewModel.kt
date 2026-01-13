package com.techres.ccb.presentation.screens.sale

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.ComboItemDao
import com.techres.ccb.data.local.dao.CouponDao
import com.techres.ccb.data.local.dao.ProductToppingDao
import com.techres.ccb.data.local.dao.ProductNoteDao
import com.techres.ccb.data.local.entity.ComboItemEntity
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.local.entity.CouponEntity
import com.techres.ccb.data.local.entity.ProductEntity
import com.techres.ccb.data.local.entity.ProductToppingEntity
import com.techres.ccb.data.local.entity.ProductNoteEntity
import com.techres.ccb.presentation.screens.sale.dialogs.AppliedDiscount
import com.techres.ccb.util.DiscountCalculator
import com.techres.ccb.util.OrderItemForDiscount
import com.techres.ccb.data.local.dao.BillPrinterConfigDao
import com.techres.ccb.data.local.dao.BillTemplateDao
import com.techres.ccb.data.printer.BillData
import com.techres.ccb.data.printer.BillItem
import com.techres.ccb.data.printer.BillTopping
import com.techres.ccb.data.printer.HybridBillPrintService
import com.techres.ccb.data.printer.PrinterResult
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.CategoryRepository
import com.techres.ccb.data.repository.OrderRepository
import com.techres.ccb.data.repository.ProductRepository
import com.techres.ccb.data.repository.ShiftRepository
import com.techres.ccb.data.repository.TableRepository
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

data class SaleUiState(
    // Categories & Products
    val categories: List<Category> = emptyList(),
    val products: List<Product> = emptyList(),
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
    val vatAmount: Long = 0,                         // Tiền VAT

    // Tax
    val taxRate: Double = 8.0,  // VAT 8% cho F&B (Nghị định 174/2025)
    val pricesIncludeVat: Boolean = true,  // Giá sản phẩm đã bao gồm VAT

    // UI State - Start with loading=true to show indicator on first render
    val isLoading: Boolean = true,
    val showVariantDialog: Boolean = false,
    val selectedProductForVariant: Product? = null,
    val showPaymentDialog: Boolean = false,
    val showTableDialog: Boolean = false,
    val showCustomerDialog: Boolean = false,
    val showNoteDialog: Boolean = false,
    val selectedCartItemForNote: String? = null,
    val selectedCartItemForTopping: String? = null, // For adding toppings to existing cart item

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

    /**
     * Tổng tiền sau giảm giá
     * Vì giá sản phẩm đã bao gồm VAT nên KHÔNG cộng thêm VAT
     */
    val totalAmount: Long
        get() = (subtotal - discountAmount).coerceAtLeast(0L)

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
    private val productToppingDao: ProductToppingDao,
    private val comboItemDao: ComboItemDao,
    private val productNoteDao: ProductNoteDao,
    private val couponDao: CouponDao,
    private val billTemplateDao: BillTemplateDao,
    private val billPrinterConfigDao: BillPrinterConfigDao
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

                    // Await all results
                    val categoryEntities = categoriesDeferred.await()
                    val allProducts = allProductsDeferred.await()
                    val areas = areasDeferred.await()
                    val tableEntities = tablesDeferred.await()
                    val notes = notesDeferred.await()

                    Log.d(TAG, "loadInitialData - Parallel queries completed in ${System.currentTimeMillis() - startTime}ms")

                    // Process categories
                    toppingCategoryIds = categoryEntities
                        .filter { it.name.lowercase().contains("topping") }
                        .map { it.id }
                        .toSet()

                    val categoryList = mutableListOf(
                        Category(id = "all", name = "Tất cả", icon = "🍽️")
                    )
                    categoryList.addAll(categoryEntities
                        .filter { !it.name.lowercase().contains("topping") }
                        .map { entity ->
                            Category(
                                id = entity.id,
                                name = entity.name,
                                icon = entity.imageUrl
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
                        Product(
                            id = entity.id,
                            code = entity.code,
                            name = entity.name,
                            searchName = entity.searchName,
                            abbreviation = entity.abbreviation,
                            categoryId = entity.categoryId ?: "",
                            price = entity.price.toLong(),
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
                        ProductVariantOption(
                            id = topping.toppingId,
                            name = toppingProduct.name,
                            price = if (topping.extraPrice > 0) topping.extraPrice.toLong() else toppingProduct.price.toLong(),
                            isDefault = topping.isDefault
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

    fun selectCategory(categoryId: String) {
        // OPTIMIZATION: Use pre-computed cache - NO database query, INSTANT switching
        // Only show all products for "all" category, otherwise return empty list if category has no products
        val products = if (categoryId == "all") {
            allProductsCache
        } else {
            productsByCategoryCache[categoryId] ?: emptyList()
        }

        _uiState.update { state ->
            state.copy(
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

            Product(
                id = entity.id,
                code = entity.code,
                name = entity.name,
                searchName = entity.searchName,
                abbreviation = entity.abbreviation,
                categoryId = entity.categoryId ?: "",
                price = entity.price.toLong(),
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
        if (product.hasVariants && product.variants.isNotEmpty()) {
            // Show variant dialog
            _uiState.update { state ->
                state.copy(
                    showVariantDialog = true,
                    selectedProductForVariant = product
                )
            }
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
        _uiState.update { state ->
            state.copy(
                orderType = orderType,
                selectedTable = if (orderType != OrderType.DINE_IN) null else state.selectedTable
            )
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

                _uiState.update { state ->
                    state.copy(
                        currentOrder = order,
                        currentOrderItems = orderItems,
                        selectedTable = selectedTable,
                        orderType = orderType,
                        cartItems = emptyList() // Clear cart when loading existing order
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
        viewModelScope.launch {
            // Find the table in the loaded tables list
            val table = _uiState.value.tables.find { it.id == tableId }
            if (table != null) {
                selectTable(table)
                // Also set order type to DINE_IN
                _uiState.update { it.copy(orderType = OrderType.DINE_IN) }
                Log.d(TAG, "selectTableById - Selected table: ${table.name}")
            } else {
                // Tables might not be loaded yet, try to load them first
                Log.w(TAG, "selectTableById - Table not found in current list, trying to reload")
                refreshTables()
                // Delay to allow tables to load
                kotlinx.coroutines.delay(500)
                val tableAfterLoad = _uiState.value.tables.find { it.id == tableId }
                if (tableAfterLoad != null) {
                    selectTable(tableAfterLoad)
                    _uiState.update { it.copy(orderType = OrderType.DINE_IN) }
                    Log.d(TAG, "selectTableById - Selected table after reload: ${tableAfterLoad.name}")
                } else {
                    Log.e(TAG, "selectTableById - Table not found: $tableId")
                    _uiState.update { it.copy(errorMessage = "Không tìm thấy bàn") }
                }
            }
        }
    }

    fun selectTable(table: Table) {
        viewModelScope.launch {
            // Load active order for this table
            // First try by table_id, then fallback to table_name (in case table_id was lost during sync)
            var activeOrder = withContext(Dispatchers.IO) {
                orderRepository.getActiveOrderByTable(table.id)
            }

            // Fallback: try to find by table name if not found by table_id
            // This handles orders where table_id was set to NULL due to foreign key constraint during sync
            if (activeOrder == null) {
                activeOrder = withContext(Dispatchers.IO) {
                    orderRepository.getActiveOrderByTableName(table.name)
                }
                if (activeOrder != null) {
                    Log.d(TAG, "selectTable - Found order by table name: ${activeOrder.orderNumber}")
                    // Restore the table_id to the order
                    withContext(Dispatchers.IO) {
                        val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                            .format(java.util.Date())
                        orderRepository.updateTableId(activeOrder.id, table.id, table.name, now)
                    }
                    // Update local reference with restored table_id
                    activeOrder = activeOrder.copy(tableId = table.id)
                }
            }

            val orderItems = if (activeOrder != null) {
                withContext(Dispatchers.IO) {
                    orderRepository.getOrderItemsSync(activeOrder.id)
                }
            } else {
                emptyList()
            }

            Log.d(TAG, "selectTable - table: ${table.name}, activeOrder: ${activeOrder?.orderNumber}, items: ${orderItems.size}")

            _uiState.update { state ->
                state.copy(
                    selectedTable = table,
                    showTableDialog = false,
                    currentOrder = activeOrder,
                    currentOrderItems = orderItems,
                    // Clear cart when switching tables with active order
                    cartItems = if (activeOrder != null) emptyList() else state.cartItems
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
     */
    fun applyDiscount(amount: Long, reason: String?) {
        val orderSubtotal = getOrderSubtotal()
        _uiState.update { state ->
            // Số tiền tối đa có thể giảm = orderSubtotal - itemDiscountTotal - couponDiscount
            val maxBillDiscount = (orderSubtotal - state.itemDiscountTotal - state.totalCouponDiscount).coerceAtLeast(0L)
            val finalAmount = amount.coerceAtMost(maxBillDiscount)
            Log.d(TAG, "applyDiscount - requested: $amount, maxAllowed: $maxBillDiscount, applied: $finalAmount")
            state.copy(
                billDiscountAmount = finalAmount,
                billDiscountDescription = reason
            )
        }
    }

    /**
     * Áp dụng giảm giá hóa đơn theo phần trăm
     * Giới hạn giảm giá để tổng không bị âm
     */
    fun applyPercentDiscount(percent: Int, reason: String?) {
        val orderSubtotal = getOrderSubtotal()
        val discountAmount = (orderSubtotal * percent / 100)
        _uiState.update { state ->
            // Số tiền tối đa có thể giảm = orderSubtotal - itemDiscountTotal - couponDiscount
            val maxBillDiscount = (orderSubtotal - state.itemDiscountTotal - state.totalCouponDiscount).coerceAtLeast(0L)
            val finalAmount = discountAmount.coerceAtMost(maxBillDiscount)
            Log.d(TAG, "applyPercentDiscount - percent: $percent%, calculated: $discountAmount, maxAllowed: $maxBillDiscount, applied: $finalAmount")
            state.copy(
                billDiscountAmount = finalAmount,
                billDiscountDescription = reason
            )
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
                itemDiscounts = emptyMap()
            )
        }
    }

    /**
     * Áp dụng giảm giá cho một món cụ thể
     * Giới hạn giảm giá không vượt quá giá của món và tổng đơn hàng
     */
    fun applyItemDiscount(itemId: String, amount: Long) {
        val orderSubtotal = getOrderSubtotal()
        _uiState.update { state ->
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
            Log.d(TAG, "applyItemDiscount - itemId: $itemId, requested: $amount, itemPrice: $itemPrice, maxAllowed: $maxItemDiscount, applied: $finalAmount")

            val newItemDiscounts = state.itemDiscounts.toMutableMap()
            if (finalAmount > 0) {
                newItemDiscounts[itemId] = finalAmount
            } else {
                newItemDiscounts.remove(itemId)
            }
            state.copy(itemDiscounts = newItemDiscounts)
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
     */
    fun applyCoupon() {
        val state = _uiState.value
        val code = state.couponCode.trim()

        if (code.isEmpty()) {
            _uiState.update { it.copy(couponError = "Vui lòng nhập mã giảm giá") }
            return
        }

        // Kiểm tra coupon đã được áp dụng chưa
        if (state.appliedDiscounts.any { it.code.equals(code, ignoreCase = true) }) {
            _uiState.update { it.copy(couponError = "Mã giảm giá này đã được áp dụng") }
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

                // Kiểm tra combinable
                val hasNonCombinableCoupon = state.appliedDiscounts.isNotEmpty() &&
                    state.availableCoupons.any { c ->
                        state.appliedDiscounts.any { d -> d.couponId == c.id } && !c.isCombinable
                    }

                if (hasNonCombinableCoupon && !coupon.isCombinable) {
                    _uiState.update {
                        it.copy(
                            isApplyingCoupon = false,
                            couponError = "Không thể kết hợp với mã giảm giá đã áp dụng"
                        )
                    }
                    return@launch
                }

                // Tính số tiền giảm
                val discountAmount = calculateCouponDiscountAmount(coupon, orderAmount)

                // Thêm vào danh sách đã áp dụng
                val appliedDiscount = AppliedDiscount(
                    couponId = coupon.id,
                    code = coupon.code,
                    name = coupon.name,
                    discountType = coupon.couponType,
                    discountValue = coupon.discountValue,
                    discountAmount = discountAmount
                )

                val newAppliedDiscounts = state.appliedDiscounts + appliedDiscount
                val totalDiscount = newAppliedDiscounts.sumOf { it.discountAmount }

                // Tính VAT (trên giá sau giảm)
                val subtotal = state.currentOrder?.subtotal?.toLong() ?: state.subtotal
                val priceAfterDiscount = (subtotal - totalDiscount).coerceAtLeast(0L)
                val vatAmount = (priceAfterDiscount * state.taxRate / 100.0).toLong()

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

                Log.d(TAG, "applyCoupon - Applied coupon: ${coupon.code}, discount: $discountAmount")
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

            // Tính lại VAT
            val subtotal = state.currentOrder?.subtotal?.toLong() ?: state.subtotal
            val priceAfterDiscount = (subtotal - totalDiscount).coerceAtLeast(0L)
            val vatAmount = (priceAfterDiscount * state.taxRate / 100.0).toLong()

            state.copy(
                appliedDiscounts = newAppliedDiscounts,
                vatAmount = vatAmount
            )
        }
        Log.d(TAG, "removeCoupon - Removed coupon: $couponId")
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
     */
    fun loadAutoCoupons() {
        viewModelScope.launch {
            try {
                val currentDate = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                    .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                    .format(java.util.Date())

                val state = _uiState.value
                val orderAmount = state.currentOrder?.subtotal ?: state.subtotal.toDouble()

                val autoCoupons = withContext(Dispatchers.IO) {
                    couponDao.getAutoCoupons(branchId, currentDate)
                }

                // Áp dụng auto coupons
                val appliedDiscounts = mutableListOf<AppliedDiscount>()
                var totalDiscount = 0L

                for (coupon in autoCoupons.filter { it.minOrderAmount <= orderAmount }) {
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

                // Tính VAT
                val subtotal = state.currentOrder?.subtotal?.toLong() ?: state.subtotal
                val priceAfterDiscount = (subtotal - totalDiscount).coerceAtLeast(0L)
                val vatAmount = (priceAfterDiscount * state.taxRate / 100.0).toLong()

                _uiState.update { s ->
                    s.copy(
                        appliedDiscounts = appliedDiscounts,
                        vatAmount = vatAmount,
                        availableCoupons = autoCoupons
                    )
                }

                Log.d(TAG, "loadAutoCoupons - Applied ${appliedDiscounts.size} auto coupons")
            } catch (e: Exception) {
                Log.e(TAG, "loadAutoCoupons - Error: ${e.message}", e)
            }
        }
    }

    private fun formatCurrencyVN(amount: Long): String {
        return String.format(java.util.Locale.US, "%,d", amount) + "đ"
    }

    // ===== VARIANT DIALOG =====

    fun showVariantDialog(product: Product) {
        _uiState.update { state ->
            state.copy(
                showVariantDialog = true,
                selectedProductForVariant = product
            )
        }
    }

    fun hideVariantDialog() {
        _uiState.update { state ->
            state.copy(
                showVariantDialog = false,
                selectedProductForVariant = null,
                selectedCartItemForTopping = null
            )
        }
    }

    /**
     * Show dialog to add more toppings to an existing cart item
     */
    fun showAddToppingDialog(cartItemId: String) {
        val cartItem = _uiState.value.cartItems.find { it.id == cartItemId } ?: return
        _uiState.update { state ->
            state.copy(
                showVariantDialog = true,
                selectedProductForVariant = cartItem.product,
                selectedCartItemForTopping = cartItemId
            )
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
        _uiState.update { state ->
            state.copy(
                showNoteDialog = true,
                selectedCartItemForNote = cartItemId
            )
        }
    }

    fun hideNoteDialog() {
        _uiState.update { state ->
            state.copy(
                showNoteDialog = false,
                selectedCartItemForNote = null
            )
        }
    }

    fun applyNoteToCartItem(cartItemId: String, note: String?) {
        updateCartItemNote(cartItemId, note?.takeIf { it.isNotBlank() })
        hideNoteDialog()
    }

    // ===== ORDER MANAGEMENT =====

    private fun getCurrentTimestamp(): String {
        return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
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

        // Build variants string with prices: "Kiwi:10000, Size S:10000"
        val variantsWithPrices = cartItem.selectedVariants.joinToString(", ") { variant ->
            if (variant.price > 0) {
                "${variant.name}:${variant.price}"
            } else {
                variant.name
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
                    totalPrice = cartItem.totalPrice.toDouble(),
                    notes = variantsAndNote,
                    status = "pending",
                    createdAt = now,
                    updatedAt = now
                )
            )
        } else {
            // This is a combo - create combo parent item
            val parentItemId = UUID.randomUUID().toString()
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
                    totalPrice = cartItem.totalPrice.toDouble(),
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
                    orderType = state.orderType.name.lowercase(),
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

                Log.d(TAG, "placeOrder - Created order: $orderNumber with ${orderItems.size} items")

                // Update UI state
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

                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = currentOrder.copy(subtotal = newSubtotal, totalAmount = newTotal, updatedAt = now),
                        currentOrderItems = allItems,
                        successMessage = "Đã thêm ${newItems.size} món"
                    )
                }

            } catch (e: Exception) {
                Log.e(TAG, "addItemsToOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi thêm món: ${e.message}") }
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

                // Calculate final amounts with applied discounts
                val orderSubtotal = currentOrder.subtotal
                val finalDiscountAmount = state.discountAmount.toDouble()  // Includes bill + item + coupon discounts
                val finalTotalAmount = (orderSubtotal - finalDiscountAmount).coerceAtLeast(0.0)

                Log.d(TAG, "completeOrder - subtotal: $orderSubtotal, discount: $finalDiscountAmount, total: $finalTotalAmount")

                withContext(Dispatchers.IO) {
                    // 1. Update order status to completed with correct discount and total
                    val completedOrder = currentOrder.copy(
                        status = "completed",
                        paymentStatus = "paid",
                        paymentMethod = paymentMethod,
                        discountAmount = finalDiscountAmount,
                        discountReason = state.billDiscountDescription,
                        totalAmount = finalTotalAmount,
                        paidAmount = finalTotalAmount,
                        completedAt = now,
                        updatedAt = now
                    )
                    orderRepository.updateOrder(completedOrder)

                    // 2. Update all order items status to completed
                    orderRepository.updateAllItemsStatus(currentOrder.id, "completed", now)

                    // 3. Update table status back to available
                    state.selectedTable?.let { table ->
                        tableRepository.updateTableStatus(table.id, "available", null, now)
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

                    // 5. Print bill (always print on payment completion)
                    try {
                        Log.d(TAG, "completeOrder - Attempting to print bill, branchId: $branchId")
                        val printerConfig = billPrinterConfigDao.getDefaultByBranch(branchId)
                        Log.d(TAG, "completeOrder - printerConfig: ${printerConfig?.id}, isActive: ${printerConfig?.isActive}, ip: ${printerConfig?.printerIp}")

                        if (printerConfig != null && printerConfig.isActive) {
                            // Get template (from printer config or default for branch)
                            val template = if (printerConfig.templateId != null) {
                                billTemplateDao.getById(printerConfig.templateId)
                            } else {
                                billTemplateDao.getDefaultByBranch(branchId)
                            }
                            Log.d(TAG, "completeOrder - template: ${template?.id}, isActive: ${template?.isActive}")

                            if (template != null && template.isActive) {
                                // Build bill data from order
                                val billData = buildBillData(
                                    order = completedOrder,
                                    orderItems = state.currentOrderItems,
                                    tableName = state.selectedTable?.name,
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

                Log.d(TAG, "completeOrder - Completed order with full sync: ${currentOrder.orderNumber}")

                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = null,
                        currentOrderItems = emptyList(),
                        selectedTable = null,
                        selectedCustomer = null,
                        successMessage = "Thanh toán thành công! ${currentOrder.orderNumber}"
                    )
                }

                // Refresh tables to show updated status
                refreshTables()

            } catch (e: Exception) {
                Log.e(TAG, "completeOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi thanh toán: ${e.message}") }
            }
        }
    }

    /**
     * Build BillData from order for printing
     */
    private fun buildBillData(
        order: OrderEntity,
        orderItems: List<OrderItemEntity>,
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
        val billItems = orderItems.filter { !it.isComboChild }.map { item ->
            // Parse toppings from notes field "Topping1:price1, Topping2:price2 | User note"
            val parts = item.notes?.split(" | ") ?: emptyList()
            val variantsPart = parts.firstOrNull()?.takeIf { it.isNotEmpty() && !it.startsWith("Ghi chú:") } ?: ""
            val userNote = parts.getOrNull(1)?.removePrefix("Ghi chú: ")
                ?: parts.firstOrNull()?.takeIf { it.startsWith("Ghi chú:") }?.removePrefix("Ghi chú: ")

            val toppings = variantsPart.split(",")
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .map { variant ->
                    val colonIndex = variant.lastIndexOf(":")
                    if (colonIndex > 0) {
                        BillTopping(
                            name = variant.substring(0, colonIndex),
                            price = variant.substring(colonIndex + 1).toDoubleOrNull() ?: 0.0
                        )
                    } else {
                        BillTopping(name = variant, price = 0.0)
                    }
                }

            BillItem(
                code = item.productCode,
                name = item.productName,
                quantity = item.quantity,
                unitPrice = item.unitPrice,
                totalPrice = item.totalPrice,
                note = userNote,
                toppings = toppings
            )
        }

        // Calculate VAT (assuming 10% VAT rate)
        val vatRate = 10.0
        val priceBeforeVat = order.totalAmount / (1 + vatRate / 100)
        val vatAmount = order.totalAmount - priceBeforeVat

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

        return BillData(
            orderNumber = order.orderNumber,
            orderDate = orderDate,
            tableName = tableName,
            staffName = staffName,
            customerName = customerName,
            items = billItems,
            subtotal = order.subtotal,
            discountAmount = order.discountAmount,
            discountPercent = if (order.subtotal > 0) (order.discountAmount / order.subtotal * 100) else 0.0,
            serviceFee = 0.0,
            vatRate = vatRate,
            vatAmount = vatAmount,
            priceBeforeVat = priceBeforeVat,
            priceAfterVat = order.totalAmount,
            totalAmount = order.totalAmount,
            paymentMethod = paymentMethodDisplay,
            receivedAmount = receivedAmount,
            changeAmount = changeAmount
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
     * Remove an order item from the current order
     */
    fun removeOrderItem(itemId: String) {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return
        val itemToRemove = state.currentOrderItems.find { it.id == itemId } ?: return

        viewModelScope.launch {
            try {
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                    .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                    .format(Date())

                withContext(Dispatchers.IO) {
                    // Delete the item from database
                    orderRepository.deleteOrderItem(itemToRemove)

                    // Calculate new order totals
                    val remainingItems = state.currentOrderItems.filter { it.id != itemId }
                    val newSubtotal = remainingItems.sumOf { it.totalPrice }
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
                            currentOrderItems = remainingItems,
                            successMessage = "Đã xóa ${itemToRemove.productName}"
                        )
                    }
                }

                Log.d(TAG, "removeOrderItem - Removed item: ${itemToRemove.productName}")
            } catch (e: Exception) {
                Log.e(TAG, "removeOrderItem - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi xóa món: ${e.message}") }
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
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                    .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                    .format(Date())

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

    fun showPaymentDialog() {
        if (_uiState.value.currentOrder != null) {
            // Load auto coupons khi mở dialog thanh toán
            loadAutoCoupons()
            _uiState.update { state ->
                state.copy(showPaymentDialog = true)
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
}
