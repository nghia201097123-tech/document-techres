---
sidebar_position: 1
---

# Tổng quan hệ thống in

Hệ thống in ấn trong FNB POS hỗ trợ nhiều loại kết nối và phiếu in khác nhau.

## Loại kết nối

| Kết nối | Platform | Use case |
|---------|----------|----------|
| **Bluetooth** | Android, iOS | Máy in di động, Order App Standalone |
| **USB** | Windows, Android | Máy in để bàn tại POS |
| **WiFi/LAN** | Tất cả | Máy in mạng dùng chung |

## Loại phiếu in

| Loại | In từ | Nội dung |
|------|-------|----------|
| **Bill khách hàng** | CCB | Tên quán, order detail, tổng tiền, QR thanh toán |
| **Tem bếp** | CCB | Tên món, số lượng, ghi chú, số bàn |
| **Tem bar** | CCB | Tương tự tem bếp |
| **Báo cáo ca** | CCB | Tổng doanh thu, số đơn, chi tiết thanh toán |

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         CCB (Master)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐     ┌─────────────────────────────────┐   │
│   │   Print Queue   │────►│         Print Service           │   │
│   │    (SQLite)     │     │                                 │   │
│   └─────────────────┘     │  • Format ESC/POS commands      │   │
│          │                │  • Send to printers             │   │
│          │                │  • Handle retries               │   │
│          │                └─────────────────────────────────┘   │
│          │                              │                       │
│          │                    ┌─────────┼─────────┐             │
│          │                    ▼         ▼         ▼             │
│          │              ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│          │              │ Printer │ │ Printer │ │ Printer │     │
│          │              │ Cashier │ │ Kitchen │ │   Bar   │     │
│          │              │  (USB)  │ │  (LAN)  │ │  (LAN)  │     │
│          │              └─────────┘ └─────────┘ └─────────┘     │
│          │                                                      │
│          │ WebSocket                                            │
│          ▼                                                      │
│   ┌─────────────────┐                                           │
│   │   POS Bếp/Bar   │                                           │
│   │  (fetch & print)│                                           │
│   └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Flow in bill

```
Thanh toán hoàn thành
        │
        ▼
CCB tạo print job (type: bill)
        │
        ▼
Print Service format ESC/POS
        │
        ▼
Gửi đến máy in cashier
        │
        ▼
In bill cho khách
```

## Flow in tem bếp

```
Order App gọi món
        │
        ▼
CCB lưu order
        │
        ▼
CCB tạo print job (type: kitchen)
        │
        ▼
Broadcast 'print:new-job' đến POS Bếp
        │
        ▼
POS Bếp fetch pending jobs
        │
        ▼
POS Bếp in tem
```

## Cấu hình máy in

Trong Settings của CCB:

```javascript
const printerConfig = {
  cashier: {
    type: 'usb',       // usb, bluetooth, lan
    address: '/dev/usb/lp0',  // USB path hoặc IP:port
    paperWidth: 80     // 58mm hoặc 80mm
  },
  kitchen: {
    type: 'lan',
    address: '192.168.1.50:9100',
    paperWidth: 80
  },
  bar: {
    type: 'lan',
    address: '192.168.1.51:9100',
    paperWidth: 58
  }
};
```

## Thư viện sử dụng

| Platform | Library |
|----------|---------|
| React Native | `react-native-esc-pos-printer` |
| React Native | `react-native-thermal-receipt-printer` |
| Windows | `escpos` (Node.js) |
