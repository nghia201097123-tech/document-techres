import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class WebhookTransactionDto {
  @ApiProperty({ description: 'Bank account number' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Transaction description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Reference number' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Transaction date time' })
  @IsString()
  transactionDateTime: string;

  @ApiProperty({ description: 'Virtual account number' })
  @IsOptional()
  @IsString()
  virtualAccountNumber?: string;

  @ApiProperty({ description: 'Virtual account name' })
  @IsOptional()
  @IsString()
  virtualAccountName?: string;

  @ApiProperty({ description: 'Counter account bank ID' })
  @IsOptional()
  @IsString()
  counterAccountBankId?: string;

  @ApiProperty({ description: 'Counter account bank name' })
  @IsOptional()
  @IsString()
  counterAccountBankName?: string;

  @ApiProperty({ description: 'Counter account number' })
  @IsOptional()
  @IsString()
  counterAccountNumber?: string;

  @ApiProperty({ description: 'Counter account name' })
  @IsOptional()
  @IsString()
  counterAccountName?: string;
}

export class WebhookDataDto {
  @ApiProperty({ description: 'Order code' })
  @IsNumber()
  orderCode: number;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Account number' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ description: 'Reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Transaction date time' })
  @IsString()
  transactionDateTime: string;

  @ApiProperty({ description: 'Currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Payment link ID' })
  @IsOptional()
  @IsString()
  paymentLinkId?: string;

  @ApiProperty({ description: 'Status code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Status description' })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiProperty({ description: 'Counter account bank ID' })
  @IsOptional()
  @IsString()
  counterAccountBankId?: string;

  @ApiProperty({ description: 'Counter account bank name' })
  @IsOptional()
  @IsString()
  counterAccountBankName?: string;

  @ApiProperty({ description: 'Counter account number' })
  @IsOptional()
  @IsString()
  counterAccountNumber?: string;

  @ApiProperty({ description: 'Counter account name' })
  @IsOptional()
  @IsString()
  counterAccountName?: string;

  @ApiProperty({ description: 'Virtual account number' })
  @IsOptional()
  @IsString()
  virtualAccountNumber?: string;

  @ApiProperty({ description: 'Virtual account name' })
  @IsOptional()
  @IsString()
  virtualAccountName?: string;
}

export class PayOSWebhookDto {
  @ApiProperty({ description: 'Webhook code (00 = success)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Webhook description' })
  @IsString()
  desc: string;

  @ApiProperty({ description: 'Success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Webhook data' })
  @ValidateNested()
  @Type(() => WebhookDataDto)
  data: WebhookDataDto;

  @ApiProperty({ description: 'Webhook signature' })
  @IsString()
  signature: string;
}
