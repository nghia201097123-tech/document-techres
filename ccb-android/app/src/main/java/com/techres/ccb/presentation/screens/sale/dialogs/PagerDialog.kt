package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/**
 * Số lượng thẻ rung hiển thị trong grid chọn nhanh
 */
enum class PagerGridSize(val count: Int, val columns: Int) {
    SIZE_8(8, 4),
    SIZE_16(16, 4),
    SIZE_32(32, 8),
    SIZE_64(64, 8),
    SIZE_99(99, 10);

    companion object {
        fun fromCount(count: Int): PagerGridSize {
            return entries.find { it.count == count } ?: SIZE_16
        }
    }
}

/**
 * Dialog for selecting pager/buzzer number (Thẻ rung)
 * One-tap selection - tap a number to select and close immediately
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PagerDialog(
    currentPagerNumber: Int? = null,
    gridSize: PagerGridSize = PagerGridSize.SIZE_16,
    usedPagerNumbers: Set<Int> = emptySet(),
    onDismiss: () -> Unit,
    onConfirm: (Int?) -> Unit,
    onClear: () -> Unit,
    onAutoGenerate: () -> Unit,
    onGridSizeChanged: ((PagerGridSize) -> Unit)? = null
) {
    var selectedGridSize by remember { mutableStateOf(gridSize) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = true
        )
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.8f),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Header with close and clear buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Vibration,
                            contentDescription = null,
                            tint = Color(0xFFFF5722),
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Chọn thẻ rung",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        // Current number badge
                        if (currentPagerNumber != null) {
                            Spacer(modifier = Modifier.width(12.dp))
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color(0xFFFF5722)
                            ) {
                                Text(
                                    text = "$currentPagerNumber",
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                            }
                        }
                    }

                    Row {
                        // Clear/Skip button
                        TextButton(
                            onClick = { onClear() },
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = MaterialTheme.colorScheme.error
                            )
                        ) {
                            Icon(Icons.Default.Clear, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Bỏ qua")
                        }

                        // Close button
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Đóng")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Grid size selector row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Số lượng:",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    PagerGridSize.entries.forEach { size ->
                        FilterChip(
                            selected = selectedGridSize == size,
                            onClick = {
                                selectedGridSize = size
                                onGridSizeChanged?.invoke(size)
                            },
                            label = { Text("${size.count}", fontSize = 13.sp) },
                            modifier = Modifier.height(32.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFFFF5722),
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Main grid - takes remaining space, one-tap selection
                val numbers = (1..selectedGridSize.count).toList()

                LazyVerticalGrid(
                    columns = GridCells.Fixed(selectedGridSize.columns),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    contentPadding = PaddingValues(vertical = 4.dp)
                ) {
                    items(numbers) { number ->
                        val isCurrentSelection = currentPagerNumber == number
                        val isUsed = number in usedPagerNumbers

                        val backgroundColor = when {
                            isCurrentSelection -> Color(0xFFFF5722).copy(alpha = 0.3f)
                            isUsed -> Color(0xFF2196F3).copy(alpha = 0.2f) // Blue for used
                            else -> MaterialTheme.colorScheme.surfaceVariant
                        }

                        val textColor = when {
                            isCurrentSelection -> Color(0xFFFF5722)
                            isUsed -> Color(0xFF2196F3) // Blue for used
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        }

                        val borderModifier = when {
                            isCurrentSelection -> Modifier.border(3.dp, Color(0xFFFF5722), RoundedCornerShape(8.dp))
                            isUsed -> Modifier.border(2.dp, Color(0xFF2196F3), RoundedCornerShape(8.dp))
                            else -> Modifier
                        }

                        Surface(
                            modifier = Modifier
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    // One-tap: select and close immediately
                                    onConfirm(number)
                                }
                                .then(borderModifier),
                            color = backgroundColor,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize()
                            ) {
                                Text(
                                    text = "$number",
                                    fontSize = when {
                                        selectedGridSize.columns <= 4 -> 22.sp
                                        selectedGridSize.columns <= 8 -> 18.sp
                                        else -> 14.sp
                                    },
                                    fontWeight = if (isCurrentSelection || isUsed) FontWeight.Bold else FontWeight.Medium,
                                    color = textColor
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
