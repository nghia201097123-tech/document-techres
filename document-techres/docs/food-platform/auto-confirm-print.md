---
sidebar_position: 6
---

# Auto-Confirm và In Bill

Chi tiết về cơ chế tự động xác nhận đơn hàng và in bill khi có tài xế được gán.

## Tổng quan

Khi đơn hàng food platform có **tài xế được gán** (driver assigned), hệ thống có thể:
1. **Tự động xác nhận** đơn hàng trên platform (nếu chưa accept)
2. **Tự động in bill** giao hàng
3. **Thông báo** cho nhân viên

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Đơn hàng có driver_info                                                 │
│  ├── driverName: "Nguyễn Văn A"                                          │
│  ├── driverPhone: "0901234567"                                           │
│  └── estimatedDeliveryTime: "15-20 phút"                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AUTO-CONFIRM CHECK                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  IF (auto_confirm_enabled == true)                               │    │
│  │     AND (order.status IN ['new', 'accepted', 'ready'])           │    │
│  │     AND (driver_just_assigned == true)                           │    │
│  │                                                                  │    │
│  │  THEN:                                                           │    │
│  │     1. Call platform API để accept (nếu status = 'new')          │    │
│  │     2. Update status = 'delivering'                              │    │
│  │     3. Trigger auto-print (nếu enabled)                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AUTO-PRINT BILL                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  IF (auto_print_enabled == true)                                 │    │
│  │                                                                  │    │
│  │  THEN:                                                           │    │
│  │     1. Generate bill từ template                                 │    │
│  │     2. Send to printer queue                                     │    │
│  │     3. Print receipt                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Configuration

### Account-Level Settings

```typescript
interface FoodPlatformAccountSettings {
  // Auto-confirm settings
  autoConfirmEnabled: boolean;
  autoConfirmWhenDriverAssigned: boolean;
  autoConfirmDelaySeconds: number;  // Delay trước khi auto-confirm (0-60)

  // Auto-print settings
  autoPrintEnabled: boolean;
  autoPrintWhenDriverAssigned: boolean;
  autoPrintWhenAccepted: boolean;
  printTemplateId: string;
  printerIds: string[];  // Có thể in nhiều máy

  // Notification settings
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notifyOnDriverAssigned: boolean;
}
```

### Database Schema

```sql
-- Thêm columns vào food_platform_accounts
ALTER TABLE food_platform_accounts ADD COLUMN settings JSONB DEFAULT '{
  "autoConfirmEnabled": false,
  "autoConfirmWhenDriverAssigned": true,
  "autoConfirmDelaySeconds": 0,
  "autoPrintEnabled": false,
  "autoPrintWhenDriverAssigned": true,
  "autoPrintWhenAccepted": false,
  "printTemplateId": null,
  "printerIds": [],
  "soundEnabled": true,
  "vibrationEnabled": true,
  "notifyOnDriverAssigned": true
}';
```

## Auto-Confirm Logic

### Trigger Detection

```typescript
// Trong sync logic, detect khi driver vừa được gán
function detectDriverAssignment(
  existing: FoodOrder | null,
  incoming: RawFoodOrder
): boolean {
  // Case 1: New order already has driver
  if (!existing && incoming.driverName) {
    return true;
  }

  // Case 2: Existing order, driver just assigned
  if (existing && !existing.driverName && incoming.driverName) {
    return true;
  }

  return false;
}
```

### Auto-Confirm Service

```typescript
// auto-confirm.service.ts
@Injectable()
export class AutoConfirmService {
  constructor(
    private readonly foodOrderRepo: Repository<FoodOrder>,
    private readonly foodPlatformAccountRepo: Repository<FoodPlatformAccount>,
    private readonly platformApiService: PlatformApiService,
    private readonly printService: PrintService,
    private readonly notificationService: NotificationService,
  ) {}

  async processDriverAssignment(
    order: FoodOrder,
    driverInfo: DriverInfo
  ): Promise<void> {
    // 1. Get account settings
    const account = await this.foodPlatformAccountRepo.findOne({
      where: { id: order.accountId },
    });

    if (!account) return;

    const settings = account.settings as FoodPlatformAccountSettings;

    // 2. Update order with driver info
    await this.foodOrderRepo.update(order.id, {
      driverName: driverInfo.name,
      driverPhone: driverInfo.phone,
      estimatedDeliveryTime: driverInfo.eta,
    });

    // 3. Auto-confirm if enabled
    if (settings.autoConfirmEnabled && settings.autoConfirmWhenDriverAssigned) {
      await this.autoConfirmOrder(order, account, settings);
    }

    // 4. Auto-print if enabled
    if (settings.autoPrintEnabled && settings.autoPrintWhenDriverAssigned) {
      await this.autoPrintBill(order, account, settings);
    }

    // 5. Send notification
    if (settings.notifyOnDriverAssigned) {
      await this.notifyDriverAssigned(order, driverInfo);
    }
  }

  private async autoConfirmOrder(
    order: FoodOrder,
    account: FoodPlatformAccount,
    settings: FoodPlatformAccountSettings
  ): Promise<void> {
    // Only auto-confirm if order is still in confirmable state
    if (!['new', 'accepted'].includes(order.status)) {
      return;
    }

    // Optional delay
    if (settings.autoConfirmDelaySeconds > 0) {
      await this.scheduleAutoConfirm(order, settings.autoConfirmDelaySeconds);
      return;
    }

    try {
      // Call platform API to accept order (if status is 'new')
      if (order.status === 'new') {
        await this.platformApiService.acceptOrder(
          account.platform,
          account.accessToken,
          order.externalOrderId
        );
      }

      // Update local status
      await this.foodOrderRepo.update(order.id, {
        status: 'delivering',
        previousStatus: order.status,
        acceptedAt: order.acceptedAt || new Date(),
      });

      // Log action
      await this.auditLog({
        action: 'AUTO_CONFIRMED',
        orderId: order.id,
        orderCode: order.orderCode,
        reason: 'driver_assigned',
      });

    } catch (error) {
      this.logger.error(`Auto-confirm failed for order ${order.orderCode}`, error);

      // Notify user about failure
      await this.notificationService.send({
        branchId: account.branchId,
        type: 'AUTO_CONFIRM_FAILED',
        title: `Không thể tự động xác nhận đơn ${order.orderCode}`,
        message: error.message,
      });
    }
  }

  private async scheduleAutoConfirm(
    order: FoodOrder,
    delaySeconds: number
  ): Promise<void> {
    // Schedule job với delay
    await this.queue.add('auto-confirm', {
      orderId: order.id,
    }, {
      delay: delaySeconds * 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
```

### Platform API Integration

```typescript
// platform-api.service.ts
@Injectable()
export class PlatformApiService {
  async acceptOrder(
    platform: FoodPlatformType,
    accessToken: string,
    externalOrderId: string
  ): Promise<void> {
    switch (platform) {
      case 'grab':
        await this.acceptGrabOrder(accessToken, externalOrderId);
        break;
      case 'shopee_food':
        await this.acceptShopeeOrder(accessToken, externalOrderId);
        break;
      case 'befood':
        await this.acceptBeFoodOrder(accessToken, externalOrderId);
        break;
    }
  }

  private async acceptGrabOrder(token: string, orderId: string): Promise<void> {
    await axios.post(
      `${GRAB_API_BASE}/merchant/v2/orders/${orderId}/accept`,
      {},
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
  }

  private async acceptShopeeOrder(token: string, orderId: string): Promise<void> {
    await axios.post(
      `${SHOPEE_API_BASE}/api/v4/merchant/orders/${orderId}/confirm`,
      { action: 'accept' },
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
  }

  private async acceptBeFoodOrder(token: string, orderId: string): Promise<void> {
    await axios.put(
      `${BEFOOD_API_BASE}/merchant/orders/${orderId}/status`,
      { status: 'ACCEPTED' },
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
  }
}
```

## Auto-Print Bill

### Print Service

```typescript
// print.service.ts
@Injectable()
export class FoodOrderPrintService {
  constructor(
    private readonly printQueue: Queue,
    private readonly templateService: PrintTemplateService,
    private readonly printerService: PrinterService,
  ) {}

  async autoPrintBill(
    order: FoodOrder,
    account: FoodPlatformAccount,
    settings: FoodPlatformAccountSettings
  ): Promise<void> {
    if (!settings.printTemplateId || settings.printerIds.length === 0) {
      this.logger.warn(`No print template or printer configured for account ${account.id}`);
      return;
    }

    try {
      // 1. Get template
      const template = await this.templateService.getTemplate(settings.printTemplateId);

      // 2. Generate print content
      const printContent = await this.generateBillContent(order, template);

      // 3. Send to each configured printer
      for (const printerId of settings.printerIds) {
        await this.printQueue.add('print-food-bill', {
          printerId,
          content: printContent,
          orderId: order.id,
          copies: 1,
        });
      }

      // 4. Log action
      await this.auditLog({
        action: 'AUTO_PRINTED',
        orderId: order.id,
        orderCode: order.orderCode,
        printerIds: settings.printerIds,
      });

    } catch (error) {
      this.logger.error(`Auto-print failed for order ${order.orderCode}`, error);
    }
  }

  private async generateBillContent(
    order: FoodOrder,
    template: PrintTemplate
  ): Promise<string> {
    // ESC/POS commands for thermal printer
    const escpos = new EscPosBuilder();

    // Header
    escpos
      .align('center')
      .bold(true)
      .text(template.headerText || 'PHIẾU GIAO HÀNG')
      .bold(false)
      .newLine()
      .text(order.platform.toUpperCase())
      .newLine()
      .text('─'.repeat(32))
      .newLine();

    // Order info
    escpos
      .align('left')
      .text(`Mã đơn: ${order.orderCode}`)
      .newLine()
      .text(`Thời gian: ${formatDateTime(order.createdAt)}`)
      .newLine()
      .text('─'.repeat(32))
      .newLine();

    // Customer info
    escpos
      .bold(true)
      .text('KHÁCH HÀNG')
      .bold(false)
      .newLine()
      .text(`Tên: ${order.customerName}`)
      .newLine()
      .text(`SĐT: ${order.customerPhone}`)
      .newLine();

    if (order.customerAddress) {
      escpos.text(`Địa chỉ: ${order.customerAddress}`).newLine();
    }

    escpos.text('─'.repeat(32)).newLine();

    // Driver info
    if (order.driverName) {
      escpos
        .bold(true)
        .text('TÀI XẾ')
        .bold(false)
        .newLine()
        .text(`Tên: ${order.driverName}`)
        .newLine()
        .text(`SĐT: ${order.driverPhone}`)
        .newLine()
        .text('─'.repeat(32))
        .newLine();
    }

    // Items
    escpos
      .bold(true)
      .text('CHI TIẾT ĐƠN HÀNG')
      .bold(false)
      .newLine();

    for (const item of order.items) {
      escpos
        .text(`${item.quantity}x ${item.productName}`)
        .newLine();

      if (item.options) {
        escpos.text(`   ${item.options}`).newLine();
      }

      if (item.note) {
        escpos.text(`   📝 ${item.note}`).newLine();
      }

      escpos
        .align('right')
        .text(formatCurrency(item.totalPrice))
        .align('left')
        .newLine();
    }

    escpos.text('─'.repeat(32)).newLine();

    // Payment breakdown
    escpos
      .columns([
        { text: 'Tạm tính:', width: 20 },
        { text: formatCurrency(order.subtotal), width: 12, align: 'right' },
      ])
      .newLine()
      .columns([
        { text: 'Phí giao hàng:', width: 20 },
        { text: formatCurrency(order.deliveryFee), width: 12, align: 'right' },
      ])
      .newLine();

    if (order.platformFee > 0) {
      escpos
        .columns([
          { text: 'Phí dịch vụ:', width: 20 },
          { text: formatCurrency(order.platformFee), width: 12, align: 'right' },
        ])
        .newLine();
    }

    if (order.discount > 0) {
      escpos
        .columns([
          { text: 'Giảm giá:', width: 20 },
          { text: `-${formatCurrency(order.discount)}`, width: 12, align: 'right' },
        ])
        .newLine();
    }

    escpos.text('─'.repeat(32)).newLine();

    // Total
    escpos
      .bold(true)
      .doubleWidth(true)
      .columns([
        { text: 'TỔNG:', width: 10 },
        { text: formatCurrency(order.totalAmount), width: 22, align: 'right' },
      ])
      .doubleWidth(false)
      .bold(false)
      .newLine();

    // Payment method
    escpos
      .newLine()
      .text(`Thanh toán: ${order.paymentMethod || 'COD'}`)
      .text(order.isPaid ? ' (ĐÃ TT)' : ' (THU HỘ)')
      .newLine();

    // Customer note
    if (order.customerNote) {
      escpos
        .text('─'.repeat(32))
        .newLine()
        .bold(true)
        .text('GHI CHÚ:')
        .bold(false)
        .newLine()
        .text(order.customerNote)
        .newLine();
    }

    // Footer
    escpos
      .newLine()
      .align('center')
      .text('─'.repeat(32))
      .newLine()
      .text('Cảm ơn quý khách!')
      .newLine()
      .newLine()
      .cut();

    return escpos.build();
  }
}
```

### Bill Template Preview

```
┌────────────────────────────────────┐
│         *** TECHRES ***            │
│        PHIẾU GIAO HÀNG             │
│            GRABFOOD                │
│────────────────────────────────────│
│ Mã đơn: #GR12345                   │
│ Thời gian: 14:30 23/01/2026        │
│────────────────────────────────────│
│ KHÁCH HÀNG                         │
│ Tên: Nguyễn Văn A                  │
│ SĐT: 0901234567                    │
│ Địa chỉ: 123 Nguyễn Huệ, Q1        │
│────────────────────────────────────│
│ TÀI XẾ                             │
│ Tên: Trần Văn B                    │
│ SĐT: 0987654321                    │
│────────────────────────────────────│
│ CHI TIẾT ĐƠN HÀNG                  │
│ 2x Cà phê sữa đá                   │
│    Size L, Ít đường                │
│                          50,000đ   │
│ 1x Bánh mì thịt                    │
│    📝 Không hành                   │
│                          35,000đ   │
│────────────────────────────────────│
│ Tạm tính:               85,000đ   │
│ Phí giao hàng:          15,000đ   │
│ Giảm giá:               -5,000đ   │
│────────────────────────────────────│
│ ██ TỔNG:               95,000đ ██ │
│                                    │
│ Thanh toán: GrabPay (ĐÃ TT)        │
│────────────────────────────────────│
│ GHI CHÚ:                           │
│ Giao trước 3h chiều                │
│                                    │
│────────────────────────────────────│
│         Cảm ơn quý khách!          │
└────────────────────────────────────┘
```

## CCB Implementation

### Auto-Confirm in ViewModel

```kotlin
// FoodOrderViewModel.kt
@HiltViewModel
class FoodOrderViewModel @Inject constructor(
    private val repository: FoodOrderRepository,
    private val printService: FoodOrderPrintService,
    private val settingsRepository: FoodPlatformSettingsRepository,
    private val soundManager: SoundManager,
) : ViewModel() {

    fun handleOrderUpdate(order: FoodOrder, previousOrder: FoodOrder?) {
        viewModelScope.launch {
            // Detect driver assignment
            val driverJustAssigned = previousOrder?.driverName == null
                && order.driverName != null

            if (driverJustAssigned) {
                handleDriverAssigned(order)
            }
        }
    }

    private suspend fun handleDriverAssigned(order: FoodOrder) {
        val settings = settingsRepository.getSettings(order.accountId)

        // Play notification sound
        if (settings.soundEnabled) {
            soundManager.playDriverAssignedSound()
        }

        // Vibrate
        if (settings.vibrationEnabled) {
            vibrator.vibrate(VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE))
        }

        // Show notification
        if (settings.notifyOnDriverAssigned) {
            showDriverAssignedNotification(order)
        }

        // Auto-confirm (if enabled and handled locally)
        // Note: Usually handled by backend, but can have local fallback
        if (settings.autoConfirmEnabled && settings.autoConfirmWhenDriverAssigned) {
            // Update UI to show "Đang tự động xác nhận..."
            _autoConfirmingOrders.value += order.id

            // Wait for backend to confirm, or timeout and do locally
            delay(settings.autoConfirmDelaySeconds * 1000L)

            // Verify order was confirmed
            val updatedOrder = repository.getOrder(order.id)
            if (updatedOrder?.status == order.status) {
                // Backend didn't confirm, do it locally
                confirmOrderLocally(order)
            }

            _autoConfirmingOrders.value -= order.id
        }

        // Auto-print (if enabled)
        if (settings.autoPrintEnabled && settings.autoPrintWhenDriverAssigned) {
            autoPrintBill(order, settings)
        }
    }

    private suspend fun autoPrintBill(order: FoodOrder, settings: FoodPlatformAccountSettings) {
        try {
            printService.printFoodOrderBill(
                order = order,
                templateId = settings.printTemplateId,
                printerIds = settings.printerIds
            )

            // Show toast
            _toastMessage.value = "Đã in bill đơn ${order.orderCode}"

        } catch (e: Exception) {
            _toastMessage.value = "Lỗi in bill: ${e.message}"
        }
    }

    private fun showDriverAssignedNotification(order: FoodOrder) {
        notificationManager.showNotification(
            title = "Tài xế đã nhận đơn ${order.orderCode}",
            body = "Tài xế: ${order.driverName} - ${order.driverPhone}",
            channelId = CHANNEL_DRIVER_ASSIGNED
        )
    }
}
```

### Settings UI

```kotlin
@Composable
fun FoodPlatformSettingsScreen(
    accountId: String,
    viewModel: FoodPlatformSettingsViewModel = hiltViewModel()
) {
    val settings by viewModel.settings.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Cài đặt tự động hóa",
                style = MaterialTheme.typography.titleLarge
            )
        }

        // Auto-confirm section
        item {
            SettingsSection(title = "Tự động xác nhận") {
                SwitchPreference(
                    title = "Bật tự động xác nhận",
                    subtitle = "Tự động xác nhận đơn khi có tài xế",
                    checked = settings.autoConfirmEnabled,
                    onCheckedChange = { viewModel.updateAutoConfirmEnabled(it) }
                )

                if (settings.autoConfirmEnabled) {
                    SliderPreference(
                        title = "Độ trễ (giây)",
                        subtitle = "Chờ ${settings.autoConfirmDelaySeconds}s trước khi xác nhận",
                        value = settings.autoConfirmDelaySeconds.toFloat(),
                        valueRange = 0f..60f,
                        onValueChange = { viewModel.updateAutoConfirmDelay(it.toInt()) }
                    )
                }
            }
        }

        // Auto-print section
        item {
            SettingsSection(title = "Tự động in bill") {
                SwitchPreference(
                    title = "Bật tự động in",
                    subtitle = "In bill khi có tài xế",
                    checked = settings.autoPrintEnabled,
                    onCheckedChange = { viewModel.updateAutoPrintEnabled(it) }
                )

                if (settings.autoPrintEnabled) {
                    // Printer selection
                    PrinterSelector(
                        selectedPrinters = settings.printerIds,
                        onPrintersSelected = { viewModel.updatePrinters(it) }
                    )

                    // Template selection
                    TemplateSelector(
                        selectedTemplate = settings.printTemplateId,
                        onTemplateSelected = { viewModel.updateTemplate(it) }
                    )
                }
            }
        }

        // Notification section
        item {
            SettingsSection(title = "Thông báo") {
                SwitchPreference(
                    title = "Âm thanh",
                    checked = settings.soundEnabled,
                    onCheckedChange = { viewModel.updateSoundEnabled(it) }
                )

                SwitchPreference(
                    title = "Rung",
                    checked = settings.vibrationEnabled,
                    onCheckedChange = { viewModel.updateVibrationEnabled(it) }
                )

                SwitchPreference(
                    title = "Thông báo khi có tài xế",
                    checked = settings.notifyOnDriverAssigned,
                    onCheckedChange = { viewModel.updateNotifyOnDriver(it) }
                )
            }
        }
    }
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DRIVER ASSIGNMENT FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

     Platform API                    API-Dashboard                    CCB
         │                               │                             │
         │ Driver assigned               │                             │
         │ to order #GR12345             │                             │
         │                               │                             │
         ├──────────────────────────────▶│                             │
         │                               │ Poll response:              │
         │                               │ updatedOrders: [{           │
         │                               │   orderCode: "#GR12345",    │
         │                               │   driverName: "Nguyễn A",   │
         │                               │   driverPhone: "090..."     │
         │                               │ }]                          │
         │                               │                             │
         │                               ├────────────────────────────▶│
         │                               │                             │
         │                               │      ┌─────────────────────┐│
         │                               │      │ Detect driver       ││
         │                               │      │ assignment          ││
         │                               │      └──────────┬──────────┘│
         │                               │                 │           │
         │                               │      ┌──────────▼──────────┐│
         │                               │      │ Check settings:     ││
         │                               │      │ autoConfirmEnabled  ││
         │                               │      │ autoPrintEnabled    ││
         │                               │      └──────────┬──────────┘│
         │                               │                 │           │
         │                               │                 │           │
         │     ┌───────────────────────────────────────────┤           │
         │     │ IF autoConfirmEnabled                     │           │
         │     │                                           │           │
         │◀────┼───────────────────────────────────────────┤           │
         │     │ Accept order API call                     │           │
         │     │                                           │           │
         │     └───────────────────────────────────────────┤           │
         │                               │                 │           │
         │                               │      ┌──────────▼──────────┐│
         │                               │      │ Update local status ││
         │                               │      │ to "delivering"     ││
         │                               │      └──────────┬──────────┘│
         │                               │                 │           │
         │                               │      ┌──────────▼──────────┐│
         │                               │      │ IF autoPrintEnabled ││
         │                               │      │ → Print bill        ││
         │                               │      └──────────┬──────────┘│
         │                               │                 │           │
         │                               │      ┌──────────▼──────────┐│
         │                               │      │ Play sound          ││
         │                               │      │ Show notification   ││
         │                               │      │ Update UI           ││
         │                               │      └─────────────────────┘│
         │                               │                             │
         ▼                               ▼                             ▼
```

## Error Handling

### Auto-Confirm Failures

```typescript
interface AutoConfirmError {
  orderId: string;
  orderCode: string;
  errorType: 'NETWORK' | 'AUTH' | 'ALREADY_CONFIRMED' | 'ORDER_CANCELLED' | 'UNKNOWN';
  message: string;
  retryable: boolean;
}

async function handleAutoConfirmError(error: AutoConfirmError): Promise<void> {
  switch (error.errorType) {
    case 'NETWORK':
      // Retry with exponential backoff
      await scheduleRetry(error.orderId, { delay: 5000, maxRetries: 3 });
      break;

    case 'AUTH':
      // Token expired, need re-login
      await markAccountDisconnected(error.accountId);
      await notifyUser('Cần đăng nhập lại ' + error.platform);
      break;

    case 'ALREADY_CONFIRMED':
      // Not an error, just update local status
      await updateOrderStatus(error.orderId, 'delivering');
      break;

    case 'ORDER_CANCELLED':
      // Order was cancelled on platform
      await updateOrderStatus(error.orderId, 'cancelled');
      await notifyUser(`Đơn ${error.orderCode} đã bị hủy trên platform`);
      break;

    default:
      await notifyUser(`Lỗi xác nhận đơn ${error.orderCode}: ${error.message}`);
  }
}
```

### Print Failures

```typescript
interface PrintError {
  orderId: string;
  printerId: string;
  errorType: 'PRINTER_OFFLINE' | 'PAPER_OUT' | 'CONNECTION_ERROR' | 'UNKNOWN';
  message: string;
}

async function handlePrintError(error: PrintError): Promise<void> {
  // Log error
  await logPrintError(error);

  // Notify user
  await notifyUser({
    type: 'PRINT_FAILED',
    title: `Lỗi in bill`,
    message: `Không thể in đơn ${error.orderCode}: ${error.message}`,
    actions: [
      { label: 'Thử lại', action: 'RETRY_PRINT' },
      { label: 'Bỏ qua', action: 'DISMISS' },
    ],
  });

  // Add to failed prints queue for manual retry
  await addToFailedPrintsQueue(error.orderId);
}
```

## Metrics & Monitoring

```typescript
interface AutomationMetrics {
  // Auto-confirm metrics
  autoConfirmAttempts: number;
  autoConfirmSuccesses: number;
  autoConfirmFailures: number;
  averageConfirmLatencyMs: number;

  // Auto-print metrics
  autoPrintAttempts: number;
  autoPrintSuccesses: number;
  autoPrintFailures: number;

  // Per-platform breakdown
  byPlatform: {
    [platform: string]: {
      confirms: number;
      prints: number;
      errors: number;
    };
  };
}

// Log metrics hourly
@Cron('0 * * * *')
async function logAutomationMetrics(): Promise<void> {
  const metrics = await gatherAutomationMetrics();

  this.logger.info('Automation metrics', metrics);

  // Alert if error rate is high
  const errorRate = metrics.autoConfirmFailures / metrics.autoConfirmAttempts;
  if (errorRate > 0.1) {
    await alertService.send('High auto-confirm error rate', { errorRate });
  }
}
```

## Summary

| Feature | Trigger | Configurable | Default |
|---------|---------|--------------|---------|
| Auto-confirm | Driver assigned | Yes | Off |
| Auto-print | Driver assigned | Yes | Off |
| Sound notification | Driver assigned | Yes | On |
| Vibration | Driver assigned | Yes | On |
| Push notification | Driver assigned | Yes | On |

Tất cả các tính năng tự động hóa đều có thể bật/tắt và cấu hình riêng cho từng tài khoản food platform.
