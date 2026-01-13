import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AssignBranchDto {
  @ApiProperty({ description: 'ID chi nhánh' })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({ description: 'Đánh dấu là chi nhánh mặc định' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class BulkAssignBranchesDto {
  @ApiProperty({ description: 'Danh sách ID chi nhánh được gán', type: [String] })
  @IsArray()
  @IsString({ each: true })
  branchIds: string[];

  @ApiPropertyOptional({ description: 'ID chi nhánh mặc định' })
  @IsUUID()
  @IsOptional()
  defaultBranchId?: string;
}

export class BulkAssignToMultipleStaffDto {
  @ApiProperty({ description: 'Danh sách ID nhân viên', type: [String] })
  @IsArray()
  @IsString({ each: true })
  staffIds: string[];

  @ApiProperty({ description: 'Danh sách ID chi nhánh được gán', type: [String] })
  @IsArray()
  @IsString({ each: true })
  branchIds: string[];

  @ApiPropertyOptional({ description: 'ID chi nhánh mặc định' })
  @IsUUID()
  @IsOptional()
  defaultBranchId?: string;
}

export class StaffBranchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  staffId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  branchName: string;

  @ApiProperty()
  brandId: string;

  @ApiProperty()
  brandName: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  assignedAt: Date;
}
