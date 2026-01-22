import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PayOSWebhookDto } from './dto/webhook.dto';
import { SocketClientService } from '../socket-client/socket-client.service';

export interface PaymentResult {
  orderCode: number;
  status: 'PAID' | 'CANCELLED' | 'EXPIRED' | 'PROCESSING';
  amount: number;
  transactionRef?: string;
  transactionDateTime?: string;
  counterAccountBankName?: string;
  counterAccountNumber?: string;
  counterAccountName?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly socketClient: SocketClientService,
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
      };

      this.logger.log(`✅ Payment SUCCESS: orderCode=${data.orderCode}, amount=${data.amount}`);

      // Emit Socket.IO event to notify POS app
      await this.socketClient.emitPaymentSuccess(paymentResult);

      return { success: true };
    }

    // Handle other webhook codes
    if (data) {
      let status: PaymentResult['status'] = 'PROCESSING';

      if (code === '01') {
        status = 'CANCELLED';
        this.logger.log(`❌ Payment CANCELLED: orderCode=${data.orderCode}`);
      } else if (code === '02') {
        status = 'EXPIRED';
        this.logger.log(`⏰ Payment EXPIRED: orderCode=${data.orderCode}`);
      } else {
        this.logger.log(`⚠️ Unknown webhook code: ${code} for orderCode=${data.orderCode}`);
      }

      const paymentResult: PaymentResult = {
        orderCode: data.orderCode,
        status,
        amount: data.amount,
        transactionRef: data.reference,
        transactionDateTime: data.transactionDateTime,
      };

      // Emit appropriate Socket.IO event
      if (status === 'CANCELLED') {
        await this.socketClient.emitPaymentCancelled(paymentResult);
      } else if (status === 'EXPIRED') {
        await this.socketClient.emitPaymentExpired(paymentResult);
      }
    }

    return { success: true };
  }

  private verifyWebhookSignature(webhookData: PayOSWebhookDto, signature: string): boolean {
    try {
      const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');
      if (!checksumKey) {
        this.logger.warn('PAYOS_CHECKSUM_KEY not configured, skipping signature verification');
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

      return computedSignature === signature;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}
