import { IsNotEmpty, IsOptional, IsString, MaxLength, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ example: 'Bếp nấu món chính' })
  @IsOptional()
  @IsString()
  description?: string;
}
