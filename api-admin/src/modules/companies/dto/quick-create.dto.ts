import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

export class QuickCreateDto {
  @ApiProperty({
    description: 'Tên công ty',
    example: 'Nhà hàng Phở Việt',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    description: 'Tiên định danh (mã công ty)',
    example: 'NHPV',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Tiên định danh phải có ít nhất 3 ký tự' })
  @MaxLength(10, { message: 'Tiên định danh không được quá 10 ký tự' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Tiên định danh chỉ chứa chữ in hoa và số' })
  alias: string;

  @ApiPropertyOptional({
    description: 'Dùng thử (mặc định false)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isTrial?: boolean;
}
