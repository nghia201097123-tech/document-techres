import { Injectable, Logger } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

export interface PaymentEventData {
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
export class SocketService {
  private readonly logger = new Logger(SocketService.name);

  constructor(private readonly socketGateway: SocketGateway) {}

  emitPaymentSuccess(data: PaymentEventData): void {
    this.logger.log(`✅ Emitting payment:success for orderCode: ${data.orderCode}`);

    // Emit to specific payment room
    this.socketGateway.emitToPaymentRoom(data.orderCode, 'payment:success', data);

    // Emit to branch if provided
    if (data.branchId) {
      this.socketGateway.emitToBranch(data.branchId, 'payment:success', data);
    }

    // Also emit globally for monitoring
    this.socketGateway.emitToAll('payment:update', {
      event: 'payment:success',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  emitPaymentCancelled(data: PaymentEventData): void {
    this.logger.log(`❌ Emitting payment:cancelled for orderCode: ${data.orderCode}`);

    // Emit to specific payment room
    this.socketGateway.emitToPaymentRoom(data.orderCode, 'payment:cancelled', data);

    // Emit to branch if provided
    if (data.branchId) {
      this.socketGateway.emitToBranch(data.branchId, 'payment:cancelled', data);
    }
  }

  emitPaymentExpired(data: PaymentEventData): void {
    this.logger.log(`⏰ Emitting payment:expired for orderCode: ${data.orderCode}`);

    // Emit to specific payment room
    this.socketGateway.emitToPaymentRoom(data.orderCode, 'payment:expired', data);

    // Emit to branch if provided
    if (data.branchId) {
      this.socketGateway.emitToBranch(data.branchId, 'payment:expired', data);
    }
  }

  emitCustomEvent(event: string, data: any, options?: { branchId?: string; orderCode?: number }): void {
    this.logger.log(`📤 Emitting custom event: ${event}`);

    if (options?.orderCode) {
      this.socketGateway.emitToPaymentRoom(options.orderCode, event, data);
    }

    if (options?.branchId) {
      this.socketGateway.emitToBranch(options.branchId, event, data);
    }

    if (!options?.orderCode && !options?.branchId) {
      this.socketGateway.emitToAll(event, data);
    }
  }

  getStats(): {
    connectedClients: number;
    clients: Array<{ socketId: string; branchId?: string; deviceType?: string }>;
  } {
    return {
      connectedClients: this.socketGateway.getConnectedClientsCount(),
      clients: this.socketGateway.getConnectedClients(),
    };
  }
}
