import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PayOSWebhookDto } from './dto/webhook.dto';
import { SocketClientService } from '../socket-client/socket-client.service';
import { ConfigStoreService } from '../config-store/config-store.service';

export interface PaymentResult {
  orderCode: number;
  status: 'PAID' | 'CANCELLED' | 'EXPIRED' | 'PROCESSING';
  amount: number;
  transactionRef?: string;
  transactionDateTime?: string;
  counterAccountBankName?: string;
  counterAccountNumber?: string;
  counterAccountName?: string;
  branchId?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly socketClient: SocketClientService,
    private readonly configStore: ConfigStoreService,
  ) {}

  async handlePayOSWebhook(
    webhookData: PayOSWebhookDto,
    signature: string,
  ): Promise<{ success: boolean }> {
    const { code, data } = webhookData;

    // Verify signature
    const isValid = this.verifyWebhookSignature(webhookData, signature);
    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for orderCode: ${data?.orderCode}`);
      // Still process but log the warning - PayOS sometimes sends test webhooks
    }

    // Get branchId from config store for multi-tenant routing
    const branchId = data ? this.getBranchId(data.orderCode) : undefined;

    // Process based on webhook code
    if (code === '00' && data) {
      // Payment successful
      const paymentResult: PaymentResult = {
        orderCode: data.orderCode,
        status: 'PAID',
        amount: data.amount,
        transactionRef: data.reference,
        transactionDateTime: data.transactionDateTime,
        counterAccountBankName: data.counterAccountBankName,
        counterAccountNumber: data.counterAccountNumber,
        counterAccountName: data.counterAccountName,
        branchId,
      };

      this.logger.log(`════════════════════════════════════════════════════════════`);
      this.logger.log(`✅ [WEBHOOK] Payment SUCCESS received from PayOS`);
      this.logger.log(`   📦 OrderCode: ${data.orderCode}`);
      this.logger.log(`   💰 Amount: ${data.amount.toLocaleString('vi-VN')} VND`);
      this.logger.log(`   🏦 From: ${data.counterAccountName || 'N/A'} - ${data.counterAccountBankName || 'N/A'}`);
      this.logger.log(`   🏢 BranchId: ${branchId || 'N/A (using fallback)'}`);
      this.logger.log(`════════════════════════════════════════════════════════════`);

      // Emit Socket.IO event to notify POS app
      this.logger.log(`📡 [WEBHOOK -> SOCKET-SERVICE] Calling HTTP to emit socket event...`);
      await this.socketClient.emitPaymentSuccess(paymentResult);

      // Clean up config after successful processing
      if (branchId) {
        this.configStore.removeConfig(data.orderCode);
      }

      return { success: true };
    }

    // Handle other webhook codes
    if (data) {
      let status: PaymentResult['status'] = 'PROCESSING';

      if (code === '01') {
        status = 'CANCELLED';
        this.logger.log(`❌ Payment CANCELLED: orderCode=${data.orderCode}, branchId=${branchId || 'N/A'}`);
      } else if (code === '02') {
        status = 'EXPIRED';
        this.logger.log(`⏰ Payment EXPIRED: orderCode=${data.orderCode}, branchId=${branchId || 'N/A'}`);
      } else {
        this.logger.log(`⚠️ Unknown webhook code: ${code} for orderCode=${data.orderCode}`);
      }

      const paymentResult: PaymentResult = {
        orderCode: data.orderCode,
        status,
        amount: data.amount,
        transactionRef: data.reference,
        transactionDateTime: data.transactionDateTime,
        branchId,
      };

      // Emit appropriate Socket.IO event
      if (status === 'CANCELLED') {
        await this.socketClient.emitPaymentCancelled(paymentResult);
      } else if (status === 'EXPIRED') {
        await this.socketClient.emitPaymentExpired(paymentResult);
      }

      // Clean up config after processing
      if (branchId) {
        this.configStore.removeConfig(data.orderCode);
      }
    }

    return { success: true };
  }

  /**
   * Get checksumKey for multi-tenant support
   * Priority: 1) Config store (per orderCode) -> 2) Environment variable (fallback)
   */
  private getChecksumKey(orderCode: number): string | undefined {
    // First, try to get from config store (multi-tenant)
    const configStoreKey = this.configStore.getChecksumKey(orderCode);
    if (configStoreKey) {
      this.logger.debug(`Using checksumKey from config store for orderCode=${orderCode}`);
      return configStoreKey;
    }

    // Fallback to environment variable (single tenant / legacy)
    const envKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');
    if (envKey) {
      this.logger.debug(`Using checksumKey from .env for orderCode=${orderCode}`);
    }
    return envKey;
  }

  /**
   * Get branchId from config store for routing socket events
   */
  private getBranchId(orderCode: number): string | undefined {
    const config = this.configStore.getConfig(orderCode);
    return config?.branchId;
  }

  private verifyWebhookSignature(webhookData: PayOSWebhookDto, signature: string): boolean {
    try {
      const orderCode = webhookData.data?.orderCode;
      const checksumKey = this.getChecksumKey(orderCode);

      if (!checksumKey) {
        this.logger.warn(`No checksumKey found for orderCode=${orderCode}, skipping signature verification`);
        return true;
      }

      if (!signature) {
        this.logger.warn('No signature provided in webhook');
        return false;
      }

      // PayOS signature verification
      // Sort data keys and create checksum string
      const data = webhookData.data;
      const sortedKeys = Object.keys(data).sort();
      const dataString = sortedKeys
        .map((key) => `${key}=${data[key as keyof typeof data]}`)
        .join('&');

      const computedSignature = crypto
        .createHmac('sha256', checksumKey)
        .update(dataString)
        .digest('hex');

      const isValid = computedSignature === signature;

      if (isValid) {
        this.logger.debug(`Signature verified successfully for orderCode=${orderCode}`);
      } else {
        this.logger.warn(`Signature mismatch for orderCode=${orderCode}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}
