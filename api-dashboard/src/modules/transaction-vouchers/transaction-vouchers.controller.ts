import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TransactionVouchersService } from './transaction-vouchers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTransactionVoucherDto, UpdateTransactionVoucherDto } from './dto';
import { TransactionType, VoucherStatus, PaymentType, Brand } from '../../database/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ApiTags('Transaction Vouchers - Phiếu thu chi')
@Controller('transaction-vouchers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionVouchersController {
  constructor(
    private readonly vouchersService: TransactionVouchersService,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phiếu thu chi' })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'transactionType', enum: TransactionType, required: false, description: 'Loại: income (thu) / expense (chi)' })
  @ApiQuery({ name: 'paymentType', enum: PaymentType, required: false, description: 'Phương thức: cash / bank' })
  @ApiQuery({ name: 'status', enum: VoucherStatus, required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Từ ngày (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Đến ngày (YYYY-MM-DD)' })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo số phiếu, người nộp/nhận, lý do' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req,
    @Query('brandId') brandId?: string,
    @Query('branchId') branchId?: string,
    @Query('transactionType') transactionType?: TransactionType,
    @Query('paymentType') paymentType?: PaymentType,
    @Query('status') status?: VoucherStatus,
    @Query('categoryId') categoryId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vouchersService.findAll(req.user.tenantId, {
      brandId: brandId || req.user.brandId,
      branchId,
      transactionType,
      paymentType,
      status,
      categoryId,
      fromDate,
      toDate,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('cash-book')
  @ApiOperation({ summary: 'Sổ quỹ tiền mặt - Cash Book' })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'fromDate', required: true, description: 'Từ ngày (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, description: 'Đến ngày (YYYY-MM-DD)' })
  getCashBook(
    @Request() req,
    @Query('brandId') brandId?: string,
    @Query('branchId') branchId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    if (!fromDate || !toDate) {
      throw new BadRequestException('Vui lòng chọn khoảng thời gian');
    }
    return this.vouchersService.getCashBankReport(req.user.tenantId, {
      brandId: brandId || req.user.brandId,
      branchId,
      paymentType: PaymentType.CASH,
      fromDate,
      toDate,
    });
  }

  @Get('bank-book')
  @ApiOperation({ summary: 'Sổ tiền gửi ngân hàng - Bank Book' })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'fromDate', required: true, description: 'Từ ngày (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, description: 'Đến ngày (YYYY-MM-DD)' })
  getBankBook(
    @Request() req,
    @Query('brandId') brandId?: string,
    @Query('branchId') branchId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    if (!fromDate || !toDate) {
      throw new BadRequestException('Vui lòng chọn khoảng thời gian');
    }
    return this.vouchersService.getCashBankReport(req.user.tenantId, {
      brandId: brandId || req.user.brandId,
      branchId,
      paymentType: PaymentType.BANK,
      fromDate,
      toDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết phiếu' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.vouchersService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo phiếu thu chi mới' })
  async create(@Request() req, @Body() createDto: CreateTransactionVoucherDto) {
    let brandId = req.user.brandId;

    if (!brandId) {
      const firstBrand = await this.brandRepository.findOne({
        where: { tenantId: req.user.tenantId, isActive: true },
        order: { createdAt: 'ASC' },
      });
      if (!firstBrand) {
        throw new BadRequestException('Không tìm thấy thương hiệu. Vui lòng tạo thương hiệu trước.');
      }
      brandId = firstBrand.id;
    }

    return this.vouchersService.create(
      req.user.tenantId,
      brandId,
      req.user.sub,
      createDto,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật phiếu (chỉ áp dụng cho phiếu nháp/chờ duyệt)' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionVoucherDto,
  ) {
    return this.vouchersService.update(req.user.tenantId, id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phiếu (không áp dụng cho phiếu đã duyệt)' })
  delete(@Request() req, @Param('id') id: string) {
    return this.vouchersService.delete(req.user.tenantId, id);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Gửi duyệt phiếu' })
  submitForApproval(@Request() req, @Param('id') id: string) {
    return this.vouchersService.submitForApproval(req.user.tenantId, id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Duyệt phiếu' })
  approve(@Request() req, @Param('id') id: string) {
    return this.vouchersService.approve(req.user.tenantId, id, req.user.sub);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Hủy phiếu' })
  @ApiBody({ schema: { properties: { reason: { type: 'string', description: 'Lý do hủy' } } } })
  cancel(@Request() req, @Param('id') id: string, @Body('reason') reason: string) {
    if (!reason) {
      throw new BadRequestException('Vui lòng nhập lý do hủy');
    }
    return this.vouchersService.cancel(req.user.tenantId, id, reason);
  }
}
