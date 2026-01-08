package com.techres.ccb.presentation.screens.branch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.BrandEntity
import com.techres.ccb.data.local.entity.BranchEntity
import com.techres.ccb.data.repository.BranchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// UI models
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

    // Keep original entities for saving
    private var brandEntityMap: Map<String, BrandEntity> = emptyMap()
    private var branchEntityMap: Map<String, BranchEntity> = emptyMap()

    init {
        loadBrandsFromLocal()
    }

    /**
     * Load brands and branches from LOCAL database
     */
    fun loadBrandsFromLocal() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Get brands from local DB
                val brandEntities = branchRepository.getAllBrandsLocal().first()

                if (brandEntities.isEmpty()) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            brands = emptyList(),
                            error = "Chưa có dữ liệu. Vui lòng đồng bộ dữ liệu trước."
                        )
                    }
                    return@launch
                }

                // Store original entities
                brandEntityMap = brandEntities.associateBy { it.id }

                // Get all branches and group by brand
                val allBranches = branchRepository.getAllBranchesLocal().first()
                branchEntityMap = allBranches.associateBy { it.id }
                val branchesByBrand = allBranches.groupBy { it.brandId }

                // Map to UI models
                val brands = brandEntities.map { brandEntity ->
                    val branches = branchesByBrand[brandEntity.id]?.map { branchEntity ->
                        Branch(
                            id = branchEntity.id,
                            name = branchEntity.name,
                            address = branchEntity.address ?: "",
                            brandId = branchEntity.brandId
                        )
                    } ?: emptyList()

                    Brand(
                        id = brandEntity.id,
                        name = brandEntity.name,
                        logo = brandEntity.logo,
                        branches = branches
                    )
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        brands = brands,
                        error = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Lỗi khi tải dữ liệu"
                    )
                }
            }
        }
    }

    /**
     * Reload brands - for retry button
     */
    fun loadBrands() {
        loadBrandsFromLocal()
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

        val brandEntity = brandEntityMap[selectedBrand.id]
        val branchEntity = branchEntityMap[selectedBranch.id]

        if (brandEntity != null && branchEntity != null) {
            branchRepository.saveSelectedBranch(brandEntity, branchEntity)
            return true
        }

        return false
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
