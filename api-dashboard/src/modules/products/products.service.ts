import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product, ProductType, ProductTopping, ToppingGroup, ProductNote, ProductNoteAssignment } from '../../database/entities';
import { CreateProductDto, UpdateProductDto, CreateToppingGroupDto, UpdateToppingGroupDto, AddToppingItemDto, UpdateToppingItemDto, CreateProductNoteDto, UpdateProductNoteDto, AssignNotesToProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ToppingGroup)
    private readonly toppingGroupRepository: Repository<ToppingGroup>,
    @InjectRepository(ProductTopping)
    private readonly productToppingRepository: Repository<ProductTopping>,
    @InjectRepository(ProductNote)
    private readonly productNoteRepository: Repository<ProductNote>,
    @InjectRepository(ProductNoteAssignment)
    private readonly productNoteAssignmentRepository: Repository<ProductNoteAssignment>,
  ) {}

  async findAll(tenantId: string, brandId?: string, type?: ProductType) {
    const where: any = { tenantId };
    if (brandId) {
      where.brandId = brandId;
    }
    if (type) {
      where.type = type;
    }
    return this.productRepository.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.productRepository.findOne({
      where: { tenantId, id },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy món');
    }
    return product;
  }

  async create(tenantId: string, brandId: string, createDto: CreateProductDto) {
    const code = await this.generateCode(createDto.type);
    const product = this.productRepository.create({
      ...createDto,
      tenantId,
      brandId,
      code,
      isActive: true,
    });
    return this.productRepository.save(product);
  }

  async update(tenantId: string, id: string, updateDto: UpdateProductDto) {
    const product = await this.findOne(tenantId, id);
    Object.assign(product, updateDto);
    return this.productRepository.save(product);
  }

  async toggleActive(tenantId: string, id: string) {
    const product = await this.findOne(tenantId, id);
    product.isActive = !product.isActive;
    return this.productRepository.save(product);
  }

  private async generateCode(type: ProductType): Promise<string> {
    const prefixes: Record<ProductType, string> = {
      [ProductType.FOOD]: 'MON',
      [ProductType.DRINK]: 'DU',
      [ProductType.OTHER]: 'KH',
      [ProductType.TOPPING]: 'TOP',
      [ProductType.COMBO]: 'CMB',
    };
    const prefix = prefixes[type] || 'PRD';
    const count = await this.productRepository.count();
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  // === Topping Management ===

  async getAvailableToppings(tenantId: string, brandId?: string) {
    const where: any = { tenantId, type: ProductType.TOPPING, isActive: true };
    if (brandId) {
      where.brandId = brandId;
    }
    return this.productRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  // === Topping Group Management ===

  async getToppingGroups(tenantId: string, productId: string) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    const groups = await this.toppingGroupRepository.find({
      where: { tenantId, productId },
      order: { sortOrder: 'ASC' },
    });

    // Get items for each group
    const result = await Promise.all(
      groups.map(async (group) => {
        const items = await this.productToppingRepository.find({
          where: { tenantId, groupId: group.id },
          relations: ['topping'],
          order: { sortOrder: 'ASC' },
        });

        return {
          id: group.id,
          name: group.name,
          isRequired: group.isRequired,
          minSelection: group.minSelection,
          maxSelection: group.maxSelection,
          sortOrder: group.sortOrder,
          items: items.map((item) => ({
            id: item.id,
            toppingId: item.toppingId,
            topping: item.topping,
            priceAdjustment: Number(item.priceAdjustment),
            maxQuantity: item.maxQuantity,
            sortOrder: item.sortOrder,
          })),
        };
      }),
    );

    return result;
  }

  async createToppingGroup(tenantId: string, productId: string, dto: CreateToppingGroupDto) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    // Get max sort order
    const maxOrder = await this.toppingGroupRepository
      .createQueryBuilder('tg')
      .where('tg.product_id = :productId', { productId })
      .select('MAX(tg.sort_order)', 'max')
      .getRawOne();

    const group = this.toppingGroupRepository.create({
      tenantId,
      productId,
      name: dto.name,
      isRequired: dto.isRequired ?? false,
      minSelection: dto.minSelection ?? 0,
      maxSelection: dto.maxSelection ?? 10,
      sortOrder: dto.sortOrder ?? (maxOrder?.max ?? -1) + 1,
    });

    await this.toppingGroupRepository.save(group);
    return this.getToppingGroups(tenantId, productId);
  }

  async updateToppingGroup(tenantId: string, productId: string, groupId: string, dto: UpdateToppingGroupDto) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    const group = await this.toppingGroupRepository.findOne({
      where: { tenantId, productId, id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Không tìm thấy nhóm topping');
    }

    Object.assign(group, dto);
    await this.toppingGroupRepository.save(group);
    return this.getToppingGroups(tenantId, productId);
  }

  async deleteToppingGroup(tenantId: string, productId: string, groupId: string) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    const result = await this.toppingGroupRepository.delete({
      tenantId,
      productId,
      id: groupId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy nhóm topping');
    }

    return this.getToppingGroups(tenantId, productId);
  }

  // === Topping Item Management ===

  async addToppingItem(tenantId: string, productId: string, groupId: string, dto: AddToppingItemDto) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    // Verify group exists
    const group = await this.toppingGroupRepository.findOne({
      where: { tenantId, productId, id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Không tìm thấy nhóm topping');
    }

    // Verify topping exists and is of type TOPPING
    const topping = await this.productRepository.findOne({
      where: { tenantId, id: dto.toppingId, type: ProductType.TOPPING },
    });
    if (!topping) {
      throw new BadRequestException('Topping không tồn tại hoặc không phải loại topping');
    }

    // Check if already exists in this group
    const existing = await this.productToppingRepository.findOne({
      where: { groupId, toppingId: dto.toppingId },
    });
    if (existing) {
      throw new BadRequestException('Topping này đã có trong nhóm');
    }

    // Get max sort order
    const maxOrder = await this.productToppingRepository
      .createQueryBuilder('pt')
      .where('pt.group_id = :groupId', { groupId })
      .select('MAX(pt.sort_order)', 'max')
      .getRawOne();

    const item = this.productToppingRepository.create({
      tenantId,
      productId,
      groupId,
      toppingId: dto.toppingId,
      priceAdjustment: dto.priceAdjustment ?? 0,
      maxQuantity: dto.maxQuantity ?? 5,
      sortOrder: dto.sortOrder ?? (maxOrder?.max ?? -1) + 1,
    });

    await this.productToppingRepository.save(item);
    return this.getToppingGroups(tenantId, productId);
  }

  async updateToppingItem(tenantId: string, productId: string, groupId: string, itemId: string, dto: UpdateToppingItemDto) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    const item = await this.productToppingRepository.findOne({
      where: { tenantId, productId, groupId, id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy topping trong nhóm');
    }

    Object.assign(item, dto);
    await this.productToppingRepository.save(item);
    return this.getToppingGroups(tenantId, productId);
  }

  async removeToppingItem(tenantId: string, productId: string, groupId: string, itemId: string) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    const result = await this.productToppingRepository.delete({
      tenantId,
      productId,
      groupId,
      id: itemId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy topping trong nhóm');
    }

    return this.getToppingGroups(tenantId, productId);
  }

  // === Product Notes Management ===

  async getAllNotes(tenantId: string) {
    return this.productNoteRepository.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async createNote(tenantId: string, dto: CreateProductNoteDto) {
    // Get max sort order
    const maxOrder = await this.productNoteRepository
      .createQueryBuilder('pn')
      .where('pn.tenant_id = :tenantId', { tenantId })
      .select('MAX(pn.sort_order)', 'max')
      .getRawOne();

    const note = this.productNoteRepository.create({
      tenantId,
      name: dto.name,
      description: dto.description,
      sortOrder: dto.sortOrder ?? (maxOrder?.max ?? -1) + 1,
      isActive: true,
    });

    return this.productNoteRepository.save(note);
  }

  async updateNote(tenantId: string, noteId: string, dto: UpdateProductNoteDto) {
    const note = await this.productNoteRepository.findOne({
      where: { tenantId, id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Không tìm thấy ghi chú');
    }

    Object.assign(note, dto);
    return this.productNoteRepository.save(note);
  }

  async deleteNote(tenantId: string, noteId: string) {
    const result = await this.productNoteRepository.delete({
      tenantId,
      id: noteId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy ghi chú');
    }

    return { success: true };
  }

  async getProductNotes(tenantId: string, productId: string) {
    await this.findOne(tenantId, productId);

    const assignments = await this.productNoteAssignmentRepository.find({
      where: { tenantId, productId },
      relations: ['note'],
      order: { sortOrder: 'ASC' },
    });

    return assignments.map(a => ({
      id: a.id,
      noteId: a.noteId,
      note: a.note,
      sortOrder: a.sortOrder,
    }));
  }

  async assignNotesToProduct(tenantId: string, productId: string, dto: AssignNotesToProductDto) {
    await this.findOne(tenantId, productId);

    // Remove all existing assignments
    await this.productNoteAssignmentRepository.delete({
      tenantId,
      productId,
    });

    // Create new assignments
    const assignments = dto.noteIds.map((noteId, index) =>
      this.productNoteAssignmentRepository.create({
        tenantId,
        productId,
        noteId,
        sortOrder: index,
      }),
    );

    if (assignments.length > 0) {
      await this.productNoteAssignmentRepository.save(assignments);
    }

    return this.getProductNotes(tenantId, productId);
  }

  async addNoteToProduct(tenantId: string, productId: string, noteId: string) {
    await this.findOne(tenantId, productId);

    // Verify note exists
    const note = await this.productNoteRepository.findOne({
      where: { tenantId, id: noteId },
    });
    if (!note) {
      throw new BadRequestException('Ghi chú không tồn tại');
    }

    // Check if already assigned
    const existing = await this.productNoteAssignmentRepository.findOne({
      where: { productId, noteId },
    });
    if (existing) {
      throw new BadRequestException('Ghi chú đã được gán cho món này');
    }

    // Get max sort order
    const maxOrder = await this.productNoteAssignmentRepository
      .createQueryBuilder('pna')
      .where('pna.product_id = :productId', { productId })
      .select('MAX(pna.sort_order)', 'max')
      .getRawOne();

    const assignment = this.productNoteAssignmentRepository.create({
      tenantId,
      productId,
      noteId,
      sortOrder: (maxOrder?.max ?? -1) + 1,
    });

    await this.productNoteAssignmentRepository.save(assignment);
    return this.getProductNotes(tenantId, productId);
  }

  async removeNoteFromProduct(tenantId: string, productId: string, noteId: string) {
    await this.findOne(tenantId, productId);

    const result = await this.productNoteAssignmentRepository.delete({
      tenantId,
      productId,
      noteId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy ghi chú trong món này');
    }

    return this.getProductNotes(tenantId, productId);
  }
}
