import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDepartmentPermissionsDto {
  @ApiProperty({ description: 'ID bộ phận' })
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;

  @ApiProperty({ description: 'Danh sách ID quyền', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

export class AssignStaffPermissionsDto {
  @ApiProperty({ description: 'ID nhân viên' })
  @IsNotEmpty()
  @IsUUID()
  staffId: string;

  @ApiProperty({ description: 'Danh sách ID quyền', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
