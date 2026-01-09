package com.techres.ccb.presentation.screens.branch

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Mock data classes
data class MockBrand(
    val id: String,
    val name: String,
    val logo: String? = null,
    val branches: List<MockBranch> = emptyList()
)

data class MockBranch(
    val id: String,
    val name: String,
    val address: String,
    val phone: String? = null
)

@Composable
fun BranchSelectionScreen(
    onBranchSelected: (brandId: String, branchId: String, branchName: String) -> Unit,
    onBack: () -> Unit
) {
    // Mock data
    val mockBrands = remember {
        listOf(
            MockBrand(
                id = "1",
                name = "Gà Rán TechRes",
                branches = listOf(
                    MockBranch("1", "Chi nhánh Quận 1", "123 Nguyễn Huệ, Q.1"),
                    MockBranch("2", "Chi nhánh Quận 3", "456 Võ Văn Tần, Q.3"),
                    MockBranch("3", "Chi nhánh Quận 7", "789 Nguyễn Văn Linh, Q.7")
                )
            ),
            MockBrand(
                id = "2",
                name = "Coffee House",
                branches = listOf(
                    MockBranch("4", "Landmark 81", "Vinhomes Central Park"),
                    MockBranch("5", "Phú Mỹ Hưng", "SC Vivo City, Q.7")
                )
            ),
            MockBrand(
                id = "3",
                name = "Phở Việt",
                branches = listOf(
                    MockBranch("6", "Chi nhánh Thủ Đức", "200 Võ Văn Ngân, Thủ Đức")
                )
            )
        )
    }

    var selectedBrand by remember { mutableStateOf<MockBrand?>(null) }
    var selectedBranch by remember { mutableStateOf<MockBranch?>(null) }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // Left Panel - Branding & Brand Selection
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.primary,
                            MaterialTheme.colorScheme.primaryContainer
                        )
                    )
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp)
            ) {
                // Header with back button
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBack,
                        colors = IconButtonDefaults.iconButtonColors(
                            contentColor = Color.White
                        )
                    ) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Chọn nơi làm việc",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Brand selection title
                Text(
                    text = "THƯƠNG HIỆU",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White.copy(alpha = 0.7f),
                    letterSpacing = 1.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Brand list
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(mockBrands) { brand ->
                        BrandSelectionCard(
                            brand = brand,
                            isSelected = selectedBrand?.id == brand.id,
                            onClick = {
                                selectedBrand = brand
                                selectedBranch = null
                            }
                        )
                    }
                }

                // Logo at bottom
                Spacer(modifier = Modifier.height(24.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Restaurant,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = Color.White.copy(alpha = 0.6f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "CCB POS",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.6f)
                    )
                }
            }
        }

        // Right Panel - Branch Selection
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(MaterialTheme.colorScheme.surface)
        ) {
            if (selectedBrand == null) {
                // Empty state
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Store,
                        contentDescription = null,
                        modifier = Modifier.size(80.dp),
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Vui lòng chọn thương hiệu",
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp)
                ) {
                    // Header
                    Text(
                        text = "CHI NHÁNH",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        letterSpacing = 1.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = selectedBrand!!.name,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Text(
                        text = "${selectedBrand!!.branches.size} chi nhánh",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Branch list
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        items(selectedBrand!!.branches) { branch ->
                            BranchSelectionCard(
                                branch = branch,
                                isSelected = selectedBranch?.id == branch.id,
                                onClick = { selectedBranch = branch }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Continue button
                    Button(
                        onClick = {
                            selectedBranch?.let { branch ->
                                selectedBrand?.let { brand ->
                                    onBranchSelected(brand.id, branch.id, branch.name)
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        enabled = selectedBranch != null,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50)
                        )
                    ) {
                        Text(
                            text = "Tiếp tục",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(Icons.Default.ArrowForward, contentDescription = null)
                    }
                }
            }
        }
    }
}

@Composable
private fun BrandSelectionCard(
    brand: MockBrand,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                Color.White
            else
                Color.White.copy(alpha = 0.15f)
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 8.dp else 0.dp
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Brand icon
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        if (isSelected)
                            MaterialTheme.colorScheme.primary
                        else
                            Color.White.copy(alpha = 0.2f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Storefront,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = if (isSelected)
                        Color.White
                    else
                        Color.White
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = brand.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSelected)
                        MaterialTheme.colorScheme.primary
                    else
                        Color.White
                )
                Text(
                    text = "${brand.branches.size} chi nhánh",
                    fontSize = 12.sp,
                    color = if (isSelected)
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    else
                        Color.White.copy(alpha = 0.7f)
                )
            }

            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

@Composable
private fun BranchSelectionCard(
    branch: MockBranch,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .then(
                if (isSelected)
                    Modifier.border(2.dp, Color(0xFF4CAF50), RoundedCornerShape(16.dp))
                else
                    Modifier
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                Color(0xFFE8F5E9)
            else
                MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 4.dp else 1.dp
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Branch icon
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        if (isSelected)
                            Color(0xFF4CAF50)
                        else
                            MaterialTheme.colorScheme.surface
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Store,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = if (isSelected)
                        Color.White
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = branch.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSelected)
                        Color(0xFF2E7D32)
                    else
                        MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = branch.address,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }

            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF4CAF50),
                    modifier = Modifier.size(24.dp)
                )
            } else {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
