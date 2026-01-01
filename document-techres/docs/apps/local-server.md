---
sidebar_position: 1
---

# Local Server

Local Server là thành phần trung tâm trong **Mô hình 3: Full System**, chạy trên máy Windows và đóng vai trò là "bộ não" của cửa hàng.

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Công nghệ** | .NET 8 / ASP.NET Core |
| **Nền tảng** | Windows 10/11 |
| **Database** | SQLite hoặc SQL Server LocalDB |
| **Giao tiếp** | REST API + SignalR (WebSocket) |
| **Discovery** | UDP Broadcast |

## Vai trò trong hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│              LOCAL SERVER (Trung tâm)                            │
│              .NET / ASP.NET Core / Windows                       │
├─────────────────────────────────────────────────────────────────┤
│  • SQLite hoặc SQL Server Local (Source of Truth)               │
│  • REST API + WebSocket Server (SignalR)                        │
│  • Print Queue (quản lý lệnh in)                                │
│  • UDP Broadcast (Discovery)                                    │
│  • Sync lên Cloud khi có mạng                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
  ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ CCB App  │    │ CCB App  │    │Order App │
  │(Thu ngân)│    │(Bếp/Bar) │    │(Nhân viên)│
  └──────────┘    └──────────┘    └──────────┘
```

## Chức năng chính

### 1. REST API Server

Cung cấp HTTP endpoints cho tất cả client:

```
GET  /api/tables         - Danh sách bàn + trạng thái
GET  /api/menu           - Menu, giá, danh mục
GET  /api/orders         - Tất cả order đang mở
POST /api/orders         - Tạo order mới
PUT  /api/orders/:id     - Cập nhật order
POST /api/orders/:id/pay - Thanh toán
...
```

### 2. WebSocket Server (SignalR)

Realtime communication với tất cả client:

```csharp
// Hub events
public class PosHub : Hub
{
    // Client -> Server
    Task OrderCreate(OrderDto order);
    Task OrderAddItem(Guid orderId, OrderItemDto item);
    Task OrderRequestPayment(Guid orderId);

    // Server -> Client (Broadcast)
    Task OnOrderCreated(OrderDto order);
    Task OnOrderUpdated(OrderDto order);
    Task OnTablesUpdated(List<TableDto> tables);
    Task OnKitchenNewItems(List<OrderItemDto> items);
}
```

### 3. Database Management

- **Primary**: SQLite cho nhẹ và đơn giản
- **Optional**: SQL Server LocalDB cho hiệu năng cao
- **Schema**: Tương tự schema của CCB Standalone

### 4. Print Queue

Quản lý tập trung tất cả lệnh in:

```sql
CREATE TABLE print_jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,           -- 'kitchen', 'bar', 'bill'
    target_printer TEXT,          -- 'kitchen_1', 'bar_1', 'cashier'
    order_id TEXT,
    content TEXT,                 -- JSON data để in
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    created_at TEXT,
    printed_at TEXT,
    printed_by TEXT
);
```

### 5. UDP Discovery

Broadcast để các client tìm thấy server:

```csharp
// Gửi mỗi 2 giây
{
    "type": "LOCAL_SERVER",
    "name": "Quán ABC",
    "ip": "192.168.1.100",
    "port": 8080,
    "version": "1.0.0"
}
```

### 6. Cloud Sync

Đồng bộ dữ liệu lên Cloud Server:

- **Realtime**: Thanh toán hoàn thành, chốt ca
- **Batch**: Order details mỗi 5-10 phút
- **Retry**: Exponential backoff khi failed

## Cấu trúc Project

```
LocalServer/
├── Controllers/           # REST API Controllers
│   ├── TablesController.cs
│   ├── MenuController.cs
│   ├── OrdersController.cs
│   ├── PrintController.cs
│   └── SyncController.cs
├── Hubs/                  # SignalR Hubs
│   └── PosHub.cs
├── Services/
│   ├── DatabaseService/   # SQLite / SQL Server
│   ├── PrintQueueService/ # Quản lý lệnh in
│   ├── DiscoveryService/  # UDP Broadcast
│   └── SyncService/       # Cloud sync
├── Models/
│   ├── Table.cs
│   ├── Order.cs
│   ├── Product.cs
│   └── PrintJob.cs
├── Data/
│   └── AppDbContext.cs    # EF Core DbContext
├── Program.cs
├── appsettings.json
└── LocalServer.csproj
```

## Cấu hình

### appsettings.json

```json
{
  "Server": {
    "Port": 8080,
    "DiscoveryPort": 9999,
    "StoreName": "Quán ABC"
  },
  "Database": {
    "Provider": "SQLite",
    "ConnectionString": "Data Source=pos.db"
  },
  "Cloud": {
    "ApiUrl": "https://api.fnbpos.com",
    "SyncInterval": 300
  },
  "Print": {
    "DefaultPrinter": "cashier",
    "KitchenPrinter": "kitchen_1",
    "BarPrinter": "bar_1"
  }
}
```

## API Endpoints

### Tables

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/tables | Danh sách bàn + trạng thái |
| GET | /api/tables/:id | Chi tiết 1 bàn |
| PUT | /api/tables/:id/status | Cập nhật trạng thái |

### Menu

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/menu | Menu đầy đủ |
| GET | /api/categories | Danh sách danh mục |
| GET | /api/products | Danh sách sản phẩm |

### Orders

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/orders | Order đang mở |
| GET | /api/orders/:id | Chi tiết order |
| POST | /api/orders | Tạo order mới |
| PUT | /api/orders/:id | Cập nhật order |
| POST | /api/orders/:id/items | Thêm món |
| DELETE | /api/orders/:id/items/:itemId | Xóa món |
| POST | /api/orders/:id/pay | Thanh toán |
| POST | /api/orders/:id/transfer | Chuyển bàn |

### Print

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/print-jobs | Danh sách print jobs |
| POST | /api/print-jobs | Tạo print job |
| POST | /api/print-jobs/:id/start | Bắt đầu in |
| POST | /api/print-jobs/:id/complete | Hoàn thành |
| POST | /api/print-jobs/:id/fail | Báo lỗi |

## SignalR Events

### Server → Client

| Event | Data | Mô tả |
|-------|------|-------|
| `connected` | `{ tables, menu, orders }` | Full state khi kết nối |
| `tables:updated` | `{ tables }` | Trạng thái bàn thay đổi |
| `order:created` | `{ order }` | Order mới được tạo |
| `order:updated` | `{ order }` | Order được cập nhật |
| `order:completed` | `{ orderId }` | Order hoàn thành |
| `kitchen:new-items` | `{ items }` | Món mới cho bếp |
| `print:new-job` | `{ jobId, printer }` | Có lệnh in mới |

### Client → Server

| Event | Data | Mô tả |
|-------|------|-------|
| `order:create` | `{ tableId, items }` | Tạo order |
| `order:add-item` | `{ orderId, item }` | Thêm món |
| `order:request-payment` | `{ orderId }` | Yêu cầu thanh toán |
| `kitchen:item-ready` | `{ orderId, itemId }` | Món làm xong |

## Yêu cầu hệ thống

### Tối thiểu

- Windows 10/11
- .NET 8 Runtime
- RAM 4GB
- SSD 128GB
- Network: LAN/WiFi

### Khuyến nghị

- RAM 8GB+ cho 30+ connections
- SSD 256GB
- Router WiFi riêng cho POS
- UPS để tránh mất điện đột ngột

## Cài đặt

### 1. Cài đặt .NET Runtime

```powershell
winget install Microsoft.DotNet.Runtime.8
```

### 2. Cài đặt Local Server

```powershell
# Download và extract
# Chạy LocalServer.exe
```

### 3. Cấu hình

- Sửa `appsettings.json`
- Thiết lập tên quán, port
- Cấu hình máy in

### 4. Khởi động

```powershell
.\LocalServer.exe
```

## Troubleshooting

### Port đã được sử dụng

```powershell
netstat -ano | findstr :8080
taskkill /PID <pid> /F
```

### Clients không tìm thấy Server

1. Kiểm tra cùng mạng WiFi/LAN
2. Tắt Windows Firewall tạm thời
3. Kiểm tra UDP port 9999

### Database lỗi

```powershell
# Backup và xóa database
copy pos.db pos.db.backup
del pos.db
# Restart server
```
