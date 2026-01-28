import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicController } from './public.controller';
import { FoodPlatformAccount, FoodPlatformStoreMapping, FoodPlatformExternalItem, FoodPlatformItemMapping, FoodOrder } from '../../database/entities';
import { AccountsModule } from '../accounts/accounts.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FoodPlatformAccount, FoodPlatformStoreMapping, FoodPlatformExternalItem, FoodPlatformItemMapping, FoodOrder]),
    AccountsModule,
    ConnectorsModule,
    OrdersModule,
  ],
  controllers: [PublicController],
})
export class PublicModule {}
