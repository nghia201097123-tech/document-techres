import { ApiProperty } from '@nestjs/swagger';

export class PayOSWebhookDataDto {
  @ApiProperty({ description: 'Order code' })
  orderCode: number;

  @ApiProperty({ description: 'Payment amount' })
  amount: number;

  @ApiProperty({ description: 'Payment description' })
  description: string;

  @ApiProperty({ description: 'Account number' })
  accountNumber: string;

  @ApiProperty({ description: 'Transaction reference' })
  reference: string;

  @ApiProperty({ description: 'Transaction date time', example: '2023-02-04 18:25:00' })
  transactionDateTime: string;

  @ApiProperty({ description: 'Currency', example: 'VND' })
  currency: string;

  @ApiProperty({ description: 'Payment link ID' })
  paymentLinkId: string;

  @ApiProperty({ description: 'Response code', example: '00' })
  code: string;

  @ApiProperty({ description: 'Response description' })
  desc: string;

  @ApiProperty({ description: 'Counter account bank ID' })
  counterAccountBankId?: string;

  @ApiProperty({ description: 'Counter account bank name' })
  counterAccountBankName?: string;

  @ApiProperty({ description: 'Counter account name' })
  counterAccountName?: string;

  @ApiProperty({ description: 'Counter account number' })
  counterAccountNumber?: string;

  @ApiProperty({ description: 'Virtual account name' })
  virtualAccountName?: string;

  @ApiProperty({ description: 'Virtual account number' })
  virtualAccountNumber?: string;
}

export class PayOSWebhookDto {
  @ApiProperty({ description: 'Response code', example: '00' })
  code: string;

  @ApiProperty({ description: 'Response description', example: 'success' })
  desc: string;

  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Webhook data', type: PayOSWebhookDataDto })
  data: PayOSWebhookDataDto;

  @ApiProperty({ description: 'Signature for verification' })
  signature: string;
}
