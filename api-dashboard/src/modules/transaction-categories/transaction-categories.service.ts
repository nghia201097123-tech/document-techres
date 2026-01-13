import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionCategory, TransactionType } from '../../database/entities';
import { CreateTransactionCategoryDto, UpdateTransactionCategoryDto } from './dto';

// Danh mục hệ thống mặc định
const DEFAULT_CATEGORIES = [
  // Thu
  { code: 'DT_BH', name: 'Doanh thu bán hàng', type: TransactionType.INCOME, isSystem: true },
  { code: 'DT_DV', name: 'Doanh thu dịch vụ', type: TransactionType.INCOME, isSystem: true },
  { code: 'THU_KHAC', name: 'Thu khác', type: TransactionType.INCOME, isSystem: true },
  // Chi
  { code: 'CP_NVL', name: 'Chi phí nguyên vật liệu', type: TransactionType.EXPENSE, isSystem: true },
  { code: 'CP_NC', name: 'Chi phí nhân công', type: TransactionType.EXPENSE, isSystem: true },
  { code: 'CP_DN', name: 'Chi phí điện nước', type: TransactionType.EXPENSE, isSystem: true },
  { code: 'CP_TMB', name: 'Chi phí thuê mặt bằng', type: TransactionType.EXPENSE, isSystem: true },
  { code: 'CP_MKT', name: 'Chi phí marketing', type: TransactionType.EXPENSE, isSystem: true },
  { code: 'CP_VPP', name: 'Chi phí văn phòng phẩm', type: TransactionType.EXPENSE, isSystem: true },
  { code: 'CP_VC', name: 'Chi phí vận chuyển', type: TransactionType.EXPENSE, isSystem: true },
  { code: 'CHI_KHAC', name: 'Chi khác', type: TransactionType.EXPENSE, isSystem: true },
];

@Injectable()
export class TransactionCategoriesService {
  constructor(
    @InjectRepository(TransactionCategory)
    private readonly categoryRepository: Repository<TransactionCategory>,
  ) {}

  /**
   * Lấy danh sách danh mục với filter và phân trang
   */
  async findAll(tenantId: string, options?: {
    type?: TransactionType;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { type, search, isActive, page = 1, limit = 50 } = options || {};

    let queryBuilder = this.categoryRepository.createQueryBuilder('category')
      .where('category.tenantId = :tenantId', { tenantId });

    if (type) {
      queryBuilder = queryBuilder.andWhere('category.type = :type', { type });
    }

    if (isActive !== undefined) {
      queryBuilder = queryBuilder.andWhere('category.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(category.name ILIKE :search OR category.code ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();

    const data = await queryBuilder
      .orderBy('category.type', 'ASC')
      .addOrderBy('category.isSystem', 'DESC')
      .addOrderBy('category.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lấy tất cả danh mục (không phân trang) - dùng cho dropdown
   */
  async findAllForDropdown(tenantId: string, type?: TransactionType) {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category')
      .where('category.tenantId = :tenantId', { tenantId })
      .andWhere('category.isActive = :isActive', { isActive: true });

    if (type) {
      queryBuilder.andWhere('category.type = :type', { type });
    }

    return queryBuilder
      .orderBy('category.type', 'ASC')
      .addOrderBy('category.isSystem', 'DESC')
      .addOrderBy('category.name', 'ASC')
      .getMany();
  }

  /**
   * Lấy chi tiết danh mục
   */
  async findOne(tenantId: string, id: string) {
    const category = await this.categoryRepository.findOne({
      where: { tenantId, id }
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
    return category;
  }

  /**
   * Tìm danh mục theo mã
   */
  async findByCode(tenantId: string, code: string) {
    return this.categoryRepository.findOne({
      where: { tenantId, code: code.toUpperCase() }
    });
  }

  /**
   * Tạo danh mục mới
   */
  async create(tenantId: string, createDto: CreateTransactionCategoryDto) {
    // Kiểm tra mã đã tồn tại
    const existing = await this.findByCode(tenantId, createDto.code);
    if (existing) {
      throw new ConflictException('Mã danh mục đã tồn tại');
    }

    const category = this.categoryRepository.create({
      ...createDto,
      tenantId,
      code: createDto.code.toUpperCase(),
      isSystem: false,
      isActive: true,
    });

    return this.categoryRepository.save(category);
  }

  /**
   * Cập nhật danh mục
   */
  async update(tenantId: string, id: string, updateDto: UpdateTransactionCategoryDto) {
    const category = await this.findOne(tenantId, id);

    // Không cho phép sửa danh mục hệ thống
    if (category.isSystem) {
      throw new BadRequestException('Không thể sửa danh mục hệ thống');
    }

    // Nếu đổi mã, kiểm tra trùng
    if (updateDto.code && updateDto.code !== category.code) {
      const existing = await this.findByCode(tenantId, updateDto.code);
      if (existing) {
        throw new ConflictException('Mã danh mục đã tồn tại');
      }
      updateDto.code = updateDto.code.toUpperCase();
    }

    Object.assign(category, updateDto);
    return this.categoryRepository.save(category);
  }

  /**
   * Xóa danh mục
   */
  async delete(tenantId: string, id: string) {
    const category = await this.findOne(tenantId, id);

    // Không cho phép xóa danh mục hệ thống
    if (category.isSystem) {
      throw new BadRequestException('Không thể xóa danh mục hệ thống');
    }

    await this.categoryRepository.remove(category);
    return { message: 'Đã xóa danh mục' };
  }

  /**
   * Kích hoạt/Tạm ngưng danh mục
   */
  async toggleActive(tenantId: string, id: string) {
    const category = await this.findOne(tenantId, id);

    // Không cho phép tắt danh mục hệ thống
    if (category.isSystem && category.isActive) {
      throw new BadRequestException('Không thể tạm ngưng danh mục hệ thống');
    }

    category.isActive = !category.isActive;
    return this.categoryRepository.save(category);
  }

  /**
   * Khởi tạo danh mục mặc định
   */
  async seed(tenantId: string) {
    const count = await this.categoryRepository.count({ where: { tenantId } });
    if (count > 0) {
      return { message: 'Danh mục đã được khởi tạo trước đó', created: 0 };
    }

    const categories = DEFAULT_CATEGORIES.map(cat =>
      this.categoryRepository.create({
        ...cat,
        tenantId,
        isActive: true,
      })
    );

    await this.categoryRepository.save(categories);
    return { message: 'Đã khởi tạo danh mục mặc định', created: categories.length };
  }
}
