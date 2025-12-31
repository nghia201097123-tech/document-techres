---
sidebar_position: 4
---

# ESC/POS Protocol

Giao thức chuẩn cho máy in bill nhiệt.

## Tổng quan

ESC/POS là giao thức được phát triển bởi Epson, trở thành chuẩn công nghiệp cho máy in POS.

## Các lệnh cơ bản

### Khởi tạo

```javascript
const ESC = 0x1B;
const GS = 0x1D;

// Reset printer
const INIT = [ESC, 0x40];  // ESC @
```

### Căn chỉnh

```javascript
// Căn trái
const ALIGN_LEFT = [ESC, 0x61, 0x00];  // ESC a 0

// Căn giữa
const ALIGN_CENTER = [ESC, 0x61, 0x01];  // ESC a 1

// Căn phải
const ALIGN_RIGHT = [ESC, 0x61, 0x02];  // ESC a 2
```

### Kích thước chữ

```javascript
// Normal
const SIZE_NORMAL = [GS, 0x21, 0x00];  // GS ! 0

// Double height
const SIZE_DOUBLE_HEIGHT = [GS, 0x21, 0x01];  // GS ! 1

// Double width
const SIZE_DOUBLE_WIDTH = [GS, 0x21, 0x10];  // GS ! 16

// Double width + height
const SIZE_DOUBLE = [GS, 0x21, 0x11];  // GS ! 17
```

### In đậm

```javascript
// Bold on
const BOLD_ON = [ESC, 0x45, 0x01];  // ESC E 1

// Bold off
const BOLD_OFF = [ESC, 0x45, 0x00];  // ESC E 0
```

### Cắt giấy

```javascript
// Partial cut
const CUT_PARTIAL = [GS, 0x56, 0x01];  // GS V 1

// Full cut
const CUT_FULL = [GS, 0x56, 0x00];  // GS V 0
```

### Xuống dòng

```javascript
const LF = [0x0A];  // Line Feed

// Feed n lines
const feedLines = (n) => [ESC, 0x64, n];  // ESC d n
```

## In QR Code

```javascript
const printQRCode = (data) => {
  const commands = [];

  // Set model
  commands.push(...[GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);

  // Set size (1-16)
  commands.push(...[GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08]);

  // Set error correction (L=48, M=49, Q=50, H=51)
  commands.push(...[GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]);

  // Store data
  const dataLength = data.length + 3;
  const pL = dataLength % 256;
  const pH = Math.floor(dataLength / 256);
  commands.push(...[GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]);
  commands.push(...Array.from(data).map(c => c.charCodeAt(0)));

  // Print
  commands.push(...[GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);

  return commands;
};
```

## Format Bill

```javascript
const formatBill = (order) => {
  let commands = [];

  // Init
  commands.push(...INIT);

  // Header (centered, double size)
  commands.push(...ALIGN_CENTER);
  commands.push(...SIZE_DOUBLE);
  commands.push(...textToBytes('QUÁN ABC'));
  commands.push(...LF);

  commands.push(...SIZE_NORMAL);
  commands.push(...textToBytes('123 Đường XYZ'));
  commands.push(...LF);
  commands.push(...textToBytes('ĐT: 0901234567'));
  commands.push(...LF);
  commands.push(...LF);

  // Order info
  commands.push(...ALIGN_LEFT);
  commands.push(...textToBytes(`Số: ${order.orderNumber}`));
  commands.push(...LF);
  commands.push(...textToBytes(`Bàn: ${order.tableName}`));
  commands.push(...LF);
  commands.push(...textToBytes(`Ngày: ${formatDate(order.createdAt)}`));
  commands.push(...LF);
  commands.push(...textToBytes('--------------------------------'));
  commands.push(...LF);

  // Items
  for (const item of order.items) {
    commands.push(...textToBytes(`${item.productName}`));
    commands.push(...LF);
    commands.push(...textToBytes(`  ${item.quantity} x ${formatCurrency(item.productPrice)}`));
    commands.push(...ALIGN_RIGHT);
    commands.push(...textToBytes(formatCurrency(item.quantity * item.productPrice)));
    commands.push(...ALIGN_LEFT);
    commands.push(...LF);
  }

  commands.push(...textToBytes('--------------------------------'));
  commands.push(...LF);

  // Total
  commands.push(...BOLD_ON);
  commands.push(...textToBytes('TỔNG CỘNG:'));
  commands.push(...ALIGN_RIGHT);
  commands.push(...textToBytes(formatCurrency(order.totalAmount)));
  commands.push(...BOLD_OFF);
  commands.push(...ALIGN_LEFT);
  commands.push(...LF);
  commands.push(...LF);

  // Footer
  commands.push(...ALIGN_CENTER);
  commands.push(...textToBytes('Cảm ơn quý khách!'));
  commands.push(...LF);

  // QR Code (optional)
  commands.push(...printQRCode(`order:${order.id}`));
  commands.push(...LF);

  // Cut
  commands.push(...feedLines(3));
  commands.push(...CUT_PARTIAL);

  return Buffer.from(commands);
};
```

## Format Tem Bếp

```javascript
const formatKitchenTicket = (order, items) => {
  let commands = [];

  // Init
  commands.push(...INIT);

  // Header
  commands.push(...ALIGN_CENTER);
  commands.push(...SIZE_DOUBLE);
  commands.push(...textToBytes(`BÀN ${order.tableName}`));
  commands.push(...LF);

  commands.push(...SIZE_NORMAL);
  commands.push(...textToBytes(formatTime(new Date())));
  commands.push(...LF);
  commands.push(...textToBytes('================'));
  commands.push(...LF);

  // Items
  commands.push(...ALIGN_LEFT);
  commands.push(...SIZE_DOUBLE_HEIGHT);

  for (const item of items) {
    commands.push(...textToBytes(`${item.quantity}x ${item.productName}`));
    commands.push(...LF);

    if (item.note) {
      commands.push(...SIZE_NORMAL);
      commands.push(...textToBytes(`   * ${item.note}`));
      commands.push(...LF);
      commands.push(...SIZE_DOUBLE_HEIGHT);
    }
  }

  // Cut
  commands.push(...feedLines(2));
  commands.push(...CUT_PARTIAL);

  return Buffer.from(commands);
};
```

## Vietnamese Text Encoding

```javascript
// Encode text to bytes (UTF-8 hoặc Windows-1258)
const textToBytes = (text) => {
  // Một số máy in hỗ trợ UTF-8
  return Array.from(Buffer.from(text, 'utf8'));

  // Nếu máy in không hỗ trợ, cần convert sang Windows-1258
  // hoặc dùng bảng mã riêng
};

// Set code page cho tiếng Việt
const SET_VIETNAMESE = [ESC, 0x74, 0x15];  // ESC t 21 (Windows-1258)
```
