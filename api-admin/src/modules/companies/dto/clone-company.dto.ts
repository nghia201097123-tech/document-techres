import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEmail,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class CloneOptionsDto {
  @ApiProperty({ description: 'Clone thương hiệu', example: true })
  @IsBoolean()
  brands: boolean;

  @ApiProperty({ description: 'Clone chi nhánh', example: true })
  @IsBoolean()
  branches: boolean;

  @ApiProperty({ description: 'Clone sản phẩm', example: false })
  @IsBoolean()
  products: boolean;

  @ApiProperty({ description: 'Clone danh mục', example: false })
  @IsBoolean()
  categories: boolean;

  @ApiProperty({ description: 'Clone nhân viên', example: false })
  @IsBoolean()
  staff: boolean;
}

export class CloneCompanyDto {
  @ApiProperty({
    description: 'ID công ty nguồn',
    example: 'uuid-string',
  })
  @IsUUID()
  @IsNotEmpty()
  sourceCompanyId: string;

  @ApiProperty({
    description: 'Tên công ty mới',
    example: 'Nhà hàng Phở Việt 2',
  })
  @IsString()
  @IsNotEmpty()
  newCompanyName: string;

  @ApiProperty({
    description: 'Tiên định danh mới (viết hoa, không dấu, 3-10 ký tự)',
    example: 'PV2',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{3,10}$/, {
    message: 'Tiên định danh phải từ 3-10 ký tự, viết hoa, không dấu',
  })
  newAlias: string;

  @ApiProperty({
    description: 'Email công ty mới',
    example: 'pv2@restaurant.vn',
  })
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;

  @ApiPropertyOptional({
    description: 'Dùng thử (mặc định false)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isTrial?: boolean;

  @ApiProperty({
    description: 'Các tuỳ chọn clone',
    type: CloneOptionsDto,
  })
  @ValidateNested()
  @Type(() => CloneOptionsDto)
  cloneOptions: CloneOptionsDto;
}
