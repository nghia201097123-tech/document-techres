package com.techres.ccb.data.repository

import com.techres.ccb.data.local.dao.ProductDao
import com.techres.ccb.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductRepository @Inject constructor(
    private val productDao: ProductDao
) {
    fun getAllProducts(branchId: String): Flow<List<ProductEntity>> {
        return productDao.getAllAvailableByBranch(branchId)
    }

    fun getActiveProducts(branchId: String): Flow<List<ProductEntity>> {
        return productDao.getAllAvailableByBranch(branchId)
    }

    fun getProductsByCategory(branchId: String, categoryId: String): Flow<List<ProductEntity>> {
        return productDao.getByCategoryAndBranch(branchId, categoryId)
    }

    suspend fun getProductById(id: String): ProductEntity? {
        return productDao.getById(id)
    }

    fun searchProductsFlow(branchId: String, query: String): Flow<List<ProductEntity>> {
        return productDao.searchProducts(branchId, query)
    }

    suspend fun searchProducts(branchId: String, query: String): List<ProductEntity> {
        return productDao.searchProducts(branchId, query).first()
    }

    suspend fun syncProducts(branchId: String, products: List<ProductEntity>) {
        productDao.syncProducts(branchId, products)
    }

    suspend fun insertProduct(product: ProductEntity) {
        productDao.insert(product)
    }

    suspend fun updateProduct(product: ProductEntity) {
        productDao.update(product)
    }

    suspend fun deleteProduct(product: ProductEntity) {
        productDao.delete(product)
    }
}
