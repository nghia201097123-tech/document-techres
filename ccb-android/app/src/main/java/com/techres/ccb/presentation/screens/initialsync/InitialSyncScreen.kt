package com.techres.ccb.presentation.screens.initialsync

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.repository.BranchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InitialSyncUiState(
    val isLoading: Boolean = false,
    val progress: Float = 0f,
    val statusMessage: String = "Chuẩn bị đồng bộ...",
    val isCompleted: Boolean = false,
    val error: String? = null,
    val brandsCount: Int = 0,
    val branchesCount: Int = 0
)

@HiltViewModel
class InitialSyncViewModel @Inject constructor(
    private val branchRepository: BranchRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(InitialSyncUiState())
    val uiState: StateFlow<InitialSyncUiState> = _uiState.asStateFlow()

    fun startSync(onComplete: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, progress = 0f) }

            // Step 1: Connecting
            _uiState.update { it.copy(statusMessage = "Đang kết nối server...", progress = 0.2f) }
            delay(500)

            // Step 2: Syncing brands and branches
            _uiState.update { it.copy(statusMessage = "Đang đồng bộ thương hiệu và chi nhánh...", progress = 0.4f) }

            val result = branchRepository.syncBrandsAndBranches()

            result.fold(
                onSuccess = { totalCount ->
                    _uiState.update { it.copy(progress = 0.8f, statusMessage = "Đang hoàn tất...") }
                    delay(300)

                    // Get counts
                    val brandsCount = branchRepository.getBrandsCount()
                    val branchesCount = branchRepository.getBranchesCount()

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isCompleted = true,
                            progress = 1f,
                            statusMessage = "Hoàn tất!",
                            brandsCount = brandsCount,
                            branchesCount = branchesCount
                        )
                    }

                    delay(800)
                    onComplete()
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "Đồng bộ thất bại",
                            statusMessage = "Đồng bộ thất bại"
                        )
                    }
                }
            )
        }
    }

    fun retry(onComplete: () -> Unit) {
        _uiState.update {
            InitialSyncUiState()
        }
        startSync(onComplete)
    }
}

@Composable
fun InitialSyncScreen(
    viewModel: InitialSyncViewModel = hiltViewModel(),
    onSyncComplete: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.startSync(onSyncComplete)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF1976D2)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            // Icon
            Icon(
                imageVector = Icons.Default.CloudDownload,
                contentDescription = null,
                modifier = Modifier.size(80.dp),
                tint = Color.White
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Title
            Text(
                text = "Đồng bộ dữ liệu",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Status message
            Text(
                text = uiState.statusMessage,
                fontSize = 16.sp,
                color = Color.White.copy(alpha = 0.8f),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Progress indicator
            if (uiState.isLoading) {
                LinearProgressIndicator(
                    progress = { uiState.progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp),
                    color = Color.White,
                    trackColor = Color.White.copy(alpha = 0.3f)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "${(uiState.progress * 100).toInt()}%",
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.8f)
                )
            }

            // Success state
            if (uiState.isCompleted) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = Color(0xFF4CAF50)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.2f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row {
                            Text(
                                text = "${uiState.brandsCount}",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Thương hiệu",
                                fontSize = 14.sp,
                                color = Color.White.copy(alpha = 0.8f),
                                modifier = Modifier.align(Alignment.Bottom)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row {
                            Text(
                                text = "${uiState.branchesCount}",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Chi nhánh",
                                fontSize = 14.sp,
                                color = Color.White.copy(alpha = 0.8f),
                                modifier = Modifier.align(Alignment.Bottom)
                            )
                        }
                    }
                }
            }

            // Error state
            if (uiState.error != null) {
                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.Error,
                            contentDescription = null,
                            tint = Color.Red,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = uiState.error ?: "Đồng bộ thất bại",
                            color = Color.Red,
                            textAlign = TextAlign.Center
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = { viewModel.retry(onSyncComplete) },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null,
                        tint = Color(0xFF1976D2)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Thử lại",
                        color = Color(0xFF1976D2)
                    )
                }
            }
        }
    }
}
