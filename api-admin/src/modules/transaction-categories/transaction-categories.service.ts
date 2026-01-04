import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { TransactionCategory, TransactionType } from '../../database/entities/transaction-category.entity';
import { CreateTransactionCategoryDto } from './dto/create-transaction-category.dto';
import { UpdateTransactionCategoryDto } from './dto/update-transaction-category.dto';
import { FilterTransactionCategoryDto } from './dto/filter-transaction-category.dto';

@Injectable()
export class TransactionCategoriesService {
  constructor(
    @InjectRepository(TransactionCategory)
    private readonly categoryRepository: Repository<TransactionCategory>,
  ) {}

  async create(createDto: CreateTransactionCategoryDto): Promise<TransactionCategory> {
    // Check if code already exists
    const existingCode = await this.categoryRepository.findOne({
      where: { code: createDto.code.toUpperCase() },
    });
    if (existingCode) {
      throw new ConflictException(`Mã danh mục "${createDto.code}" đã tồn tại`);
    }

    const category = this.categoryRepository.create({
      ...createDto,
      code: createDto.code.toUpperCase(),
    });

    return this.categoryRepository.save(category);
  }

  async findAll(filterDto: FilterTransactionCategoryDto) {
    const { type, search, isActive, page = 1, limit = 50 } = filterDto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<TransactionCategory> = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (type) {
      queryBuilder.andWhere('category.type = :type', { type });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(category.name ILIKE :search OR category.code ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('category.type', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<TransactionCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
    return category;
  }

  async update(id: string, updateDto: UpdateTransactionCategoryDto): Promise<TransactionCategory> {
    const category = await this.findOne(id);

    // Cannot update system categories
    if (category.isSystem) {
      throw new BadRequestException('Không thể chỉnh sửa danh mục hệ thống');
    }

    Object.assign(category, updateDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Cannot delete system categories
    if (category.isSystem) {
      throw new BadRequestException('Không thể xóa danh mục hệ thống');
    }

    await this.categoryRepository.remove(category);
  }

  async toggleActive(id: string): Promise<TransactionCategory> {
    const category = await this.findOne(id);

    // Cannot deactivate system categories
    if (category.isSystem && category.isActive) {
      throw new BadRequestException('Không thể tắt danh mục hệ thống');
    }

    category.isActive = !category.isActive;
    return this.categoryRepository.save(category);
  }

  // Seed default categories
  async seedDefaults(): Promise<void> {
    const defaultCategories: Array<{ name: string; code: string; type: TransactionType; isSystem: boolean }> = [
      // Income categories
      { name: 'Doanh thu bán hàng', code: 'DT_BH', type: TransactionType.INCOME, isSystem: true },
      { name: 'Doanh thu dịch vụ', code: 'DT_DV', type: TransactionType.INCOME, isSystem: true },
      { name: 'Thu khác', code: 'THU_KHAC', type: TransactionType.INCOME, isSystem: true },
      // Expense categories
      { name: 'Chi phí nguyên vật liệu', code: 'CP_NVL', type: TransactionType.EXPENSE, isSystem: true },
      { name: 'Chi phí nhân công', code: 'CP_NC', type: TransactionType.EXPENSE, isSystem: true },
      { name: 'Chi phí điện nước', code: 'CP_DN', type: TransactionType.EXPENSE, isSystem: true },
      { name: 'Chi phí thuê mặt bằng', code: 'CP_TMB', type: TransactionType.EXPENSE, isSystem: true },
      { name: 'Chi phí marketing', code: 'CP_MKT', type: TransactionType.EXPENSE, isSystem: true },
      { name: 'Chi khác', code: 'CHI_KHAC', type: TransactionType.EXPENSE, isSystem: true },
    ];

    for (const cat of defaultCategories) {
      const exists = await this.categoryRepository.findOne({ where: { code: cat.code } });
      if (!exists) {
        await this.categoryRepository.save(this.categoryRepository.create(cat));
      }
    }
  }
}
