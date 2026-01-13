import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
  IsDateString,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../../database/entities/transaction-category.entity';
import { PaymentType, VoucherStatus } from '../../../database/entities/transaction-voucher.entity';

export class CreateTransactionVoucherDto {
  @ApiPropertyOptional({ description: 'ID chi nhánh (mặc định lấy từ user)' })
  @IsOptional()
  @IsUUID('4', { message: 'branchId phải là UUID hợp lệ' })
  branchId?: string;

  @ApiProperty({ enum: TransactionType, example: 'income', description: 'Loại phiếu: thu (income) hoặc chi (expense)' })
  @IsNotEmpty({ message: 'Loại giao dịch không được để trống' })
  @IsEnum(TransactionType, { message: 'Loại giao dịch phải là income hoặc expense' })
  transactionType: TransactionType;

  @ApiProperty({ example: '2026-01-07', description: 'Ngày lập phiếu (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Ngày lập phiếu không được để trống' })
  @IsDateString({}, { message: 'Ngày lập phiếu không hợp lệ' })
  voucherDate: string;

  @ApiPropertyOptional({ description: 'ID danh mục thu chi' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId phải là UUID hợp lệ' })
  categoryId?: string;

  @ApiProperty({ example: 1000000, description: 'Số tiền (VNĐ)' })
  @IsNotEmpty({ message: 'Số tiền không được để trống' })
  @IsNumber({}, { message: 'Số tiền phải là số' })
  @Min(0, { message: 'Số tiền phải >= 0' })
  amount: number;

  @ApiProperty({ enum: PaymentType, example: 'cash', description: 'Phương thức: tiền mặt (cash) hoặc chuyển khoản (bank)' })
  @IsNotEmpty({ message: 'Phương thức thanh toán không được để trống' })
  @IsEnum(PaymentType, { message: 'Phương thức phải là cash hoặc bank' })
  paymentType: PaymentType;

  @ApiPropertyOptional({ description: 'ID phương thức thanh toán' })
  @IsOptional()
  @IsUUID('4', { message: 'paymentMethodId phải là UUID hợp lệ' })
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'ID tài khoản ngân hàng (nếu chuyển khoản)' })
  @IsOptional()
  @IsUUID('4', { message: 'bankAccountId phải là UUID hợp lệ' })
  bankAccountId?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', description: 'Người nộp/nhận tiền' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  counterpartyName?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh, Q7', description: 'Địa chỉ đối tác' })
  @IsOptional()
  @IsString()
  counterpartyAddress?: string;

  @ApiPropertyOptional({ example: '0123456789', description: 'Mã số thuế đối tác' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  counterpartyTaxCode?: string;

  @ApiProperty({ example: 'Thu tiền bán hàng ngày 07/01/2026', description: 'Lý do thu/chi' })
  @IsNotEmpty({ message: 'Lý do không được để trống' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Ghi chú bổ sung' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách URL file đính kèm' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({ enum: VoucherStatus, default: 'draft', description: 'Trạng thái phiếu' })
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;

  @ApiPropertyOptional({ example: 'ORD-20260107-001', description: 'Mã tham chiếu (đơn hàng, hóa đơn...)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceCode?: string;

  @ApiPropertyOptional({ example: 'order', description: 'Loại tham chiếu (order, invoice, purchase...)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;
}
