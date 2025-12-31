# TechRes Documentation

Website tài liệu kỹ thuật được xây dựng bằng [Docusaurus](https://docusaurus.io/) và React.

## Yêu cầu

- Node.js >= 18.0
- npm hoặc yarn

## Cài đặt

```bash
npm install
```

## Phát triển

Chạy development server:

```bash
npm start
```

Website sẽ chạy tại `http://localhost:3000`.

## Build

Tạo bản production:

```bash
npm run build
```

Output sẽ được tạo trong thư mục `build/`.

## Preview

Preview bản build:

```bash
npm run serve
```

## Cấu trúc thư mục

```
document-techres/
├── blog/                    # Blog posts
├── docs/                    # Documentation files
│   ├── intro.md
│   ├── tutorial/
│   └── api/
├── src/
│   ├── components/          # React components
│   ├── css/                 # Custom styles
│   └── pages/               # Custom pages
├── static/                  # Static files
├── docusaurus.config.ts     # Docusaurus configuration
├── sidebars.ts              # Sidebar configuration
└── package.json
```

## Thêm tài liệu mới

1. Tạo file `.md` trong thư mục `docs/`
2. Thêm frontmatter với `sidebar_position`
3. Cập nhật `sidebars.ts` nếu cần

## License

MIT
