package com.techres.ccb.presentation.screens.branch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.remote.dto.BrandDto
import com.techres.ccb.data.remote.dto.BranchDto
import com.techres.ccb.data.repository.BranchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// UI models (mapped from DTOs)
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
class BranchSelectionViewModel @Inject constructor(
    private val branchRepository: BranchRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BranchSelectionUiState())
    val uiState: StateFlow<BranchSelectionUiState> = _uiState.asStateFlow()

    // Keep original DTOs for saving
    private var brandDtoMap: Map<String, BrandDto> = emptyMap()
    private var branchDtoMap: Map<String, BranchDto> = emptyMap()

    init {
        loadBrands()
    }

    fun loadBrands() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = branchRepository.getBrands()
            result.fold(
                onSuccess = { brandDtos ->
                    // Store original DTOs
                    brandDtoMap = brandDtos.associateBy { it.id }
                    branchDtoMap = brandDtos.flatMap { brand ->
                        brand.branches?.map { it.id to it } ?: emptyList()
                    }.toMap()

                    // Map to UI models
                    val brands = brandDtos.filter { it.isActive }.map { dto ->
                        Brand(
                            id = dto.id,
                            name = dto.name,
                            logo = dto.logo,
                            branches = dto.branches?.filter { it.isActive }?.map { branchDto ->
                                Branch(
                                    id = branchDto.id,
                                    name = branchDto.name,
                                    address = branchDto.address ?: "",
                                    brandId = branchDto.brandId
                                )
                            } ?: emptyList()
                        )
                    }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            brands = brands,
                            error = null
                        )
                    }
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "Không thể tải danh sách thương hiệu"
                        )
                    }
                }
            )
        }
    }

    fun selectBrand(brand: Brand) {
        _uiState.update {
            it.copy(
                selectedBrand = brand,
                selectedBranch = null, // Reset branch selection
                error = null
            )
        }
    }

    fun selectBranch(branch: Branch) {
        _uiState.update { it.copy(selectedBranch = branch, error = null) }
    }

    fun canProceed(): Boolean {
        return _uiState.value.selectedBranch != null
    }

    /**
     * Save selected branch and return true if successful
     */
    fun confirmSelection(): Boolean {
        val selectedBrand = _uiState.value.selectedBrand ?: return false
        val selectedBranch = _uiState.value.selectedBranch ?: return false

        val brandDto = brandDtoMap[selectedBrand.id]
        val branchDto = branchDtoMap[selectedBranch.id]

        if (brandDto != null && branchDto != null) {
            branchRepository.saveSelectedBranch(brandDto, branchDto)
            return true
        }

        return false
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
