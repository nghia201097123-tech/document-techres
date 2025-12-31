---
sidebar_position: 3
---

# Discovery Service

Cơ chế tự động tìm CCB trong mạng LAN.

## UDP Broadcast

CCB broadcast thông tin của mình qua UDP để Order App tìm thấy.

### CCB (Broadcaster)

```javascript
import dgram from 'react-native-udp';

class DiscoveryBroadcaster {
  socket = null;
  interval = null;

  start() {
    this.socket = dgram.createSocket('udp4');

    this.socket.bind(0, () => {
      this.socket.setBroadcast(true);

      // Broadcast mỗi 2 giây
      this.interval = setInterval(() => {
        this.broadcast();
      }, 2000);
    });
  }

  broadcast() {
    const message = JSON.stringify({
      type: 'CCB_SERVER',
      name: 'Quán ABC',
      ip: this.getLocalIP(),
      port: 8080,
      version: '1.0.0'
    });

    const buffer = Buffer.from(message);

    this.socket.send(
      buffer,
      0,
      buffer.length,
      9999,
      '255.255.255.255'
    );
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.socket) {
      this.socket.close();
    }
  }

  getLocalIP() {
    // Get local IP address
    return NetworkInfo.getIPV4Address();
  }
}
```

### Order App (Listener)

```javascript
import dgram from 'react-native-udp';

class DiscoveryListener {
  socket = null;
  servers = [];
  onServersFound = null;

  start(callback) {
    this.onServersFound = callback;
    this.servers = [];

    this.socket = dgram.createSocket('udp4');

    this.socket.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type === 'CCB_SERVER') {
          this.addServer({
            name: data.name,
            ip: data.ip,
            port: data.port,
            version: data.version,
            lastSeen: Date.now()
          });
        }
      } catch (e) {
        console.error('Invalid broadcast message', e);
      }
    });

    this.socket.bind(9999);

    // Cleanup stale servers
    setInterval(() => {
      this.cleanupStale();
    }, 5000);
  }

  addServer(server) {
    const existing = this.servers.find(s => s.ip === server.ip);

    if (existing) {
      existing.lastSeen = server.lastSeen;
    } else {
      this.servers.push(server);
    }

    this.onServersFound?.(this.servers);
  }

  cleanupStale() {
    const now = Date.now();
    this.servers = this.servers.filter(s => now - s.lastSeen < 10000);
    this.onServersFound?.(this.servers);
  }

  stop() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
```

## Broadcast Message Format

```json
{
  "type": "CCB_SERVER",
  "name": "Quán ABC",
  "ip": "192.168.1.100",
  "port": 8080,
  "version": "1.0.0"
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| type | string | Luôn là "CCB_SERVER" |
| name | string | Tên quán |
| ip | string | IP address của CCB |
| port | number | Port của HTTP/WebSocket server |
| version | string | Phiên bản CCB app |

## Phương án backup

### QR Code

CCB hiển thị QR chứa thông tin kết nối:

```javascript
// CCB tạo QR
const qrData = JSON.stringify({
  type: 'CCB_CONNECTION',
  ip: '192.168.1.100',
  port: 8080,
  name: 'Quán ABC'
});

// Order App scan QR
const handleQRScan = (data) => {
  const parsed = JSON.parse(data);
  if (parsed.type === 'CCB_CONNECTION') {
    connectToCCB(parsed.ip, parsed.port);
  }
};
```

### Nhập thủ công

Cho phép user nhập IP address:

```jsx
const ManualConnect = () => {
  const [ip, setIP] = useState('');

  const handleConnect = () => {
    if (isValidIP(ip)) {
      connectToCCB(ip, 8080);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Nhập IP của máy POS"
        value={ip}
        onChangeText={setIP}
        keyboardType="numeric"
      />
      <Button onPress={handleConnect}>Kết nối</Button>
    </View>
  );
};
```

## UI chọn CCB

```jsx
const SelectCCB = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const discovery = new DiscoveryListener();
    discovery.start((found) => {
      setServers(found);
      setLoading(false);
    });

    return () => discovery.stop();
  }, []);

  if (loading && servers.length === 0) {
    return <LoadingSpinner text="Đang tìm máy POS..." />;
  }

  return (
    <View>
      <Text>Chọn máy POS để kết nối:</Text>

      {servers.map(server => (
        <TouchableOpacity
          key={server.ip}
          onPress={() => connectToCCB(server.ip, server.port)}
        >
          <View style={styles.serverItem}>
            <Text style={styles.serverName}>{server.name}</Text>
            <Text style={styles.serverIP}>{server.ip}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {servers.length === 0 && (
        <View>
          <Text>Không tìm thấy máy POS</Text>
          <Button onPress={() => navigation.navigate('ManualConnect')}>
            Nhập IP thủ công
          </Button>
          <Button onPress={() => navigation.navigate('ScanQR')}>
            Quét mã QR
          </Button>
        </View>
      )}
    </View>
  );
};
```

## Troubleshooting

### Không tìm thấy CCB

1. Kiểm tra CCB và Order App cùng mạng WiFi
2. Kiểm tra firewall không chặn UDP port 9999
3. Kiểm tra CCB đang chạy và broadcast
4. Thử restart cả CCB và Order App

### Kết nối chậm

1. Tránh sử dụng WiFi 2.4GHz đông đúc
2. Đặt router gần khu vực sử dụng
3. Sử dụng WiFi 5GHz nếu có
