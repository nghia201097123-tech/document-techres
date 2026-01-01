import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsController, PermissionGroupsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { Permission, PermissionGroup } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, PermissionGroup])],
  controllers: [PermissionsController, PermissionGroupsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
