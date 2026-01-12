import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillPrinterConfig } from '../../database/entities';
import { BillPrinterConfigsService } from './bill-printer-configs.service';
import { BillPrinterConfigsController } from './bill-printer-configs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BillPrinterConfig])],
  controllers: [BillPrinterConfigsController],
  providers: [BillPrinterConfigsService],
  exports: [BillPrinterConfigsService],
})
export class BillPrinterConfigsModule {}
