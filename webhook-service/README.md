# PayOS Webhook Service

Microservice for handling PayOS payment webhooks and emitting Socket.IO events to notify the POS app of payment status changes.

## Architecture

```
PayOS Server --> Webhook Service --> Socket.IO --> api-dashboard --> POS App
                    |
                    v
              Payment Events:
              - payment:success
              - payment:cancelled
              - payment:expired
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/webhook/health` | Health check endpoint |
| POST | `/webhook/payos` | PayOS webhook receiver |
| POST | `/webhook/payos/confirm` | Webhook confirmation endpoint |

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=3006

# PayOS Configuration
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key

# Socket.IO Server (api-dashboard)
SOCKET_SERVER_URL=http://localhost:3000
```

## Running

### Development
```bash
npm install
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Docker
```bash
docker-compose up -d
```

## PayOS Webhook Configuration

Configure PayOS webhook URL in PayOS dashboard:
- URL: `https://your-domain/webhook/payos`
- Events: Payment success, cancelled, expired

## Socket.IO Events

The service emits the following events to the api-dashboard Socket.IO server:

### `payment:success`
```json
{
  "orderCode": 1234567890,
  "status": "PAID",
  "amount": 150000,
  "transactionRef": "TXN123456",
  "transactionDateTime": "2025-01-21T10:30:00Z",
  "counterAccountBankName": "Vietcombank",
  "counterAccountNumber": "1234567890",
  "counterAccountName": "NGUYEN VAN A"
}
```

### `payment:cancelled`
```json
{
  "orderCode": 1234567890,
  "status": "CANCELLED",
  "amount": 150000
}
```

### `payment:expired`
```json
{
  "orderCode": 1234567890,
  "status": "EXPIRED",
  "amount": 150000
}
```
