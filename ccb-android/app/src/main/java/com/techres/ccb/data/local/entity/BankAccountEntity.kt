package com.techres.ccb.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Entity lưu trữ tài khoản ngân hàng trong Room Database
 * Dùng cho thanh toán chuyển khoản, hiển thị mã QR
 */
@Entity(
    tableName = "bank_accounts",
    indices = [
        Index(value = ["branch_id"]),
        Index(value = ["is_primary"]),
        Index(value = ["is_active"])
    ]
)
data class BankAccountEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "branch_id")
    val branchId: String,

    // Mã ngân hàng (VCB, TCB, MB...)
    @ColumnInfo(name = "bank_code")
    val bankCode: String,

    // Tên ngân hàng
    @ColumnInfo(name = "bank_name")
    val bankName: String,

    // BIN ngân hàng cho VietQR
    @ColumnInfo(name = "bank_bin")
    val bankBin: String? = null,

    // Số tài khoản
    @ColumnInfo(name = "account_number")
    val accountNumber: String,

    // Tên chủ tài khoản
    @ColumnInfo(name = "account_name")
    val accountName: String,

    // Template nội dung chuyển khoản (VD: "TT {order_code}")
    @ColumnInfo(name = "transfer_template")
    val transferTemplate: String? = null,

    // URL mã QR tĩnh (nếu có)
    @ColumnInfo(name = "static_qr_url")
    val staticQrUrl: String? = null,

    // Tài khoản chính?
    @ColumnInfo(name = "is_primary")
    val isPrimary: Boolean = false,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    // Sync fields
    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "synced",

    @ColumnInfo(name = "synced_at")
    val syncedAt: String? = null,

    @ColumnInfo(name = "version")
    val version: Int = 1
) {
    /**
     * Generate QR URL using VietQR API
     * Format: https://qr.sepay.vn/img?bank={BANK_CODE}&acc={ACCOUNT}&template=compact&amount={AMOUNT}&des={DESCRIPTION}
     */
    fun generateQrUrl(amount: Long, transferContent: String): String {
        val encodedContent = java.net.URLEncoder.encode(transferContent, "UTF-8")
        return "https://qr.sepay.vn/img?bank=$bankCode&acc=$accountNumber&template=compact&amount=$amount&des=$encodedContent"
    }

    /**
     * Generate transfer content from template
     * Replace {order_code} with actual order number
     */
    fun generateTransferContent(orderNumber: String): String {
        return transferTemplate?.replace("{order_code}", orderNumber)
            ?: "TT $orderNumber"
    }
}
