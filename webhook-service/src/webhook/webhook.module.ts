import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { SocketClientModule } from '../socket-client/socket-client.module';

@Module({
  imports: [SocketClientModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
