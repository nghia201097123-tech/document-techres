import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, IsIn, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KitchenPrintMode, KitchenType } from '../../../database/entities/kitchen.entity';

export class CreateKitchenDto {
  @ApiProperty({ example: 'Bếp chính' })
  @IsNotEmpty({ message: 'Tên bếp không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'kitchen',
    enum: Object.values(KitchenType),
    description: 'Loại bếp: kitchen, bar, grill, dessert, seafood, hotpot, bakery, other',
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(KitchenType))
  kitchenType?: string;

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

  @ApiPropertyOptional({ example: 80, description: 'Khổ giấy in (mm): 58, 80, 110, 112' })
  @IsOptional()
  @IsInt()
  @Min(32)
  @Max(200)
  paperWidth?: number;

  @ApiPropertyOptional({
    example: 'TICKET',
    enum: Object.values(KitchenPrintMode),
    description: 'Chế độ in: TICKET (phiếu bếp), LABEL (tem), BOTH (cả hai)',
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(KitchenPrintMode))
  printMode?: string;

  @ApiPropertyOptional({ example: 'Bếp nấu món chính' })
  @IsOptional()
  @IsString()
  description?: string;
}
