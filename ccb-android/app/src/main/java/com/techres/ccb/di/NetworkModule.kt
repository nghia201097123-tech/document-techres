package com.techres.ccb.di

import android.os.Build
import android.util.Log
import com.techres.ccb.BuildConfig
import com.techres.ccb.data.remote.api.AuthApi
import com.techres.ccb.data.remote.api.FoodPlatformApi
import com.techres.ccb.data.remote.api.MasterDataApi
import com.techres.ccb.data.remote.api.PayOSApi
import com.techres.ccb.data.remote.api.PosApi
import com.techres.ccb.data.remote.api.SyncApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Qualifier
import okhttp3.ConnectionSpec
import okhttp3.OkHttpClient
import okhttp3.TlsVersion
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit

import retrofit2.converter.gson.GsonConverterFactory
import java.net.InetAddress
import java.net.Socket
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

// Qualifiers for different Retrofit instances (APISIX Gateway routing via x-svc-id)
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class OAuthRetrofit      // api-oauth: 1506

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class DashboardRetrofit  // api-dashboard: 1503

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class MasterDataRetrofit // api-master-data: 1504

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class FoodRetrofit       // api-app-food (direct, không qua gateway)

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val TAG = "NetworkModule"

    // APISIX Gateway URL
    private val GATEWAY_URL: String by lazy { BuildConfig.API_BASE_URL }

    /**
     * Create OkHttpClient with x-svc-id header for APISIX Gateway routing
     */
    private fun createGatewayOkHttpClient(serviceId: String): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val builder = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Accept", "application/json")
                    .addHeader("x-svc-id", serviceId) // APISIX Gateway routing header
                    .build()
                Log.d(TAG, "Request: ${request.url} | x-svc-id: $serviceId")
                chain.proceed(request)
            }
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
                    Tls12SocketFactory(sslContext.socketFactory),
                    trustManager
                )

                val specs = listOf(
                    ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
                        .tlsVersions(TlsVersion.TLS_1_2)
                        .build(),
                    ConnectionSpec.CLEARTEXT
                )
                builder.connectionSpecs(specs)

                Log.d(TAG, "TLS 1.2 enabled for Android ${Build.VERSION.SDK_INT}")
            } catch (e: Exception) {
                Log.e(TAG, "Error enabling TLS 1.2", e)
            }
        }

        return builder.build()
    }

    /**
     * Create basic OkHttpClient without x-svc-id (for direct API calls)
     */
    private fun createBasicOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val builder = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Accept", "application/json")
                    .build()
                chain.proceed(request)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)

        // Enable TLS 1.2 for Android 6-7
        if (Build.VERSION.SDK_INT in 19..25) {
            try {
                val trustManager = getTrustManager()
                val sslContext = SSLContext.getInstance("TLSv1.2")
                sslContext.init(null, arrayOf(trustManager), null)

                builder.sslSocketFactory(
                    Tls12SocketFactory(sslContext.socketFactory),
                    trustManager
                )

                val specs = listOf(
                    ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
                        .tlsVersions(TlsVersion.TLS_1_2)
                        .build(),
                    ConnectionSpec.CLEARTEXT
                )
                builder.connectionSpecs(specs)
            } catch (e: Exception) {
                Log.e(TAG, "Error enabling TLS 1.2", e)
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

    // ==================== OAuth Retrofit (api-oauth: 1506) ====================

    @Provides
    @Singleton
    @OAuthRetrofit
    fun provideOAuthRetrofit(): Retrofit {
        val serviceId = BuildConfig.SVC_ID_OAUTH
        Log.d(TAG, "Creating OAuth Retrofit | Gateway: $GATEWAY_URL | x-svc-id: $serviceId")
        return Retrofit.Builder()
            .baseUrl(GATEWAY_URL)
            .client(createGatewayOkHttpClient(serviceId))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideAuthApi(@OAuthRetrofit retrofit: Retrofit): AuthApi {
        return retrofit.create(AuthApi::class.java)
    }

    // ==================== Dashboard Retrofit (api-dashboard: 1503) ====================

    @Provides
    @Singleton
    @DashboardRetrofit
    fun provideDashboardRetrofit(): Retrofit {
        val serviceId = BuildConfig.SVC_ID_DASHBOARD
        Log.d(TAG, "Creating Dashboard Retrofit | Gateway: $GATEWAY_URL | x-svc-id: $serviceId")
        return Retrofit.Builder()
            .baseUrl(GATEWAY_URL)
            .client(createGatewayOkHttpClient(serviceId))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideSyncApi(@DashboardRetrofit retrofit: Retrofit): SyncApi {
        return retrofit.create(SyncApi::class.java)
    }

    @Provides
    @Singleton
    fun providePosApi(@DashboardRetrofit retrofit: Retrofit): PosApi {
        return retrofit.create(PosApi::class.java)
    }

    @Provides
    @Singleton
    fun providePayOSApi(@DashboardRetrofit retrofit: Retrofit): PayOSApi {
        return retrofit.create(PayOSApi::class.java)
    }

    // ==================== Master Data Retrofit (api-master-data: 1504) ====================

    @Provides
    @Singleton
    @MasterDataRetrofit
    fun provideMasterDataRetrofit(): Retrofit {
        val serviceId = BuildConfig.SVC_ID_MASTER_DATA
        Log.d(TAG, "Creating MasterData Retrofit | Gateway: $GATEWAY_URL | x-svc-id: $serviceId")
        return Retrofit.Builder()
            .baseUrl(GATEWAY_URL)
            .client(createGatewayOkHttpClient(serviceId))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideMasterDataApi(@MasterDataRetrofit retrofit: Retrofit): MasterDataApi {
        return retrofit.create(MasterDataApi::class.java)
    }

    // ==================== Food Platform Retrofit (api-app-food - direct, không qua gateway) ====================

    @Provides
    @Singleton
    @FoodRetrofit
    fun provideFoodRetrofit(): Retrofit {
        val foodApiUrl = try {
            val field = BuildConfig::class.java.getField("API_FOOD_BASE_URL")
            val url = field.get(null) as? String
            if (url.isNullOrEmpty()) GATEWAY_URL else url
        } catch (e: Exception) {
            Log.w(TAG, "API_FOOD_BASE_URL not found, using Gateway URL as fallback")
            GATEWAY_URL
        }
        Log.d(TAG, "Creating Food Retrofit | URL: $foodApiUrl")
        return Retrofit.Builder()
            .baseUrl(foodApiUrl)
            .client(createBasicOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideFoodPlatformApi(@FoodRetrofit retrofit: Retrofit): FoodPlatformApi {
        return retrofit.create(FoodPlatformApi::class.java)
    }
}

/**
 * Custom SSLSocketFactory to force TLS 1.2 on Android 6-7
 * These Android versions don't enable TLS 1.2 by default
 */
class Tls12SocketFactory(
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
