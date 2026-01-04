import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionCategory } from '../../database/entities/transaction-category.entity';
import { TransactionCategoriesController } from './transaction-categories.controller';
import { TransactionCategoriesService } from './transaction-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionCategory])],
  controllers: [TransactionCategoriesController],
  providers: [TransactionCategoriesService],
  exports: [TransactionCategoriesService],
})
export class TransactionCategoriesModule {}
