import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrintMode } from '../../../database/entities/kitchen.entity';

export class CreateKitchenDto {
  @ApiProperty({ example: 'Bếp chính' })
  @IsNotEmpty({ message: 'Tên bếp không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Kitchen_01' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  printerName?: string;

  @ApiPropertyOptional({ example: '192.168.1.101' })
  @IsOptional()
  @IsString()
  printerIp?: string;

  @ApiPropertyOptional({ example: 9100, description: 'Cổng máy in (mặc định: 9100)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  printerPort?: number;

  @ApiPropertyOptional({ example: '80mm', description: 'Kích thước giấy in (VD: 58mm, 80mm, A4...)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paperSize?: string;

  @ApiPropertyOptional({ example: 'list', enum: PrintMode, description: 'Chế độ in: individual (từng món) hoặc list (danh sách)' })
  @IsOptional()
  @IsEnum(PrintMode)
  printMode?: PrintMode;

  @ApiPropertyOptional({ example: 'Bếp nấu món chính' })
  @IsOptional()
  @IsString()
  description?: string;
}
