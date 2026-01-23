import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodPlatformAccount } from '../../database/entities';
import { FoodPlatformsController } from './food-platforms.controller';
import { FoodPlatformsService } from './food-platforms.service';

@Module({
  imports: [TypeOrmModule.forFeature([FoodPlatformAccount])],
  controllers: [FoodPlatformsController],
  providers: [FoodPlatformsService],
  exports: [FoodPlatformsService],
})
export class FoodPlatformsModule {}
