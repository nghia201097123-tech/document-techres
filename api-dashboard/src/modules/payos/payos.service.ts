import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import PayOS = require('@payos/node');
import { BankAccount } from '../../database/entities';
import {
  CreatePaymentDto,
  CreatePaymentResponseDto,
  PaymentStatusResponseDto,
} from './dto/create-payment.dto';
import { PayOSWebhookDto } from './dto/webhook.dto';
import { SocketGateway } from '../socket/socket.gateway';

interface PaymentSession {
  orderId: string;
  orderCode: number;
  amount: number;
  branchId: string;
  deviceId: string;
  tableName?: string;
  customerName?: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  createdAt: Date;
  paidAt?: Date;
  transactionRef?: string;
  payosClientId: string;
}

@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);
  private readonly paymentSessions = new Map<number, PaymentSession>();
  private readonly payosInstances = new Map<string, PayOS>();

  constructor(
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
    private configService: ConfigService,
    private socketGateway: SocketGateway,
  ) {
    this.startCleanupJob();
  }

  private startCleanupJob() {
    setInterval(() => {
      const now = new Date();
      const expireTime = 30 * 60 * 1000;

      for (const [orderCode, session] of this.paymentSessions.entries()) {
        if (
          now.getTime() - session.createdAt.getTime() > expireTime &&
          session.status === 'PENDING'
        ) {
          this.socketGateway.emitPaymentExpired(session.branchId, orderCode);
          this.paymentSessions.delete(orderCode);
          this.logger.debug(`Cleaned up expired session: ${orderCode}`);
        }
      }
    }, 10 * 60 * 1000);
  }

  private async getPayOSInstance(branchId: string): Promise<{ payos: PayOS; bankAccount: BankAccount }> {
    // Find PayOS bank account for the branch
    const bankAccount = await this.bankAccountRepository.findOne({
      where: {
        branchId,
        paymentPartner: 'payos',
        isActive: true,
      },
    });

    if (!bankAccount) {
      // Try to find brand-level PayOS account
      const brandBankAccount = await this.bankAccountRepository
        .createQueryBuilder('ba')
        .innerJoin('branches', 'b', 'b.brand_id = ba.brand_id')
        .where('b.id = :branchId', { branchId })
        .andWhere('ba.branch_id IS NULL')
        .andWhere('ba.payment_partner = :partner', { partner: 'payos' })
        .andWhere('ba.is_active = true')
        .getOne();

      if (!brandBankAccount) {
        throw new NotFoundException('PayOS not configured for this branch');
      }

      return this.createPayOSFromBankAccount(brandBankAccount);
    }

    return this.createPayOSFromBankAccount(bankAccount);
  }

  private createPayOSFromBankAccount(bankAccount: BankAccount): { payos: PayOS; bankAccount: BankAccount } {
    const { payosClientId, payosApiKey, payosChecksumKey } = bankAccount;

    if (!payosClientId || !payosApiKey || !payosChecksumKey) {
      throw new BadRequestException('PayOS credentials not fully configured');
    }

    // Cache PayOS instance by clientId
    if (!this.payosInstances.has(payosClientId)) {
      const payos = new PayOS({
        clientId: payosClientId,
        apiKey: payosApiKey,
        checksumKey: payosChecksumKey,
      });
      this.payosInstances.set(payosClientId, payos);
      this.logger.log(`Created PayOS instance for clientId: ${payosClientId}`);
    }

    return {
      payos: this.payosInstances.get(payosClientId),
      bankAccount,
    };
  }

  async createPayment(dto: CreatePaymentDto): Promise<CreatePaymentResponseDto> {
    const { payos, bankAccount } = await this.getPayOSInstance(dto.branchId);

    try {
      const returnUrl =
        this.configService.get<string>('PAYOS_RETURN_URL') ||
        'https://techres.vn/payment/success';
      const cancelUrl =
        this.configService.get<string>('PAYOS_CANCEL_URL') ||
        'https://techres.vn/payment/cancel';

      const paymentRequest = await payos.paymentRequests.create({
        orderCode: dto.orderCode,
        amount: dto.amount,
        description: dto.description.substring(0, 25),
        returnUrl,
        cancelUrl,
        ...(dto.customerName && { buyerName: dto.customerName }),
      });

      this.paymentSessions.set(dto.orderCode, {
        orderId: dto.orderId,
        orderCode: dto.orderCode,
        amount: dto.amount,
        branchId: dto.branchId,
        deviceId: dto.deviceId,
        tableName: dto.tableName,
        customerName: dto.customerName,
        status: 'PENDING',
        createdAt: new Date(),
        payosClientId: bankAccount.payosClientId,
      });

      this.logger.log(
        `Created payment: orderCode=${dto.orderCode}, amount=${dto.amount}, branch=${dto.branchId}`,
      );

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

  async getPaymentStatus(orderCode: number, branchId: string): Promise<PaymentStatusResponseDto> {
    const { payos } = await this.getPayOSInstance(branchId);

    try {
      const paymentInfo = await payos.paymentRequests.get(orderCode);

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

  async cancelPayment(orderCode: number, branchId: string, reason?: string): Promise<boolean> {
    const { payos } = await this.getPayOSInstance(branchId);

    try {
      await payos.paymentRequests.cancel(orderCode, reason);

      const session = this.paymentSessions.get(orderCode);
      if (session) {
        session.status = 'CANCELLED';

        this.socketGateway.emitPaymentCancelled(session.branchId, {
          orderId: session.orderId,
          orderCode,
          reason,
        });
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
      const { data } = webhookData;
      const orderCode = data.orderCode;

      if (webhookData.code === '00' && data.code === '00') {
        this.logger.log(`Payment success webhook received: orderCode=${orderCode}`);

        const session = this.paymentSessions.get(orderCode);
        if (session) {
          // Verify webhook signature using cached PayOS instance
          const payos = this.payosInstances.get(session.payosClientId);
          if (payos) {
            const isValid = await payos.webhooks.verify(webhookData);
            if (!isValid) {
              this.logger.warn('Invalid webhook signature');
              return { success: false };
            }
          }

          session.status = 'PAID';
          session.paidAt = new Date();
          session.transactionRef = data.reference;

          this.socketGateway.emitPaymentSuccess(session.branchId, {
            orderId: session.orderId,
            orderCode,
            amount: data.amount,
            transactionRef: data.reference,
            transactionDateTime: data.transactionDateTime,
            counterAccountName: data.counterAccountName,
            counterAccountNumber: data.counterAccountNumber,
            counterAccountBankName: data.counterAccountBankName,
          });

          this.logger.log(
            `Socket.IO event emitted for orderCode=${orderCode} to branch=${session.branchId}`,
          );
        } else {
          this.logger.warn(`No session found for orderCode=${orderCode}`);
        }
      } else {
        this.logger.log(
          `Payment webhook with code: ${webhookData.code}, data.code: ${data.code}`,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to handle webhook: ${error.message}`, error.stack);
      return { success: false };
    }
  }

  getSession(orderCode: number): PaymentSession | undefined {
    return this.paymentSessions.get(orderCode);
  }
}
