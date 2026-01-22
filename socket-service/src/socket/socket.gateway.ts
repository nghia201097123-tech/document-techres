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

interface JoinBranchPayload {
  branchId: string;
  deviceId?: string;
  deviceType?: string;
}

interface JoinPaymentPayload {
  orderCode: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private connectedClients: Map<string, { branchId?: string; deviceId?: string; deviceType?: string }> = new Map();

  afterInit(server: Server) {
    this.logger.log('🔌 Socket.IO Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`📱 Client connected: ${client.id}`);
    this.connectedClients.set(client.id, {});

    // Send connection confirmation
    client.emit('connection:success', {
      socketId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    this.logger.log(`📴 Client disconnected: ${client.id} (branch: ${clientInfo?.branchId || 'unknown'})`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join:branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinBranchPayload,
  ) {
    const { branchId, deviceId, deviceType } = payload;

    // Leave previous branch room if any
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo?.branchId) {
      client.leave(`branch:${clientInfo.branchId}`);
    }

    // Join new branch room
    client.join(`branch:${branchId}`);

    // Update client info
    this.connectedClients.set(client.id, { branchId, deviceId, deviceType });

    this.logger.log(`📍 Client ${client.id} joined branch: ${branchId} (device: ${deviceType || 'unknown'})`);

    return {
      success: true,
      branchId,
      message: `Joined branch ${branchId}`,
    };
  }

  @SubscribeMessage('join:payment')
  handleJoinPayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPaymentPayload,
  ) {
    const { orderCode } = payload;
    const room = `payment:${orderCode}`;

    client.join(room);
    this.logger.log(`💳 Client ${client.id} joined payment room: ${room}`);

    return {
      success: true,
      orderCode,
      room,
    };
  }

  @SubscribeMessage('leave:payment')
  handleLeavePayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPaymentPayload,
  ) {
    const { orderCode } = payload;
    const room = `payment:${orderCode}`;

    client.leave(room);
    this.logger.log(`🚪 Client ${client.id} left payment room: ${room}`);

    return {
      success: true,
      orderCode,
    };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', timestamp: new Date().toISOString() };
  }

  // Methods to emit events (called by SocketService)
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`📤 Emitted ${event} to all clients`);
  }

  emitToBranch(branchId: string, event: string, data: any) {
    this.server.to(`branch:${branchId}`).emit(event, data);
    this.logger.log(`📤 Emitted ${event} to branch: ${branchId}`);
  }

  emitToPaymentRoom(orderCode: number, event: string, data: any) {
    const room = `payment:${orderCode}`;
    this.server.to(room).emit(event, data);
    this.logger.log(`📤 Emitted ${event} to payment room: ${room}`);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getConnectedClients(): Array<{ socketId: string; branchId?: string; deviceType?: string }> {
    return Array.from(this.connectedClients.entries()).map(([socketId, info]) => ({
      socketId,
      ...info,
    }));
  }
}
