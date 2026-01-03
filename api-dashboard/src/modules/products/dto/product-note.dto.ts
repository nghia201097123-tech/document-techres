import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductNoteDto {
  @ApiProperty({ example: 'Không hành' })
  @IsNotEmpty({ message: 'Tên ghi chú không được để trống' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Khách không muốn hành' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateProductNoteDto {
  @ApiPropertyOptional({ example: 'Không hành' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Khách không muốn hành' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class AssignNotesToProductDto {
  @ApiProperty({ description: 'Danh sách ID ghi chú' })
  @IsArray()
  @IsString({ each: true })
  noteIds: string[];
}
