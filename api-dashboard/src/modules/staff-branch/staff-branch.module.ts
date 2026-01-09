import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffBranchController } from './staff-branch.controller';
import { StaffBranchService } from './staff-branch.service';
import { StaffBranch, Staff, Branch, Brand } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([StaffBranch, Staff, Branch, Brand])],
  controllers: [StaffBranchController],
  providers: [StaffBranchService],
  exports: [StaffBranchService],
})
export class StaffBranchModule {}
