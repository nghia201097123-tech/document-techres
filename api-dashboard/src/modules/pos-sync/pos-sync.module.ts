import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product,
  Category,
  Area,
  Table,
  Staff,
  Kitchen,
  ProductKitchen,
  Branch,
  ToppingGroup,
  ToppingGroupItem,
  ProductToppingGroup,
  ProductNote,
  ProductNoteAssignment,
  ComboItem,
  SeasonalPrice,
  SeasonalPriceProduct,
  Coupon,
  BillTemplate,
  BillPrinterConfig,
} from '../../database/entities';
import { PosSyncService } from './pos-sync.service';
import { PosSyncController } from './pos-sync.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      Area,
      Table,
      Staff,
      Kitchen,
      ProductKitchen,
      Branch,
      ToppingGroup,
      ToppingGroupItem,
      ProductToppingGroup,
      ProductNote,
      ProductNoteAssignment,
      ComboItem,
      SeasonalPrice,
      SeasonalPriceProduct,
      Coupon,
      BillTemplate,
      BillPrinterConfig,
    ]),
  ],
  controllers: [PosSyncController],
  providers: [PosSyncService],
  exports: [PosSyncService],
})
export class PosSyncModule {}
