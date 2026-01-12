import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillTemplate } from '../../database/entities';
import { BillTemplatesService } from './bill-templates.service';
import { BillTemplatesController } from './bill-templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BillTemplate])],
  controllers: [BillTemplatesController],
  providers: [BillTemplatesService],
  exports: [BillTemplatesService],
})
export class BillTemplatesModule {}
