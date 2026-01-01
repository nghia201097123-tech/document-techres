---
sidebar_position: 3
---

# Deployment

Hướng dẫn triển khai hệ thống lên production.

## Server Deployment

### Docker

```dockerfile
# server/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/fnb
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=fnb

  web-dashboard:
    build: ./apps/web-dashboard
    ports:
      - "80:3000"

volumes:
  postgres_data:
```

### Cloud Platforms

| Platform | Phù hợp cho |
|----------|-------------|
| Vercel | Web apps (Dashboard, Admin) |
| Railway | Server API + Database |
| DigitalOcean | Full stack |
| AWS | Enterprise |

## Mobile Apps

### Android

#### Build APK

```bash
cd apps/ccb/android
./gradlew assembleRelease
```

APK tại: `android/app/build/outputs/apk/release/app-release.apk`

#### Build AAB (Play Store)

```bash
./gradlew bundleRelease
```

### iOS

#### Build IPA

```bash
cd apps/order/ios
xcodebuild -workspace Order.xcworkspace \
  -scheme Order \
  -configuration Release \
  -archivePath build/Order.xcarchive \
  archive
```

## Windows App (CCB)

### Build với react-native-windows

```bash
cd apps/ccb
npx react-native run-windows --release
```

### Packaging với MSIX

```powershell
.\windows\package.ps1
```

## Environment Configuration

### Production

```bash
# Server
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=strong-secret-key
CORS_ORIGIN=https://dashboard.fnbpos.com

# Mobile apps
API_URL=https://api.fnbpos.com
```

### SSL/TLS

- Server API: HTTPS required
- WebSocket: WSS required
- Local API (CCB): HTTP (LAN only)

## Monitoring

### Logging

```javascript
// Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Health Check

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isDatabaseConnected(),
    version: process.env.npm_package_version
  });
});
```

### Error Tracking

Sử dụng Sentry:

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

## Backup Strategy

### Database

```bash
# Daily backup
pg_dump -Fc fnb_pos > backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d fnb_pos backup_20240115.dump
```

### CCB Local Data

- Export SQLite database
- Sync lên cloud trước khi backup
- Giữ backup 7 ngày gần nhất
