package com.techres.ccb.presentation.screens.branch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class Brand(
    val id: String,
    val name: String,
    val logo: String? = null,
    val branches: List<Branch> = emptyList()
)

data class Branch(
    val id: String,
    val name: String,
    val address: String,
    val brandId: String
)

data class BranchSelectionUiState(
    val isLoading: Boolean = false,
    val brands: List<Brand> = emptyList(),
    val selectedBrand: Brand? = null,
    val selectedBranch: Branch? = null,
    val error: String? = null
)

@HiltViewModel
class BranchSelectionViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(BranchSelectionUiState())
    val uiState: StateFlow<BranchSelectionUiState> = _uiState.asStateFlow()

    init {
        loadBrands()
    }

    private fun loadBrands() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Mock data - thay bằng API call thực tế
            val brands = listOf(
                Brand(
                    id = "brand_1",
                    name = "TechRes Coffee",
                    branches = listOf(
                        Branch("branch_1", "Chi nhánh Quận 1", "123 Nguyễn Huệ, Q.1", "brand_1"),
                        Branch("branch_2", "Chi nhánh Quận 3", "456 Võ Văn Tần, Q.3", "brand_1"),
                        Branch("branch_3", "Chi nhánh Quận 7", "789 Nguyễn Văn Linh, Q.7", "brand_1")
                    )
                ),
                Brand(
                    id = "brand_2",
                    name = "TechRes Restaurant",
                    branches = listOf(
                        Branch("branch_4", "Chi nhánh Bình Thạnh", "111 Điện Biên Phủ, Bình Thạnh", "brand_2"),
                        Branch("branch_5", "Chi nhánh Tân Bình", "222 Cộng Hòa, Tân Bình", "brand_2")
                    )
                ),
                Brand(
                    id = "brand_3",
                    name = "TechRes Tea & More",
                    branches = listOf(
                        Branch("branch_6", "Chi nhánh Gò Vấp", "333 Quang Trung, Gò Vấp", "brand_3")
                    )
                )
            )

            _uiState.update {
                it.copy(
                    isLoading = false,
                    brands = brands
                )
            }
        }
    }

    fun selectBrand(brand: Brand) {
        _uiState.update {
            it.copy(
                selectedBrand = brand,
                selectedBranch = null // Reset branch selection
            )
        }
    }

    fun selectBranch(branch: Branch) {
        _uiState.update { it.copy(selectedBranch = branch) }
    }

    fun canProceed(): Boolean {
        return _uiState.value.selectedBranch != null
    }
}
