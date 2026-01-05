import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ArrayMinSize } from 'class-validator';

export class BulkStaffIdsDto {
  @ApiProperty({ description: 'Danh sách ID nhân viên', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  staffIds: string[];
}

export class BulkUpdateDepartmentDto extends BulkStaffIdsDto {
  @ApiProperty({ description: 'ID bộ phận mới' })
  @IsUUID('4')
  departmentId: string;
}

export class BulkUpdateBranchDto extends BulkStaffIdsDto {
  @ApiProperty({ description: 'ID chi nhánh mới' })
  @IsUUID('4')
  branchId: string;
}

export class BulkToggleActiveDto extends BulkStaffIdsDto {
  @ApiProperty({ description: 'Trạng thái mới' })
  @IsBoolean()
  isActive: boolean;
}

export class BulkResetPasswordDto extends BulkStaffIdsDto {
  @ApiPropertyOptional({ description: 'Mật khẩu mới (nếu không cung cấp sẽ tạo mật khẩu tạm)' })
  @IsOptional()
  @IsString()
  newPassword?: string;
}

export class BulkOperationResultDto {
  @ApiProperty({ description: 'Số lượng thành công' })
  success: number;

  @ApiProperty({ description: 'Số lượng thất bại' })
  failed: number;

  @ApiProperty({ description: 'Danh sách lỗi', type: [Object] })
  errors: { staffId: string; message: string }[];

  @ApiPropertyOptional({ description: 'Danh sách mật khẩu mới (cho reset password)', type: [Object] })
  passwords?: { staffId: string; username: string; password: string }[];
}
