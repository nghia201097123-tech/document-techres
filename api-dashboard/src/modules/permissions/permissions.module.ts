import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import {
  Permission,
  DepartmentPermission,
  StaffPermission,
  Department,
  Staff,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      DepartmentPermission,
      StaffPermission,
      Department,
      Staff,
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
