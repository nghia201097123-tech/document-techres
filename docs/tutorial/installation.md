---
sidebar_position: 2
---

# Cài đặt

Hướng dẫn chi tiết về cách cài đặt TechRes trên các môi trường khác nhau.

## Cài đặt với npm

```bash
npm install techres
```

## Cài đặt với yarn

```bash
yarn add techres
```

## Cài đặt với pnpm

```bash
pnpm add techres
```

## Cài đặt từ source

Nếu bạn muốn build từ source code:

```bash
# Clone repository
git clone https://github.com/nghia201097123-tech/document-techres.git

# Di chuyển vào thư mục
cd document-techres

# Cài đặt dependencies
npm install

# Build project
npm run build
```

## Kiểm tra cài đặt

Sau khi cài đặt, bạn có thể kiểm tra bằng lệnh:

```bash
npx techres --version
```

## Xử lý lỗi thường gặp

### Lỗi permission denied

Nếu gặp lỗi permission, thử chạy với sudo (Linux/macOS):

```bash
sudo npm install -g techres
```

### Lỗi node version

Đảm bảo bạn đang sử dụng Node.js 18 trở lên:

```bash
node --version
```

Nếu phiên bản thấp hơn, hãy cập nhật Node.js tại [nodejs.org](https://nodejs.org).
