import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Staff, Department, Branch, Province, Ward } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Staff, Department, Branch, Province, Ward])],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
