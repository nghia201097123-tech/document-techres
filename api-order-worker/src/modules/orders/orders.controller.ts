import { Controller, Get, Post, Param, Query, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private ordersService: OrdersService) {}

  /**
   * CCB gọi mỗi 15s để lấy orders
   * Chỉ đọc từ DB/Cache, rất nhanh
   *
   * GET /api/v1/orders/:branchId?status=all
   */
  @Get(':branchId')
  async getOrders(
    @Param('branchId') branchId: string,
    @Query('status') status?: string,
  ) {
    const startTime = Date.now();

    const orders = await this.ordersService.getOrdersByBranch(branchId, status);
    const counts = await this.ordersService.getOrderCounts(branchId);

    const duration = Date.now() - startTime;
    this.logger.debug(`[getOrders] Branch ${branchId}: ${orders.length} orders in ${duration}ms`);

    return {
      status: 200,
      message: 'Ok',
      data: {
        branchId,
        orders,
        totalOrders: counts.total,
        newOrders: counts.new,
        confirmedOrders: counts.confirmed, // Đơn đã xác nhận bởi CCB
        completedOrders: counts.completed,
        cancelledOrders: counts.cancelled,
        polledAt: new Date().toISOString(),
      },
    };
  }

  /**
   * CCB gọi khi cần trigger refresh từ platforms
   * Gửi signal đến workers để poll
   *
   * POST /api/v1/orders/trigger-poll/:branchId
   */
  @Post('trigger-poll/:branchId')
  async triggerPoll(@Param('branchId') branchId: string) {
    const startTime = Date.now();
    this.logger.log(`[triggerPoll] Starting poll for branch ${branchId}`);

    const result = await this.ordersService.triggerPoll(branchId);

    const duration = Date.now() - startTime;
    this.logger.log(
      `[triggerPoll] Branch ${branchId}: ${result.newOrderIds.length} new orders, ` +
        `${result.accounts.length} accounts in ${duration}ms`,
    );

    return {
      status: 200,
      message: result.newOrderIds.length > 0
        ? `Có ${result.newOrderIds.length} đơn hàng mới`
        : 'Poll completed',
      data: {
        branchId,
        newOrderIds: result.newOrderIds,
        newOrdersCount: result.newOrderIds.length,
        totalOrders: result.totalOrders,
        accounts: result.accounts,
        polledAt: new Date().toISOString(),
        duration,
      },
    };
  }

  /**
   * Health check + Worker stats
   *
   * GET /api/v1/orders/health/stats
   */
  @Get('health/stats')
  async getStats() {
    const workerStats = this.ordersService.getWorkerStats();

    return {
      status: 200,
      message: 'Ok',
      data: {
        service: 'api-order-worker',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        workers: workerStats,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
