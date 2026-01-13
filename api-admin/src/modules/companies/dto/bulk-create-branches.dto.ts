import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCompanyWizardDto } from './create-company-wizard.dto';

export class BulkBranchDto {
  @ApiProperty({ description: 'Tên chi nhánh', example: 'Chi nhánh Quận 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Địa chỉ chi tiết', example: '123 Nguyễn Huệ' })
  @IsString()
  @IsOptional()
  addressDetail?: string;

  @ApiPropertyOptional({ description: 'Mã tỉnh/thành', example: '79' })
  @IsString()
  @IsOptional()
  provinceCode?: string;

  @ApiPropertyOptional({ description: 'Mã phường/xã', example: '26743' })
  @IsString()
  @IsOptional()
  wardCode?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại', example: '0901234567' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreateCompanyWithBranchesDto extends CreateCompanyWizardDto {
  @ApiPropertyOptional({
    description: 'Danh sách chi nhánh bổ sung (ngoài chi nhánh chính)',
    type: [BulkBranchDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkBranchDto)
  @IsOptional()
  additionalBranches?: BulkBranchDto[];
}

export class BulkCreateBranchesResponseDto {
  @ApiProperty({ description: 'Danh sách chi nhánh đã tạo' })
  branches: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}
