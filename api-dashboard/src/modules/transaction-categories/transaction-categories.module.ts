import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionCategory } from '../../database/entities';
import { TransactionCategoriesService } from './transaction-categories.service';
import { TransactionCategoriesController } from './transaction-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionCategory])],
  controllers: [TransactionCategoriesController],
  providers: [TransactionCategoriesService],
  exports: [TransactionCategoriesService],
})
export class TransactionCategoriesModule {}
