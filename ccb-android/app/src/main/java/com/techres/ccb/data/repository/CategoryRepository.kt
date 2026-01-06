package com.techres.ccb.data.repository

import com.techres.ccb.data.local.dao.CategoryDao
import com.techres.ccb.data.local.entity.CategoryEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CategoryRepository @Inject constructor(
    private val categoryDao: CategoryDao
) {
    fun getAllCategories(branchId: String): Flow<List<CategoryEntity>> {
        return categoryDao.getAllCategories(branchId)
    }

    fun getActiveCategories(branchId: String): Flow<List<CategoryEntity>> {
        return categoryDao.getActiveCategories(branchId)
    }

    suspend fun getCategoryById(id: String): CategoryEntity? {
        return categoryDao.getCategoryById(id)
    }

    suspend fun syncCategories(branchId: String, categories: List<CategoryEntity>) {
        categoryDao.syncCategories(branchId, categories)
    }

    suspend fun insertCategory(category: CategoryEntity) {
        categoryDao.insert(category)
    }

    suspend fun updateCategory(category: CategoryEntity) {
        categoryDao.update(category)
    }

    suspend fun deleteCategory(category: CategoryEntity) {
        categoryDao.delete(category)
    }
}
