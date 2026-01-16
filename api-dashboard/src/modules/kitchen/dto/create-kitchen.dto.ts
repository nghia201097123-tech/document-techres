import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, IsIn, Min, Max, IsBoolean } from 'class-validator';
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

  // ========== TICKET PRINTING CONFIG ==========
  @ApiPropertyOptional({ description: 'Cắt giấy sau khi in phiếu', default: true })
  @IsOptional()
  @IsBoolean()
  ticketCutAfterPrint?: boolean;

  @ApiPropertyOptional({ description: 'In từng món riêng biệt', default: false })
  @IsOptional()
  @IsBoolean()
  ticketPrintItemsSeparately?: boolean;

  @ApiPropertyOptional({ description: 'Số bản in phiếu (1-5)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ticketCopies?: number;

  // ========== LABEL PRINTING CONFIG ==========
  @ApiPropertyOptional({ description: 'In giá trên tem', default: false })
  @IsOptional()
  @IsBoolean()
  labelPrintPrice?: boolean;

  @ApiPropertyOptional({ description: 'In tên cửa hàng trên tem', default: false })
  @IsOptional()
  @IsBoolean()
  labelPrintStoreName?: boolean;

  @ApiPropertyOptional({ description: 'In mã đơn hàng trên tem', default: true })
  @IsOptional()
  @IsBoolean()
  labelPrintOrderNumber?: boolean;

  @ApiPropertyOptional({ description: 'In tên bàn trên tem', default: true })
  @IsOptional()
  @IsBoolean()
  labelPrintTableName?: boolean;

  @ApiPropertyOptional({ description: 'In thời gian trên tem', default: true })
  @IsOptional()
  @IsBoolean()
  labelPrintTime?: boolean;

  @ApiPropertyOptional({ description: 'Tên cửa hàng hiển thị trên tem' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  labelStoreName?: string;

  @ApiPropertyOptional({ description: 'Đảo chiều in tem (180°)', default: false })
  @IsOptional()
  @IsBoolean()
  labelReverse?: boolean;
}
