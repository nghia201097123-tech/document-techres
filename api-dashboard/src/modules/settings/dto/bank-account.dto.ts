import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  bankCode: string;

  @IsString()
  bankName: string;

  @IsString()
  accountNumber: string;

  @IsString()
  accountName: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  bankBin?: string;

  @IsOptional()
  @IsString()
  transferTemplate?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  apiSecret?: string;

  // Payment Partner integration (e.g., PayOS)
  @IsOptional()
  @IsString()
  paymentPartner?: string;

  @IsOptional()
  @IsString()
  payosClientId?: string;

  @IsOptional()
  @IsString()
  payosApiKey?: string;

  @IsOptional()
  @IsString()
  payosChecksumKey?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  bankBin?: string;

  @IsOptional()
  @IsString()
  transferTemplate?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  apiSecret?: string;

  // Payment Partner integration (e.g., PayOS)
  @IsOptional()
  @IsString()
  paymentPartner?: string;

  @IsOptional()
  @IsString()
  payosClientId?: string;

  @IsOptional()
  @IsString()
  payosApiKey?: string;

  @IsOptional()
  @IsString()
  payosChecksumKey?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
