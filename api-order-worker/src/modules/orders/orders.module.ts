import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { FoodOrder } from '../../database/entities/food-order.entity';
import { FoodPlatformAccount } from '../../database/entities/food-platform-account.entity';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FoodOrder, FoodPlatformAccount]),
    WorkersModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersService],
})
export class OrdersModule {}
