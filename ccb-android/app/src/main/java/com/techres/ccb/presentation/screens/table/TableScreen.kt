package com.techres.ccb.presentation.screens.table

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import java.text.NumberFormat
import java.util.Locale

// Status colors
private val StatusAvailable = Color(0xFF4CAF50)   // Green
private val StatusPending = Color(0xFFFF9800)      // Orange
private val StatusOccupied = Color(0xFFF44336)     // Red
private val StatusReserved = Color(0xFF9C27B0)     // Purple
private val StatusCleaning = Color(0xFF607D8B)     // Gray

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TableScreen(
    onNavigateBack: () -> Unit,
    onNavigateToSale: () -> Unit,
    onNavigateToSaleWithTable: (tableId: String) -> Unit,
    onNavigateToSaleWithOrder: (orderId: String) -> Unit,
    viewModel: TableViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp
    val isCompactScreen = screenWidthDp < 600

    // Grid columns from ViewModel (persisted in SharedPreferences)
    val gridColumns = uiState.gridColumns
    val columnOptions = if (isCompactScreen) listOf(2, 3, 4) else listOf(3, 4, 5, 6)

    // Initialize data lazily - allows screen to render immediately for smooth navigation
    LaunchedEffect(Unit) {
        viewModel.initializeData()
    }

    // Refresh data when screen resumes (e.g., navigating back from SaleScreen)
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.initializeData() // Will check if cache was invalidated
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Show error snackbar
    LaunchedEffect(uiState.errorMessage) {
        if (uiState.errorMessage != null) {
            kotlinx.coroutines.delay(4000)
            viewModel.clearErrorMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Danh sách bàn",
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${uiState.availableTables}/${uiState.totalTables} bàn trống",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                },
                actions = {
                    // Refresh button - force refresh data
                    IconButton(onClick = { viewModel.refreshData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Làm mới")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToSale,
                containerColor = Color(0xFF4CAF50),
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Tạo đơn mới")
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8F9FA))
        ) {
            if (uiState.isLoading && uiState.areas.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(48.dp),
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Đang tải danh sách bàn...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else if (uiState.areas.isEmpty() && uiState.tablesWithoutArea.isEmpty() && !uiState.isLoading) {
                // Empty state - only show when not loading
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFE3F2FD)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.TableBar,
                                contentDescription = null,
                                modifier = Modifier.size(40.dp),
                                tint = Color(0xFF1976D2)
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Chưa có bàn",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF424242)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Vui lòng đồng bộ dữ liệu bàn từ hệ thống",
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }
                }
            } else {
                // Filter areas based on selected area
                val filteredAreas = remember(uiState.areas, uiState.selectedAreaId) {
                    if (uiState.selectedAreaId == null) {
                        uiState.areas
                    } else {
                        uiState.areas.filter { it.area.id == uiState.selectedAreaId }
                    }
                }

                // Filter tables without area
                val showTablesWithoutArea = remember(uiState.selectedAreaId, uiState.tablesWithoutArea) {
                    uiState.selectedAreaId == null && uiState.tablesWithoutArea.isNotEmpty()
                }

                Column(modifier = Modifier.fillMaxSize()) {
                    // Statistics bar with grid column selector and area filter
                    TableStatisticsBar(
                        totalTables = uiState.totalTables,
                        availableTables = uiState.availableTables,
                        occupiedTables = uiState.occupiedTables,
                        gridColumns = gridColumns,
                        columnOptions = columnOptions,
                        onGridColumnsChange = { viewModel.setGridColumns(it) },
                        areas = uiState.areas,
                        selectedAreaId = uiState.selectedAreaId,
                        onAreaSelected = { viewModel.setSelectedArea(it) }
                    )

                    // Table list grouped by area
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 80.dp)
                    ) {
                        // Filtered areas with tables
                        filteredAreas.forEach { areaWithTables ->
                            item(key = "area_${areaWithTables.area.id}") {
                                AreaSection(
                                    areaWithTables = areaWithTables,
                                    gridColumns = gridColumns,
                                    onToggleExpand = { viewModel.toggleAreaExpanded(areaWithTables.area.id) },
                                    onTableClick = { table ->
                                        if (table.currentOrderId != null) {
                                            // Has active order -> navigate to add items
                                            onNavigateToSaleWithOrder(table.currentOrderId)
                                        } else {
                                            // No order -> create new order with table
                                            onNavigateToSaleWithTable(table.id)
                                        }
                                    }
                                )
                            }
                        }

                        // Tables without area (only show when "Tất cả" is selected)
                        if (showTablesWithoutArea) {
                            item(key = "area_no_area") {
                                AreaSection(
                                    areaWithTables = AreaWithTables(
                                        area = com.techres.ccb.data.local.entity.AreaEntity(
                                            id = "no_area",
                                            branchId = "",
                                            name = "Chưa phân khu vực",
                                            sortOrder = 999,
                                            createdAt = "",
                                            updatedAt = ""
                                        ),
                                        tables = uiState.tablesWithoutArea,
                                        isExpanded = true
                                    ),
                                    gridColumns = gridColumns,
                                    onToggleExpand = { },
                                    onTableClick = { table ->
                                        if (table.currentOrderId != null) {
                                            onNavigateToSaleWithOrder(table.currentOrderId)
                                        } else {
                                            onNavigateToSaleWithTable(table.id)
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }

            // Error message
            AnimatedVisibility(
                visible = uiState.errorMessage != null,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 16.dp)
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF44336)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Error, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = uiState.errorMessage ?: "",
                            color = Color.White,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TableStatisticsBar(
    totalTables: Int,
    availableTables: Int,
    occupiedTables: Int,
    gridColumns: Int,
    columnOptions: List<Int>,
    onGridColumnsChange: (Int) -> Unit,
    areas: List<AreaWithTables>,
    selectedAreaId: String?,
    onAreaSelected: (String?) -> Unit
) {
    Surface(
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // Row 1: Statistics and grid selector
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Statistics chips
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatChip(
                        count = availableTables,
                        label = "Trống",
                        color = StatusAvailable
                    )
                    StatChip(
                        count = occupiedTables,
                        label = "Có khách",
                        color = StatusOccupied
                    )
                }

                // Grid column selector
                GridColumnSelector(
                    gridColumns = gridColumns,
                    columnOptions = columnOptions,
                    onGridColumnsChange = onGridColumnsChange
                )
            }

            // Row 2: Area filter chips (only show if more than 1 area)
            if (areas.size > 1) {
                Spacer(modifier = Modifier.height(10.dp))
                androidx.compose.foundation.lazy.LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // "Tất cả" chip
                    item {
                        AreaFilterChip(
                            name = "Tất cả",
                            isSelected = selectedAreaId == null,
                            onClick = { onAreaSelected(null) }
                        )
                    }
                    // Area chips
                    items(areas.size) { index ->
                        val area = areas[index]
                        AreaFilterChip(
                            name = area.area.name,
                            isSelected = selectedAreaId == area.area.id,
                            onClick = { onAreaSelected(area.area.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AreaFilterChip(
    name: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val backgroundColor = if (isSelected) Color(0xFF1976D2) else Color.White
    val textColor = if (isSelected) Color.White else Color(0xFF424242)
    val borderColor = if (isSelected) Color(0xFF1976D2) else Color.Gray.copy(alpha = 0.4f)

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(backgroundColor)
            .border(1.dp, borderColor, RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(
            text = name,
            fontSize = 13.sp,
            fontWeight = if (isSelected) FontWeight.Medium else FontWeight.Normal,
            color = textColor
        )
    }
}

@Composable
private fun GridColumnSelector(
    gridColumns: Int,
    columnOptions: List<Int>,
    onGridColumnsChange: (Int) -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Grid icon
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFFF5F5F5))
                .border(1.dp, Color.Gray.copy(alpha = 0.3f), RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.GridView,
                contentDescription = "Grid",
                modifier = Modifier.size(20.dp),
                tint = Color.Gray
            )
        }

        // Column options
        columnOptions.forEach { option ->
            val isSelected = gridColumns == option
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isSelected) Color(0xFF1976D2) else Color.White)
                    .border(
                        1.dp,
                        if (isSelected) Color(0xFF1976D2) else Color.Gray.copy(alpha = 0.3f),
                        RoundedCornerShape(8.dp)
                    )
                    .clickable { onGridColumnsChange(option) },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = option.toString(),
                    fontSize = 14.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                    color = if (isSelected) Color.White else Color.Gray
                )
            }
        }
    }
}

@Composable
private fun StatChip(
    count: Int,
    label: String,
    color: Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(color.copy(alpha = 0.1f))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .clip(CircleShape)
                .background(color)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "$count $label",
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            color = color
        )
    }
}

@Composable
private fun AreaSection(
    areaWithTables: AreaWithTables,
    gridColumns: Int,
    onToggleExpand: () -> Unit,
    onTableClick: (TableWithOrderInfo) -> Unit
) {
    // Use remember for computed values to avoid recalculation on every recomposition
    val availableCount = remember(areaWithTables.tables) {
        areaWithTables.tables.count { it.status == "available" }
    }
    val totalCount = areaWithTables.tables.size

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        // Area header
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onToggleExpand() },
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Room,
                        contentDescription = null,
                        tint = Color(0xFF1976D2),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = areaWithTables.area.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "$availableCount/$totalCount bàn trống",
                            fontSize = 13.sp,
                            color = if (availableCount > 0) StatusAvailable else Color.Gray
                        )
                    }
                }
                Icon(
                    imageVector = if (areaWithTables.isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (areaWithTables.isExpanded) "Thu gọn" else "Mở rộng",
                    tint = Color.Gray
                )
            }
        }

        // Tables grid - only render when expanded
        if (areaWithTables.isExpanded) {
            // Cache the chunked rows to avoid recalculation
            val rows = remember(areaWithTables.tables, gridColumns) {
                areaWithTables.tables.chunked(gridColumns)
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
            ) {
                rows.forEachIndexed { rowIndex, rowTables ->
                    key(rowIndex) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            rowTables.forEach { table ->
                                key(table.id) {
                                    TableCard(
                                        table = table,
                                        modifier = Modifier.weight(1f),
                                        onClick = { onTableClick(table) }
                                    )
                                }
                            }
                            // Fill remaining space if row is not complete
                            repeat(gridColumns - rowTables.size) { index ->
                                Spacer(
                                    modifier = Modifier.weight(1f),
                                    // key is not applicable to Spacer directly
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun TableCard(
    table: TableWithOrderInfo,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    // Cache computed values with remember to avoid recalculation on recomposition
    val statusColor = remember(table.status, table.orderNumber) {
        when (table.status.lowercase()) {
            "available" -> StatusAvailable
            "occupied" -> if (table.orderNumber?.startsWith("pending") == true || table.orderNumber == null) StatusPending else StatusOccupied
            "reserved" -> StatusReserved
            "cleaning" -> StatusCleaning
            else -> StatusAvailable
        }
    }

    val hasOrder = table.currentOrderId != null

    // Pre-calculate colors to avoid repeated calculation
    val containerColor = remember(hasOrder, statusColor) {
        if (hasOrder) statusColor.copy(alpha = 0.1f) else Color.White
    }

    val borderStroke = remember(hasOrder, statusColor) {
        if (hasOrder) {
            androidx.compose.foundation.BorderStroke(2.dp, statusColor)
        } else {
            androidx.compose.foundation.BorderStroke(1.dp, Color.Gray.copy(alpha = 0.3f))
        }
    }

    // Cache formatted currency
    val formattedTotal = remember(table.orderTotal) {
        if (table.orderTotal > 0) formatCurrency(table.orderTotal) else ""
    }

    val timeColor = remember(table.occupiedMinutes) {
        if (table.occupiedMinutes > 30) Color(0xFFF44336) else Color.Gray
    }

    Card(
        modifier = modifier
            .aspectRatio(1f)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        shape = RoundedCornerShape(12.dp),
        border = borderStroke
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Status indicator
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(statusColor)
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Table name
            Text(
                text = table.name,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // Capacity
            Text(
                text = "${table.capacity} chỗ",
                fontSize = 11.sp,
                color = Color.Gray
            )

            // Order info (if occupied)
            if (hasOrder) {
                Spacer(modifier = Modifier.height(4.dp))

                // Items count and total
                if (table.orderItemCount > 0) {
                    Text(
                        text = "${table.orderItemCount} món",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = statusColor
                    )
                }

                if (formattedTotal.isNotEmpty()) {
                    Text(
                        text = formattedTotal,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1976D2)
                    )
                }

                // Wait time and note indicator
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Wait time - always show
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Schedule,
                            contentDescription = null,
                            modifier = Modifier.size(10.dp),
                            tint = timeColor
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = "${table.occupiedMinutes}p",
                            fontSize = 10.sp,
                            color = timeColor
                        )
                    }

                    // Note indicator
                    if (table.hasNote) {
                        Icon(
                            Icons.Default.StickyNote2,
                            contentDescription = "Có ghi chú",
                            modifier = Modifier.size(12.dp),
                            tint = Color(0xFFFF9800) // Orange
                        )
                    }
                }
            }
        }
    }
}

private fun formatCurrency(amount: Long): String {
    val formatter = NumberFormat.getNumberInstance(Locale("vi", "VN"))
    return "${formatter.format(amount)}đ"
}
