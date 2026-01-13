import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonalPrice, SeasonalPriceProduct, Product } from '../../database/entities';
import { SeasonalPricesService } from './seasonal-prices.service';
import { SeasonalPricesController } from './seasonal-prices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SeasonalPrice, SeasonalPriceProduct, Product])],
  controllers: [SeasonalPricesController],
  providers: [SeasonalPricesService],
  exports: [SeasonalPricesService],
})
export class SeasonalPricesModule {}
