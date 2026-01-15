import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { Category, Product, BranchProduct, Area, Table, Staff, Device, Brand, Branch, StaffBranch, SeasonalPrice, SeasonalPriceProduct, Coupon, ToppingGroup, ToppingGroupItem, ProductToppingGroup, ProductNote, ProductNoteAssignment, ComboItem, Kitchen, ProductKitchen, BillTemplate, BillPrinterConfig } from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Product, BranchProduct, Area, Table, Staff, Device, Brand, Branch, StaffBranch, SeasonalPrice, SeasonalPriceProduct, Coupon, ToppingGroup, ToppingGroupItem, ProductToppingGroup, ProductNote, ProductNoteAssignment, ComboItem, Kitchen, ProductKitchen, BillTemplate, BillPrinterConfig]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
