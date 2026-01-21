import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PayosService } from './payos.service';
import {
  CreatePaymentDto,
  CreatePaymentResponseDto,
  CancelPaymentDto,
  PaymentStatusResponseDto,
} from './dto/create-payment.dto';

@ApiTags('PayOS Payments')
@Controller('payos')
export class PayosController {
  private readonly logger = new Logger(PayosController.name);

  constructor(private readonly payosService: PayosService) {}

  @Post('create-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new PayOS payment link' })
  @ApiResponse({
    status: 200,
    description: 'Payment link created successfully',
    type: CreatePaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createPayment(@Body() dto: CreatePaymentDto): Promise<CreatePaymentResponseDto> {
    this.logger.log(`Creating payment: orderId=${dto.orderId}, amount=${dto.amount}`);

    if (!dto.orderId || !dto.orderCode || !dto.amount || !dto.branchId) {
      throw new BadRequestException('Missing required fields: orderId, orderCode, amount, branchId');
    }

    if (dto.amount < 1000) {
      throw new BadRequestException('Amount must be at least 1000 VND');
    }

    return this.payosService.createPayment(dto);
  }

  @Get('payment-status/:orderCode')
  @ApiOperation({ summary: 'Get payment status by order code' })
  @ApiParam({ name: 'orderCode', type: 'number', description: 'Order code' })
  @ApiQuery({ name: 'branchId', required: true, description: 'Branch ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved',
    type: PaymentStatusResponseDto,
  })
  async getPaymentStatus(
    @Param('orderCode') orderCode: string,
    @Query('branchId') branchId: string,
  ): Promise<PaymentStatusResponseDto> {
    const code = parseInt(orderCode, 10);
    if (isNaN(code)) {
      throw new BadRequestException('Invalid order code');
    }
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }
    return this.payosService.getPaymentStatus(code, branchId);
  }

  @Post('cancel-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request or payment cannot be cancelled' })
  async cancelPayment(
    @Body() dto: CancelPaymentDto,
    @Query('branchId') branchId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Cancelling payment: orderCode=${dto.orderCode}`);

    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    const success = await this.payosService.cancelPayment(dto.orderCode, branchId, dto.reason);
    return {
      success,
      message: success ? 'Payment cancelled' : 'Failed to cancel payment',
    };
  }
}
