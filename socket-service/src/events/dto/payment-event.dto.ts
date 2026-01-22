import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum PaymentStatus {
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PROCESSING = 'PROCESSING',
}

export class PaymentEventDto {
  @ApiProperty({ description: 'Order code from PayOS' })
  @IsNumber()
  orderCode: number;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Transaction reference' })
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional({ description: 'Transaction date time' })
  @IsOptional()
  @IsString()
  transactionDateTime?: string;

  @ApiPropertyOptional({ description: 'Counter account bank name' })
  @IsOptional()
  @IsString()
  counterAccountBankName?: string;

  @ApiPropertyOptional({ description: 'Counter account number' })
  @IsOptional()
  @IsString()
  counterAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Counter account name' })
  @IsOptional()
  @IsString()
  counterAccountName?: string;

  @ApiPropertyOptional({ description: 'Branch ID for targeting specific branch' })
  @IsOptional()
  @IsString()
  branchId?: string;
}

export class CustomEventDto {
  @ApiProperty({ description: 'Event name' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Event data' })
  data: any;

  @ApiPropertyOptional({ description: 'Branch ID for targeting specific branch' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Order code for targeting specific payment room' })
  @IsOptional()
  @IsNumber()
  orderCode?: number;
}
