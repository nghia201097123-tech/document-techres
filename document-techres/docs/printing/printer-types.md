---
sidebar_position: 3
---

# Loại máy in

Hỗ trợ kết nối với tất cả các loại máy in phổ biến trên thị trường.

## Tổng quan các loại kết nối

| Loại kết nối | Port/Protocol | Ưu điểm | Nhược điểm |
|--------------|---------------|---------|------------|
| **Bluetooth** | SPP (UUID 00001101) | Di động, không cần dây | Range ngắn (~10m) |
| **WiFi/LAN** | TCP/IP port 9100 | Ổn định, range xa | Cần cấu hình mạng |
| **USB** | USB Host | Nhanh, tin cậy | Cần cáp, cố định |
| **Sunmi Built-in** | AIDL Service | Tích hợp sẵn | Chỉ máy Sunmi |
| **Serial (RS232)** | /dev/ttyS* | Ổn định, công nghiệp | Thiết bị cũ |

---

## 1. Bluetooth Printer

### Khi nào dùng

- Order App Standalone (quán nhỏ)
- Máy in di động, xách tay
- Không có hạ tầng mạng

### Thông số kỹ thuật

| Thông số | Giá trị |
|----------|---------|
| Protocol | Serial Port Profile (SPP) |
| UUID | `00001101-0000-1000-8000-00805F9B34FB` |
| Range | ~10 mét |
| Android min | API 23 (Android 6.0) |

### Sử dụng (Kotlin)

```kotlin
@Inject
lateinit var printerManager: PrinterManager

// Lấy danh sách thiết bị đã ghép đôi
val pairedDevices = printerManager.quickScan()
    .filter { it.connectionType == ConnectionType.BLUETOOTH }

// Kết nối
val result = printerManager.connect(pairedDevices.first())

when (result) {
    is PrinterResult.Success -> {
        // In test
        printerManager.testPrint()
    }
    is PrinterResult.Error -> {
        Log.e("Printer", "Lỗi: ${result.message}")
    }
}
```

### Discovery (tìm kiếm thiết bị mới)

```kotlin
// Bắt đầu quét
printerManager.startDiscovery(setOf(ConnectionType.BLUETOOTH))

// Observe kết quả
printerManager.discoveredDevices.collect { devices ->
    devices.forEach { device ->
        println("Found: ${device.name} - ${device.address}")
    }
}

// Dừng quét
printerManager.stopDiscovery()
```

### Permissions cần thiết

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
```

### Máy in Bluetooth phổ biến

| Hãng | Model | Khổ giấy | Ghi chú |
|------|-------|----------|---------|
| Epson | TM-P20 | 58mm | Chất lượng cao |
| Bixolon | SPP-R310 | 80mm | Bluetooth + USB |
| Goojprt | PT-210 | 58mm | Giá rẻ |
| Xprinter | XP-P300 | 80mm | Phổ biến |
| HPRT | HM-A300 | 80mm | Di động |

### Lưu ý

- Cần pair (ghép đôi) trước khi kết nối
- Khoảng cách tối đa ~10m
- Có thể bị disconnect nếu ra xa
- Một số máy cần mã PIN (thường là 0000 hoặc 1234)

---

## 2. WiFi/LAN Printer (Network)

### Khi nào dùng

- Nhiều thiết bị dùng chung 1 máy in
- Máy in bếp/bar đặt xa POS
- Cần linh hoạt vị trí

### Thông số kỹ thuật

| Thông số | Giá trị |
|----------|---------|
| Protocol | TCP/IP Socket |
| Port mặc định | 9100 (RAW printing) |
| Port alternatives | 515 (LPR), 631 (IPP) |
| Discovery | mDNS/Bonjour, Network scan |

### Sử dụng (Kotlin)

```kotlin
// Kết nối bằng IP
printerManager.connectByAddress(
    address = "192.168.1.100:9100",
    connectionType = ConnectionType.LAN,
    name = "Kitchen Printer"
)

// Hoặc connect với PrinterDevice
val device = PrinterDevice.fromNetworkAddress(
    ip = "192.168.1.100",
    port = 9100,
    name = "Kitchen Printer"
)
printerManager.connect(device)
```

### Network Discovery

```kotlin
// Quét mạng local
printerManager.startDiscovery(setOf(ConnectionType.LAN))

// Discovery service sẽ:
// 1. Quét mDNS/Bonjour
// 2. Scan port 9100 trong subnet
// 3. Trả về danh sách máy in
```

### Permissions cần thiết

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
```

### Máy in Network phổ biến

| Hãng | Model | Khổ giấy | Interface |
|------|-------|----------|-----------|
| Epson | TM-T88VI | 80mm | Ethernet, WiFi, USB |
| Star | TSP100 | 80mm | Ethernet, WiFi |
| Bixolon | SRP-350III | 80mm | Ethernet, USB |
| Citizen | CT-E651 | 80mm | Ethernet, USB |
| Xprinter | XP-N160II | 80mm | Ethernet, USB |

### Lưu ý

- Máy in cần có IP tĩnh hoặc DHCP reservation
- Đảm bảo firewall không chặn port 9100
- Có thể bị ảnh hưởng nếu mạng không ổn định
- Nên đặt cùng VLAN với thiết bị POS

---

## 3. USB Printer

### Khi nào dùng

- POS để bàn (Windows, Android)
- Máy in bill cố định
- Cần ổn định, tốc độ cao

### Thông số kỹ thuật

| Thông số | Giá trị |
|----------|---------|
| Mode | USB Host |
| Class | Printer (0x07) hoặc Vendor Specific |
| Android min | API 12 (Android 3.1) |

### Sử dụng (Kotlin)

```kotlin
// Lấy danh sách máy in USB đang kết nối
val usbPrinters = usbAdapter.getConnectedPrinters()

// Kết nối (sẽ yêu cầu permission nếu chưa có)
val result = printerManager.connect(usbPrinters.first())

// Xử lý kết quả
if (result is PrinterResult.Success) {
    printerManager.testPrint()
}
```

### Manifest configuration

```xml
<uses-feature android:name="android.hardware.usb.host"/>

<!-- Auto-launch khi cắm USB -->
<intent-filter>
    <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"/>
</intent-filter>
<meta-data
    android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
    android:resource="@xml/usb_device_filter"/>
```

### Vendor IDs phổ biến

| Hãng | Vendor ID (Hex) | Vendor ID (Dec) |
|------|-----------------|-----------------|
| Epson | 0x04B8 | 1208 |
| Star Micronics | 0x0519 | 1305 |
| Bixolon | 0x1504 | 5380 |
| Citizen | 0x154F | 5455 |
| STMicroelectronics | 0x0483 | 1155 |
| HPRT | 0x0456 | 1110 |
| Zjiang | 0x6868 | 26728 |

---

## 4. Sunmi Built-in Printer

### Khi nào dùng

- Máy POS Sunmi (V1, V2, T2, P2, D2...)
- Không cần cấu hình máy in riêng
- Tích hợp sẵn trong thiết bị

### Các thiết bị Sunmi được hỗ trợ

| Model | Giấy | Cutter | Màn hình | Ghi chú |
|-------|------|--------|----------|---------|
| Sunmi V1 | 58mm | No | 5.5" | Entry level |
| Sunmi V1s | 58mm | No | 5.5" | 4G support |
| Sunmi V2 | 58mm | No | 5.5" | Popular |
| Sunmi V2 Pro | 58mm | No | 5.99" | NFC, 4G |
| Sunmi V2s | 58mm | No | 5.5" | Budget |
| Sunmi T1 | 80mm | Yes | 15.6" | Desktop |
| Sunmi T1 mini | 58mm | No | 11.6" | Compact desktop |
| Sunmi T2 | 80mm | Yes | 15.6" | Popular desktop |
| Sunmi T2 mini | 58mm | Yes | 11.6" | Compact |
| Sunmi T2s | 80mm | Yes | 15.6" | Updated |
| Sunmi P1 | 58mm | No | Handheld | Mobile |
| Sunmi P2 | 58mm | No | Handheld | 4G, NFC |
| Sunmi P2 Lite | 58mm | No | Handheld | Budget |
| Sunmi D2 | 58mm | Optional | Counter | Kiosk |
| Sunmi D2 mini | 58mm | No | Counter | Compact |
| Sunmi K1 | 80mm | Yes | Kiosk | Self-service |
| Sunmi K2 | 80mm | Yes | Kiosk | 2 screens |

### Sử dụng (Kotlin)

```kotlin
// Auto-detect và connect
if (sunmiAdapter.isSunmiDevice()) {
    printerManager.connect(PrinterDevice.sunmiInner())
}

// Lấy thông tin máy
val model = sunmiAdapter.getSunmiModel()
val paperWidth = sunmiAdapter.getPaperWidth()
val serial = sunmiAdapter.getSerialNumber()
```

### Sunmi-specific functions

```kotlin
// In QR Code với kích thước lớn
sunmiAdapter.printQRCode("https://techres.vn", size = 8)

// Mở ngăn kéo tiền
sunmiAdapter.openCashDrawer()

// Cắt giấy
sunmiAdapter.cutPaper()

// In bảng
sunmiAdapter.printTable(
    columns = arrayOf("Món", "SL", "Giá"),
    weights = intArrayOf(2, 1, 1),
    aligns = intArrayOf(0, 1, 2)  // left, center, right
)
```

### Lưu ý

- Không cần permission đặc biệt
- Tự động detect thiết bị Sunmi
- Sunmi service cần được cài sẵn (có sẵn trên máy Sunmi)

---

## 5. Serial Printer (RS232/RS485)

### Khi nào dùng

- Máy POS công nghiệp
- Thiết bị cũ có cổng Serial
- Môi trường đòi hỏi độ ổn định cao

### Thông số kỹ thuật

| Thông số | Giá trị mặc định |
|----------|------------------|
| Baud rate | 9600 |
| Data bits | 8 |
| Stop bits | 1 |
| Parity | None |
| Flow control | None |

### Serial ports phổ biến

```
/dev/ttyS0, /dev/ttyS1       - Native serial
/dev/ttyUSB0, /dev/ttyUSB1   - USB to Serial adapter
/dev/ttyACM0                 - USB CDC devices
```

### Sử dụng (Kotlin)

```kotlin
// Kiểm tra ports có sẵn
val ports = serialAdapter.getAvailablePorts()

// Kết nối
serialAdapter.connect("/dev/ttyS0", baudRate = 9600)
```

### Lưu ý

- Cần USB-to-Serial adapter nếu thiết bị không có cổng Serial
- Một số máy Android công nghiệp có cổng Serial native
- Cần root hoặc chmod permission cho /dev/tty* files

---

## So sánh chi tiết

| Tiêu chí | Bluetooth | WiFi/LAN | USB | Sunmi | Serial |
|----------|-----------|----------|-----|-------|--------|
| **Khoảng cách** | ~10m | Trong mạng | Dây cáp | N/A | Dây cáp |
| **Tốc độ** | Trung bình | Nhanh | Rất nhanh | Nhanh | Trung bình |
| **Ổn định** | Trung bình | Cao | Rất cao | Cao | Rất cao |
| **Dùng chung** | Không | Được | Không | Không | Không |
| **Setup** | Dễ | Trung bình | Dễ | Tự động | Khó |
| **Di động** | Có | Không | Không | Có | Không |
| **Giá máy in** | Thấp-TB | TB-Cao | TB | Tích hợp | Cao |

## Danh sách máy in được test

| Hãng | Model | Bluetooth | LAN | USB | Khổ giấy | Status |
|------|-------|-----------|-----|-----|----------|--------|
| Epson | TM-T88VI | - | ✅ | ✅ | 80mm | ✅ Tested |
| Epson | TM-T82III | - | ✅ | ✅ | 80mm | ✅ Tested |
| Epson | TM-P20 | ✅ | - | ✅ | 58mm | ✅ Tested |
| Star | TSP100 | - | ✅ | ✅ | 80mm | ✅ Tested |
| Bixolon | SRP-350III | - | ✅ | ✅ | 80mm | ✅ Tested |
| Bixolon | SPP-R310 | ✅ | - | ✅ | 80mm | ✅ Tested |
| Citizen | CT-S310II | - | ✅ | ✅ | 80mm | ✅ Tested |
| Sunmi | V2 | Built-in | - | - | 58mm | ✅ Tested |
| Sunmi | T2 | Built-in | - | - | 80mm | ✅ Tested |
| Xprinter | XP-N160II | - | ✅ | ✅ | 80mm | ✅ Tested |
| Xprinter | XP-58IIH | ✅ | - | ✅ | 58mm | ✅ Tested |
| HPRT | TP806L | - | ✅ | ✅ | 80mm | ✅ Tested |
| Rongta | RP80 | ✅ | ✅ | ✅ | 80mm | ✅ Tested |
| Goojprt | PT-210 | ✅ | - | - | 58mm | ✅ Tested |
| Zjiang | ZJ-5890K | - | - | ✅ | 58mm | ✅ Tested |
