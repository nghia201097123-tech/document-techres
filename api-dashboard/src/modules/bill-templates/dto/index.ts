import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsUUID, IsNotEmpty } from 'class-validator';
import { BillTemplateType } from '../../../database/entities/bill-template.entity';

export class CreateBillTemplateDto {
  @ApiProperty({ description: 'ID chi nhánh' })
  @IsUUID('4', { message: 'branchId phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'branchId không được để trống' })
  branchId: string;

  @ApiProperty({ description: 'Tên mẫu bill' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: BillTemplateType })
  @IsOptional()
  @IsEnum(BillTemplateType)
  templateType?: BillTemplateType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  // Header
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ description: 'Tên cửa hàng' })
  @IsString()
  storeName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headerText?: string;

  // Content
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showOrderNumber?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTableName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showStaffName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showCustomerName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showDateTime?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFormat?: string;

  // Items
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showItemCode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showItemNote?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showUnitPrice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showQuantity?: boolean;

  // Price
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showSubtotal?: boolean;

  @ApiPropertyOptional({ description: 'Hiển thị giảm giá trên từng món' })
  @IsOptional()
  @IsBoolean()
  showItemDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Hiển thị tổng giảm giá các món' })
  @IsOptional()
  @IsBoolean()
  showTotalItemDiscount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showDiscount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showDiscountPercent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showServiceFee?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showVat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showVatDetails?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPriceBeforeVat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPriceAfterVat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vatLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceBeforeVatLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceAfterVatLabel?: string;

  // Payment
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPaymentMethod?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showReceivedAmount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showChangeAmount?: boolean;

  // Footer
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showQrCode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCodeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCodeContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showBarcode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thankYouMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comebackMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  footerText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showWifiInfo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wifiName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wifiPassword?: string;

  // Style
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  paperWidth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fontSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  separatorChar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doubleSeparatorChar?: string;

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
  numberOfCopies?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateBillTemplateDto extends CreateBillTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
