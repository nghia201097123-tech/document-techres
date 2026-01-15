package com.techres.ccb.presentation.screens.debug

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.CategoryEntity
import com.techres.ccb.data.local.entity.ProductEntity
import com.techres.ccb.data.local.entity.ProductToppingEntity
import com.techres.ccb.data.local.entity.AreaEntity
import com.techres.ccb.data.local.entity.TableEntity
import com.techres.ccb.data.local.entity.StaffEntity
import com.techres.ccb.data.local.entity.BrandEntity
import com.techres.ccb.data.local.entity.BranchEntity
import com.techres.ccb.data.local.entity.SeasonalPriceEntity
import com.techres.ccb.data.local.entity.CouponEntity
import com.techres.ccb.data.local.entity.ShiftEntity
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.local.entity.KitchenEntity
import com.techres.ccb.data.local.entity.BillTemplateEntity
import com.techres.ccb.data.local.entity.BillPrinterConfigEntity
import com.techres.ccb.data.local.entity.ComboItemEntity
import com.techres.ccb.data.local.dao.ProductToppingDao
import com.techres.ccb.data.local.dao.SeasonalPriceDao
import com.techres.ccb.data.local.dao.CouponDao
import com.techres.ccb.data.local.dao.OrderDao
import com.techres.ccb.data.local.dao.OrderItemDao
import com.techres.ccb.data.local.dao.ProductNoteDao
import com.techres.ccb.data.local.dao.KitchenDao
import com.techres.ccb.data.local.dao.BillTemplateDao
import com.techres.ccb.data.local.dao.BillPrinterConfigDao
import com.techres.ccb.data.local.dao.ComboItemDao
import com.techres.ccb.data.local.entity.ProductNoteEntity
import com.techres.ccb.data.repository.*
import android.util.Log
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class DebugTab(val title: String) {
    BRANDS("Thương hiệu"),
    BRANCHES("Chi nhánh"),
    CATEGORIES("Danh mục"),
    PRODUCTS("Sản phẩm"),
    PRODUCT_TOPPINGS("Topping"),
    PRODUCT_NOTES("Ghi chú"),
    COMBO_ITEMS("Combo"),
    AREAS("Khu vực"),
    TABLES("Bàn"),
    STAFF("Nhân viên"),
    KITCHENS("Bếp"),
    SHIFTS("Ca làm việc"),
    ORDERS("Đơn hàng"),
    ORDER_ITEMS("Chi tiết đơn"),
    SEASONAL_PRICES("Giá thời vụ"),
    COUPONS("Coupon"),
    BILL_TEMPLATES("Mẫu in bill"),
    BILL_PRINTER_CONFIGS("Cấu hình máy in")
}

data class DebugUiState(
    val selectedTab: DebugTab = DebugTab.BRANDS,
    val branchId: String = "",
    val brands: List<BrandEntity> = emptyList(),
    val branches: List<BranchEntity> = emptyList(),
    val categories: List<CategoryEntity> = emptyList(),
    val products: List<ProductEntity> = emptyList(),
    val productToppings: List<ProductToppingEntity> = emptyList(),
    val productNotes: List<ProductNoteEntity> = emptyList(),
    val comboItems: List<ComboItemEntity> = emptyList(),
    val areas: List<AreaEntity> = emptyList(),
    val tables: List<TableEntity> = emptyList(),
    val staff: List<StaffEntity> = emptyList(),
    val kitchens: List<KitchenEntity> = emptyList(),
    val shifts: List<ShiftEntity> = emptyList(),
    val orders: List<OrderEntity> = emptyList(),
    val orderItems: List<OrderItemEntity> = emptyList(),
    val seasonalPrices: List<SeasonalPriceEntity> = emptyList(),
    val coupons: List<CouponEntity> = emptyList(),
    val billTemplates: List<BillTemplateEntity> = emptyList(),
    val billPrinterConfigs: List<BillPrinterConfigEntity> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class DatabaseDebugViewModel @Inject constructor(
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository,
    private val tableRepository: TableRepository,
    private val staffRepository: StaffRepository,
    private val shiftRepository: ShiftRepository,
    private val branchRepository: BranchRepository,
    private val authRepository: AuthRepository,
    private val productToppingDao: ProductToppingDao,
    private val productNoteDao: ProductNoteDao,
    private val comboItemDao: ComboItemDao,
    private val seasonalPriceDao: SeasonalPriceDao,
    private val couponDao: CouponDao,
    private val orderDao: OrderDao,
    private val orderItemDao: OrderItemDao,
    private val kitchenDao: KitchenDao,
    private val billTemplateDao: BillTemplateDao,
    private val billPrinterConfigDao: BillPrinterConfigDao
) : ViewModel() {

    private val _uiState = MutableStateFlow(DebugUiState())
    val uiState: StateFlow<DebugUiState> = _uiState.asStateFlow()

    init {
        loadBranchId()
        loadAllData()
    }

    private fun loadBranchId() {
        val branchId = authRepository.getBranchId() ?: ""
        _uiState.update { it.copy(branchId = branchId) }
    }

    fun selectTab(tab: DebugTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun loadAllData() {
        _uiState.update { it.copy(isLoading = true, error = null) }

        // Load brands (not branch-specific)
        viewModelScope.launch {
            try {
                branchRepository.getAllBrandsLocal()
                    .catch { e ->
                        Log.e(TAG, "Error loading brands", e)
                        _uiState.update { it.copy(error = "Lỗi tải thương hiệu: ${e.message}") }
                    }
                    .collect { brands ->
                        _uiState.update { it.copy(brands = brands) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading brands", e)
                _uiState.update { it.copy(error = "Lỗi tải thương hiệu: ${e.message}") }
            }
        }

        // Load branches (not branch-specific)
        viewModelScope.launch {
            try {
                branchRepository.getAllBranchesLocal()
                    .catch { e ->
                        Log.e(TAG, "Error loading branches", e)
                        _uiState.update { it.copy(error = "Lỗi tải chi nhánh: ${e.message}") }
                    }
                    .collect { branches ->
                        _uiState.update { it.copy(branches = branches, isLoading = false) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading branches", e)
                _uiState.update { it.copy(error = "Lỗi tải chi nhánh: ${e.message}", isLoading = false) }
            }
        }

        val branchId = _uiState.value.branchId
        if (branchId.isEmpty()) {
            _uiState.update { it.copy(isLoading = false) }
            return
        }

        viewModelScope.launch {
            try {
                categoryRepository.getAllCategories(branchId)
                    .catch { e -> Log.e(TAG, "Error loading categories", e) }
                    .collect { categories ->
                        _uiState.update { it.copy(categories = categories) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading categories", e)
            }
        }

        viewModelScope.launch {
            try {
                productRepository.getAllProducts(branchId)
                    .catch { e -> Log.e(TAG, "Error loading products", e) }
                    .collect { products ->
                        _uiState.update { it.copy(products = products) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading products", e)
            }
        }

        viewModelScope.launch {
            try {
                tableRepository.getAllAreas(branchId)
                    .catch { e -> Log.e(TAG, "Error loading areas", e) }
                    .collect { areas ->
                        _uiState.update { it.copy(areas = areas) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading areas", e)
            }
        }

        viewModelScope.launch {
            try {
                tableRepository.getAllTables(branchId)
                    .catch { e -> Log.e(TAG, "Error loading tables", e) }
                    .collect { tables ->
                        _uiState.update { it.copy(tables = tables) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading tables", e)
            }
        }

        viewModelScope.launch {
            try {
                staffRepository.getAllStaff(branchId)
                    .catch { e -> Log.e(TAG, "Error loading staff", e) }
                    .collect { staff ->
                        _uiState.update { it.copy(staff = staff) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading staff", e)
            }
        }

        viewModelScope.launch {
            try {
                shiftRepository.getAllShiftsByBranch(branchId)
                    .catch { e -> Log.e(TAG, "Error loading shifts", e) }
                    .collect { shifts ->
                        _uiState.update { it.copy(shifts = shifts) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading shifts", e)
            }
        }

        viewModelScope.launch {
            try {
                seasonalPriceDao.getActiveSeasonalPrices(branchId)
                    .catch { e -> Log.e(TAG, "Error loading seasonal prices", e) }
                    .collect { seasonalPrices ->
                        _uiState.update { it.copy(seasonalPrices = seasonalPrices) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading seasonal prices", e)
            }
        }

        viewModelScope.launch {
            try {
                couponDao.getActiveCoupons(branchId)
                    .catch { e -> Log.e(TAG, "Error loading coupons", e) }
                    .collect { coupons ->
                        _uiState.update { it.copy(coupons = coupons) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading coupons", e)
            }
        }

        viewModelScope.launch {
            try {
                productToppingDao.getAllByBranch(branchId)
                    .catch { e -> Log.e(TAG, "Error loading product toppings", e) }
                    .collect { toppings ->
                        _uiState.update { it.copy(productToppings = toppings) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading product toppings", e)
            }
        }

        viewModelScope.launch {
            try {
                productNoteDao.getAllNotes(branchId)
                    .catch { e -> Log.e(TAG, "Error loading product notes", e) }
                    .collect { notes ->
                        _uiState.update { it.copy(productNotes = notes) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading product notes", e)
            }
        }

        viewModelScope.launch {
            try {
                orderDao.getAllByBranch(branchId)
                    .catch { e -> Log.e(TAG, "Error loading orders", e) }
                    .collect { orders ->
                        _uiState.update { it.copy(orders = orders) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading orders", e)
            }
        }

        viewModelScope.launch {
            try {
                orderItemDao.getAllByBranch(branchId)
                    .catch { e -> Log.e(TAG, "Error loading order items", e) }
                    .collect { orderItems ->
                        _uiState.update { it.copy(orderItems = orderItems) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading order items", e)
            }
        }

        viewModelScope.launch {
            try {
                kitchenDao.getAllByBranch(branchId)
                    .catch { e -> Log.e(TAG, "Error loading kitchens", e) }
                    .collect { kitchens ->
                        _uiState.update { it.copy(kitchens = kitchens) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading kitchens", e)
            }
        }

        viewModelScope.launch {
            try {
                billTemplateDao.getAllByBranch(branchId)
                    .catch { e -> Log.e(TAG, "Error loading bill templates", e) }
                    .collect { billTemplates ->
                        _uiState.update { it.copy(billTemplates = billTemplates) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading bill templates", e)
            }
        }

        viewModelScope.launch {
            try {
                billPrinterConfigDao.getAllByBranch(branchId)
                    .catch { e -> Log.e(TAG, "Error loading bill printer configs", e) }
                    .collect { configs ->
                        _uiState.update { it.copy(billPrinterConfigs = configs) }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading bill printer configs", e)
            }
        }

        viewModelScope.launch {
            try {
                val comboItems = comboItemDao.getAllDebug()
                _uiState.update { it.copy(comboItems = comboItems) }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading combo items", e)
            }
        }
    }

    companion object {
        private const val TAG = "DatabaseDebugViewModel"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DatabaseDebugScreen(
    onBack: () -> Unit,
    viewModel: DatabaseDebugViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Database Debug") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadAllData() }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Error message
            uiState.error?.let { error ->
                Text(
                    text = error,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.errorContainer)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }

            // Branch info
            Text(
                text = "Branch ID: ${uiState.branchId.ifEmpty { "(không có)" }}",
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // Tabs
            ScrollableTabRow(
                selectedTabIndex = uiState.selectedTab.ordinal,
                modifier = Modifier.fillMaxWidth()
            ) {
                DebugTab.entries.forEach { tab ->
                    val count = when (tab) {
                        DebugTab.BRANDS -> uiState.brands.size
                        DebugTab.BRANCHES -> uiState.branches.size
                        DebugTab.CATEGORIES -> uiState.categories.size
                        DebugTab.PRODUCTS -> uiState.products.size
                        DebugTab.PRODUCT_TOPPINGS -> uiState.productToppings.size
                        DebugTab.PRODUCT_NOTES -> uiState.productNotes.size
                        DebugTab.COMBO_ITEMS -> uiState.comboItems.size
                        DebugTab.AREAS -> uiState.areas.size
                        DebugTab.TABLES -> uiState.tables.size
                        DebugTab.STAFF -> uiState.staff.size
                        DebugTab.KITCHENS -> uiState.kitchens.size
                        DebugTab.SHIFTS -> uiState.shifts.size
                        DebugTab.ORDERS -> uiState.orders.size
                        DebugTab.ORDER_ITEMS -> uiState.orderItems.size
                        DebugTab.SEASONAL_PRICES -> uiState.seasonalPrices.size
                        DebugTab.COUPONS -> uiState.coupons.size
                        DebugTab.BILL_TEMPLATES -> uiState.billTemplates.size
                        DebugTab.BILL_PRINTER_CONFIGS -> uiState.billPrinterConfigs.size
                    }
                    Tab(
                        selected = uiState.selectedTab == tab,
                        onClick = { viewModel.selectTab(tab) },
                        text = { Text("${tab.title} ($count)") }
                    )
                }
            }

            // Content
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                when (uiState.selectedTab) {
                    DebugTab.BRANDS -> BrandsTable(uiState.brands)
                    DebugTab.BRANCHES -> BranchesTable(uiState.branches)
                    DebugTab.CATEGORIES -> CategoriesTable(uiState.categories)
                    DebugTab.PRODUCTS -> ProductsTable(uiState.products)
                    DebugTab.PRODUCT_TOPPINGS -> ProductToppingsTable(uiState.productToppings)
                    DebugTab.PRODUCT_NOTES -> ProductNotesTable(uiState.productNotes)
                    DebugTab.COMBO_ITEMS -> ComboItemsTable(uiState.comboItems)
                    DebugTab.AREAS -> AreasTable(uiState.areas)
                    DebugTab.TABLES -> TablesTable(uiState.tables)
                    DebugTab.STAFF -> StaffTable(uiState.staff)
                    DebugTab.KITCHENS -> KitchensTable(uiState.kitchens)
                    DebugTab.SHIFTS -> ShiftsTable(uiState.shifts)
                    DebugTab.ORDERS -> OrdersTable(uiState.orders)
                    DebugTab.ORDER_ITEMS -> OrderItemsTable(uiState.orderItems)
                    DebugTab.SEASONAL_PRICES -> SeasonalPricesTable(uiState.seasonalPrices)
                    DebugTab.COUPONS -> CouponsTable(uiState.coupons)
                    DebugTab.BILL_TEMPLATES -> BillTemplatesTable(uiState.billTemplates)
                    DebugTab.BILL_PRINTER_CONFIGS -> BillPrinterConfigsTable(uiState.billPrinterConfigs)
                }
            }
        }
    }
}

@Composable
fun BrandsTable(brands: List<BrandEntity>) {
    DataTable(
        headers = listOf("ID", "Name", "Code", "Company", "Active"),
        data = brands,
        rowContent = { brand ->
            listOf(
                brand.id.take(8) + "...",
                brand.name,
                brand.code ?: "-",
                brand.companyName ?: "-",
                if (brand.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun BranchesTable(branches: List<BranchEntity>) {
    DataTable(
        headers = listOf("ID", "Name", "Code", "Brand", "Address", "Active"),
        data = branches,
        rowContent = { branch ->
            listOf(
                branch.id.take(8) + "...",
                branch.name,
                branch.code ?: "-",
                branch.brandName ?: "-",
                branch.address ?: "-",
                if (branch.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun CategoriesTable(categories: List<CategoryEntity>) {
    DataTable(
        headers = listOf("ID", "Name", "Description", "Active"),
        data = categories,
        rowContent = { category ->
            listOf(
                category.id.take(8) + "...",
                category.name,
                category.description ?: "-",
                if (category.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun ProductsTable(products: List<ProductEntity>) {
    DataTable(
        headers = listOf("ID", "Name", "Code", "SearchName", "Abbrev", "Price", "VAT%", "Type", "Active"),
        data = products,
        rowContent = { product ->
            listOf(
                product.id.take(8) + "...",
                product.name.take(20),
                product.code,
                product.searchName?.take(20) ?: "NULL",
                product.abbreviation ?: "NULL",
                "%,.0f".format(product.price),
                "${product.vatRate.toInt()}%",
                product.type,
                if (product.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun ProductToppingsTable(toppings: List<ProductToppingEntity>) {
    DataTable(
        headers = listOf("Product ID", "Topping ID", "Nhóm", "Loại", "Bắt buộc", "Nhiều", "Giá thêm", "Mặc định"),
        data = toppings,
        rowContent = { topping ->
            listOf(
                topping.productId.take(8) + "...",
                topping.toppingId.take(8) + "...",
                topping.groupName,
                topping.groupType,
                if (topping.isRequired) "✓" else "✗",
                if (topping.isMultiple) "✓" else "✗",
                "%,.0f".format(topping.extraPrice),
                if (topping.isDefault) "✓" else "✗"
            )
        }
    )
}

@Composable
fun ProductNotesTable(notes: List<ProductNoteEntity>) {
    DataTable(
        headers = listOf("ID", "Tên ghi chú", "Mô tả", "Thứ tự", "Active", "Sync", "Cập nhật"),
        data = notes,
        rowContent = { note ->
            listOf(
                note.id.take(8) + "...",
                note.name,
                note.description ?: "-",
                note.sortOrder.toString(),
                if (note.isActive) "✓" else "✗",
                note.syncStatus,
                note.updatedAt.take(19).replace("T", " ")
            )
        }
    )
}

@Composable
fun AreasTable(areas: List<AreaEntity>) {
    DataTable(
        headers = listOf("ID", "Name", "Description", "Active"),
        data = areas,
        rowContent = { area ->
            listOf(
                area.id.take(8) + "...",
                area.name,
                area.description ?: "-",
                if (area.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun TablesTable(tables: List<TableEntity>) {
    DataTable(
        headers = listOf("ID", "Name", "Capacity", "Area", "Status", "Active"),
        data = tables,
        rowContent = { table ->
            listOf(
                table.id.take(8) + "...",
                table.name,
                table.capacity.toString(),
                table.areaId?.take(8) ?: "-",
                table.status,
                if (table.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun StaffTable(staff: List<StaffEntity>) {
    DataTable(
        headers = listOf("ID", "Name", "Code", "Role", "Active"),
        data = staff,
        rowContent = { s ->
            listOf(
                s.id.take(8) + "...",
                s.name,
                s.code,
                s.role,
                if (s.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun ShiftsTable(shifts: List<ShiftEntity>) {
    DataTable(
        headers = listOf("ID", "Nhân viên", "Trạng thái", "Tiền đầu ca", "Doanh thu", "Mở ca", "Đóng ca"),
        data = shifts,
        rowContent = { shift ->
            listOf(
                shift.id.take(8) + "...",
                shift.staffName,
                if (shift.status == "open") "🟢 Đang mở" else "🔴 Đã đóng",
                "%,.0f".format(shift.openingAmount),
                "%,.0f".format(shift.totalRevenue),
                shift.openedAt.take(19).replace("T", " "),
                shift.closedAt?.take(19)?.replace("T", " ") ?: "-"
            )
        }
    )
}

@Composable
fun OrdersTable(orders: List<OrderEntity>) {
    DataTable(
        headers = listOf("ID", "Số đơn", "Bàn", "Trạng thái", "Thanh toán", "Tổng tiền", "Tạo lúc", "Sync"),
        data = orders,
        rowContent = { order ->
            val statusText = when (order.status) {
                "pending" -> "⏳ Chờ"
                "confirmed" -> "✅ Xác nhận"
                "preparing" -> "👨‍🍳 Đang làm"
                "ready" -> "🍽️ Sẵn sàng"
                "completed" -> "✅ Hoàn tất"
                "cancelled" -> "❌ Hủy"
                else -> order.status
            }
            val paymentText = when (order.paymentStatus) {
                "unpaid" -> "⏳ Chưa TT"
                "partial" -> "⚠️ TT một phần"
                "paid" -> "✅ Đã TT"
                else -> order.paymentStatus
            }
            val syncText = when (order.syncStatus) {
                "pending" -> "⏳"
                "syncing" -> "🔄"
                "synced" -> "✅"
                "failed" -> "❌"
                else -> order.syncStatus
            }
            listOf(
                order.id.take(8) + "...",
                order.orderNumber,
                order.tableName ?: "-",
                statusText,
                paymentText,
                "%,.0f".format(order.totalAmount),
                order.createdAt.take(19).replace("T", " "),
                syncText
            )
        }
    )
}

@Composable
fun OrderItemsTable(orderItems: List<OrderItemEntity>) {
    DataTable(
        headers = listOf("ID", "Order ID", "Sản phẩm", "SL", "Đơn giá", "Tổng", "Trạng thái", "Ghi chú"),
        data = orderItems,
        rowContent = { item ->
            val statusText = when (item.status) {
                "pending" -> "⏳ Chờ"
                "preparing" -> "👨‍🍳 Đang làm"
                "ready" -> "🍽️ Sẵn sàng"
                "served" -> "✅ Đã phục vụ"
                "cancelled" -> "❌ Hủy"
                else -> item.status
            }
            listOf(
                item.id.take(8) + "...",
                item.orderId.take(8) + "...",
                item.productName,
                item.quantity.toString(),
                "%,.0f".format(item.unitPrice),
                "%,.0f".format(item.totalPrice),
                statusText,
                item.notes ?: "-"
            )
        }
    )
}

@Composable
fun SeasonalPricesTable(seasonalPrices: List<SeasonalPriceEntity>) {
    DataTable(
        headers = listOf("ID", "Tên", "Loại", "Giá trị", "Bắt đầu", "Kết thúc", "Active"),
        data = seasonalPrices,
        rowContent = { sp ->
            val adjustmentText = if (sp.adjustmentType == "percentage") {
                "${sp.adjustmentValue.toInt()}%"
            } else {
                "%,.0f".format(sp.adjustmentValue)
            }
            listOf(
                sp.id.take(8) + "...",
                sp.name,
                if (sp.adjustmentType == "percentage") "%" else "Cố định",
                adjustmentText,
                sp.startDate,
                sp.endDate,
                if (sp.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun CouponsTable(coupons: List<CouponEntity>) {
    DataTable(
        headers = listOf("ID", "Mã", "Tên", "Loại", "Giá trị", "Giới hạn", "Đã dùng", "GH/ngày", "Ngày BĐ", "Ngày KT", "Active"),
        data = coupons,
        rowContent = { c ->
            val discountText = if (c.couponType == "percentage") {
                "${c.discountValue.toInt()}%"
            } else {
                "%,.0f".format(c.discountValue)
            }
            listOf(
                c.id.take(8) + "...",
                c.code,
                c.name,
                if (c.couponType == "percentage") "%" else "Cố định",
                discountText,
                c.usageLimit?.toString() ?: "∞",
                c.usageCount.toString(),
                c.dailyLimit?.toString() ?: "∞",
                c.startDate?.take(10) ?: "-",
                c.endDate?.take(10) ?: "-",
                if (c.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun KitchensTable(kitchens: List<KitchenEntity>) {
    DataTable(
        headers = listOf("ID", "Tên bếp", "Loại", "PrintMode", "PrinterIP", "Protocol", "Active"),
        data = kitchens,
        rowContent = { kitchen ->
            listOf(
                kitchen.id.take(8) + "...",
                kitchen.name,
                kitchen.kitchenType ?: "-",
                kitchen.printMode,
                "${kitchen.printerIp ?: "-"}:${kitchen.printerPort}",
                kitchen.printerProtocol,
                if (kitchen.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun BillTemplatesTable(templates: List<BillTemplateEntity>) {
    DataTable(
        headers = listOf("ID", "Tên mẫu", "Loại", "Tên cửa hàng", "Khổ giấy", "Mặc định", "Active", "Cập nhật"),
        data = templates,
        rowContent = { template ->
            listOf(
                template.id.take(8) + "...",
                template.name,
                template.templateType,
                template.storeName.take(15),
                "${template.paperWidth}mm",
                if (template.isDefault) "✓" else "✗",
                if (template.isActive) "✓" else "✗",
                template.updatedAt.take(19).replace("T", " ")
            )
        }
    )
}

@Composable
fun BillPrinterConfigsTable(configs: List<BillPrinterConfigEntity>) {
    DataTable(
        headers = listOf("ID", "Tên máy in", "Loại kết nối", "IP:Port", "Khổ giấy", "Mặc định", "Active"),
        data = configs,
        rowContent = { config ->
            listOf(
                config.id.take(8) + "...",
                config.name,
                config.connectionType,
                "${config.printerIp ?: "-"}:${config.printerPort}",
                "${config.paperWidth}mm",
                if (config.isDefault) "✓" else "✗",
                if (config.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun ComboItemsTable(items: List<ComboItemEntity>) {
    DataTable(
        headers = listOf("ID", "Combo ID", "Product ID", "Tên SP", "SL", "Thứ tự", "Active"),
        data = items,
        rowContent = { item ->
            listOf(
                item.id.take(8) + "...",
                item.comboId.take(8) + "...",
                item.productId.take(8) + "...",
                item.productName.take(20),
                item.quantity.toString(),
                item.sortOrder.toString(),
                if (item.isActive) "✓" else "✗"
            )
        }
    )
}

@Composable
fun <T> DataTable(
    headers: List<String>,
    data: List<T>,
    rowContent: (T) -> List<String>
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .horizontalScroll(scrollState)
    ) {
        // Header row
        Row(
            modifier = Modifier
                .background(MaterialTheme.colorScheme.primaryContainer)
                .padding(8.dp)
        ) {
            headers.forEach { header ->
                Text(
                    text = header,
                    modifier = Modifier.width(100.dp),
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // Data rows
        LazyColumn {
            items(data) { item ->
                Row(
                    modifier = Modifier
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    rowContent(item).forEach { cell ->
                        Text(
                            text = cell,
                            modifier = Modifier.width(100.dp),
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                HorizontalDivider()
            }
        }
    }
}
