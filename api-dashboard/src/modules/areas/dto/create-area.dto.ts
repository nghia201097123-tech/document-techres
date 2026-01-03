import { IsNotEmpty, IsOptional, IsString, IsInt, Min, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuickTableDto {
  @ApiProperty({ example: 'Bàn 1' })
  @IsNotEmpty({ message: 'Tên bàn không được để trống' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 4, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class CreateAreaDto {
  @ApiProperty({ example: 'Tầng 1' })
  @IsNotEmpty({ message: 'Tên khu vực không được để trống' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Khu vực tầng 1 - Sảnh chính' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Danh sách bàn tạo nhanh', type: [QuickTableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickTableDto)
  tables?: QuickTableDto[];
}
