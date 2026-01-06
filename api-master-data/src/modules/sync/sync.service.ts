import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Category, Product, Area, Table, Staff, Device } from '../../entities';
import {
  FullSyncResponseDto,
  IncrementalSyncResponseDto,
  CategoryDto,
  ProductDto,
  AreaDto,
  TableDto,
  StaffDto,
} from './dto/sync.dto';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  async getFullSync(branchId: string): Promise<FullSyncResponseDto> {
    const [categories, products, areas, tables, staff] = await Promise.all([
      this.categoryRepository.find({
        where: { branchId },
        order: { displayOrder: 'ASC' },
      }),
      this.productRepository.find({
        where: { branchId },
        order: { displayOrder: 'ASC' },
      }),
      this.areaRepository.find({
        where: { branchId },
        order: { displayOrder: 'ASC' },
      }),
      this.tableRepository.find({
        where: { branchId },
        order: { displayOrder: 'ASC' },
      }),
      this.staffRepository.find({
        where: { branchId },
      }),
    ]);

    const syncedAt = new Date().toISOString();

    return {
      categories: categories.map(this.mapCategory),
      products: products.map(this.mapProduct),
      areas: areas.map(this.mapArea),
      tables: tables.map(this.mapTable),
      staff: staff.map(this.mapStaff),
      syncedAt,
    };
  }

  async getIncrementalSync(
    branchId: string,
    since: Date,
  ): Promise<IncrementalSyncResponseDto> {
    const [categories, products, areas, tables, staff] = await Promise.all([
      this.categoryRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { displayOrder: 'ASC' },
      }),
      this.productRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { displayOrder: 'ASC' },
      }),
      this.areaRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { displayOrder: 'ASC' },
      }),
      this.tableRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { displayOrder: 'ASC' },
      }),
      this.staffRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
      }),
    ]);

    const syncedAt = new Date().toISOString();

    // TODO: Implement deleted records tracking
    // For now, return empty arrays for deleted IDs
    const deletedIds = {
      categories: [],
      products: [],
      areas: [],
      tables: [],
      staff: [],
    };

    return {
      categories: categories.map(this.mapCategory),
      products: products.map(this.mapProduct),
      areas: areas.map(this.mapArea),
      tables: tables.map(this.mapTable),
      staff: staff.map(this.mapStaff),
      deletedIds,
      syncedAt,
    };
  }

  async updateDeviceSyncTime(deviceId: string): Promise<void> {
    await this.deviceRepository.update(
      { deviceId },
      { lastSyncAt: new Date() },
    );
  }

  private mapCategory(category: Category): CategoryDto {
    return {
      id: category.id,
      name: category.name,
      displayOrder: category.displayOrder,
      imageUrl: category.imageUrl || '',
      isActive: category.isActive,
      version: category.version,
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private mapProduct(product: Product): ProductDto {
    return {
      id: product.id,
      categoryId: product.categoryId,
      code: product.code,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      imageUrl: product.imageUrl || '',
      unit: product.unit || '',
      vatRate: Number(product.vatRate),
      isActive: product.isActive,
      displayOrder: product.displayOrder,
      version: product.version,
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private mapArea(area: Area): AreaDto {
    return {
      id: area.id,
      name: area.name,
      displayOrder: area.displayOrder,
      isActive: area.isActive,
      version: area.version,
      updatedAt: area.updatedAt.toISOString(),
    };
  }

  private mapTable(table: Table): TableDto {
    return {
      id: table.id,
      areaId: table.areaId,
      name: table.name,
      capacity: table.capacity,
      status: table.status,
      displayOrder: table.displayOrder,
      isActive: table.isActive,
      version: table.version,
      updatedAt: table.updatedAt.toISOString(),
    };
  }

  private mapStaff(staff: Staff): StaffDto {
    return {
      id: staff.id,
      code: staff.code,
      name: staff.name,
      phone: staff.phone || '',
      pinCode: staff.pinCode,
      role: staff.role,
      avatarUrl: staff.avatarUrl || '',
      isActive: staff.isActive,
      version: staff.version,
      updatedAt: staff.updatedAt.toISOString(),
    };
  }
}
