---
sidebar_position: 1
---

# Tổng quan hệ thống in

Hệ thống in ấn trong TechRes POS hỗ trợ đầy đủ tất cả các loại máy in phổ biến trên thị trường Việt Nam.

## Các loại kết nối

| Kết nối | Protocol | Platform | Use case | Port/Address |
|---------|----------|----------|----------|--------------|
| **Bluetooth** | SPP | Android, iOS | Máy in di động | MAC address |
| **WiFi/LAN** | TCP/IP | Tất cả | Máy in mạng | IP:9100 |
| **USB** | USB Host | Windows, Android | Máy in để bàn | USB path |
| **Sunmi Built-in** | AIDL | Sunmi devices | POS tích hợp | Internal |
| **Serial (RS232)** | Serial | Industrial | Máy POS công nghiệp | /dev/ttyS* |

## Các hãng máy in được hỗ trợ

| Hãng | Models phổ biến | Kết nối | Khổ giấy |
|------|-----------------|---------|----------|
| **Epson** | TM-T88, TM-T82, TM-P20, TM-U220 | All | 58/80mm |
| **Star Micronics** | TSP100, TSP654, SM-T300 | All | 58/80mm |
| **Bixolon** | SRP-350, SPP-R310, SPP-R200 | All | 58/80mm |
| **Citizen** | CT-S310, CT-E651, CMP-30 | All | 58/80mm |
| **Sunmi** | V1, V2, V2 Pro, T2, P2, D2 | Built-in | 58/80mm |
| **Xprinter** | XP-N160II, XP-58IIH, XP-80 | All | 58/80mm |
| **HPRT** | TP806L, TP808, TP585 | All | 58/80mm |
| **Rongta** | RP80, RP58, RP330 | All | 58/80mm |
| **Zjiang/ZJ** | ZJ-5890K, ZJ-8250 | All | 58/80mm |
| **Goojprt** | PT-210, MTP-II | Bluetooth | 58mm |
| **MUNBYN** | IMP001, IMP002 | All | 58/80mm |

## Loại phiếu in

| Loại | In từ | Nội dung | Máy in |
|------|-------|----------|--------|
| **Bill khách hàng** | CCB | Tên quán, chi tiết order, tổng tiền, QR | Cashier |
| **Tem bếp** | CCB | Tên món, số lượng, ghi chú, số bàn | Kitchen |
| **Tem bar** | CCB | Tương tự tem bếp | Bar |
| **Báo cáo ca** | CCB | Doanh thu, số đơn, chi tiết thanh toán | Cashier |
| **Phiếu giao hàng** | CCB | Địa chỉ, món, tổng tiền | Cashier |

## Kiến trúc hệ thống in

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRINTER ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                          PrinterManager                                 │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │  • Quản lý tất cả adapters                                       │   │ │
│  │  │  • Lưu cấu hình máy in mặc định                                  │   │ │
│  │  │  • Print queue với retry                                         │   │ │
│  │  │  • Connection state management                                    │   │ │
│  │  │  • Auto-reconnect khi mất kết nối                                │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│          ┌─────────────────────────┼─────────────────────────┐              │
│          ▼                         ▼                         ▼              │
│   ┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐      │
│   │  Discovery   │     │  PrinterConnection │     │  ReceiptTemplate │      │
│   │   Service    │     │    (Interface)     │     │     Builder      │      │
│   │              │     │                    │     │                  │      │
│   │ • Bluetooth  │     │ • connect()        │     │ • Header         │      │
│   │ • Network    │     │ • disconnect()     │     │ • Items          │      │
│   │ • USB        │     │ • write()          │     │ • Totals         │      │
│   │ • mDNS       │     │ • read()           │     │ • Footer         │      │
│   └──────────────┘     │ • getStatus()      │     │ • QR/Barcode     │      │
│                        └───────────────────┘     └──────────────────┘      │
│                                    │                                         │
│            ┌───────────────────────┼───────────────────────┐                │
│            ▼           ▼           ▼           ▼           ▼                │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                         Printer Adapters                              │  │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │  │
│   │  │Bluetooth │ │ Network  │ │   USB    │ │  Sunmi   │ │   Serial   │ │  │
│   │  │ Adapter  │ │ Adapter  │ │ Adapter  │ │ Adapter  │ │  Adapter   │ │  │
│   │  │          │ │          │ │          │ │          │ │            │ │  │
│   │  │ SPP UUID │ │ TCP:9100 │ │ USB Host │ │  AIDL    │ │  RS232     │ │  │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────┘ │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        ESC/POS Commands                               │  │
│   │  • Initialize, Reset                                                  │  │
│   │  • Text formatting (bold, underline, size, alignment)                │  │
│   │  • Barcode (CODE39, CODE128, EAN13, UPC-A, ITF, CODABAR)            │  │
│   │  • QR Code (Model 1, Model 2, error correction levels)               │  │
│   │  • Image printing (raster bitmap, NV graphics)                       │  │
│   │  • Paper cut (full, partial), Cash drawer, Beeper                   │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flow in bill khách hàng

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         BILL PRINTING FLOW                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────┐                                                        │
│   │  Thanh toán │                                                        │
│   │  hoàn thành │                                                        │
│   └──────┬──────┘                                                        │
│          │                                                                │
│          ▼                                                                │
│   ┌──────────────────┐                                                   │
│   │  ReceiptTemplate │                                                   │
│   │     .create()    │                                                   │
│   │     .header()    │──────► Logo, tên quán, địa chỉ, ĐT               │
│   │     .orderInfo() │──────► Số HĐ, ngày, bàn, nhân viên               │
│   │     .items()     │──────► Danh sách món + giá                        │
│   │     .totals()    │──────► Tạm tính, giảm giá, VAT, tổng              │
│   │     .payment()   │──────► Phương thức, tiền nhận, tiền thừa          │
│   │     .footer()    │──────► QR Code, lời cảm ơn                        │
│   │     .build()     │                                                   │
│   └──────┬───────────┘                                                   │
│          │                                                                │
│          ▼                                                                │
│   ┌──────────────────┐                                                   │
│   │  PrinterManager  │                                                   │
│   │   .printRaw()    │                                                   │
│   └──────┬───────────┘                                                   │
│          │                                                                │
│          ▼                                                                │
│   ┌──────────────────┐     ┌──────────────────┐                         │
│   │  Check Status    │────►│  Retry if needed │                         │
│   └──────┬───────────┘     └──────────────────┘                         │
│          │                                                                │
│          ▼                                                                │
│   ┌──────────────────┐                                                   │
│   │   🖨️ Print Bill  │                                                   │
│   └──────────────────┘                                                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Flow in tem bếp

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       KITCHEN TICKET FLOW                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────┐       ┌─────────────┐       ┌─────────────┐           │
│   │  Order App  │──────►│  CCB nhận   │──────►│  Lưu order  │           │
│   │  gọi món    │       │   order     │       │  vào DB     │           │
│   └─────────────┘       └─────────────┘       └──────┬──────┘           │
│                                                       │                   │
│                                                       ▼                   │
│                                        ┌──────────────────────────┐      │
│                                        │  Phân loại món theo khu: │      │
│                                        │  • Bếp (nấu, chiên, nướng)│      │
│                                        │  • Bar (đồ uống, tráng miệng)│   │
│                                        └──────────────┬───────────┘      │
│                                                       │                   │
│                          ┌────────────────────────────┼──────────────┐   │
│                          ▼                            ▼              │   │
│                   ┌──────────────┐            ┌──────────────┐       │   │
│                   │ KitchenTicket│            │ KitchenTicket│       │   │
│                   │   (Bếp)      │            │   (Bar)      │       │   │
│                   │              │            │              │       │   │
│                   │ • Số bàn     │            │ • Số bàn     │       │   │
│                   │ • Thời gian  │            │ • Thời gian  │       │   │
│                   │ • Món + SL   │            │ • Món + SL   │       │   │
│                   │ • Ghi chú    │            │ • Ghi chú    │       │   │
│                   └──────┬───────┘            └──────┬───────┘       │   │
│                          │                           │               │   │
│                          ▼                           ▼               │   │
│                   ┌──────────────┐            ┌──────────────┐       │   │
│                   │ 🖨️ Máy in   │            │ 🖨️ Máy in   │       │   │
│                   │    BẾP       │            │    BAR       │       │   │
│                   │  (LAN/WiFi)  │            │  (LAN/WiFi)  │       │   │
│                   └──────────────┘            └──────────────┘       │   │
│                                                                       │   │
└──────────────────────────────────────────────────────────────────────────┘
```

## Cấu hình máy in

### Trong CCB Settings (Kotlin)

```kotlin
data class PrinterConfig(
    val cashier: PrinterDevice,    // Máy in bill
    val kitchen: PrinterDevice?,   // Máy in bếp (optional)
    val bar: PrinterDevice?,       // Máy in bar (optional)
    val paperWidth: Int = 58       // 58mm hoặc 80mm
)

// Ví dụ cấu hình
val config = PrinterConfig(
    cashier = PrinterDevice(
        connectionType = ConnectionType.BLUETOOTH,
        address = "00:11:22:33:44:55",
        name = "Cashier Printer",
        paperWidth = 80
    ),
    kitchen = PrinterDevice(
        connectionType = ConnectionType.LAN,
        address = "192.168.1.50:9100",
        name = "Kitchen Printer",
        paperWidth = 80
    ),
    bar = PrinterDevice(
        connectionType = ConnectionType.LAN,
        address = "192.168.1.51:9100",
        name = "Bar Printer",
        paperWidth = 58
    )
)
```

### Network Ports

| Port | Protocol | Mô tả |
|------|----------|-------|
| 9100 | RAW | Phổ biến nhất (HP JetDirect compatible) |
| 515 | LPR/LPD | Một số máy in cũ |
| 631 | IPP | Internet Printing Protocol |

## Xử lý lỗi máy in

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| **Connection failed** | Máy in tắt/ngoài phạm vi | Kiểm tra nguồn, khoảng cách |
| **Write failed** | Mất kết nối giữa chừng | Auto-reconnect, retry |
| **Paper out** | Hết giấy | Thông báo người dùng |
| **Cover open** | Nắp máy in mở | Đóng nắp |
| **Overheated** | Máy in quá nóng | Đợi nguội |
| **Permission denied** | Thiếu quyền Bluetooth/USB | Yêu cầu cấp quyền |

## Thư viện sử dụng

| Platform | Library | Ghi chú |
|----------|---------|---------|
| Android Native | Custom PrinterManager | ESC/POS, All connections |
| React Native | `react-native-thermal-receipt-printer` | Bluetooth, USB, LAN |
| Windows | `escpos` (Node.js) | USB, LAN |

## Best Practices

1. **Auto-reconnect:** Tự động kết nối lại khi mất kết nối
2. **Print queue:** Sử dụng queue để xử lý khi máy in bận
3. **Status check:** Kiểm tra trạng thái trước khi in
4. **Fallback:** Cho phép bỏ qua lỗi in (order vẫn hoàn thành)
5. **Test print:** Cung cấp chức năng in thử
6. **Default printer:** Lưu máy in mặc định để kết nối nhanh
7. **Paper width:** Lưu setting khổ giấy (58mm/80mm)
