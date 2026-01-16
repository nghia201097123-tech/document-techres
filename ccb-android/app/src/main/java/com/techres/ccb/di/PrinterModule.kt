package com.techres.ccb.di

import android.content.Context
import com.techres.ccb.data.printer.HybridBillPrintService
import com.techres.ccb.printer.PrinterManager
import com.techres.ccb.printer.adapter.*
import com.techres.ccb.printer.discovery.PrinterDiscoveryService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt Module cho Printer dependencies
 */
@Module
@InstallIn(SingletonComponent::class)
object PrinterModule {

    @Provides
    @Singleton
    fun provideBluetoothPrinterAdapter(
        @ApplicationContext context: Context
    ): BluetoothPrinterAdapter {
        return BluetoothPrinterAdapter(context)
    }

    @Provides
    @Singleton
    fun provideNetworkPrinterAdapter(
        @ApplicationContext context: Context
    ): NetworkPrinterAdapter {
        return NetworkPrinterAdapter(context)
    }

    @Provides
    @Singleton
    fun provideUsbPrinterAdapter(
        @ApplicationContext context: Context
    ): UsbPrinterAdapter {
        return UsbPrinterAdapter(context)
    }

    @Provides
    @Singleton
    fun provideSunmiPrinterAdapter(
        @ApplicationContext context: Context
    ): SunmiPrinterAdapter {
        val adapter = SunmiPrinterAdapter(context)
        // Initialize Sunmi adapter for HybridBillPrintService
        HybridBillPrintService.initSunmiAdapter(adapter)
        return adapter
    }

    @Provides
    @Singleton
    fun provideSerialPrinterAdapter(
        @ApplicationContext context: Context
    ): SerialPrinterAdapter {
        return SerialPrinterAdapter(context)
    }

    @Provides
    @Singleton
    fun providePrinterDiscoveryService(
        @ApplicationContext context: Context,
        bluetoothAdapter: BluetoothPrinterAdapter,
        networkAdapter: NetworkPrinterAdapter,
        usbAdapter: UsbPrinterAdapter,
        sunmiAdapter: SunmiPrinterAdapter,
        serialAdapter: SerialPrinterAdapter
    ): PrinterDiscoveryService {
        return PrinterDiscoveryService(
            context,
            bluetoothAdapter,
            networkAdapter,
            usbAdapter,
            sunmiAdapter,
            serialAdapter
        )
    }

    @Provides
    @Singleton
    fun providePrinterManager(
        @ApplicationContext context: Context,
        bluetoothAdapter: BluetoothPrinterAdapter,
        networkAdapter: NetworkPrinterAdapter,
        usbAdapter: UsbPrinterAdapter,
        sunmiAdapter: SunmiPrinterAdapter,
        serialAdapter: SerialPrinterAdapter,
        discoveryService: PrinterDiscoveryService
    ): PrinterManager {
        return PrinterManager(
            context,
            bluetoothAdapter,
            networkAdapter,
            usbAdapter,
            sunmiAdapter,
            serialAdapter,
            discoveryService
        )
    }
}
