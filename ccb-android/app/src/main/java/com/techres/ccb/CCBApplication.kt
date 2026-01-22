package com.techres.ccb

import android.app.Application
import android.util.Log
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber

@HiltAndroidApp
class CCBApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Initialize Timber for logging
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        } else {
            // Release build: Plant a tree that still logs important socket events
            Timber.plant(ReleaseTree())
        }

        Timber.d("CCB Application started")
    }

    /**
     * Custom Timber tree for release builds
     * Only logs WARN and above, plus specific tags for socket debugging
     */
    private class ReleaseTree : Timber.Tree() {
        override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
            // Always log warnings and errors
            if (priority >= Log.WARN) {
                Log.println(priority, tag ?: "CCB", message)
                return
            }

            // Also log socket-related messages at DEBUG level for troubleshooting
            if (message.contains("[SOCKET]") || tag?.contains("Socket") == true) {
                Log.d(tag ?: "CCB-Socket", message)
            }
        }
    }
}
