import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface PaymentSuccessPayload {
  orderId: string;
  orderCode: number;
  amount: number;
  transactionRef: string;
  transactionDateTime: string;
  counterAccountName?: string;
  counterAccountNumber?: string;
  counterAccountBankName?: string;
}

export interface PaymentCancelledPayload {
  orderId: string;
  orderCode: number;
  reason?: string;
}

export interface JoinRoomPayload {
  branchId: string;
  deviceId: string;
  deviceType: 'android' | 'windows' | 'web';
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
    credentials: true,
  },
  namespace: '/payment',
  transports: ['websocket', 'polling'],
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  // Track connected devices: socketId -> { branchId, deviceId, deviceType }
  private connectedDevices = new Map<
    string,
    { branchId: string; deviceId: string; deviceType: string }
  >();

  afterInit(server: Server) {
    this.logger.log('Socket.IO Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const deviceInfo = this.connectedDevices.get(client.id);
    if (deviceInfo) {
      this.logger.log(
        `Client disconnected: ${client.id} (branch: ${deviceInfo.branchId}, device: ${deviceInfo.deviceId})`,
      );
      this.connectedDevices.delete(client.id);
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('join:branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { branchId, deviceId, deviceType } = payload;
    const roomName = `branch:${branchId}`;

    // Leave any previous rooms
    const previousInfo = this.connectedDevices.get(client.id);
    if (previousInfo) {
      client.leave(`branch:${previousInfo.branchId}`);
    }

    // Join new room
    client.join(roomName);
    this.connectedDevices.set(client.id, { branchId, deviceId, deviceType });

    this.logger.log(
      `Device ${deviceId} (${deviceType}) joined room ${roomName}`,
    );

    // Acknowledge join
    return {
      success: true,
      room: roomName,
      message: `Joined branch ${branchId}`,
    };
  }

  @SubscribeMessage('leave:branch')
  handleLeaveBranch(@ConnectedSocket() client: Socket) {
    const deviceInfo = this.connectedDevices.get(client.id);
    if (deviceInfo) {
      const roomName = `branch:${deviceInfo.branchId}`;
      client.leave(roomName);
      this.connectedDevices.delete(client.id);

      this.logger.log(`Device ${deviceInfo.deviceId} left room ${roomName}`);

      return { success: true, message: `Left branch ${deviceInfo.branchId}` };
    }
    return { success: false, message: 'Not in any branch room' };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', timestamp: Date.now() };
  }

  // Methods to emit events (called from PayOS service)

  emitPaymentSuccess(branchId: string, payload: PaymentSuccessPayload) {
    const roomName = `branch:${branchId}`;
    this.server.to(roomName).emit('payment:success', payload);
    this.logger.log(
      `Emitted payment:success to ${roomName} for order ${payload.orderCode}`,
    );
  }

  emitPaymentCancelled(branchId: string, payload: PaymentCancelledPayload) {
    const roomName = `branch:${branchId}`;
    this.server.to(roomName).emit('payment:cancelled', payload);
    this.logger.log(
      `Emitted payment:cancelled to ${roomName} for order ${payload.orderCode}`,
    );
  }

  emitPaymentExpired(branchId: string, orderCode: number) {
    const roomName = `branch:${branchId}`;
    this.server.to(roomName).emit('payment:expired', { orderCode });
    this.logger.log(`Emitted payment:expired to ${roomName} for order ${orderCode}`);
  }

  // Get connected devices count for a branch
  getBranchDeviceCount(branchId: string): number {
    let count = 0;
    for (const [, info] of this.connectedDevices) {
      if (info.branchId === branchId) {
        count++;
      }
    }
    return count;
  }

  // Get all connected devices info
  getConnectedDevices(): Array<{
    socketId: string;
    branchId: string;
    deviceId: string;
    deviceType: string;
  }> {
    const devices: Array<{
      socketId: string;
      branchId: string;
      deviceId: string;
      deviceType: string;
    }> = [];
    for (const [socketId, info] of this.connectedDevices) {
      devices.push({ socketId, ...info });
    }
    return devices;
  }
}
