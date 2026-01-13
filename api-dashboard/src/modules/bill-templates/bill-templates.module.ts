import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillTemplate, BillPrinterConfig } from '../../database/entities';
import { BillTemplatesService } from './bill-templates.service';
import { BillTemplatesController } from './bill-templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BillTemplate, BillPrinterConfig])],
  controllers: [BillTemplatesController],
  providers: [BillTemplatesService],
  exports: [BillTemplatesService],
})
export class BillTemplatesModule {}
