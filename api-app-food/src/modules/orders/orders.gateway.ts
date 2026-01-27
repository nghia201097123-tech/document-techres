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
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit } from '@nestjs/common';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: process.env.CONFIG_WS_CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class OrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);
  private connectedClients: Map<string, Set<string>> = new Map(); // branchId -> Set of socketIds

  constructor(private readonly redisPubSub: RedisPubSubService) {}

  async onModuleInit() {
    // Subscribe to new-orders channel from api-order-worker
    await this.redisPubSub.subscribeNewOrders((branchId, data) => {
      this.pushNewOrders(branchId, data.orders);
    });

    this.logger.log('✅ WebSocket Gateway initialized and subscribed to Redis');
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove client from all branch rooms
    this.connectedClients.forEach((clients, branchId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        this.logger.log(`Removed ${client.id} from branch ${branchId}`);
      }
    });
  }

  /**
   * Client joins a branch room to receive orders
   */
  @SubscribeMessage('joinBranch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() branchId: string,
  ) {
    const room = `branch:${branchId}`;
    client.join(room);

    // Track connected clients
    if (!this.connectedClients.has(branchId)) {
      this.connectedClients.set(branchId, new Set());
    }
    this.connectedClients.get(branchId)!.add(client.id);

    this.logger.log(`Client ${client.id} joined branch ${branchId}`);

    return {
      event: 'joinedBranch',
      data: {
        branchId,
        message: `Đã tham gia branch ${branchId}`,
      },
    };
  }

  /**
   * Client leaves a branch room
   */
  @SubscribeMessage('leaveBranch')
  handleLeaveBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() branchId: string,
  ) {
    const room = `branch:${branchId}`;
    client.leave(room);

    // Remove from tracking
    this.connectedClients.get(branchId)?.delete(client.id);

    this.logger.log(`Client ${client.id} left branch ${branchId}`);

    return {
      event: 'leftBranch',
      data: {
        branchId,
        message: `Đã rời branch ${branchId}`,
      },
    };
  }

  /**
   * Push new orders to all clients in a branch room
   * Called when api-order-worker publishes new orders
   */
  pushNewOrders(branchId: string, orders: any[]) {
    const room = `branch:${branchId}`;
    const clientCount = this.connectedClients.get(branchId)?.size || 0;

    this.logger.log(
      `📤 Pushing ${orders.length} new orders to branch ${branchId} (${clientCount} clients)`,
    );

    this.server.to(room).emit('newOrders', {
      branchId,
      orders,
      count: orders.length,
      timestamp: Date.now(),
    });
  }

  /**
   * Get connected clients count for a branch
   */
  getConnectedClientsCount(branchId: string): number {
    return this.connectedClients.get(branchId)?.size || 0;
  }

  /**
   * Get all connected branches and their client counts
   */
  getAllConnectedBranches(): Record<string, number> {
    const result: Record<string, number> = {};
    this.connectedClients.forEach((clients, branchId) => {
      result[branchId] = clients.size;
    });
    return result;
  }
}
