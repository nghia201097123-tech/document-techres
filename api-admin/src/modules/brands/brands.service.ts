import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Brand, Company } from '../../database/entities';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandListDto } from './dto/brand-list.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * Transform brand entity to response (map logoUrl to logo)
   */
  private transformBrand(brand: Brand): any {
    const { logoUrl, ...rest } = brand as any;
    return {
      ...rest,
      logo: logoUrl,
    };
  }

  async create(createBrandDto: CreateBrandDto): Promise<any> {
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

    // Map logo from DTO to logoUrl in entity
    const { logo, ...restDto } = createBrandDto as any;
    const brandData: Partial<Brand> = {
      ...restDto,
      tenantId: company.code,
    };
    if (logo !== undefined) {
      brandData.logoUrl = logo;
    }

    const brand = this.brandRepository.create(brandData);
    const saved = await this.brandRepository.save(brand);
    return this.transformBrand(saved);
  }

  async findAll(query: BrandListDto) {
    const { page = 1, limit = 10, search, companyId } = query;
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
        ...this.transformBrand(brand),
        companyName: brand.company?.name,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const brand = await this.brandRepository.findOne({
      where: { id },
      relations: ['company', 'branches'],
    });

    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    return this.transformBrand(brand);
  }

  async update(id: string, updateBrandDto: UpdateBrandDto): Promise<any> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    // Map logo from DTO to logoUrl in entity
    const { logo, ...restDto } = updateBrandDto as any;
    if (logo !== undefined) {
      brand.logoUrl = logo;
    }
    Object.assign(brand, restDto);
    const saved = await this.brandRepository.save(brand);
    return this.transformBrand(saved);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    await this.brandRepository.remove(brand);
  }

  async toggleStatus(id: string): Promise<any> {
    const brand = await this.brandRepository.findOne({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    brand.isActive = !brand.isActive;
    const saved = await this.brandRepository.save(brand);
    return this.transformBrand(saved);
  }
}
