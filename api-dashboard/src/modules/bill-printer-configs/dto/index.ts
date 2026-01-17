import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { PrinterConnectionType } from '../../../database/entities/bill-printer-config.entity';

export class CreateBillPrinterConfigDto {
  @ApiProperty({ description: 'ID chi nhánh' })
  @IsString()
  branchId: string;

  @ApiProperty({ description: 'Tên máy in' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PrinterConnectionType })
  @IsOptional()
  @IsEnum(PrinterConnectionType)
  connectionType?: PrinterConnectionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  printerIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  printerPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  printerMac?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  printerUsbPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  paperWidth?: number;

  @ApiPropertyOptional({ description: 'Cỡ chữ: extra_small, small, normal, large, extra_large' })
  @IsOptional()
  @IsString()
  fontSize?: string;

  @ApiPropertyOptional({ description: 'Khoảng cách dòng (0.3-1.0)' })
  @IsOptional()
  @IsNumber()
  lineSpacing?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPrintOnPayment?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  printPreview?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  numberOfCopies?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cutPaper?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  openCashDrawer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  beepAfterPrint?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  retryDelayMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  connectionTimeoutMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateBillPrinterConfigDto extends CreateBillPrinterConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
