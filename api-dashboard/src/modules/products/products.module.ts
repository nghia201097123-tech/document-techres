import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product,
  ToppingGroup,
  ToppingGroupItem,
  ProductToppingGroup,
  ProductNote,
  ProductNoteAssignment,
  ComboItem,
  Category,
  Unit,
  SeasonalPrice,
  SeasonalPriceProduct,
} from '../../database/entities';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ToppingGroup,
      ToppingGroupItem,
      ProductToppingGroup,
      ProductNote,
      ProductNoteAssignment,
      ComboItem,
      Category,
      Unit,
      SeasonalPrice,
      SeasonalPriceProduct,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
