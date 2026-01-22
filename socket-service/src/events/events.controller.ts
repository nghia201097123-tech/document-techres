import { Controller, Post, Body, Get, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SocketService } from '../socket/socket.service';
import { PaymentEventDto, CustomEventDto, PaymentStatus } from './dto/payment-event.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly socketService: SocketService) {}

  @Post('payment/success')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emit payment success event' })
  @ApiResponse({ status: 200, description: 'Event emitted successfully' })
  emitPaymentSuccess(@Body() dto: PaymentEventDto) {
    this.logger.log(`📥 Received payment success event for orderCode: ${dto.orderCode}`);

    this.socketService.emitPaymentSuccess({
      ...dto,
      status: PaymentStatus.PAID,
    });

    return {
      success: true,
      message: 'Payment success event emitted',
      orderCode: dto.orderCode,
    };
  }

  @Post('payment/cancelled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emit payment cancelled event' })
  @ApiResponse({ status: 200, description: 'Event emitted successfully' })
  emitPaymentCancelled(@Body() dto: PaymentEventDto) {
    this.logger.log(`📥 Received payment cancelled event for orderCode: ${dto.orderCode}`);

    this.socketService.emitPaymentCancelled({
      ...dto,
      status: PaymentStatus.CANCELLED,
    });

    return {
      success: true,
      message: 'Payment cancelled event emitted',
      orderCode: dto.orderCode,
    };
  }

  @Post('payment/expired')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emit payment expired event' })
  @ApiResponse({ status: 200, description: 'Event emitted successfully' })
  emitPaymentExpired(@Body() dto: PaymentEventDto) {
    this.logger.log(`📥 Received payment expired event for orderCode: ${dto.orderCode}`);

    this.socketService.emitPaymentExpired({
      ...dto,
      status: PaymentStatus.EXPIRED,
    });

    return {
      success: true,
      message: 'Payment expired event emitted',
      orderCode: dto.orderCode,
    };
  }

  @Post('custom')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emit custom event' })
  @ApiResponse({ status: 200, description: 'Event emitted successfully' })
  emitCustomEvent(@Body() dto: CustomEventDto) {
    this.logger.log(`📥 Received custom event: ${dto.event}`);

    this.socketService.emitCustomEvent(dto.event, dto.data, {
      branchId: dto.branchId,
      orderCode: dto.orderCode,
    });

    return {
      success: true,
      message: `Custom event ${dto.event} emitted`,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get connected clients statistics' })
  @ApiResponse({ status: 200, description: 'Returns connection statistics' })
  getStats() {
    const stats = this.socketService.getStats();

    return {
      success: true,
      ...stats,
    };
  }
}
