package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.techres.ccb.data.local.entity.ProductNoteEntity
import com.techres.ccb.domain.model.*
import com.techres.ccb.presentation.screens.sale.formatCurrency

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProductVariantDialog(
    product: Product,
    availableNotes: List<ProductNoteEntity> = emptyList(),
    onDismiss: () -> Unit,
    onConfirm: (List<SelectedVariant>, String?) -> Unit
) {
    // State for selected variants
    val selectedOptions = remember {
        mutableStateMapOf<String, MutableList<String>>().apply {
            // Initialize with default options
            product.variants.forEach { group ->
                val defaults = group.options.filter { it.isDefault }.map { it.id }
                this[group.id] = defaults.toMutableList()
            }
        }
    }

    var quantity by remember { mutableIntStateOf(1) }
    var note by remember { mutableStateOf("") }
    val selectedNotes = remember { mutableStateListOf<String>() }

    // Calculate total price
    val variantPrice = product.variants.sumOf { group ->
        val selectedIds = selectedOptions[group.id] ?: emptyList()
        group.options.filter { it.id in selectedIds }.sumOf { it.price }
    }
    val unitPrice = product.price + variantPrice
    val totalPrice = unitPrice * quantity

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primary)
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = product.name,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Text(
                            text = formatCurrency(product.price),
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Đóng",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }

                // Variant Options
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    product.variants.forEach { group ->
                        VariantGroupSection(
                            group = group,
                            selectedIds = selectedOptions[group.id] ?: emptyList(),
                            onOptionSelected = { optionId ->
                                // Create a new list to trigger recomposition
                                val currentSelected = (selectedOptions[group.id] ?: emptyList()).toMutableList()
                                if (group.isMultiple) {
                                    // Toggle selection for multiple choice
                                    if (optionId in currentSelected) {
                                        currentSelected.remove(optionId)
                                    } else {
                                        currentSelected.add(optionId)
                                    }
                                } else {
                                    // Single selection
                                    currentSelected.clear()
                                    currentSelected.add(optionId)
                                }
                                // Assign new list to trigger state update
                                selectedOptions[group.id] = currentSelected
                            }
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // Quantity Section
                    Text(
                        text = "Số lượng",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        IconButton(
                            onClick = { if (quantity > 1) quantity-- },
                            modifier = Modifier
                                .size(48.dp)
                                .background(
                                    MaterialTheme.colorScheme.surfaceVariant,
                                    RoundedCornerShape(8.dp)
                                )
                        ) {
                            Icon(Icons.Default.Remove, contentDescription = "Giảm")
                        }

                        Text(
                            text = quantity.toString(),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 32.dp)
                        )

                        IconButton(
                            onClick = { quantity++ },
                            modifier = Modifier
                                .size(48.dp)
                                .background(
                                    MaterialTheme.colorScheme.primaryContainer,
                                    RoundedCornerShape(8.dp)
                                )
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Tăng")
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Note Section
                    Text(
                        text = "Ghi chú",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    // Available notes as chips
                    if (availableNotes.isNotEmpty()) {
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            availableNotes.forEach { noteEntity ->
                                val isSelected = noteEntity.name in selectedNotes
                                NoteChip(
                                    note = noteEntity.name,
                                    isSelected = isSelected,
                                    onClick = {
                                        if (isSelected) {
                                            selectedNotes.remove(noteEntity.name)
                                        } else {
                                            selectedNotes.add(noteEntity.name)
                                        }
                                    }
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Free-text note input
                    OutlinedTextField(
                        value = note,
                        onValueChange = { note = it },
                        placeholder = { Text("Ghi chú thêm...") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 2,
                        shape = RoundedCornerShape(8.dp)
                    )
                }

                // Footer with Total and Actions
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Thành tiền:",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = formatCurrency(totalPrice),
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Hủy")
                        }

                        Button(
                            onClick = {
                                // Build selected variants list
                                val variants = mutableListOf<SelectedVariant>()
                                product.variants.forEach { group ->
                                    val selectedIds = selectedOptions[group.id] ?: emptyList()
                                    group.options.filter { it.id in selectedIds }.forEach { option ->
                                        variants.add(
                                            SelectedVariant(
                                                groupId = group.id,
                                                groupName = group.name,
                                                optionId = option.id,
                                                name = option.name,
                                                price = option.price
                                            )
                                        )
                                    }
                                }
                                // Combine selected notes with free-text note
                                val allNotes = mutableListOf<String>()
                                allNotes.addAll(selectedNotes)
                                if (note.isNotBlank()) {
                                    allNotes.add(note.trim())
                                }
                                val finalNote = if (allNotes.isNotEmpty()) allNotes.joinToString(", ") else null
                                // Add multiple items based on quantity
                                repeat(quantity) {
                                    onConfirm(variants, finalNote)
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary
                            )
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Thêm vào đơn", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun VariantGroupSection(
    group: ProductVariantGroup,
    selectedIds: List<String>,
    onOptionSelected: (String) -> Unit
) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = group.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            if (group.isRequired) {
                Text(
                    text = " *",
                    color = MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.Bold
                )
            }
            if (group.isMultiple) {
                Text(
                    text = " (chọn nhiều)",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Option chips in a flow layout
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            group.options.forEach { option ->
                val isSelected = option.id in selectedIds
                VariantOptionChip(
                    option = option,
                    isSelected = isSelected,
                    onClick = { onOptionSelected(option.id) }
                )
            }
        }
    }
}

@Composable
fun VariantOptionChip(
    option: ProductVariantOption,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val backgroundColor = if (isSelected) {
        MaterialTheme.colorScheme.primaryContainer
    } else {
        MaterialTheme.colorScheme.surface
    }

    val borderColor = if (isSelected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(backgroundColor)
            .border(1.dp, borderColor, RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = option.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
            )
            if (option.price != 0L) {
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = if (option.price > 0) "+${formatCurrency(option.price)}" else formatCurrency(option.price),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (option.price > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FlowRow(
    modifier: Modifier = Modifier,
    horizontalArrangement: Arrangement.Horizontal = Arrangement.Start,
    verticalArrangement: Arrangement.Vertical = Arrangement.Top,
    content: @Composable () -> Unit
) {
    androidx.compose.foundation.layout.FlowRow(
        modifier = modifier,
        horizontalArrangement = horizontalArrangement,
        verticalArrangement = verticalArrangement
    ) {
        content()
    }
}

@Composable
fun NoteChip(
    note: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val backgroundColor = if (isSelected) {
        MaterialTheme.colorScheme.tertiaryContainer
    } else {
        MaterialTheme.colorScheme.surface
    }

    val borderColor = if (isSelected) {
        MaterialTheme.colorScheme.tertiary
    } else {
        MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(backgroundColor)
            .border(1.dp, borderColor, RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (isSelected) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.tertiary
                )
                Spacer(modifier = Modifier.width(4.dp))
            }
            Text(
                text = note,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) MaterialTheme.colorScheme.onTertiaryContainer else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}
