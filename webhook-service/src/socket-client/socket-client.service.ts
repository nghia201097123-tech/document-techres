import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';
import { PaymentResult } from '../webhook/webhook.service';

@Injectable()
export class SocketClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocketClientService.name);
  private socket: Socket;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  private connect() {
    const serverUrl = this.configService.get<string>('SOCKET_SERVER_URL') || 'http://localhost:3000';

    this.logger.log(`Connecting to Socket.IO server: ${serverUrl}`);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        service: 'webhook-service',
      },
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log(`✅ Connected to Socket.IO server: ${this.socket.id}`);

      // Join webhook service room
      this.socket.emit('join:service', { service: 'webhook' });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.logger.warn(`❌ Disconnected from Socket.IO server: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      this.logger.error(`Socket.IO connection error (attempt ${this.reconnectAttempts}): ${error.message}`);
    });

    this.socket.on('error', (error) => {
      this.logger.error(`Socket.IO error: ${error}`);
    });
  }

  private disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.logger.log('Disconnected from Socket.IO server');
    }
  }

  async emitPaymentSuccess(paymentResult: PaymentResult): Promise<void> {
    return this.emitPaymentEvent('payment:success', paymentResult);
  }

  async emitPaymentCancelled(paymentResult: PaymentResult): Promise<void> {
    return this.emitPaymentEvent('payment:cancelled', paymentResult);
  }

  async emitPaymentExpired(paymentResult: PaymentResult): Promise<void> {
    return this.emitPaymentEvent('payment:expired', paymentResult);
  }

  private async emitPaymentEvent(event: string, paymentResult: PaymentResult): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Socket not connected, cannot emit ${event}`);
      // Try to reconnect
      this.socket?.connect();
      // Wait a bit for connection
      await this.waitForConnection(3000);
    }

    if (this.isConnected) {
      this.logger.log(`Emitting ${event} for orderCode: ${paymentResult.orderCode}`);
      this.socket.emit(event, paymentResult);

      // Also emit to specific room based on orderCode
      // The room naming convention follows the pattern: payment:{orderCode}
      this.socket.emit('payment:update', {
        room: `payment:${paymentResult.orderCode}`,
        event,
        data: paymentResult,
      });
    } else {
      this.logger.error(`Failed to emit ${event}: Socket not connected`);
      throw new Error('Socket not connected');
    }
  }

  private waitForConnection(timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected) {
        resolve(true);
        return;
      }

      const checkInterval = setInterval(() => {
        if (this.isConnected) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(this.isConnected);
      }, timeout);
    });
  }

  getConnectionStatus(): { connected: boolean; socketId: string | null } {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
    };
  }
}
