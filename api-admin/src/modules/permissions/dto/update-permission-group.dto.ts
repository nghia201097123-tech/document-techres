import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreatePermissionGroupDto } from './create-permission-group.dto';

export class UpdatePermissionGroupDto extends PartialType(CreatePermissionGroupDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
