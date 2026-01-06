import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchProduct, Branch, Product, SeasonalPrice, SeasonalPriceProduct } from '../../database/entities';
import { BranchProductsService } from './branch-products.service';
import { BranchProductsController } from './branch-products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BranchProduct, Branch, Product, SeasonalPrice, SeasonalPriceProduct]),
  ],
  controllers: [BranchProductsController],
  providers: [BranchProductsService],
  exports: [BranchProductsService],
})
export class BranchProductsModule {}
