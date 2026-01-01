import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Brand, Company } from '../../database/entities';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async create(createBrandDto: CreateBrandDto): Promise<Brand> {
    const company = await this.companyRepository.findOne({
      where: { id: createBrandDto.companyId },
    });
    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    const existing = await this.brandRepository.findOne({
      where: { code: createBrandDto.code },
    });
    if (existing) {
      throw new ConflictException('Mã thương hiệu đã tồn tại');
    }

    const brand = this.brandRepository.create(createBrandDto);
    return this.brandRepository.save(brand);
  }

  async findAll(paginationDto: PaginationDto & { companyId?: string }) {
    const { page = 1, limit = 10, search, companyId } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.brandRepository
      .createQueryBuilder('brand')
      .leftJoinAndSelect('brand.company', 'company')
      .loadRelationCountAndMap('brand.branchCount', 'brand.branches');

    if (search) {
      queryBuilder.andWhere('(brand.name ILIKE :search OR brand.code ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (companyId) {
      queryBuilder.andWhere('brand.companyId = :companyId', { companyId });
    }

    queryBuilder.orderBy('brand.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map((brand) => ({
        ...brand,
        companyName: brand.company?.name,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({
      where: { id },
      relations: ['company', 'branches'],
    });

    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findOne(id);
    Object.assign(brand, updateBrandDto);
    return this.brandRepository.save(brand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    await this.brandRepository.remove(brand);
  }

  async toggleStatus(id: string): Promise<Brand> {
    const brand = await this.findOne(id);
    brand.isActive = !brand.isActive;
    return this.brandRepository.save(brand);
  }
}
