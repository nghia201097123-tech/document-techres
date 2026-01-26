import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class OrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);
  private subscriber: Redis;
  private connectedClients = new Map<string, Set<string>>(); // branchId -> Set<clientId>

  constructor(@InjectRedis() private redis: Redis) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
    this.setupRedisSubscriber();
  }

  /**
   * Setup Redis Pub/Sub subscriber
   * Listen for new orders and push to connected clients
   */
  private setupRedisSubscriber() {
    // Create a duplicate connection for subscribing
    this.subscriber = this.redis.duplicate();

    // Subscribe to all branch channels
    this.subscriber.psubscribe('branch:*:new-orders');

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      try {
        const data = JSON.parse(message);
        const branchId = data.branchId;

        // Emit to all clients in the branch room
        this.server.to(`branch:${branchId}`).emit('newOrders', data);

        this.logger.debug(
          `[WebSocket] Pushed ${data.orders?.length || 0} orders to branch ${branchId}`,
        );
      } catch (e) {
        this.logger.error(`[WebSocket] Error processing message: ${e.message}`);
      }
    });

    this.subscriber.on('error', (err) => {
      this.logger.error(`[WebSocket] Redis subscriber error: ${err.message}`);
    });

    this.logger.log('Redis Pub/Sub subscriber initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`[WebSocket] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`[WebSocket] Client disconnected: ${client.id}`);

    // Remove client from all rooms tracking
    this.connectedClients.forEach((clients, branchId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        this.logger.debug(
          `[WebSocket] Removed client ${client.id} from branch ${branchId}`,
        );
      }
    });
  }

  /**
   * Client joins a branch room to receive realtime updates
   *
   * Client: socket.emit('joinBranch', { branchId: '123' })
   */
  @SubscribeMessage('joinBranch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    const { branchId } = data;

    if (!branchId) {
      return { success: false, error: 'branchId is required' };
    }

    // Join the room
    client.join(`branch:${branchId}`);

    // Track connected clients
    if (!this.connectedClients.has(branchId)) {
      this.connectedClients.set(branchId, new Set());
    }
    this.connectedClients.get(branchId).add(client.id);

    this.logger.log(
      `[WebSocket] Client ${client.id} joined branch ${branchId}. ` +
        `Total clients: ${this.connectedClients.get(branchId).size}`,
    );

    return { success: true, branchId };
  }

  /**
   * Client leaves a branch room
   *
   * Client: socket.emit('leaveBranch', { branchId: '123' })
   */
  @SubscribeMessage('leaveBranch')
  handleLeaveBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    const { branchId } = data;

    if (!branchId) {
      return { success: false, error: 'branchId is required' };
    }

    // Leave the room
    client.leave(`branch:${branchId}`);

    // Update tracking
    const clients = this.connectedClients.get(branchId);
    if (clients) {
      clients.delete(client.id);
    }

    this.logger.debug(`[WebSocket] Client ${client.id} left branch ${branchId}`);

    return { success: true };
  }

  /**
   * Ping/Pong for connection keep-alive
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { type: 'pong', timestamp: Date.now() };
  }

  /**
   * Get connected clients count for a branch
   */
  getConnectedClientsCount(branchId: string): number {
    return this.connectedClients.get(branchId)?.size || 0;
  }

  /**
   * Get all connected branches with client counts
   */
  getAllConnectedBranches(): Record<string, number> {
    const result: Record<string, number> = {};
    this.connectedClients.forEach((clients, branchId) => {
      result[branchId] = clients.size;
    });
    return result;
  }
}
