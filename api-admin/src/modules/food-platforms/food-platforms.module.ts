import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodPlatformAccount } from '../../database/entities/food-platform-account.entity';
import { Branch } from '../../database/entities/branch.entity';
import { FoodPlatformsController } from './food-platforms.controller';
import { FoodPlatformsService } from './food-platforms.service';

@Module({
  imports: [TypeOrmModule.forFeature([FoodPlatformAccount, Branch])],
  controllers: [FoodPlatformsController],
  providers: [FoodPlatformsService],
  exports: [FoodPlatformsService],
})
export class FoodPlatformsModule {}
