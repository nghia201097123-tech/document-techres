import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from '../../database/entities/payment-method.entity';
import { BankAccount } from '../../database/entities/bank-account.entity';
import { EInvoiceConfig } from '../../database/entities/einvoice-config.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethod, BankAccount, EInvoiceConfig]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
