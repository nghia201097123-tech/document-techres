import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayosService } from './payos.service';
import { PayosController } from './payos.controller';
import { WebhookController } from './webhook.controller';
import { FcmService } from './fcm.service';

@Module({
  imports: [ConfigModule],
  controllers: [PayosController, WebhookController],
  providers: [PayosService, FcmService],
  exports: [PayosService, FcmService],
})
export class PayosModule {}
