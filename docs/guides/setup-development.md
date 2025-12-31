---
sidebar_position: 2
---

# Thiết lập môi trường phát triển

Hướng dẫn chi tiết thiết lập môi trường development.

## Cài đặt tools

### Node.js

```bash
# Sử dụng nvm (recommended)
nvm install 18
nvm use 18
```

### pnpm

```bash
npm install -g pnpm
```

### React Native

Theo hướng dẫn tại [reactnative.dev/docs/environment-setup](https://reactnative.dev/docs/environment-setup)

## Cấu hình Editor

### VS Code Extensions

- ESLint
- Prettier
- TypeScript
- React Native Tools
- Prisma

### Workspace settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Environment Variables

### Server (.env)

```bash
# server/.env
DATABASE_URL="postgresql://user:password@localhost:5432/fnb_pos"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=3000
```

### Web Apps (.env.local)

```bash
# apps/web-dashboard/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Database Setup

### PostgreSQL với Docker

```bash
docker run -d \
  --name fnb-postgres \
  -e POSTGRES_USER=fnb \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=fnb_pos \
  -p 5432:5432 \
  postgres:15
```

### Migrate database

```bash
cd server
npx prisma migrate dev
```

### Seed data

```bash
npx prisma db seed
```

## Chạy tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:coverage
```

## Linting

```bash
# Lint all
pnpm lint

# Lint fix
pnpm lint:fix
```

## Build

```bash
# Build all packages
pnpm build

# Build specific app
pnpm --filter web-dashboard build
```

## Debug

### React Native Debugger

1. Cài đặt [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
2. Mở app
3. Shake device → Debug with Chrome

### VS Code Debug

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/src/index.ts",
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

## Troubleshooting

### Metro bundler lỗi

```bash
# Clear cache
cd apps/order
npm start -- --reset-cache
```

### Android build lỗi

```bash
# Clean build
cd apps/order/android
./gradlew clean
```

### iOS build lỗi

```bash
cd apps/order/ios
rm -rf Pods Podfile.lock
pod install
```
