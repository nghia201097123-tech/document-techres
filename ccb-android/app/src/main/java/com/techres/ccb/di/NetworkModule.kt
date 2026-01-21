package com.techres.ccb.di

import android.os.Build
import android.util.Log
import com.techres.ccb.BuildConfig
import com.techres.ccb.data.remote.api.AuthApi
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

// Qualifiers for different Retrofit instances
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class TenantRetrofit

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class PosRetrofit

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class GatewayRetrofit

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val TAG = "NetworkModule"

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
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

        // Enable TLS 1.2 for Android 6-7 (API 23-25)
        // Android 6 doesn't enable TLS 1.2 by default
        if (Build.VERSION.SDK_INT in 19..25) {
            try {
                val trustManager = getTrustManager()
                val sslContext = SSLContext.getInstance("TLSv1.2")
                sslContext.init(null, arrayOf(trustManager), null)

                builder.sslSocketFactory(
                    Tls12SocketFactory(sslContext.socketFactory),
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

                Log.d(TAG, "TLS 1.2 enabled for Android ${Build.VERSION.SDK_INT}")
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

    @Provides
    @Singleton
    @TenantRetrofit
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        Log.d(TAG, "API Base URL: ${BuildConfig.API_BASE_URL}")
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    @PosRetrofit
    fun providePosRetrofit(okHttpClient: OkHttpClient): Retrofit {
        Log.d(TAG, "API POS Base URL: ${BuildConfig.API_POS_BASE_URL}")
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_POS_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    @GatewayRetrofit
    fun provideGatewayRetrofit(okHttpClient: OkHttpClient): Retrofit {
        Log.d(TAG, "API Gateway URL: ${BuildConfig.API_GATEWAY_URL}")
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_GATEWAY_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideAuthApi(@TenantRetrofit retrofit: Retrofit): AuthApi {
        return retrofit.create(AuthApi::class.java)
    }

    @Provides
    @Singleton
    fun provideMasterDataApi(@PosRetrofit retrofit: Retrofit): MasterDataApi {
        return retrofit.create(MasterDataApi::class.java)
    }

    @Provides
    @Singleton
    fun provideSyncApi(@PosRetrofit retrofit: Retrofit): SyncApi {
        return retrofit.create(SyncApi::class.java)
    }

    @Provides
    @Singleton
    fun providePosApi(@PosRetrofit retrofit: Retrofit): PosApi {
        return retrofit.create(PosApi::class.java)
    }

    @Provides
    @Singleton
    fun providePayOSApi(@GatewayRetrofit retrofit: Retrofit): PayOSApi {
        return retrofit.create(PayOSApi::class.java)
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
