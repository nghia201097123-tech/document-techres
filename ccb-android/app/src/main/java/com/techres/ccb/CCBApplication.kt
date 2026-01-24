package com.techres.ccb

import android.app.Application
import android.os.Build
import android.util.Log
import coil.ImageLoader
import coil.ImageLoaderFactory
import com.techres.ccb.data.printer.HybridBillPrintService
import com.techres.ccb.printer.adapter.SunmiPrinterAdapter
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.HiltAndroidApp
import dagger.hilt.components.SingletonComponent
import okhttp3.ConnectionSpec
import okhttp3.OkHttpClient
import okhttp3.TlsVersion
import timber.log.Timber
import java.net.InetAddress
import java.net.Socket
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

@HiltAndroidApp
class CCBApplication : Application(), ImageLoaderFactory {

    /**
     * EntryPoint để access Hilt-managed SunmiPrinterAdapter từ Application
     * Cần thiết vì Application không thể inject trực tiếp như Activity/ViewModel
     */
    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface PrinterEntryPoint {
        fun sunmiPrinterAdapter(): SunmiPrinterAdapter
    }

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

        // Khởi tạo Sunmi adapter ngay khi app start để tránh lỗi "adapter chưa được khởi tạo"
        // khi user in bill trước khi vào Settings
        initializeSunmiAdapter()
    }

    /**
     * Khởi tạo Sunmi printer adapter ngay khi app khởi động
     * Đảm bảo HybridBillPrintService.sunmiAdapter luôn sẵn sàng
     */
    private fun initializeSunmiAdapter() {
        try {
            val entryPoint = EntryPointAccessors.fromApplication(
                this,
                PrinterEntryPoint::class.java
            )
            val sunmiAdapter = entryPoint.sunmiPrinterAdapter()

            // initSunmiAdapter đã được gọi trong PrinterModule.provideSunmiPrinterAdapter()
            // nhưng gọi lại ở đây để chắc chắn (idempotent operation)
            HybridBillPrintService.initSunmiAdapter(sunmiAdapter)

            Timber.d("Sunmi adapter initialized on app startup")
        } catch (e: Exception) {
            Timber.e(e, "Failed to initialize Sunmi adapter on startup")
        }
    }

    /**
     * Configure Coil ImageLoader with TLS 1.2 support for older Android devices (6-7).
     * Sunmi T1-G and similar POS devices often run Android 6/7 which don't enable TLS 1.2 by default.
     * This ensures QR code images from external HTTPS URLs can be loaded successfully.
     */
    override fun newImageLoader(): ImageLoader {
        val okHttpClient = createTls12OkHttpClient()

        return ImageLoader.Builder(this)
            .okHttpClient(okHttpClient)
            .crossfade(true)
            .build()
    }

    /**
     * Create OkHttpClient with TLS 1.2 support for Android 6-7 (API 23-25).
     * These Android versions don't enable TLS 1.2 by default, causing HTTPS image loading to fail
     * on older POS devices like Sunmi T1-G.
     */
    private fun createTls12OkHttpClient(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)

        // Enable TLS 1.2 for Android 6-7 (API 23-25)
        if (Build.VERSION.SDK_INT in 19..25) {
            try {
                val trustManager = getTrustManager()
                val sslContext = SSLContext.getInstance("TLSv1.2")
                sslContext.init(null, arrayOf(trustManager), null)

                builder.sslSocketFactory(
                    Tls12ImageLoaderSocketFactory(sslContext.socketFactory),
                    trustManager
                )

                // Enable TLS 1.2 protocols
                val specs = listOf(
                    ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
                        .tlsVersions(TlsVersion.TLS_1_2)
                        .build(),
                    ConnectionSpec.CLEARTEXT
                )
                builder.connectionSpecs(specs)

                Timber.d("Coil ImageLoader: TLS 1.2 enabled for Android ${Build.VERSION.SDK_INT}")
            } catch (e: Exception) {
                Timber.e(e, "Coil ImageLoader: Error enabling TLS 1.2")
            }
        }

        return builder.build()
    }

    private fun getTrustManager(): X509TrustManager {
        val trustManagerFactory = TrustManagerFactory.getInstance(
            TrustManagerFactory.getDefaultAlgorithm()
        )
        trustManagerFactory.init(null as KeyStore?)
        val trustManagers = trustManagerFactory.trustManagers
        return trustManagers[0] as X509TrustManager
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

/**
 * Custom SSLSocketFactory to force TLS 1.2 for Coil ImageLoader on Android 6-7.
 * These Android versions don't enable TLS 1.2 by default, causing HTTPS image loading
 * to fail on older POS devices like Sunmi T1-G.
 */
private class Tls12ImageLoaderSocketFactory(
    private val delegate: SSLSocketFactory
) : SSLSocketFactory() {

    override fun getDefaultCipherSuites(): Array<String> = delegate.defaultCipherSuites
    override fun getSupportedCipherSuites(): Array<String> = delegate.supportedCipherSuites

    override fun createSocket(s: Socket, host: String, port: Int, autoClose: Boolean): Socket {
        return enableTls12(delegate.createSocket(s, host, port, autoClose))
    }

    override fun createSocket(host: String, port: Int): Socket {
        return enableTls12(delegate.createSocket(host, port))
    }

    override fun createSocket(host: String, port: Int, localHost: InetAddress, localPort: Int): Socket {
        return enableTls12(delegate.createSocket(host, port, localHost, localPort))
    }

    override fun createSocket(host: InetAddress, port: Int): Socket {
        return enableTls12(delegate.createSocket(host, port))
    }

    override fun createSocket(address: InetAddress, port: Int, localAddress: InetAddress, localPort: Int): Socket {
        return enableTls12(delegate.createSocket(address, port, localAddress, localPort))
    }

    private fun enableTls12(socket: Socket): Socket {
        if (socket is SSLSocket) {
            socket.enabledProtocols = arrayOf("TLSv1.2")
        }
        return socket
    }
}
