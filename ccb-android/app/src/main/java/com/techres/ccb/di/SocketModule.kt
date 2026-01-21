package com.techres.ccb.di

import com.techres.ccb.data.socket.PaymentAnnouncementService
import com.techres.ccb.data.socket.PaymentSocketManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for Socket.IO and payment notification services
 */
@Module
@InstallIn(SingletonComponent::class)
object SocketModule {

    // PaymentSocketManager and PaymentAnnouncementService are @Singleton classes
    // with @Inject constructors, so they are automatically provided by Hilt.
    // This module is kept for any future custom configurations.
}
