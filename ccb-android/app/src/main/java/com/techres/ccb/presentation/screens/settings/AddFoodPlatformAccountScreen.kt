package com.techres.ccb.presentation.screens.settings

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.remote.dto.StoreDto
import com.techres.ccb.presentation.components.PosTopAppBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddFoodPlatformAccountScreen(
    onNavigateBack: () -> Unit,
    onSuccess: () -> Unit,
    viewModel: AddFoodPlatformAccountViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Handle back press
    BackHandler {
        if (!viewModel.goBack()) {
            onNavigateBack()
        }
    }

    // Navigate on success
    LaunchedEffect(uiState.currentStep) {
        if (uiState.currentStep == LoginStep.SUCCESS) {
            // Delay a bit to show success message
            kotlinx.coroutines.delay(1500)
            onSuccess()
        }
    }

    Scaffold(
        topBar = {
            PosTopAppBar(
                title = {
                    Text(
                        when (uiState.currentStep) {
                            LoginStep.SELECT_PLATFORM -> "Chọn nền tảng"
                            LoginStep.ENTER_CREDENTIALS -> "Đăng nhập"
                            LoginStep.ENTER_OTP -> "Xác thực OTP"
                            LoginStep.SELECT_STORE -> "Chọn cửa hàng"
                            LoginStep.SUCCESS -> "Thành công"
                        }
                    )
                },
                onBack = {
                    if (!viewModel.goBack()) {
                        onNavigateBack()
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (uiState.currentStep) {
                LoginStep.SELECT_PLATFORM -> PlatformSelectionContent(
                    selectedPlatform = uiState.selectedPlatform,
                    isLoading = uiState.isLoading,
                    onSelectPlatform = { viewModel.selectPlatform(it) },
                    onProceed = { viewModel.proceedFromPlatformSelection() }
                )
                LoginStep.ENTER_CREDENTIALS -> CredentialsContent(
                    platform = uiState.selectedPlatform!!,
                    username = uiState.username,
                    password = uiState.password,
                    phoneNumber = uiState.phoneNumber,
                    isLoading = uiState.isLoading,
                    onUsernameChange = { viewModel.updateUsername(it) },
                    onPasswordChange = { viewModel.updatePassword(it) },
                    onPhoneNumberChange = { viewModel.updatePhoneNumber(it) },
                    onLogin = { viewModel.login() }
                )
                LoginStep.ENTER_OTP -> OtpContent(
                    otp = uiState.otp,
                    phoneNumber = uiState.phoneNumber,
                    expiresIn = uiState.otpExpiresIn,
                    isLoading = uiState.isLoading,
                    onOtpChange = { viewModel.updateOtp(it) },
                    onVerify = { viewModel.verifyOtp() },
                    onResendOtp = { viewModel.login() }
                )
                LoginStep.SELECT_STORE -> StoreSelectionContent(
                    stores = uiState.stores,
                    selectedStore = uiState.selectedStore,
                    isLoading = uiState.isLoading,
                    onSelectStore = { viewModel.selectStore(it) },
                    onConfirm = { viewModel.confirmStoreSelection() }
                )
                LoginStep.SUCCESS -> SuccessContent(
                    message = uiState.successMessage ?: "Liên kết thành công!"
                )
            }

            // Error snackbar
            if (uiState.error != null) {
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("Đóng", color = Color.White)
                        }
                    },
                    containerColor = MaterialTheme.colorScheme.error
                ) {
                    Text(uiState.error!!)
                }
            }
        }
    }
}

@Composable
private fun PlatformSelectionContent(
    selectedPlatform: FoodPlatform?,
    isLoading: Boolean,
    onSelectPlatform: (FoodPlatform) -> Unit,
    onProceed: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Chọn nền tảng giao đồ ăn bạn muốn liên kết",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            modifier = Modifier.padding(bottom = 24.dp)
        )

        FoodPlatform.entries.forEach { platform ->
            PlatformCard(
                platform = platform,
                isSelected = selectedPlatform == platform,
                onClick = { onSelectPlatform(platform) }
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = onProceed,
            enabled = selectedPlatform != null && !isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Text("Tiếp tục", fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun PlatformCard(
    platform: FoodPlatform,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val platformColor = when (platform) {
        FoodPlatform.GRAB -> Color(0xFF00B14F)
        FoodPlatform.SHOPEE_FOOD -> Color(0xFFEE4D2D)
        FoodPlatform.BEFOOD -> Color(0xFFFFB300)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .then(
                if (isSelected) Modifier.border(
                    2.dp,
                    platformColor,
                    RoundedCornerShape(12.dp)
                ) else Modifier
            ),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                platformColor.copy(alpha = 0.1f)
            else
                MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(platformColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = platform.displayName.first().toString(),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = platformColor
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = platform.displayName,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp
                )
                Text(
                    text = if (platform.authType == "username_password")
                        "Đăng nhập bằng tài khoản"
                    else
                        "Đăng nhập bằng OTP",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }

            if (isSelected) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = platformColor,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}

@Composable
private fun CredentialsContent(
    platform: FoodPlatform,
    username: String,
    password: String,
    phoneNumber: String,
    isLoading: Boolean,
    onUsernameChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onPhoneNumberChange: (String) -> Unit,
    onLogin: () -> Unit
) {
    var passwordVisible by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Platform info
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            )
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Store,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "Đăng nhập vào ${platform.displayName}",
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        if (platform.authType == "username_password") {
            // Username field
            OutlinedTextField(
                value = username,
                onValueChange = onUsernameChange,
                label = { Text("Tên đăng nhập / Email") },
                leadingIcon = {
                    Icon(Icons.Default.Person, contentDescription = null)
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Password field
            OutlinedTextField(
                value = password,
                onValueChange = onPasswordChange,
                label = { Text("Mật khẩu") },
                leadingIcon = {
                    Icon(Icons.Default.Lock, contentDescription = null)
                },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            if (passwordVisible) Icons.Default.VisibilityOff
                            else Icons.Default.Visibility,
                            contentDescription = null
                        )
                    }
                },
                visualTransformation = if (passwordVisible)
                    VisualTransformation.None
                else
                    PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = { onLogin() }
                )
            )
        } else {
            // Phone number field (for OTP)
            OutlinedTextField(
                value = phoneNumber,
                onValueChange = onPhoneNumberChange,
                label = { Text("Số điện thoại") },
                leadingIcon = {
                    Icon(Icons.Default.Phone, contentDescription = null)
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Phone,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = { onLogin() }
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Mã OTP sẽ được gửi đến số điện thoại này",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = onLogin,
            enabled = !isLoading && (
                (platform.authType == "username_password" && username.isNotBlank() && password.isNotBlank()) ||
                (platform.authType != "username_password" && phoneNumber.length >= 10)
            ),
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Text(
                    if (platform.authType == "username_password") "Đăng nhập" else "Gửi mã OTP",
                    fontSize = 16.sp
                )
            }
        }
    }
}

@Composable
private fun OtpContent(
    otp: String,
    phoneNumber: String,
    expiresIn: Int,
    isLoading: Boolean,
    onOtpChange: (String) -> Unit,
    onVerify: () -> Unit,
    onResendOtp: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.Sms,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Nhập mã OTP",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Mã xác thực đã được gửi đến\n$phoneNumber",
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
        )

        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = otp,
            onValueChange = { if (it.length <= 6) onOtpChange(it) },
            label = { Text("Mã OTP") },
            modifier = Modifier.fillMaxWidth(0.7f),
            textStyle = LocalTextStyle.current.copy(
                textAlign = TextAlign.Center,
                fontSize = 24.sp,
                letterSpacing = 8.sp
            ),
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Number,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onDone = { onVerify() }
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(onClick = onResendOtp, enabled = !isLoading) {
            Text("Gửi lại mã OTP")
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = onVerify,
            enabled = !isLoading && otp.length >= 4,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Text("Xác nhận", fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun StoreSelectionContent(
    stores: List<StoreDto>,
    selectedStore: StoreDto?,
    isLoading: Boolean,
    onSelectStore: (StoreDto) -> Unit,
    onConfirm: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Chọn cửa hàng bạn muốn liên kết",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            modifier = Modifier.padding(bottom = 16.dp)
        )

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(stores) { store ->
                StoreCard(
                    store = store,
                    isSelected = selectedStore == store,
                    onClick = { onSelectStore(store) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onConfirm,
            enabled = selectedStore != null && !isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Text("Xác nhận", fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun StoreCard(
    store: StoreDto,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .then(
                if (isSelected) Modifier.border(
                    2.dp,
                    MaterialTheme.colorScheme.primary,
                    RoundedCornerShape(12.dp)
                ) else Modifier
            ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Storefront,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(40.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = store.storeName ?: "Cửa hàng",
                    fontWeight = FontWeight.SemiBold
                )
                if (!store.storeAddress.isNullOrBlank()) {
                    Text(
                        text = store.storeAddress,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }

            if (isSelected) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun SuccessContent(message: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.CheckCircle,
            contentDescription = null,
            modifier = Modifier.size(100.dp),
            tint = Color(0xFF4CAF50)
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Liên kết thành công!",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF4CAF50)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = message,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
        )

        Spacer(modifier = Modifier.height(24.dp))

        CircularProgressIndicator(
            modifier = Modifier.size(24.dp),
            strokeWidth = 2.dp
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Đang chuyển hướng...",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
        )
    }
}
