import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { Company, Brand, Branch, Department, Staff } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Brand, Branch, Department, Staff])],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
