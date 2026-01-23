import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import {
  PollOrdersQueryDto,
  GetOrdersQueryDto,
  CancelOrderDto,
} from './dto/order.dto';

@ApiTags('orders')
@Controller('food-orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Poll orders for a branch
   * CCB calls this endpoint every 5 seconds
   */
  @Get('poll')
  @ApiOperation({
    summary: 'Poll đơn hàng cho chi nhánh',
    description: 'CCB gọi endpoint này mỗi 5 giây để lấy đơn hàng mới và cập nhật',
  })
  @ApiQuery({ name: 'branchId', type: Number, required: true })
  @ApiQuery({ name: 'lastPollAt', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async pollOrders(@Query() query: PollOrdersQueryDto) {
    const result = await this.ordersService.pollOrders(query);
    return result;
  }

  /**
   * Get orders with filters
   */
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getOrders(@Query() query: GetOrdersQueryDto) {
    const result = await this.ordersService.getOrders(query);
    return ApiResponseDto.success(result);
  }

  /**
   * Get order by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin đơn hàng theo ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getOrderById(@Param('id') id: string) {
    const order = await this.ordersService.getOrderById(id);
    return ApiResponseDto.success(order);
  }

  /**
   * Accept/Confirm an order
   */
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác nhận đơn hàng' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Xác nhận thành công' })
  async acceptOrder(@Param('id') id: string) {
    const order = await this.ordersService.acceptOrder(id);
    return ApiResponseDto.success(
      {
        id: order.id,
        orderCode: order.orderCode,
        status: order.status,
        acceptedAt: order.acceptedAt,
      },
      `Đã xác nhận đơn ${order.orderCode}`,
    );
  }

  /**
   * Mark order as ready
   */
  @Post(':id/ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu đơn hàng sẵn sàng' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async markReady(@Param('id') id: string) {
    const order = await this.ordersService.markReady(id);
    return ApiResponseDto.success(
      {
        id: order.id,
        orderCode: order.orderCode,
        status: order.status,
        preparedAt: order.preparedAt,
      },
      `Đơn ${order.orderCode} đã sẵn sàng`,
    );
  }

  /**
   * Complete an order
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn tất đơn hàng' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Hoàn tất thành công' })
  async completeOrder(@Param('id') id: string) {
    const order = await this.ordersService.completeOrder(id);
    return ApiResponseDto.success(
      {
        id: order.id,
        orderCode: order.orderCode,
        status: order.status,
        completedAt: order.completedAt,
      },
      `Đã hoàn tất đơn ${order.orderCode}`,
    );
  }

  /**
   * Cancel an order
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy đơn hàng' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Hủy thành công' })
  async cancelOrder(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    const order = await this.ordersService.cancelOrder(id, dto.reason);
    return ApiResponseDto.success(
      {
        id: order.id,
        orderCode: order.orderCode,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancelReason: order.cancelReason,
      },
      `Đã hủy đơn ${order.orderCode}`,
    );
  }

  /**
   * Mark order as printed
   */
  @Post(':id/printed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu đơn hàng đã in' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async markPrinted(@Param('id') id: string) {
    const order = await this.ordersService.markPrinted(id);
    return ApiResponseDto.success(
      {
        id: order.id,
        orderCode: order.orderCode,
        isPrinted: order.isPrinted,
        printedAt: order.printedAt,
      },
      `Đã đánh dấu in đơn ${order.orderCode}`,
    );
  }
}
