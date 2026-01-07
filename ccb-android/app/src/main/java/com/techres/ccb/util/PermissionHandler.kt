package com.techres.ccb.util

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import timber.log.Timber

/**
 * Permission Handler cho Android 6+
 * Android 6 (API 23) yêu cầu runtime permissions cho:
 * - Bluetooth
 * - Location (required for BLE on API 23-30)
 * - Storage (for backup/export)
 * - Camera (optional for QR scanning)
 */
class PermissionHandler(private val activity: Activity) {

    companion object {
        const val REQUEST_CODE_BLUETOOTH = 1001
        const val REQUEST_CODE_LOCATION = 1002
        const val REQUEST_CODE_STORAGE = 1003
        const val REQUEST_CODE_CAMERA = 1004
        const val REQUEST_CODE_ALL = 1005

        /**
         * Bluetooth permissions - different for API < 31 and >= 31
         */
        val BLUETOOTH_PERMISSIONS: Array<String>
            get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                arrayOf(
                    Manifest.permission.BLUETOOTH_CONNECT,
                    Manifest.permission.BLUETOOTH_SCAN
                )
            } else {
                arrayOf(
                    Manifest.permission.BLUETOOTH,
                    Manifest.permission.BLUETOOTH_ADMIN
                )
            }

        /**
         * Location permission - required for BLE on API 23-30
         */
        val LOCATION_PERMISSIONS: Array<String>
            get() = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
            } else {
                emptyArray()
            }

        /**
         * Storage permissions - different for API < 33 and >= 33
         */
        val STORAGE_PERMISSIONS: Array<String>
            get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                emptyArray() // No permissions needed for app-specific storage
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
            } else {
                arrayOf(
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                )
            }

        /**
         * All required permissions for the app
         */
        val ALL_REQUIRED_PERMISSIONS: Array<String>
            get() = (BLUETOOTH_PERMISSIONS + LOCATION_PERMISSIONS).filterNotNull().toTypedArray()
    }

    /**
     * Check if all Bluetooth permissions are granted
     */
    fun hasBluetoothPermissions(): Boolean {
        val permissions = BLUETOOTH_PERMISSIONS + LOCATION_PERMISSIONS
        return permissions.all {
            ContextCompat.checkSelfPermission(activity, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Request Bluetooth permissions
     */
    fun requestBluetoothPermissions() {
        val permissions = (BLUETOOTH_PERMISSIONS + LOCATION_PERMISSIONS).filterNotNull().toTypedArray()
        val missingPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isNotEmpty()) {
            Timber.d("Requesting Bluetooth permissions: $missingPermissions")
            ActivityCompat.requestPermissions(
                activity,
                missingPermissions.toTypedArray(),
                REQUEST_CODE_BLUETOOTH
            )
        }
    }

    /**
     * Check if storage permissions are granted
     */
    fun hasStoragePermissions(): Boolean {
        return STORAGE_PERMISSIONS.all {
            ContextCompat.checkSelfPermission(activity, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Request storage permissions
     */
    fun requestStoragePermissions() {
        val missingPermissions = STORAGE_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isNotEmpty()) {
            Timber.d("Requesting Storage permissions: $missingPermissions")
            ActivityCompat.requestPermissions(
                activity,
                missingPermissions.toTypedArray(),
                REQUEST_CODE_STORAGE
            )
        }
    }

    /**
     * Check if all required permissions are granted
     */
    fun hasAllRequiredPermissions(): Boolean {
        return ALL_REQUIRED_PERMISSIONS.all {
            ContextCompat.checkSelfPermission(activity, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Request all required permissions
     */
    fun requestAllPermissions() {
        val missingPermissions = ALL_REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isNotEmpty()) {
            Timber.d("Requesting all permissions: $missingPermissions")
            ActivityCompat.requestPermissions(
                activity,
                missingPermissions.toTypedArray(),
                REQUEST_CODE_ALL
            )
        }
    }

    /**
     * Check if should show rationale for permissions
     */
    fun shouldShowRationale(permissions: Array<String>): Boolean {
        return permissions.any {
            ActivityCompat.shouldShowRequestPermissionRationale(activity, it)
        }
    }

    /**
     * Handle permission result
     */
    fun handlePermissionResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ): PermissionResult {
        if (grantResults.isEmpty()) {
            return PermissionResult.Cancelled
        }

        val deniedPermissions = permissions.filterIndexed { index, _ ->
            grantResults[index] != PackageManager.PERMISSION_GRANTED
        }

        return when {
            deniedPermissions.isEmpty() -> PermissionResult.Granted
            deniedPermissions.any {
                !ActivityCompat.shouldShowRequestPermissionRationale(activity, it)
            } -> PermissionResult.PermanentlyDenied(deniedPermissions)
            else -> PermissionResult.Denied(deniedPermissions)
        }
    }
}

sealed class PermissionResult {
    object Granted : PermissionResult()
    object Cancelled : PermissionResult()
    data class Denied(val permissions: List<String>) : PermissionResult()
    data class PermanentlyDenied(val permissions: List<String>) : PermissionResult()
}

/**
 * Extension function to check single permission
 */
fun Context.hasPermission(permission: String): Boolean {
    return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
}

/**
 * Extension function to check multiple permissions
 */
fun Context.hasPermissions(vararg permissions: String): Boolean {
    return permissions.all { hasPermission(it) }
}
