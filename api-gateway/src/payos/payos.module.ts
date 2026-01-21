import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayosService } from './payos.service';
import { PayosController } from './payos.controller';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PayosController, WebhookController],
  providers: [PayosService],
  exports: [PayosService],
})
export class PayosModule {}
