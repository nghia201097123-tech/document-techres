import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Order ID from CCB app', example: 'ORD-20250121-001' })
  orderId: string;

  @ApiProperty({ description: 'Order code (numeric)', example: 1705812345678 })
  orderCode: number;

  @ApiProperty({ description: 'Payment amount in VND', example: 150000 })
  amount: number;

  @ApiProperty({ description: 'Order description', example: 'Thanh toan don hang #ORD-20250121-001' })
  description: string;

  @ApiProperty({ description: 'Branch ID', example: 'branch-123' })
  branchId: string;

  @ApiProperty({ description: 'Device ID for FCM notification', example: 'device-abc-123' })
  deviceId: string;

  @ApiProperty({ description: 'FCM token for push notification', example: 'fcm-token-xyz' })
  fcmToken: string;

  @ApiProperty({ description: 'Table name (optional)', example: 'Ban 5', required: false })
  tableName?: string;

  @ApiProperty({ description: 'Customer name (optional)', example: 'Nguyen Van A', required: false })
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
  orderCode: number;

  @ApiProperty({ description: 'Cancellation reason (optional)', example: 'Customer cancelled' })
  reason?: string;
}

export class GetPaymentStatusDto {
  @ApiProperty({ description: 'Order code to check', example: 1705812345678 })
  orderCode: number;
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
