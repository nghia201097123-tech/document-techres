import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  TransactionVoucher,
  Brand,
  Branch,
  TransactionCategory,
  PaymentMethod,
  BankAccount,
  Staff,
} from '../../database/entities';
import { TransactionVouchersService } from './transaction-vouchers.service';
import { TransactionVouchersController } from './transaction-vouchers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionVoucher,
      Brand,
      Branch,
      TransactionCategory,
      PaymentMethod,
      BankAccount,
      Staff,
    ]),
  ],
  controllers: [TransactionVouchersController],
  providers: [TransactionVouchersService],
  exports: [TransactionVouchersService],
})
export class TransactionVouchersModule {}
