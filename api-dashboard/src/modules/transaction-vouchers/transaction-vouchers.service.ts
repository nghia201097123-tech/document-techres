import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import {
  TransactionVoucher,
  VoucherStatus,
  PaymentType,
  TransactionType,
  Brand,
  Branch,
  Staff,
} from '../../database/entities';
import { CreateTransactionVoucherDto, UpdateTransactionVoucherDto } from './dto';

@Injectable()
export class TransactionVouchersService {
  constructor(
    @InjectRepository(TransactionVoucher)
    private readonly voucherRepository: Repository<TransactionVoucher>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  /**
   * Tạo số phiếu tự động
   * Format: PT-YYYYMMDD-XXXX (Phiếu thu) hoặc PC-YYYYMMDD-XXXX (Phiếu chi)
   */
  private async generateVoucherNumber(
    tenantId: string,
    transactionType: TransactionType,
    voucherDate: Date,
  ): Promise<string> {
    const prefix = transactionType === TransactionType.INCOME ? 'PT' : 'PC';
    const dateStr = voucherDate.toISOString().slice(0, 10).replace(/-/g, '');

    // Tìm số phiếu lớn nhất trong ngày
    const lastVoucher = await this.voucherRepository
      .createQueryBuilder('v')
      .where('v.tenantId = :tenantId', { tenantId })
      .andWhere('v.voucherNumber LIKE :pattern', { pattern: `${prefix}-${dateStr}-%` })
      .orderBy('v.voucherNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastVoucher) {
      const lastSequence = parseInt(lastVoucher.voucherNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Lấy danh sách phiếu thu chi với filter và phân trang
   */
  async findAll(
    tenantId: string,
    options?: {
      brandId?: string;
      branchId?: string;
      transactionType?: TransactionType;
      paymentType?: PaymentType;
      status?: VoucherStatus;
      categoryId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      brandId,
      branchId,
      transactionType,
      paymentType,
      status,
      categoryId,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20,
    } = options || {};

    let queryBuilder = this.voucherRepository
      .createQueryBuilder('voucher')
      .leftJoinAndSelect('voucher.category', 'category')
      .leftJoinAndSelect('voucher.branch', 'branch')
      .leftJoinAndSelect('voucher.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('voucher.bankAccount', 'bankAccount')
      .leftJoinAndSelect('voucher.createdBy', 'createdBy')
      .leftJoinAndSelect('voucher.approvedBy', 'approvedBy')
      .where('voucher.tenantId = :tenantId', { tenantId });

    if (brandId) {
      queryBuilder = queryBuilder.andWhere('voucher.brandId = :brandId', { brandId });
    }

    if (branchId) {
      queryBuilder = queryBuilder.andWhere('voucher.branchId = :branchId', { branchId });
    }

    if (transactionType) {
      queryBuilder = queryBuilder.andWhere('voucher.transactionType = :transactionType', { transactionType });
    }

    if (paymentType) {
      queryBuilder = queryBuilder.andWhere('voucher.paymentType = :paymentType', { paymentType });
    }

    if (status) {
      queryBuilder = queryBuilder.andWhere('voucher.status = :status', { status });
    }

    if (categoryId) {
      queryBuilder = queryBuilder.andWhere('voucher.categoryId = :categoryId', { categoryId });
    }

    if (fromDate) {
      queryBuilder = queryBuilder.andWhere('voucher.voucherDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder = queryBuilder.andWhere('voucher.voucherDate <= :toDate', { toDate });
    }

    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(voucher.voucherNumber ILIKE :search OR voucher.counterpartyName ILIKE :search OR voucher.reason ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();

    const data = await queryBuilder
      .orderBy('voucher.voucherDate', 'DESC')
      .addOrderBy('voucher.voucherNumber', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Tính tổng thu, chi
    const summaryBuilder = this.voucherRepository
      .createQueryBuilder('voucher')
      .select('voucher.transactionType', 'type')
      .addSelect('SUM(voucher.amount)', 'total')
      .where('voucher.tenantId = :tenantId', { tenantId })
      .andWhere('voucher.status = :status', { status: VoucherStatus.APPROVED });

    if (brandId) {
      summaryBuilder.andWhere('voucher.brandId = :brandId', { brandId });
    }
    if (branchId) {
      summaryBuilder.andWhere('voucher.branchId = :branchId', { branchId });
    }
    if (fromDate) {
      summaryBuilder.andWhere('voucher.voucherDate >= :fromDate', { fromDate });
    }
    if (toDate) {
      summaryBuilder.andWhere('voucher.voucherDate <= :toDate', { toDate });
    }

    const summary = await summaryBuilder.groupBy('voucher.transactionType').getRawMany();

    const totalIncome = summary.find(s => s.type === TransactionType.INCOME)?.total || 0;
    const totalExpense = summary.find(s => s.type === TransactionType.EXPENSE)?.total || 0;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalIncome: parseFloat(totalIncome),
        totalExpense: parseFloat(totalExpense),
        balance: parseFloat(totalIncome) - parseFloat(totalExpense),
      },
    };
  }

  /**
   * Lấy chi tiết phiếu
   */
  async findOne(tenantId: string, id: string) {
    const voucher = await this.voucherRepository.findOne({
      where: { tenantId, id },
      relations: ['category', 'branch', 'paymentMethod', 'bankAccount', 'createdBy', 'approvedBy'],
    });

    if (!voucher) {
      throw new NotFoundException('Không tìm thấy phiếu thu chi');
    }

    return voucher;
  }

  /**
   * Tạo phiếu thu chi mới
   */
  async create(
    tenantId: string,
    brandId: string,
    userId: string,
    createDto: CreateTransactionVoucherDto,
  ) {
    // Xác định branchId
    let branchId = createDto.branchId;
    if (!branchId) {
      const firstBranch = await this.branchRepository.findOne({
        where: { tenantId, brandId, isActive: true },
        order: { createdAt: 'ASC' },
      });
      if (!firstBranch) {
        throw new BadRequestException('Không tìm thấy chi nhánh. Vui lòng chọn chi nhánh.');
      }
      branchId = firstBranch.id;
    }

    // Kiểm tra staff tồn tại (userId từ JWT có thể không tồn tại trong bảng staff local)
    let createdById: string | null = null;
    if (userId) {
      const staff = await this.staffRepository.findOne({ where: { id: userId } });
      if (staff) {
        createdById = userId;
      }
    }

    // Tạo số phiếu
    const voucherDate = new Date(createDto.voucherDate);
    const voucherNumber = await this.generateVoucherNumber(
      tenantId,
      createDto.transactionType,
      voucherDate,
    );

    const voucher = this.voucherRepository.create({
      ...createDto,
      tenantId,
      brandId,
      branchId,
      voucherNumber,
      voucherDate,
      createdById,
      status: createDto.status || VoucherStatus.DRAFT,
    });

    return this.voucherRepository.save(voucher);
  }

  /**
   * Cập nhật phiếu
   */
  async update(tenantId: string, id: string, updateDto: UpdateTransactionVoucherDto) {
    const voucher = await this.findOne(tenantId, id);

    // Không cho phép sửa phiếu đã duyệt hoặc đã hủy
    if (voucher.status === VoucherStatus.APPROVED) {
      throw new BadRequestException('Không thể sửa phiếu đã duyệt');
    }
    if (voucher.status === VoucherStatus.CANCELLED) {
      throw new BadRequestException('Không thể sửa phiếu đã hủy');
    }

    // Cập nhật ngày nếu thay đổi
    if (updateDto.voucherDate) {
      (updateDto as any).voucherDate = new Date(updateDto.voucherDate);
    }

    Object.assign(voucher, updateDto);
    return this.voucherRepository.save(voucher);
  }

  /**
   * Xóa phiếu
   */
  async delete(tenantId: string, id: string) {
    const voucher = await this.findOne(tenantId, id);

    // Không cho phép xóa phiếu đã duyệt
    if (voucher.status === VoucherStatus.APPROVED) {
      throw new BadRequestException('Không thể xóa phiếu đã duyệt. Vui lòng hủy phiếu trước.');
    }

    await this.voucherRepository.remove(voucher);
    return { message: 'Đã xóa phiếu thu chi' };
  }

  /**
   * Duyệt phiếu
   */
  async approve(tenantId: string, id: string, approverId: string) {
    const voucher = await this.findOne(tenantId, id);

    if (voucher.status === VoucherStatus.APPROVED) {
      throw new BadRequestException('Phiếu đã được duyệt');
    }
    if (voucher.status === VoucherStatus.CANCELLED) {
      throw new BadRequestException('Không thể duyệt phiếu đã hủy');
    }

    // Kiểm tra staff tồn tại
    let approvedById: string | null = null;
    if (approverId) {
      const staff = await this.staffRepository.findOne({ where: { id: approverId } });
      if (staff) {
        approvedById = approverId;
      }
    }

    voucher.status = VoucherStatus.APPROVED;
    voucher.approvedById = approvedById;
    voucher.approvedAt = new Date();

    return this.voucherRepository.save(voucher);
  }

  /**
   * Hủy phiếu
   */
  async cancel(tenantId: string, id: string, reason: string) {
    const voucher = await this.findOne(tenantId, id);

    if (voucher.status === VoucherStatus.CANCELLED) {
      throw new BadRequestException('Phiếu đã bị hủy');
    }

    voucher.status = VoucherStatus.CANCELLED;
    voucher.cancelledReason = reason;

    return this.voucherRepository.save(voucher);
  }

  /**
   * Gửi duyệt
   */
  async submitForApproval(tenantId: string, id: string) {
    const voucher = await this.findOne(tenantId, id);

    if (voucher.status !== VoucherStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể gửi duyệt phiếu nháp');
    }

    voucher.status = VoucherStatus.PENDING;
    return this.voucherRepository.save(voucher);
  }

  /**
   * Báo cáo sổ quỹ tiền mặt / sổ ngân hàng
   */
  async getCashBankReport(
    tenantId: string,
    options: {
      brandId?: string;
      branchId?: string;
      paymentType: PaymentType;
      fromDate: string;
      toDate: string;
    },
  ) {
    const { brandId, branchId, paymentType, fromDate, toDate } = options;

    let queryBuilder = this.voucherRepository
      .createQueryBuilder('voucher')
      .leftJoinAndSelect('voucher.category', 'category')
      .where('voucher.tenantId = :tenantId', { tenantId })
      .andWhere('voucher.paymentType = :paymentType', { paymentType })
      .andWhere('voucher.status = :status', { status: VoucherStatus.APPROVED })
      .andWhere('voucher.voucherDate >= :fromDate', { fromDate })
      .andWhere('voucher.voucherDate <= :toDate', { toDate });

    if (brandId) {
      queryBuilder = queryBuilder.andWhere('voucher.brandId = :brandId', { brandId });
    }
    if (branchId) {
      queryBuilder = queryBuilder.andWhere('voucher.branchId = :branchId', { branchId });
    }

    const vouchers = await queryBuilder
      .orderBy('voucher.voucherDate', 'ASC')
      .addOrderBy('voucher.voucherNumber', 'ASC')
      .getMany();

    // Tính số dư
    let balance = 0;
    const data = vouchers.map(v => {
      const income = v.transactionType === TransactionType.INCOME ? parseFloat(v.amount as any) : 0;
      const expense = v.transactionType === TransactionType.EXPENSE ? parseFloat(v.amount as any) : 0;
      balance += income - expense;

      return {
        ...v,
        income,
        expense,
        balance,
      };
    });

    const totalIncome = data.reduce((sum, v) => sum + v.income, 0);
    const totalExpense = data.reduce((sum, v) => sum + v.expense, 0);

    return {
      data,
      summary: {
        totalIncome,
        totalExpense,
        finalBalance: balance,
      },
    };
  }
}
