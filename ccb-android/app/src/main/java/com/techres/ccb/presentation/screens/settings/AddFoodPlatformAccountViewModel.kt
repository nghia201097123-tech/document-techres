package com.techres.ccb.presentation.screens.settings

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.remote.dto.StoreDto
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.FoodPlatformRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class FoodPlatform(val displayName: String, val authType: String, val apiValue: String) {
    GRAB("GrabFood", "username_password", "grab"),
    SHOPEE_FOOD("ShopeeFood", "username_password", "shopee_food"),
    BEFOOD("BeFood", "phone_otp", "befood")
}

enum class LoginStep {
    SELECT_PLATFORM,
    ENTER_CREDENTIALS,
    ENTER_OTP,
    SELECT_STORE,
    SUCCESS
}

data class AddFoodPlatformAccountUiState(
    val currentStep: LoginStep = LoginStep.SELECT_PLATFORM,
    val selectedPlatform: FoodPlatform? = null,
    val accountId: String? = null,

    // Username/Password login
    val username: String = "",
    val password: String = "",

    // OTP login
    val phoneNumber: String = "",
    val otp: String = "",
    val otpExpiresIn: Int = 0,

    // Store selection
    val stores: List<StoreDto> = emptyList(),
    val selectedStore: StoreDto? = null,

    // Status
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class AddFoodPlatformAccountViewModel @Inject constructor(
    private val foodPlatformRepository: FoodPlatformRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    companion object {
        private const val TAG = "AddFoodPlatformVM"
    }

    private val _uiState = MutableStateFlow(AddFoodPlatformAccountUiState())
    val uiState: StateFlow<AddFoodPlatformAccountUiState> = _uiState.asStateFlow()

    fun selectPlatform(platform: FoodPlatform) {
        _uiState.update { it.copy(selectedPlatform = platform) }
    }

    /**
     * Initialize for relogin flow - skip platform selection and go directly to credentials
     * Used when user wants to re-enter credentials for an existing disconnected account
     */
    fun initForRelogin(accountId: String, platformValue: String) {
        val platform = FoodPlatform.values().find { it.apiValue == platformValue }
        if (platform != null) {
            Log.d(TAG, "Initializing relogin for account: $accountId, platform: ${platform.displayName}")
            _uiState.update {
                it.copy(
                    accountId = accountId,
                    selectedPlatform = platform,
                    currentStep = LoginStep.ENTER_CREDENTIALS
                )
            }
        } else {
            Log.e(TAG, "Unknown platform: $platformValue")
            _uiState.update { it.copy(error = "Nền tảng không hợp lệ") }
        }
    }

    fun proceedFromPlatformSelection() {
        val platform = _uiState.value.selectedPlatform ?: return
        createAccountAndProceed(platform)
    }

    private fun createAccountAndProceed(platform: FoodPlatform) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val tenantId = authRepository.getTenantId() ?: ""
            val branchId = authRepository.getBranchId()
            val displayName = "${platform.displayName} - Chi nhánh"

            Log.d(TAG, "Creating account for platform: ${platform.apiValue}, tenantId: $tenantId")

            val result = foodPlatformRepository.createAccount(
                tenantId = tenantId,
                platform = platform.apiValue,
                authType = platform.authType,
                displayName = displayName
            )

            result.fold(
                onSuccess = { account ->
                    Log.d(TAG, "Account created: ${account.id}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            accountId = account.id,
                            currentStep = LoginStep.ENTER_CREDENTIALS
                        )
                    }
                },
                onFailure = { e ->
                    Log.e(TAG, "Create account failed: ${e.message}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "Không thể tạo tài khoản"
                        )
                    }
                }
            )
        }
    }

    fun updateUsername(value: String) {
        _uiState.update { it.copy(username = value) }
    }

    fun updatePassword(value: String) {
        _uiState.update { it.copy(password = value) }
    }

    fun updatePhoneNumber(value: String) {
        _uiState.update { it.copy(phoneNumber = value) }
    }

    fun updateOtp(value: String) {
        _uiState.update { it.copy(otp = value) }
    }

    fun login() {
        val platform = _uiState.value.selectedPlatform ?: return

        if (platform.authType == "username_password") {
            loginWithPassword()
        } else {
            requestOtp()
        }
    }

    private fun loginWithPassword() {
        val accountId = _uiState.value.accountId ?: return
        val username = _uiState.value.username
        val password = _uiState.value.password

        if (username.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(error = "Vui lòng nhập đầy đủ thông tin") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val branchId = authRepository.getBranchId()

            val result = foodPlatformRepository.login(
                accountId = accountId,
                username = username,
                password = password,
                branchId = branchId
            )

            result.fold(
                onSuccess = { loginResult ->
                    Log.d(TAG, "Login successful: ${loginResult.merchantName}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            currentStep = LoginStep.SUCCESS,
                            successMessage = "Đăng nhập thành công! Tài khoản: ${loginResult.merchantName ?: username}"
                        )
                    }
                },
                onFailure = { e ->
                    Log.e(TAG, "Login failed: ${e.message}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "Đăng nhập thất bại"
                        )
                    }
                }
            )
        }
    }

    private fun requestOtp() {
        val accountId = _uiState.value.accountId ?: return
        val phoneNumber = _uiState.value.phoneNumber

        if (phoneNumber.isBlank() || phoneNumber.length < 10) {
            _uiState.update { it.copy(error = "Vui lòng nhập số điện thoại hợp lệ") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = foodPlatformRepository.requestOtp(accountId, phoneNumber)

            result.fold(
                onSuccess = { otpResult ->
                    Log.d(TAG, "OTP requested, expires in: ${otpResult.expiresIn}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            currentStep = LoginStep.ENTER_OTP,
                            otpExpiresIn = otpResult.expiresIn ?: 300
                        )
                    }
                },
                onFailure = { e ->
                    Log.e(TAG, "Request OTP failed: ${e.message}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "Gửi OTP thất bại"
                        )
                    }
                }
            )
        }
    }

    fun verifyOtp() {
        val accountId = _uiState.value.accountId ?: return
        val otp = _uiState.value.otp

        if (otp.isBlank() || otp.length < 4) {
            _uiState.update { it.copy(error = "Vui lòng nhập mã OTP") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = foodPlatformRepository.verifyOtp(accountId, otp)

            result.fold(
                onSuccess = { verifyResult ->
                    Log.d(TAG, "OTP verified, stores: ${verifyResult.stores?.size}")

                    if (!verifyResult.stores.isNullOrEmpty()) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                stores = verifyResult.stores,
                                currentStep = LoginStep.SELECT_STORE
                            )
                        }
                    } else {
                        // No stores to select, directly success
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                currentStep = LoginStep.SUCCESS,
                                successMessage = "Xác thực thành công!"
                            )
                        }
                    }
                },
                onFailure = { e ->
                    Log.e(TAG, "Verify OTP failed: ${e.message}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "Mã OTP không chính xác"
                        )
                    }
                }
            )
        }
    }

    fun selectStore(store: StoreDto) {
        _uiState.update { it.copy(selectedStore = store) }
    }

    fun confirmStoreSelection() {
        val accountId = _uiState.value.accountId ?: return
        val store = _uiState.value.selectedStore ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = foodPlatformRepository.selectStore(
                accountId = accountId,
                merchantId = store.merchantId ?: "",
                storeName = store.storeName ?: ""
            )

            result.fold(
                onSuccess = { loginResult ->
                    Log.d(TAG, "Store selected: ${loginResult.merchantName}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            currentStep = LoginStep.SUCCESS,
                            successMessage = "Liên kết thành công! Cửa hàng: ${loginResult.merchantName ?: store.storeName}"
                        )
                    }
                },
                onFailure = { e ->
                    Log.e(TAG, "Select store failed: ${e.message}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "Chọn cửa hàng thất bại"
                        )
                    }
                }
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun goBack(): Boolean {
        val currentStep = _uiState.value.currentStep
        return when (currentStep) {
            LoginStep.SELECT_PLATFORM -> false
            LoginStep.ENTER_CREDENTIALS -> {
                _uiState.update { it.copy(currentStep = LoginStep.SELECT_PLATFORM) }
                true
            }
            LoginStep.ENTER_OTP -> {
                _uiState.update { it.copy(currentStep = LoginStep.ENTER_CREDENTIALS, otp = "") }
                true
            }
            LoginStep.SELECT_STORE -> {
                _uiState.update { it.copy(currentStep = LoginStep.ENTER_OTP) }
                true
            }
            LoginStep.SUCCESS -> false
        }
    }
}
