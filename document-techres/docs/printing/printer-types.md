---
sidebar_position: 3
---

# Loại máy in

Hỗ trợ kết nối với nhiều loại máy in khác nhau.

## Bluetooth

### Khi nào dùng

- Order App Standalone (quán nhỏ)
- Máy in di động, xách tay
- Không có hạ tầng mạng

### Cấu hình

```javascript
const bluetoothPrinter = {
  type: 'bluetooth',
  address: 'XX:XX:XX:XX:XX:XX',  // MAC address
  name: 'POS-58',
  paperWidth: 58
};
```

### Kết nối

```javascript
import { BluetoothManager } from 'react-native-thermal-receipt-printer';

// Scan thiết bị
const devices = await BluetoothManager.scanDevices();

// Kết nối
await BluetoothManager.connect(device.address);

// In
await BluetoothManager.printText('Hello World');
```

### Lưu ý

- Cần pair trước khi kết nối
- Khoảng cách tối đa ~10m
- Có thể bị disconnect nếu ra xa

---

## USB

### Khi nào dùng

- POS để bàn (Windows, Android)
- Máy in bill cố định
- Cần ổn định, tốc độ cao

### Cấu hình

```javascript
// Windows
const usbPrinter = {
  type: 'usb',
  address: 'USB001',  // Windows printer name
  paperWidth: 80
};

// Android
const usbPrinter = {
  type: 'usb',
  vendorId: 0x0483,
  productId: 0x5720,
  paperWidth: 80
};
```

### Kết nối (Windows)

```javascript
import escpos from 'escpos';
import USB from 'escpos-usb';

const device = new USB();
const printer = new escpos.Printer(device);

device.open(function(error) {
  printer
    .text('Hello World')
    .cut()
    .close();
});
```

### Kết nối (Android)

```javascript
import { USBPrinter } from 'react-native-thermal-receipt-printer';

const devices = await USBPrinter.getDeviceList();
await USBPrinter.connectPrinter(devices[0].vendor_id, devices[0].product_id);
await USBPrinter.printText('Hello World');
```

---

## WiFi/LAN

### Khi nào dùng

- Nhiều thiết bị dùng chung 1 máy in
- Máy in bếp/bar đặt xa POS
- Cần linh hoạt vị trí

### Cấu hình

```javascript
const lanPrinter = {
  type: 'lan',
  address: '192.168.1.50',
  port: 9100,  // Standard raw port
  paperWidth: 80
};
```

### Kết nối

```javascript
import TcpSocket from 'react-native-tcp-socket';

const printViaLAN = async (ip, port, data) => {
  return new Promise((resolve, reject) => {
    const client = TcpSocket.createConnection({ host: ip, port }, () => {
      client.write(Buffer.from(data));
      client.end();
    });

    client.on('close', () => resolve());
    client.on('error', (err) => reject(err));
  });
};
```

### Lưu ý

- Máy in cần có IP tĩnh
- Đảm bảo firewall không chặn port 9100
- Có thể bị ảnh hưởng nếu mạng không ổn định

---

## So sánh

| Tiêu chí | Bluetooth | USB | LAN |
|----------|-----------|-----|-----|
| Khoảng cách | ~10m | Dây cáp | Trong mạng |
| Tốc độ | Trung bình | Nhanh | Nhanh |
| Ổn định | Trung bình | Cao | Cao |
| Dùng chung | Không | Không | Được |
| Setup | Dễ | Trung bình | Phức tạp |
| Giá máy in | Thấp | Trung bình | Cao |

## Máy in phổ biến

| Hãng | Model | Kết nối | Khổ giấy |
|------|-------|---------|----------|
| Xprinter | XP-58 | USB, Bluetooth | 58mm |
| Xprinter | XP-80 | USB, LAN | 80mm |
| Epson | TM-T82 | USB, LAN | 80mm |
| Bixolon | SRP-350 | USB, LAN | 80mm |
| RONGTA | RP80 | USB, LAN, Bluetooth | 80mm |
