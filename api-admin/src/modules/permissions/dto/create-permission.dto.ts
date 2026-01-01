import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'Xem danh sách công ty' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'companies.read' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  code: string;

  @ApiProperty({ example: 'companies' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  module: string;

  @ApiPropertyOptional({ example: 'Quyền xem danh sách công ty' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
