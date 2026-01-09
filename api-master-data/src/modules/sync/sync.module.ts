import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { Category, Product, Area, Table, Staff, Device, Brand, Branch, StaffBranch } from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Product, Area, Table, Staff, Device, Brand, Branch, StaffBranch]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
