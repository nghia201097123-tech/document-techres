import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Bếp chính' })
  @IsNotEmpty({ message: 'Tên bộ phận không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Bộ phận nấu ăn chính' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ID bộ phận cha (nếu có)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
