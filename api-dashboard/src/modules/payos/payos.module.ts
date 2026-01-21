import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PayosService } from './payos.service';
import { PayosController } from './payos.controller';
import { WebhookController } from './webhook.controller';
import { BankAccount } from '../../database/entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([BankAccount]),
  ],
  controllers: [PayosController, WebhookController],
  providers: [PayosService],
  exports: [PayosService],
})
export class PayosModule {}
