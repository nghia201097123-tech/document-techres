import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodOrder, FoodPlatformAccount, FoodOrderItemEntity } from '../../database/entities';
import { ConnectorsModule } from '../connectors/connectors.module';
import { StoresModule } from '../stores/stores.module';
import { AccountsModule } from '../accounts/accounts.module';
import { RedisModule } from '../redis/redis.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([FoodOrder, FoodOrderItemEntity, FoodPlatformAccount]),
    ConnectorsModule,
    StoresModule,
    AccountsModule,
    RedisModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersService],
})
export class OrdersModule {}
