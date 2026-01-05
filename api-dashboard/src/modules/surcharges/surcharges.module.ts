import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Surcharge } from '../../database/entities';
import { SurchargesService } from './surcharges.service';
import { SurchargesController } from './surcharges.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Surcharge])],
  controllers: [SurchargesController],
  providers: [SurchargesService],
  exports: [SurchargesService],
})
export class SurchargesModule {}
