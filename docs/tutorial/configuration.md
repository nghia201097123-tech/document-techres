---
sidebar_position: 3
---

# Cấu hình

Hướng dẫn cấu hình TechRes theo nhu cầu của bạn.

## File cấu hình

TechRes sử dụng file `techres.config.js` để cấu hình:

```javascript title="techres.config.js"
module.exports = {
  // Tên dự án
  name: 'My Project',

  // Phiên bản
  version: '1.0.0',

  // Cấu hình môi trường
  env: {
    development: {
      apiUrl: 'http://localhost:3000/api',
      debug: true,
    },
    production: {
      apiUrl: 'https://api.example.com',
      debug: false,
    },
  },
};
```

## Các tùy chọn cấu hình

### name

Tên dự án, sử dụng trong các thông báo và logs.

| Type | Default | Required |
|------|---------|----------|
| string | `'TechRes'` | No |

### version

Phiên bản của dự án.

| Type | Default | Required |
|------|---------|----------|
| string | `'1.0.0'` | No |

### env

Cấu hình cho các môi trường khác nhau.

| Type | Default | Required |
|------|---------|----------|
| object | `{}` | No |

## Biến môi trường

Bạn cũng có thể sử dụng file `.env`:

```bash title=".env"
TECHRES_API_URL=https://api.example.com
TECHRES_DEBUG=false
TECHRES_SECRET_KEY=your-secret-key
```

:::warning Lưu ý bảo mật
Không bao giờ commit file `.env` chứa secret keys lên git repository.
:::

## Cấu hình nâng cao

Xem thêm [API Reference](/docs/api/overview) để biết thêm về các tùy chọn cấu hình nâng cao.
