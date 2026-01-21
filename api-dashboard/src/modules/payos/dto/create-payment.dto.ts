import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Order ID from CCB app', example: 'ORD-20250121-001' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Order code (numeric)', example: 1705812345678 })
  @IsNumber()
  orderCode: number;

  @ApiProperty({ description: 'Payment amount in VND', example: 150000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ description: 'Order description', example: 'Thanh toan don hang #ORD-20250121-001' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Branch ID for Socket.IO room', example: 'branch-123' })
  @IsString()
  branchId: string;

  @ApiProperty({ description: 'Device ID', example: 'device-abc-123' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Table name (optional)', example: 'Ban 5', required: false })
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiProperty({ description: 'Customer name (optional)', example: 'Nguyen Van A', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;
}

export class CreatePaymentResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'PayOS payment link ID' })
  paymentLinkId: string;

  @ApiProperty({ description: 'QR code URL for payment' })
  qrCode: string;

  @ApiProperty({ description: 'Checkout URL' })
  checkoutUrl: string;

  @ApiProperty({ description: 'Order code' })
  orderCode: number;

  @ApiProperty({ description: 'Payment amount' })
  amount: number;
}

export class CancelPaymentDto {
  @ApiProperty({ description: 'Order code to cancel', example: 1705812345678 })
  @IsNumber()
  orderCode: number;

  @ApiProperty({ description: 'Cancellation reason (optional)', example: 'Customer cancelled' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ description: 'Order code' })
  orderCode: number;

  @ApiProperty({ description: 'Payment status', enum: ['PENDING', 'PROCESSING', 'PAID', 'CANCELLED', 'EXPIRED'] })
  status: string;

  @ApiProperty({ description: 'Payment amount' })
  amount: number;

  @ApiProperty({ description: 'Amount paid (if paid)' })
  amountPaid: number;

  @ApiProperty({ description: 'Transaction reference (if paid)' })
  transactionRef?: string;

  @ApiProperty({ description: 'Transaction date time (if paid)' })
  transactionDateTime?: string;
}
