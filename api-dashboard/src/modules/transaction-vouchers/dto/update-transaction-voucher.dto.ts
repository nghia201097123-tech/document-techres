import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTransactionVoucherDto } from './create-transaction-voucher.dto';

export class UpdateTransactionVoucherDto extends PartialType(
  OmitType(CreateTransactionVoucherDto, ['transactionType'] as const)
) {}
