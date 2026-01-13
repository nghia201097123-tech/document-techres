package com.techres.ccb.data.sync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Network Monitor compatible với Android 6.0+
 * - Sử dụng NetworkCallback cho API 24+
 * - Sử dụng BroadcastReceiver cho API 23 (Android 6)
 */
@Singleton
class NetworkMonitor @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val _isOnline = MutableStateFlow(false)
    val isOnline: StateFlow<Boolean> = _isOnline

    private val _networkState = MutableStateFlow(NetworkState.Unknown)
    val networkState: StateFlow<NetworkState> = _networkState

    // BroadcastReceiver cho Android 6 (API 23)
    private val networkReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Timber.d("Network broadcast received")
            updateNetworkStatus()
        }
    }

    // NetworkCallback cho Android 7+ (API 24+)
    private val networkCallback = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Timber.d("Network available")
                _isOnline.value = true
                _networkState.value = NetworkState.Online
            }

            override fun onLost(network: Network) {
                Timber.d("Network lost")
                _isOnline.value = false
                _networkState.value = NetworkState.Offline
            }

            override fun onCapabilitiesChanged(
                network: Network,
                capabilities: NetworkCapabilities
            ) {
                val hasInternet = capabilities.hasCapability(
                    NetworkCapabilities.NET_CAPABILITY_INTERNET
                )
                val isValidated = capabilities.hasCapability(
                    NetworkCapabilities.NET_CAPABILITY_VALIDATED
                )

                _isOnline.value = hasInternet && isValidated

                _networkState.value = when {
                    !hasInternet -> NetworkState.Offline
                    !isValidated -> NetworkState.OnlineButNotValidated
                    else -> NetworkState.Online
                }
            }
        }
    } else null

    private var isMonitoring = false

    /**
     * Bắt đầu theo dõi trạng thái mạng
     */
    fun startMonitoring() {
        if (isMonitoring) return

        isMonitoring = true

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            // API 24+ - sử dụng NetworkCallback
            Timber.d("Starting network monitoring with NetworkCallback (API ${Build.VERSION.SDK_INT})")
            networkCallback?.let {
                connectivityManager.registerDefaultNetworkCallback(it)
            }
        } else {
            // API 23 (Android 6) - sử dụng BroadcastReceiver
            Timber.d("Starting network monitoring with BroadcastReceiver (API ${Build.VERSION.SDK_INT})")
            @Suppress("DEPRECATION")
            context.registerReceiver(
                networkReceiver,
                IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION)
            )
        }

        // Initial status check
        updateNetworkStatus()
    }

    /**
     * Dừng theo dõi trạng thái mạng
     */
    fun stopMonitoring() {
        if (!isMonitoring) return

        isMonitoring = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            networkCallback?.let {
                try {
                    connectivityManager.unregisterNetworkCallback(it)
                } catch (e: Exception) {
                    Timber.e(e, "Error unregistering network callback")
                }
            }
        } else {
            try {
                context.unregisterReceiver(networkReceiver)
            } catch (e: Exception) {
                Timber.e(e, "Error unregistering broadcast receiver")
            }
        }
    }

    /**
     * Cập nhật trạng thái mạng hiện tại
     */
    private fun updateNetworkStatus() {
        val isConnected = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        } else {
            @Suppress("DEPRECATION")
            connectivityManager.activeNetworkInfo?.isConnected == true
        }

        _isOnline.value = isConnected
        _networkState.value = if (isConnected) NetworkState.Online else NetworkState.Offline

        Timber.d("Network status updated: isOnline=$isConnected")
    }

    /**
     * Kiểm tra trạng thái mạng tức thời (không qua Flow)
     */
    fun isCurrentlyOnline(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        } else {
            @Suppress("DEPRECATION")
            connectivityManager.activeNetworkInfo?.isConnected == true
        }
    }

    /**
     * Lấy loại kết nối hiện tại
     */
    fun getConnectionType(): ConnectionType {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)

            when {
                capabilities == null -> ConnectionType.None
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> ConnectionType.Wifi
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> ConnectionType.Cellular
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> ConnectionType.Ethernet
                else -> ConnectionType.Other
            }
        } else {
            @Suppress("DEPRECATION")
            when (connectivityManager.activeNetworkInfo?.type) {
                ConnectivityManager.TYPE_WIFI -> ConnectionType.Wifi
                ConnectivityManager.TYPE_MOBILE -> ConnectionType.Cellular
                ConnectivityManager.TYPE_ETHERNET -> ConnectionType.Ethernet
                else -> ConnectionType.None
            }
        }
    }
}

enum class NetworkState {
    Unknown,
    Offline,
    Online,
    OnlineButNotValidated,
    OnlineButApiUnreachable
}

enum class ConnectionType {
    None,
    Wifi,
    Cellular,
    Ethernet,
    Other
}
