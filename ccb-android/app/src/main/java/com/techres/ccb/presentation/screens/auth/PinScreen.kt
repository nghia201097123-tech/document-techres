package com.techres.ccb.presentation.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.StaffEntity

@Composable
fun PinScreen(
    onPinVerified: () -> Unit,
    onLogout: () -> Unit,
    viewModel: PinViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var pin by remember { mutableStateOf("") }

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            onPinVerified()
        }
    }

    LaunchedEffect(pin) {
        if (pin.length == 4) {
            viewModel.verifyPin(pin)
            pin = ""
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top bar actions
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Back button (when in PIN input mode)
            if (!uiState.showStaffSelection && uiState.staffList.isNotEmpty()) {
                IconButton(onClick = { viewModel.backToStaffSelection() }) {
                    Icon(
                        Icons.Default.ArrowBack,
                        contentDescription = "Quay lai",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
            } else {
                Spacer(modifier = Modifier.size(48.dp))
            }

            // Logout button
            IconButton(
                onClick = {
                    viewModel.logout()
                    onLogout()
                }
            ) {
                Icon(
                    Icons.Default.Logout,
                    contentDescription = "Dang xuat",
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        // Main content
        if (uiState.showStaffSelection && uiState.staffList.isNotEmpty()) {
            // Staff Selection Mode
            StaffSelectionContent(
                branchName = viewModel.getBranchName(),
                staffList = uiState.staffList,
                onStaffSelected = { viewModel.selectStaff(it) }
            )
        } else {
            // PIN Input Mode
            PinInputContent(
                branchName = viewModel.getBranchName(),
                selectedStaff = uiState.selectedStaff,
                pin = pin,
                onPinChange = { pin = it },
                isLoading = uiState.isLoading,
                error = uiState.error
            )
        }
    }
}

@Composable
private fun StaffSelectionContent(
    branchName: String,
    staffList: List<StaffEntity>,
    onStaffSelected: (StaffEntity) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(48.dp))

        // Header
        Text(
            text = branchName,
            fontSize = 18.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Chon nhan vien",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Cham vao ten cua ban de dang nhap",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Staff Grid
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 140.dp),
            contentPadding = PaddingValues(8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(staffList, key = { it.id }) { staff ->
                StaffCard(
                    staff = staff,
                    onClick = { onStaffSelected(staff) }
                )
            }
        }
    }
}

@Composable
private fun StaffCard(
    staff: StaffEntity,
    onClick: () -> Unit
) {
    val roleColor = when (staff.role.lowercase()) {
        "manager", "admin" -> Color(0xFF9C27B0)
        "cashier" -> Color(0xFF2196F3)
        "waiter" -> Color(0xFF4CAF50)
        "kitchen" -> Color(0xFFFF9800)
        "bar" -> Color(0xFFE91E63)
        else -> MaterialTheme.colorScheme.primary
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(roleColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                // Get initials
                val initials = staff.name.split(" ")
                    .mapNotNull { it.firstOrNull()?.uppercaseChar() }
                    .takeLast(2)
                    .joinToString("")

                Text(
                    text = initials.ifEmpty { "?" },
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = roleColor
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Name
            Text(
                text = staff.name,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onSurface
            )

            // Role badge
            Spacer(modifier = Modifier.height(4.dp))
            Box(
                modifier = Modifier
                    .background(roleColor.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 2.dp)
            ) {
                Text(
                    text = getRoleDisplayName(staff.role),
                    fontSize = 10.sp,
                    color = roleColor,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

private fun getRoleDisplayName(role: String): String {
    return when (role.lowercase()) {
        "manager" -> "Quan ly"
        "admin" -> "Admin"
        "cashier" -> "Thu ngan"
        "waiter" -> "Phuc vu"
        "kitchen" -> "Bep"
        "bar" -> "Pha che"
        else -> role
    }
}

@Composable
private fun PinInputContent(
    branchName: String,
    selectedStaff: StaffEntity?,
    pin: String,
    onPinChange: (String) -> Unit,
    isLoading: Boolean,
    error: String?
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Branch name
        Text(
            text = branchName,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Selected staff avatar (if any)
        if (selectedStaff != null) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                val initials = selectedStaff.name.split(" ")
                    .mapNotNull { it.firstOrNull()?.uppercaseChar() }
                    .takeLast(2)
                    .joinToString("")

                Text(
                    text = initials.ifEmpty { "?" },
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = selectedStaff.name,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(4.dp))
        }

        Text(
            text = "Nhap ma PIN",
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(24.dp))

        // PIN dots
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            repeat(4) { index ->
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .clip(CircleShape)
                        .background(
                            if (index < pin.length) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surfaceVariant
                        )
                )
            }
        }

        if (error != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = error,
                color = MaterialTheme.colorScheme.error,
                fontSize = 14.sp
            )
        }

        Spacer(modifier = Modifier.height(40.dp))

        // Number pad
        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("", "0", "⌫")
            ).forEach { row ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(20.dp),
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Spacer(modifier = Modifier.weight(1f))
                    row.forEach { key ->
                        if (key.isEmpty()) {
                            Spacer(modifier = Modifier.size(64.dp))
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .clickable(enabled = !isLoading) {
                                        when (key) {
                                            "⌫" -> if (pin.isNotEmpty()) onPinChange(pin.dropLast(1))
                                            else -> if (pin.length < 4) onPinChange(pin + key)
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                if (key == "⌫") {
                                    Icon(
                                        Icons.Default.Backspace,
                                        contentDescription = "Xoa",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                } else {
                                    Text(
                                        text = key,
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }

        if (isLoading) {
            Spacer(modifier = Modifier.height(24.dp))
            CircularProgressIndicator(modifier = Modifier.size(32.dp))
        }
    }
}
