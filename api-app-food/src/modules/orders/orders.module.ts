import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodOrder, FoodPlatformAccount } from '../../database/entities';
import { ConnectorsModule } from '../connectors/connectors.module';
import { StoresModule } from '../stores/stores.module';
import { AccountsModule } from '../accounts/accounts.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FoodOrder, FoodPlatformAccount]),
    ConnectorsModule,
    StoresModule,
    AccountsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
