import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { PayOSWebhookDto } from './dto/webhook.dto';

@ApiTags('PayOS Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('payos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PayOS webhook endpoint for payment notifications' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiExcludeEndpoint()
  async handlePayOSWebhook(
    @Body() webhookData: PayOSWebhookDto,
    @Headers('x-payos-signature') signature: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received PayOS webhook: code=${webhookData.code}, orderCode=${webhookData.data?.orderCode}`);
    this.logger.debug('Webhook payload:', JSON.stringify(webhookData, null, 2));

    try {
      const result = await this.webhookService.handlePayOSWebhook(webhookData, signature);
      return result;
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
      return { success: false };
    }
  }

  @Post('payos/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm webhook endpoint for PayOS' })
  async confirmWebhook(): Promise<{ status: string }> {
    this.logger.log('Webhook confirmation request received');
    return { status: 'ok' };
  }
}
