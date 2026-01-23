import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FoodPlatformStoreMapping,
  FoodPlatformAccount,
} from '../../database/entities';
import { ConnectorsModule } from '../connectors/connectors.module';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FoodPlatformStoreMapping, FoodPlatformAccount]),
    ConnectorsModule,
  ],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
