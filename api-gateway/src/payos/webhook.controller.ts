import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { PayosService } from './payos.service';
import { PayOSWebhookDto } from './dto/webhook.dto';

@ApiTags('PayOS Webhook')
@Controller('payos/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly payosService: PayosService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PayOS webhook endpoint for payment notifications' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiExcludeEndpoint() // Hide from Swagger UI for security
  async handleWebhook(
    @Body() webhookData: PayOSWebhookDto,
    @Headers('x-payos-signature') signature: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received PayOS webhook: code=${webhookData.code}, orderCode=${webhookData.data?.orderCode}`);

    // Log webhook for debugging (remove in production)
    this.logger.debug('Webhook payload:', JSON.stringify(webhookData, null, 2));

    try {
      const result = await this.payosService.handleWebhook(webhookData);
      return result;
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
      // Always return 200 to acknowledge receipt (PayOS will retry on non-2xx)
      return { success: false };
    }
  }

  // Endpoint for PayOS to confirm webhook URL (optional)
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm webhook endpoint for PayOS' })
  async confirmWebhook(): Promise<{ status: string }> {
    this.logger.log('Webhook confirmation request received');
    return { status: 'ok' };
  }
}
