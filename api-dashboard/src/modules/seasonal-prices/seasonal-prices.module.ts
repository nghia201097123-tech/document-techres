import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonalPrice } from '../../database/entities';
import { SeasonalPricesService } from './seasonal-prices.service';
import { SeasonalPricesController } from './seasonal-prices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SeasonalPrice])],
  controllers: [SeasonalPricesController],
  providers: [SeasonalPricesService],
  exports: [SeasonalPricesService],
})
export class SeasonalPricesModule {}
