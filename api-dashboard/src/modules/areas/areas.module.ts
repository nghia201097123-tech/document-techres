import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { Area, Table } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Area, Table])],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [AreasService],
})
export class AreasModule {}
