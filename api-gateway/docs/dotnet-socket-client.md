# .NET Socket.IO Client for PayOS Payment Notifications

## Installation

Install the SocketIOClient NuGet package:

```bash
dotnet add package SocketIOClient
```

## Sample Code

### PaymentSocketService.cs

```csharp
using SocketIOClient;
using System;
using System.Speech.Synthesis; // Add reference to System.Speech
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace TechRes.POS.Services
{
    public class PaymentSuccessEvent
    {
        public string OrderId { get; set; }
        public long OrderCode { get; set; }
        public long Amount { get; set; }
        public string TransactionRef { get; set; }
        public string TransactionDateTime { get; set; }
        public string CounterAccountName { get; set; }
        public string CounterAccountNumber { get; set; }
        public string CounterAccountBankName { get; set; }
    }

    public class PaymentCancelledEvent
    {
        public string OrderId { get; set; }
        public long OrderCode { get; set; }
        public string Reason { get; set; }
    }

    public class PaymentExpiredEvent
    {
        public long OrderCode { get; set; }
    }

    public class PaymentSocketService : IDisposable
    {
        private SocketIO _socket;
        private SpeechSynthesizer _synthesizer;
        private string _branchId;
        private string _deviceId;

        public event EventHandler<PaymentSuccessEvent> OnPaymentSuccess;
        public event EventHandler<PaymentCancelledEvent> OnPaymentCancelled;
        public event EventHandler<PaymentExpiredEvent> OnPaymentExpired;
        public event EventHandler<bool> OnConnectionChanged;

        public bool IsConnected => _socket?.Connected ?? false;

        public PaymentSocketService()
        {
            // Initialize Text-to-Speech
            _synthesizer = new SpeechSynthesizer();
            _synthesizer.SetOutputToDefaultAudioDevice();

            // Try to use Vietnamese voice if available
            foreach (var voice in _synthesizer.GetInstalledVoices())
            {
                if (voice.VoiceInfo.Culture.Name.StartsWith("vi"))
                {
                    _synthesizer.SelectVoice(voice.VoiceInfo.Name);
                    break;
                }
            }
        }

        public async Task ConnectAsync(string serverUrl, string branchId, string deviceId)
        {
            _branchId = branchId;
            _deviceId = deviceId;

            _socket = new SocketIO(serverUrl + "/payment", new SocketIOOptions
            {
                Transport = SocketIOClient.Transport.TransportProtocol.WebSocket,
                Reconnection = true,
                ReconnectionAttempts = 10,
                ReconnectionDelay = 1000
            });

            // Connection events
            _socket.OnConnected += async (sender, e) =>
            {
                Console.WriteLine("Socket.IO connected");
                OnConnectionChanged?.Invoke(this, true);
                await JoinBranchAsync();
            };

            _socket.OnDisconnected += (sender, e) =>
            {
                Console.WriteLine($"Socket.IO disconnected: {e}");
                OnConnectionChanged?.Invoke(this, false);
            };

            _socket.OnError += (sender, e) =>
            {
                Console.WriteLine($"Socket.IO error: {e}");
            };

            // Payment events
            _socket.On("payment:success", response =>
            {
                var data = response.GetValue<PaymentSuccessEvent>();
                Console.WriteLine($"Payment success: OrderCode={data.OrderCode}, Amount={data.Amount}");

                OnPaymentSuccess?.Invoke(this, data);
                AnnouncePaymentSuccess(data.Amount, data.OrderCode);
            });

            _socket.On("payment:cancelled", response =>
            {
                var data = response.GetValue<PaymentCancelledEvent>();
                Console.WriteLine($"Payment cancelled: OrderCode={data.OrderCode}");

                OnPaymentCancelled?.Invoke(this, data);
                AnnouncePaymentCancelled(data.OrderCode);
            });

            _socket.On("payment:expired", response =>
            {
                var data = response.GetValue<PaymentExpiredEvent>();
                Console.WriteLine($"Payment expired: OrderCode={data.OrderCode}");

                OnPaymentExpired?.Invoke(this, data);
                AnnouncePaymentExpired(data.OrderCode);
            });

            await _socket.ConnectAsync();
        }

        private async Task JoinBranchAsync()
        {
            var payload = new
            {
                branchId = _branchId,
                deviceId = _deviceId,
                deviceType = "windows"
            };

            await _socket.EmitAsync("join:branch", response =>
            {
                Console.WriteLine($"Join branch response: {response}");
            }, payload);
        }

        public async Task DisconnectAsync()
        {
            if (_socket != null)
            {
                await _socket.DisconnectAsync();
                _socket.Dispose();
                _socket = null;
            }
        }

        #region Text-to-Speech Announcements

        public void AnnouncePaymentSuccess(long amount, long orderCode)
        {
            var amountText = FormatAmountForSpeech(amount);
            var message = $"Đã nhận thanh toán {amountText} cho đơn hàng số {orderCode}";
            Speak(message);
        }

        public void AnnouncePaymentCancelled(long orderCode)
        {
            var message = $"Đơn hàng số {orderCode} đã hủy thanh toán";
            Speak(message);
        }

        public void AnnouncePaymentExpired(long orderCode)
        {
            var message = $"Thanh toán đơn hàng số {orderCode} đã hết hạn";
            Speak(message);
        }

        private void Speak(string message)
        {
            try
            {
                _synthesizer.SpeakAsync(message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"TTS error: {ex.Message}");
            }
        }

        private string FormatAmountForSpeech(long amount)
        {
            if (amount >= 1_000_000_000)
            {
                var billions = amount / 1_000_000_000;
                var millions = (amount % 1_000_000_000) / 1_000_000;
                return millions > 0
                    ? $"{billions} tỷ {millions} triệu đồng"
                    : $"{billions} tỷ đồng";
            }
            else if (amount >= 1_000_000)
            {
                var millions = amount / 1_000_000;
                var thousands = (amount % 1_000_000) / 1_000;
                return thousands > 0
                    ? $"{millions} triệu {thousands} nghìn đồng"
                    : $"{millions} triệu đồng";
            }
            else if (amount >= 1_000)
            {
                var thousands = amount / 1_000;
                return $"{thousands} nghìn đồng";
            }
            else
            {
                return $"{amount} đồng";
            }
        }

        #endregion

        public void Dispose()
        {
            _socket?.Dispose();
            _synthesizer?.Dispose();
        }
    }
}
```

### Usage Example

```csharp
using System;
using System.Threading.Tasks;
using TechRes.POS.Services;

class Program
{
    static async Task Main(string[] args)
    {
        var paymentService = new PaymentSocketService();

        // Subscribe to events
        paymentService.OnPaymentSuccess += (sender, e) =>
        {
            Console.WriteLine($"Payment received! Order: {e.OrderCode}, Amount: {e.Amount}");
            // Auto-complete bill logic here
            CompleteBill(e.OrderId, e.TransactionRef);
        };

        paymentService.OnPaymentCancelled += (sender, e) =>
        {
            Console.WriteLine($"Payment cancelled: Order {e.OrderCode}");
        };

        paymentService.OnConnectionChanged += (sender, connected) =>
        {
            Console.WriteLine($"Connection status: {(connected ? "Connected" : "Disconnected")}");
        };

        // Connect to server
        await paymentService.ConnectAsync(
            serverUrl: "http://192.168.1.62:4000",
            branchId: "branch-123",
            deviceId: "windows-pos-001"
        );

        Console.WriteLine("Press any key to exit...");
        Console.ReadKey();

        await paymentService.DisconnectAsync();
    }

    static void CompleteBill(string orderId, string transactionRef)
    {
        // Your bill completion logic here
        Console.WriteLine($"Completing bill {orderId} with transaction {transactionRef}");
    }
}
```

## NuGet Packages Required

```xml
<PackageReference Include="SocketIOClient" Version="3.1.1" />
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
```

For Text-to-Speech on Windows, add reference to `System.Speech` assembly.

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join:branch` | Client → Server | Join a branch room to receive payment notifications |
| `payment:success` | Server → Client | Payment completed successfully |
| `payment:cancelled` | Server → Client | Payment was cancelled |
| `payment:expired` | Server → Client | Payment link expired |

## Connection URL

```
ws://{server}:{port}/payment
```

Example: `ws://192.168.1.62:4000/payment`
