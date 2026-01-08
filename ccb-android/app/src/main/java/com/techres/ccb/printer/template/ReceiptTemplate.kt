package com.techres.ccb.printer.template

import android.graphics.Bitmap
import com.techres.ccb.printer.core.EscPosBuilder
import com.techres.ccb.printer.core.EscPosCommands
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

/**
 * Receipt Template Builder
 *
 * Xây dựng hóa đơn với các template phổ biến cho POS
 * Hỗ trợ đa ngôn ngữ, đa loại máy in
 */
class ReceiptTemplate private constructor(
    private val builder: EscPosBuilder
) {
    companion object {
        // Paper widths
        const val PAPER_58MM = 58
        const val PAPER_80MM = 80

        // Characters per line
        fun charsPerLine(paperWidth: Int): Int = when (paperWidth) {
            58 -> 32
            80 -> 48
            else -> 32
        }

        /**
         * Tạo builder mới
         */
        fun create(paperWidth: Int = PAPER_58MM): Builder {
            return Builder(paperWidth)
        }
    }

    fun build(): ByteArray = builder.build()

    /**
     * Receipt Builder - Fluent API
     */
    class Builder(private val paperWidth: Int) {
        private val builder = EscPosBuilder()
        private val lineWidth = charsPerLine(paperWidth)
        private var currencyFormat: NumberFormat = NumberFormat.getInstance(Locale("vi", "VN"))
        private var dateFormat: SimpleDateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())

        init {
            builder.init()
            currencyFormat.maximumFractionDigits = 0
        }

        // ==================== CONFIGURATION ====================

        fun setCurrency(locale: Locale): Builder {
            currencyFormat = NumberFormat.getInstance(locale)
            return this
        }

        fun setDateFormat(pattern: String): Builder {
            dateFormat = SimpleDateFormat(pattern, Locale.getDefault())
            return this
        }

        // ==================== HEADER ====================

        /**
         * In logo (hình ảnh)
         */
        fun logo(bitmap: Bitmap): Builder {
            builder.alignCenter()
            builder.image(bitmap)
            builder.newLine()
            return this
        }

        /**
         * In tên cửa hàng (title lớn)
         */
        fun storeName(name: String): Builder {
            builder.alignCenter()
            builder.doubleSize()
            builder.bold(true)
            builder.line(name)
            builder.normal()
            builder.bold(false)
            return this
        }

        /**
         * In địa chỉ
         */
        fun storeAddress(address: String): Builder {
            builder.alignCenter()
            builder.line(address)
            return this
        }

        /**
         * In số điện thoại
         */
        fun storePhone(phone: String): Builder {
            builder.alignCenter()
            builder.line("ĐT: $phone")
            return this
        }

        /**
         * In thông tin bổ sung (website, email...)
         */
        fun storeInfo(info: String): Builder {
            builder.alignCenter()
            builder.line(info)
            return this
        }

        /**
         * Header hoàn chỉnh
         */
        fun header(
            storeName: String,
            address: String? = null,
            phone: String? = null,
            taxCode: String? = null,
            logo: Bitmap? = null
        ): Builder {
            logo?.let { this.logo(it) }
            storeName(storeName)
            address?.let { storeAddress(it) }
            phone?.let { storePhone(it) }
            taxCode?.let { builder.line("MST: $it") }
            builder.newLine()
            return this
        }

        // ==================== ORDER INFO ====================

        /**
         * Tiêu đề hóa đơn
         */
        fun title(title: String = "HÓA ĐƠN BÁN HÀNG"): Builder {
            builder.alignCenter()
            builder.bold(true)
            builder.line(title)
            builder.bold(false)
            builder.alignLeft()
            return this
        }

        /**
         * Số hóa đơn
         */
        fun orderNumber(number: String, label: String = "Số HĐ"): Builder {
            return twoColumns(label, number)
        }

        /**
         * Ngày giờ
         */
        fun dateTime(date: Date = Date(), label: String = "Ngày"): Builder {
            return twoColumns(label, dateFormat.format(date))
        }

        /**
         * Số bàn
         */
        fun table(tableName: String, label: String = "Bàn"): Builder {
            return twoColumns(label, tableName)
        }

        /**
         * Nhân viên
         */
        fun staff(staffName: String, label: String = "Thu ngân"): Builder {
            return twoColumns(label, staffName)
        }

        /**
         * Khách hàng
         */
        fun customer(customerName: String, label: String = "Khách hàng"): Builder {
            return twoColumns(label, customerName)
        }

        /**
         * Thông tin order hoàn chỉnh
         */
        fun orderInfo(
            orderNumber: String,
            date: Date = Date(),
            tableName: String? = null,
            staffName: String? = null,
            customerName: String? = null
        ): Builder {
            separator()
            orderNumber(orderNumber)
            dateTime(date)
            tableName?.let { table(it) }
            staffName?.let { staff(it) }
            customerName?.let { customer(it) }
            separator()
            return this
        }

        // ==================== ITEMS ====================

        /**
         * Header của bảng items
         */
        fun itemsHeader(
            nameLabel: String = "Tên món",
            qtyLabel: String = "SL",
            priceLabel: String = "Đơn giá",
            totalLabel: String = "T.Tiền"
        ): Builder {
            builder.bold(true)
            if (paperWidth == PAPER_80MM) {
                // 80mm: 4 cột
                val cols = arrayOf(nameLabel, qtyLabel, priceLabel, totalLabel)
                val weights = intArrayOf(20, 6, 11, 11)
                printRow(cols.toList(), weights.toList())
            } else {
                // 58mm: 2 dòng
                builder.line(nameLabel)
                twoColumns("$qtyLabel x $priceLabel", totalLabel)
            }
            builder.bold(false)
            separator('-')
            return this
        }

        /**
         * In một item
         */
        fun item(
            name: String,
            quantity: Int,
            unitPrice: Double,
            total: Double = quantity * unitPrice,
            note: String? = null
        ): Builder {
            if (paperWidth == PAPER_80MM) {
                // 80mm: 4 cột
                val cols = arrayOf(
                    name.take(20),
                    quantity.toString(),
                    formatCurrency(unitPrice),
                    formatCurrency(total)
                )
                val weights = intArrayOf(20, 6, 11, 11)
                printRow(cols.toList(), weights.toList())
            } else {
                // 58mm: 2 dòng
                builder.line(name)
                twoColumns(
                    "  $quantity x ${formatCurrency(unitPrice)}",
                    formatCurrency(total)
                )
            }

            // Note nếu có
            note?.let {
                builder.line("  * $it")
            }

            return this
        }

        /**
         * In danh sách items
         */
        fun items(items: List<ReceiptItem>): Builder {
            itemsHeader()
            items.forEach { item ->
                item(
                    name = item.name,
                    quantity = item.quantity,
                    unitPrice = item.unitPrice,
                    total = item.total,
                    note = item.note
                )
            }
            return this
        }

        // ==================== TOTALS ====================

        /**
         * Tạm tính
         */
        fun subtotal(amount: Double, label: String = "Tạm tính"): Builder {
            return twoColumns(label, formatCurrency(amount))
        }

        /**
         * Giảm giá
         */
        fun discount(amount: Double, label: String = "Giảm giá", percent: Int? = null): Builder {
            val labelText = if (percent != null) "$label ($percent%)" else label
            return twoColumns(labelText, "-${formatCurrency(amount)}")
        }

        /**
         * VAT
         */
        fun vat(amount: Double, percent: Int = 10, label: String = "VAT"): Builder {
            return twoColumns("$label ($percent%)", formatCurrency(amount))
        }

        /**
         * Phí dịch vụ
         */
        fun serviceFee(amount: Double, percent: Int? = null, label: String = "Phí dịch vụ"): Builder {
            val labelText = if (percent != null) "$label ($percent%)" else label
            return twoColumns(labelText, formatCurrency(amount))
        }

        /**
         * Tổng cộng (in đậm, lớn)
         */
        fun total(amount: Double, label: String = "TỔNG CỘNG"): Builder {
            separator()
            builder.bold(true)
            if (paperWidth == PAPER_80MM) {
                builder.doubleHeight()
            }
            twoColumns(label, formatCurrency(amount))
            builder.normal()
            builder.bold(false)
            return this
        }

        /**
         * Block tổng hoàn chỉnh
         */
        fun totals(
            subtotal: Double,
            discount: Double = 0.0,
            discountPercent: Int? = null,
            vat: Double = 0.0,
            vatPercent: Int = 10,
            serviceFee: Double = 0.0,
            total: Double
        ): Builder {
            separator()
            subtotal(subtotal)
            if (discount > 0) {
                discount(discount, percent = discountPercent)
            }
            if (serviceFee > 0) {
                serviceFee(serviceFee)
            }
            if (vat > 0) {
                vat(vat, vatPercent)
            }
            total(total)
            return this
        }

        // ==================== PAYMENT ====================

        /**
         * Phương thức thanh toán
         */
        fun paymentMethod(method: String, label: String = "Thanh toán"): Builder {
            return twoColumns(label, method)
        }

        /**
         * Tiền khách đưa
         */
        fun receivedAmount(amount: Double, label: String = "Tiền khách"): Builder {
            return twoColumns(label, formatCurrency(amount))
        }

        /**
         * Tiền thừa
         */
        fun changeAmount(amount: Double, label: String = "Tiền thừa"): Builder {
            return twoColumns(label, formatCurrency(amount))
        }

        /**
         * Block thanh toán hoàn chỉnh
         */
        fun payment(
            method: String,
            received: Double,
            change: Double
        ): Builder {
            separator()
            paymentMethod(method)
            receivedAmount(received)
            changeAmount(change)
            return this
        }

        // ==================== FOOTER ====================

        /**
         * QR Code thanh toán hoặc thông tin
         */
        fun qrCode(data: String, size: Int = 4): Builder {
            builder.alignCenter()
            builder.qrCode(data, size)
            builder.newLine()
            return this
        }

        /**
         * Barcode
         */
        fun barcode(data: String, type: Int = EscPosCommands.BarcodeType.CODE128): Builder {
            builder.alignCenter()
            builder.barcode(type, data)
            builder.newLine()
            return this
        }

        /**
         * Lời cảm ơn
         */
        fun thankYou(message: String = "Cảm ơn quý khách!"): Builder {
            builder.alignCenter()
            builder.line(message)
            return this
        }

        /**
         * Chính sách đổi trả
         */
        fun returnPolicy(policy: String): Builder {
            builder.alignCenter()
            builder.line(policy)
            return this
        }

        /**
         * Footer hoàn chỉnh
         */
        fun footer(
            thankYou: String = "Cảm ơn quý khách!",
            comeback: String = "Hẹn gặp lại!",
            policy: String? = null,
            qrData: String? = null
        ): Builder {
            builder.newLine()
            qrData?.let { qrCode(it) }
            builder.alignCenter()
            builder.line(thankYou)
            builder.line(comeback)
            policy?.let {
                builder.newLine()
                builder.line(it)
            }
            return this
        }

        // ==================== UTILITIES ====================

        /**
         * Đường kẻ phân cách
         */
        fun separator(char: Char = '-'): Builder {
            builder.separator(char, lineWidth)
            return this
        }

        /**
         * Đường kẻ đôi
         */
        fun doubleSeparator(): Builder {
            builder.doubleSeparator(lineWidth)
            return this
        }

        /**
         * Dòng trống
         */
        fun space(lines: Int = 1): Builder {
            builder.newLine(lines)
            return this
        }

        /**
         * Text thường
         */
        fun text(text: String): Builder {
            builder.line(text)
            return this
        }

        /**
         * Text căn giữa
         */
        fun centerText(text: String): Builder {
            builder.alignCenter()
            builder.line(text)
            builder.alignLeft()
            return this
        }

        /**
         * 2 cột (trái - phải)
         */
        fun twoColumns(left: String, right: String): Builder {
            builder.twoColumns(left, right, lineWidth)
            return this
        }

        /**
         * In row với nhiều cột
         */
        private fun printRow(columns: List<String>, weights: List<Int>) {
            val totalWeight = weights.sum()
            val row = StringBuilder()

            columns.forEachIndexed { index, text ->
                val colWidth = (lineWidth * weights[index]) / totalWeight
                val formatted = if (text.length > colWidth) {
                    text.take(colWidth)
                } else if (index == columns.lastIndex) {
                    text.padStart(colWidth)
                } else {
                    text.padEnd(colWidth)
                }
                row.append(formatted)
            }

            builder.line(row.toString())
        }

        /**
         * Feed và cắt giấy
         */
        fun feedAndCut(feedLines: Int = 3): Builder {
            builder.feed(feedLines)
            builder.cut()
            return this
        }

        /**
         * Mở ngăn kéo tiền
         */
        fun openCashDrawer(): Builder {
            builder.openCashDrawer()
            return this
        }

        /**
         * Format số tiền
         */
        private fun formatCurrency(amount: Double): String {
            return currencyFormat.format(amount)
        }

        /**
         * Build thành byte array
         */
        fun build(): ByteArray = builder.build()

        /**
         * Build thành ReceiptTemplate
         */
        fun toTemplate(): ReceiptTemplate = ReceiptTemplate(builder)
    }
}

/**
 * Receipt Item data class
 */
data class ReceiptItem(
    val name: String,
    val quantity: Int,
    val unitPrice: Double,
    val total: Double = quantity * unitPrice,
    val note: String? = null
)

/**
 * Complete receipt data
 */
data class Receipt(
    // Store info
    val storeName: String,
    val storeAddress: String? = null,
    val storePhone: String? = null,
    val taxCode: String? = null,
    val logo: Bitmap? = null,

    // Order info
    val orderNumber: String,
    val dateTime: Date = Date(),
    val tableName: String? = null,
    val staffName: String? = null,
    val customerName: String? = null,

    // Items
    val items: List<ReceiptItem>,

    // Totals
    val subtotal: Double,
    val discount: Double = 0.0,
    val discountPercent: Int? = null,
    val vat: Double = 0.0,
    val vatPercent: Int = 10,
    val serviceFee: Double = 0.0,
    val total: Double,

    // Payment
    val paymentMethod: String,
    val receivedAmount: Double,
    val changeAmount: Double,

    // Footer
    val qrData: String? = null,
    val thankYouMessage: String = "Cảm ơn quý khách!",
    val comebackMessage: String = "Hẹn gặp lại!"
) {
    /**
     * Build receipt thành byte array
     */
    fun toEscPos(paperWidth: Int = ReceiptTemplate.PAPER_58MM): ByteArray {
        return ReceiptTemplate.create(paperWidth)
            .header(storeName, storeAddress, storePhone, taxCode, logo)
            .title()
            .orderInfo(orderNumber, dateTime, tableName, staffName, customerName)
            .items(items)
            .totals(subtotal, discount, discountPercent, vat, vatPercent, serviceFee, total)
            .payment(paymentMethod, receivedAmount, changeAmount)
            .footer(thankYouMessage, comebackMessage, qrData = qrData)
            .feedAndCut()
            .build()
    }
}

// ==================== KITCHEN TICKET ====================

/**
 * Kitchen ticket (phiếu bếp)
 */
data class KitchenTicket(
    val orderNumber: String,
    val tableName: String,
    val items: List<KitchenItem>,
    val notes: String? = null,
    val dateTime: Date = Date(),
    val isUrgent: Boolean = false
) {
    fun toEscPos(paperWidth: Int = ReceiptTemplate.PAPER_58MM): ByteArray {
        val lineWidth = ReceiptTemplate.charsPerLine(paperWidth)

        return EscPosBuilder().apply {
            init()

            // Header
            alignCenter()
            if (isUrgent) {
                doubleSize()
                bold(true)
                line("!!! GẤP !!!")
                normal()
                bold(false)
            }
            doubleSize()
            bold(true)
            line("PHIẾU BẾP")
            normal()
            bold(false)

            // Order info
            alignLeft()
            separator('-', lineWidth)
            twoColumns("Số HĐ:", orderNumber, lineWidth)
            twoColumns("Bàn:", tableName, lineWidth)
            twoColumns("Giờ:", SimpleDateFormat("HH:mm", Locale.getDefault()).format(dateTime), lineWidth)
            separator('-', lineWidth)

            // Items
            items.forEach { item ->
                doubleHeight()
                line("${item.quantity}x ${item.name}")
                normal()
                item.note?.let { line("   * $it") }
            }

            // Notes
            notes?.let {
                separator('-', lineWidth)
                line("Ghi chú: $it")
            }

            feed(5)
            cut()
        }.build()
    }
}

data class KitchenItem(
    val name: String,
    val quantity: Int,
    val note: String? = null
)

// ==================== END OF DAY REPORT ====================

/**
 * Báo cáo cuối ngày
 */
data class EndOfDayReport(
    val storeName: String,
    val date: Date,
    val shiftName: String,
    val staffName: String,
    val totalOrders: Int,
    val totalRevenue: Double,
    val totalDiscount: Double,
    val totalVat: Double,
    val netRevenue: Double,
    val paymentBreakdown: List<PaymentSummary>,
    val openingCash: Double,
    val closingCash: Double,
    val expectedCash: Double
) {
    fun toEscPos(paperWidth: Int = ReceiptTemplate.PAPER_58MM): ByteArray {
        val lineWidth = ReceiptTemplate.charsPerLine(paperWidth)
        val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        val currencyFormat = NumberFormat.getInstance(Locale("vi", "VN")).apply {
            maximumFractionDigits = 0
        }

        return EscPosBuilder().apply {
            init()

            // Header
            alignCenter()
            doubleSize()
            bold(true)
            line(storeName)
            normal()
            bold(false)
            line("BÁO CÁO CUỐI NGÀY")
            line(dateFormat.format(date))
            alignLeft()
            separator('=', lineWidth)

            // Shift info
            twoColumns("Ca:", shiftName, lineWidth)
            twoColumns("Nhân viên:", staffName, lineWidth)
            separator('-', lineWidth)

            // Summary
            twoColumns("Tổng đơn hàng:", totalOrders.toString(), lineWidth)
            twoColumns("Doanh thu:", currencyFormat.format(totalRevenue), lineWidth)
            twoColumns("Giảm giá:", "-${currencyFormat.format(totalDiscount)}", lineWidth)
            twoColumns("VAT:", currencyFormat.format(totalVat), lineWidth)
            separator('-', lineWidth)
            bold(true)
            twoColumns("DOANH THU THỰC:", currencyFormat.format(netRevenue), lineWidth)
            bold(false)

            // Payment breakdown
            separator('=', lineWidth)
            alignCenter()
            bold(true)
            line("PHƯƠNG THỨC THANH TOÁN")
            bold(false)
            alignLeft()
            separator('-', lineWidth)

            paymentBreakdown.forEach { payment ->
                twoColumns(payment.method, currencyFormat.format(payment.amount), lineWidth)
            }

            // Cash drawer
            separator('=', lineWidth)
            alignCenter()
            bold(true)
            line("TIỀN MẶT TRONG KÉT")
            bold(false)
            alignLeft()
            separator('-', lineWidth)

            twoColumns("Đầu ca:", currencyFormat.format(openingCash), lineWidth)
            twoColumns("Cuối ca:", currencyFormat.format(closingCash), lineWidth)
            twoColumns("Dự kiến:", currencyFormat.format(expectedCash), lineWidth)

            val difference = closingCash - expectedCash
            if (difference != 0.0) {
                bold(true)
                twoColumns(
                    if (difference > 0) "Thừa:" else "Thiếu:",
                    currencyFormat.format(kotlin.math.abs(difference)),
                    lineWidth
                )
                bold(false)
            }

            separator('=', lineWidth)

            // Signature
            newLine(3)
            alignCenter()
            line("Xác nhận của quản lý")
            newLine(3)
            separator('.', lineWidth)

            feed(5)
            cut()
        }.build()
    }
}

data class PaymentSummary(
    val method: String,
    val count: Int,
    val amount: Double
)
