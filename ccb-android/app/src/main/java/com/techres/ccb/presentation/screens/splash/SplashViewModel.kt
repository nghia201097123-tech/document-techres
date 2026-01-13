package com.techres.ccb.presentation.screens.splash

import androidx.lifecycle.ViewModel
import com.techres.ccb.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    fun isDeviceLoggedIn(): Boolean = authRepository.isLoggedIn()

    fun isStaffLoggedIn(): Boolean = authRepository.isStaffLoggedIn()
}
