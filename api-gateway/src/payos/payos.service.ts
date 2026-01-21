import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import {
  CreatePaymentDto,
  CreatePaymentResponseDto,
  PaymentStatusResponseDto,
} from './dto/create-payment.dto';
import { PayOSWebhookDto } from './dto/webhook.dto';
import { FcmService, PaymentNotificationData } from './fcm.service';

// In-memory store for payment sessions (use Redis in production)
interface PaymentSession {
  orderId: string;
  orderCode: number;
  amount: number;
  branchId: string;
  deviceId: string;
  fcmToken: string;
  tableName?: string;
  customerName?: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  createdAt: Date;
  paidAt?: Date;
  transactionRef?: string;
}

@Injectable()
export class PayosService implements OnModuleInit {
  private readonly logger = new Logger(PayosService.name);
  private payos: PayOS;
  private readonly paymentSessions = new Map<number, PaymentSession>();

  constructor(
    private configService: ConfigService,
    private fcmService: FcmService,
  ) {}

  onModuleInit() {
    this.initializePayOS();
    this.startCleanupJob();
  }

  private initializePayOS() {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.configService.get<string>('PAYOS_API_KEY');
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');

    if (!clientId || !apiKey || !checksumKey) {
      this.logger.error('PayOS credentials not configured');
      throw new Error('PayOS credentials not configured');
    }

    this.payos = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });

    this.logger.log('PayOS SDK initialized');
  }

  // Cleanup expired sessions every 10 minutes
  private startCleanupJob() {
    setInterval(() => {
      const now = new Date();
      const expireTime = 30 * 60 * 1000; // 30 minutes

      for (const [orderCode, session] of this.paymentSessions.entries()) {
        if (now.getTime() - session.createdAt.getTime() > expireTime && session.status === 'PENDING') {
          this.paymentSessions.delete(orderCode);
          this.logger.debug(`Cleaned up expired session: ${orderCode}`);
        }
      }
    }, 10 * 60 * 1000);
  }

  async createPayment(dto: CreatePaymentDto): Promise<CreatePaymentResponseDto> {
    try {
      const returnUrl = this.configService.get<string>('PAYOS_RETURN_URL') || 'https://techres.vn/payment/success';
      const cancelUrl = this.configService.get<string>('PAYOS_CANCEL_URL') || 'https://techres.vn/payment/cancel';

      // Create payment request with PayOS
      const paymentRequest = await this.payos.paymentRequests.create({
        orderCode: dto.orderCode,
        amount: dto.amount,
        description: dto.description.substring(0, 25), // PayOS limits to 25 chars
        returnUrl,
        cancelUrl,
        // Optional: Add buyer info if available
        ...(dto.customerName && { buyerName: dto.customerName }),
      });

      // Store session for webhook handling
      this.paymentSessions.set(dto.orderCode, {
        orderId: dto.orderId,
        orderCode: dto.orderCode,
        amount: dto.amount,
        branchId: dto.branchId,
        deviceId: dto.deviceId,
        fcmToken: dto.fcmToken,
        tableName: dto.tableName,
        customerName: dto.customerName,
        status: 'PENDING',
        createdAt: new Date(),
      });

      this.logger.log(`Created payment: orderCode=${dto.orderCode}, amount=${dto.amount}`);

      return {
        success: true,
        paymentLinkId: paymentRequest.paymentLinkId,
        qrCode: paymentRequest.qrCode,
        checkoutUrl: paymentRequest.checkoutUrl,
        orderCode: dto.orderCode,
        amount: dto.amount,
      };
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPaymentStatus(orderCode: number): Promise<PaymentStatusResponseDto> {
    try {
      const paymentInfo = await this.payos.paymentRequests.get(orderCode);
      const session = this.paymentSessions.get(orderCode);

      return {
        orderCode,
        status: paymentInfo.status,
        amount: paymentInfo.amount,
        amountPaid: paymentInfo.amountPaid || 0,
        transactionRef: paymentInfo.transactions?.[0]?.reference,
        transactionDateTime: paymentInfo.transactions?.[0]?.transactionDateTime,
      };
    } catch (error) {
      this.logger.error(`Failed to get payment status: ${error.message}`);
      throw error;
    }
  }

  async cancelPayment(orderCode: number, reason?: string): Promise<boolean> {
    try {
      await this.payos.paymentRequests.cancel(orderCode, reason);

      // Update session status
      const session = this.paymentSessions.get(orderCode);
      if (session) {
        session.status = 'CANCELLED';
      }

      this.logger.log(`Cancelled payment: orderCode=${orderCode}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel payment: ${error.message}`);
      throw error;
    }
  }

  async handleWebhook(webhookData: PayOSWebhookDto): Promise<{ success: boolean }> {
    try {
      // Verify webhook signature
      const isValid = await this.payos.webhooks.verify(webhookData);
      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        return { success: false };
      }

      const { data } = webhookData;
      const orderCode = data.orderCode;

      // Check if payment was successful
      if (webhookData.code === '00' && data.code === '00') {
        this.logger.log(`Payment success webhook received: orderCode=${orderCode}`);

        // Get session info
        const session = this.paymentSessions.get(orderCode);
        if (session) {
          // Update session
          session.status = 'PAID';
          session.paidAt = new Date();
          session.transactionRef = data.reference;

          // Send FCM notification to the device
          const notificationData: PaymentNotificationData = {
            type: 'PAYMENT_SUCCESS',
            orderId: session.orderId,
            orderCode: orderCode.toString(),
            amount: data.amount.toString(),
            transactionRef: data.reference,
            transactionDateTime: data.transactionDateTime,
            counterAccountName: data.counterAccountName,
            counterAccountNumber: data.counterAccountNumber,
            counterAccountBankName: data.counterAccountBankName,
          };

          await this.fcmService.sendPaymentNotification(
            session.fcmToken,
            notificationData,
          );

          this.logger.log(`FCM notification sent for orderCode=${orderCode}`);
        } else {
          this.logger.warn(`No session found for orderCode=${orderCode}`);
        }
      } else {
        this.logger.log(`Payment webhook with code: ${webhookData.code}, data.code: ${data.code}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to handle webhook: ${error.message}`, error.stack);
      return { success: false };
    }
  }

  // Get session info (for debugging)
  getSession(orderCode: number): PaymentSession | undefined {
    return this.paymentSessions.get(orderCode);
  }
}
