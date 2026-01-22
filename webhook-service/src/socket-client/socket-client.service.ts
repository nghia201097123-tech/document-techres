import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PaymentResult } from '../webhook/webhook.service';

@Injectable()
export class SocketClientService {
  private readonly logger = new Logger(SocketClientService.name);
  private readonly httpClient: AxiosInstance;
  private readonly socketServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.socketServiceUrl = this.configService.get<string>('SOCKET_SERVICE_URL') || 'http://localhost:3007';

    this.httpClient = axios.create({
      baseURL: this.socketServiceUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Socket service URL configured: ${this.socketServiceUrl}`);
  }

  async emitPaymentSuccess(paymentResult: PaymentResult): Promise<void> {
    try {
      this.logger.log(`📤 Sending payment success to socket-service for orderCode: ${paymentResult.orderCode}`);

      await this.httpClient.post('/events/payment/success', {
        orderCode: paymentResult.orderCode,
        status: paymentResult.status,
        amount: paymentResult.amount,
        transactionRef: paymentResult.transactionRef,
        transactionDateTime: paymentResult.transactionDateTime,
        counterAccountBankName: paymentResult.counterAccountBankName,
        counterAccountNumber: paymentResult.counterAccountNumber,
        counterAccountName: paymentResult.counterAccountName,
      });

      this.logger.log(`✅ Payment success event sent for orderCode: ${paymentResult.orderCode}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send payment success event: ${error.message}`);
      throw error;
    }
  }

  async emitPaymentCancelled(paymentResult: PaymentResult): Promise<void> {
    try {
      this.logger.log(`📤 Sending payment cancelled to socket-service for orderCode: ${paymentResult.orderCode}`);

      await this.httpClient.post('/events/payment/cancelled', {
        orderCode: paymentResult.orderCode,
        status: paymentResult.status,
        amount: paymentResult.amount,
        transactionRef: paymentResult.transactionRef,
        transactionDateTime: paymentResult.transactionDateTime,
      });

      this.logger.log(`✅ Payment cancelled event sent for orderCode: ${paymentResult.orderCode}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send payment cancelled event: ${error.message}`);
      throw error;
    }
  }

  async emitPaymentExpired(paymentResult: PaymentResult): Promise<void> {
    try {
      this.logger.log(`📤 Sending payment expired to socket-service for orderCode: ${paymentResult.orderCode}`);

      await this.httpClient.post('/events/payment/expired', {
        orderCode: paymentResult.orderCode,
        status: paymentResult.status,
        amount: paymentResult.amount,
      });

      this.logger.log(`✅ Payment expired event sent for orderCode: ${paymentResult.orderCode}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send payment expired event: ${error.message}`);
      throw error;
    }
  }

  async getSocketServiceStatus(): Promise<{ healthy: boolean; connectedClients?: number }> {
    try {
      const [healthResponse, statsResponse] = await Promise.all([
        this.httpClient.get('/health'),
        this.httpClient.get('/events/stats'),
      ]);

      return {
        healthy: healthResponse.data.status === 'ok',
        connectedClients: statsResponse.data.connectedClients,
      };
    } catch (error) {
      this.logger.error(`❌ Socket service health check failed: ${error.message}`);
      return { healthy: false };
    }
  }
}
