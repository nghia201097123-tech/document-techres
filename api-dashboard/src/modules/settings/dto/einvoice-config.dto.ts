import { IsString, IsOptional, IsBoolean, IsEnum, IsObject } from 'class-validator';
import { EInvoiceProvider } from '../../../database/entities/einvoice-config.entity';

export class CreateEInvoiceConfigDto {
  @IsEnum(EInvoiceProvider)
  provider: EInvoiceProvider;

  @IsString()
  taxCode: string;

  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  invoiceTemplate?: string;

  @IsOptional()
  @IsString()
  invoiceSeries?: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;

  @IsOptional()
  @IsString()
  apiUsername?: string;

  @IsOptional()
  @IsString()
  apiPassword?: string;

  @IsOptional()
  @IsString()
  apiToken?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  autoIssue?: boolean;
}

export class UpdateEInvoiceConfigDto {
  @IsOptional()
  @IsEnum(EInvoiceProvider)
  provider?: EInvoiceProvider;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  invoiceTemplate?: string;

  @IsOptional()
  @IsString()
  invoiceSeries?: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;

  @IsOptional()
  @IsString()
  apiUsername?: string;

  @IsOptional()
  @IsString()
  apiPassword?: string;

  @IsOptional()
  @IsString()
  apiToken?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  autoIssue?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
