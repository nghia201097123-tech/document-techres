import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiPropertyOptional({ description: 'Brand ID - lấy từ token nếu không truyền' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty({ example: 'Phần' })
  @IsNotEmpty({ message: 'Tên đơn vị không được để trống' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Đơn vị tính theo phần ăn' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
