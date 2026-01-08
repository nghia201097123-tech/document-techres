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
import com.techres.ccb.data.local.entity.AreaEntity
import com.techres.ccb.data.local.entity.TableEntity
import com.techres.ccb.data.local.entity.StaffEntity
import com.techres.ccb.data.repository.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class DebugTab(val title: String) {
    CATEGORIES("Danh mục"),
    PRODUCTS("Sản phẩm"),
    AREAS("Khu vực"),
    TABLES("Bàn"),
    STAFF("Nhân viên")
}

data class DebugUiState(
    val selectedTab: DebugTab = DebugTab.CATEGORIES,
    val branchId: String = "",
    val categories: List<CategoryEntity> = emptyList(),
    val products: List<ProductEntity> = emptyList(),
    val areas: List<AreaEntity> = emptyList(),
    val tables: List<TableEntity> = emptyList(),
    val staff: List<StaffEntity> = emptyList(),
    val isLoading: Boolean = false
)

@HiltViewModel
class DatabaseDebugViewModel @Inject constructor(
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository,
    private val tableRepository: TableRepository,
    private val staffRepository: StaffRepository,
    private val branchRepository: BranchRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DebugUiState())
    val uiState: StateFlow<DebugUiState> = _uiState.asStateFlow()

    init {
        loadBranchId()
        loadAllData()
    }

    private fun loadBranchId() {
        val branchId = branchRepository.getSelectedBranchId() ?: ""
        _uiState.update { it.copy(branchId = branchId) }
    }

    fun selectTab(tab: DebugTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun loadAllData() {
        val branchId = _uiState.value.branchId
        if (branchId.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Load categories
            categoryRepository.getAllCategories(branchId)
                .collect { categories ->
                    _uiState.update { it.copy(categories = categories) }
                }
        }

        viewModelScope.launch {
            val branchId = _uiState.value.branchId
            productRepository.getAllProducts(branchId)
                .collect { products ->
                    _uiState.update { it.copy(products = products) }
                }
        }

        viewModelScope.launch {
            val branchId = _uiState.value.branchId
            tableRepository.getAllAreas(branchId)
                .collect { areas ->
                    _uiState.update { it.copy(areas = areas) }
                }
        }

        viewModelScope.launch {
            val branchId = _uiState.value.branchId
            tableRepository.getAllTables(branchId)
                .collect { tables ->
                    _uiState.update { it.copy(tables = tables, isLoading = false) }
                }
        }

        viewModelScope.launch {
            val branchId = _uiState.value.branchId
            staffRepository.getAllStaff(branchId)
                .collect { staff ->
                    _uiState.update { it.copy(staff = staff) }
                }
        }
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
            // Branch info
            Text(
                text = "Branch ID: ${uiState.branchId}",
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
                        DebugTab.CATEGORIES -> uiState.categories.size
                        DebugTab.PRODUCTS -> uiState.products.size
                        DebugTab.AREAS -> uiState.areas.size
                        DebugTab.TABLES -> uiState.tables.size
                        DebugTab.STAFF -> uiState.staff.size
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
                    DebugTab.CATEGORIES -> CategoriesTable(uiState.categories)
                    DebugTab.PRODUCTS -> ProductsTable(uiState.products)
                    DebugTab.AREAS -> AreasTable(uiState.areas)
                    DebugTab.TABLES -> TablesTable(uiState.tables)
                    DebugTab.STAFF -> StaffTable(uiState.staff)
                }
            }
        }
    }
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
        headers = listOf("ID", "Name", "Code", "Price", "Category", "Active"),
        data = products,
        rowContent = { product ->
            listOf(
                product.id.take(8) + "...",
                product.name,
                product.code,
                "%,.0f".format(product.price),
                product.categoryId?.take(8) ?: "-",
                if (product.isActive) "✓" else "✗"
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
