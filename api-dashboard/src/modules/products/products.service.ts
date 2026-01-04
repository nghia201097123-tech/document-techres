import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import {
  Product,
  ProductType,
  ToppingGroup,
  ToppingGroupItem,
  ProductToppingGroup,
  ProductNote,
  ProductNoteAssignment,
  ComboItem,
} from '../../database/entities';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateToppingGroupDto,
  UpdateToppingGroupDto,
  AddToppingItemDto,
  UpdateToppingItemDto,
  CreateProductNoteDto,
  UpdateProductNoteDto,
  AssignNotesToProductDto,
  AssignNoteToProductsDto,
  AssignToppingGroupsDto,
  AssignComboItemsDto,
} from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ToppingGroup)
    private readonly toppingGroupRepository: Repository<ToppingGroup>,
    @InjectRepository(ToppingGroupItem)
    private readonly toppingGroupItemRepository: Repository<ToppingGroupItem>,
    @InjectRepository(ProductToppingGroup)
    private readonly productToppingGroupRepository: Repository<ProductToppingGroup>,
    @InjectRepository(ProductNote)
    private readonly productNoteRepository: Repository<ProductNote>,
    @InjectRepository(ProductNoteAssignment)
    private readonly productNoteAssignmentRepository: Repository<ProductNoteAssignment>,
    @InjectRepository(ComboItem)
    private readonly comboItemRepository: Repository<ComboItem>,
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

  // === Shared Topping Group Management ===

  // Get all shared topping groups (with their items)
  async getAllToppingGroups(tenantId: string) {
    const groups = await this.toppingGroupRepository.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    const result = await Promise.all(
      groups.map(async (group) => {
        const items = await this.toppingGroupItemRepository.find({
          where: { tenantId, groupId: group.id },
          relations: ['topping'],
          order: { sortOrder: 'ASC' },
        });

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          isRequired: group.isRequired,
          minSelection: group.minSelection,
          maxSelection: group.maxSelection,
          isActive: group.isActive,
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

  // Get a single topping group by id
  async getToppingGroupById(tenantId: string, groupId: string) {
    const group = await this.toppingGroupRepository.findOne({
      where: { tenantId, id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Không tìm thấy nhóm topping');
    }

    const items = await this.toppingGroupItemRepository.find({
      where: { tenantId, groupId: group.id },
      relations: ['topping'],
      order: { sortOrder: 'ASC' },
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      isRequired: group.isRequired,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      isActive: group.isActive,
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
  }

  // Create a new shared topping group
  async createToppingGroup(tenantId: string, dto: CreateToppingGroupDto) {
    // Get max sort order
    const maxOrder = await this.toppingGroupRepository
      .createQueryBuilder('tg')
      .where('tg.tenant_id = :tenantId', { tenantId })
      .select('MAX(tg.sort_order)', 'max')
      .getRawOne();

    const group = this.toppingGroupRepository.create({
      tenantId,
      name: dto.name,
      isRequired: dto.isRequired ?? false,
      minSelection: dto.minSelection ?? 0,
      maxSelection: dto.maxSelection ?? 10,
      sortOrder: dto.sortOrder ?? (maxOrder?.max ?? -1) + 1,
      isActive: true,
    });

    const savedGroup = await this.toppingGroupRepository.save(group);
    return this.getToppingGroupById(tenantId, savedGroup.id);
  }

  // Update a shared topping group
  async updateToppingGroup(tenantId: string, groupId: string, dto: UpdateToppingGroupDto) {
    const group = await this.toppingGroupRepository.findOne({
      where: { tenantId, id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Không tìm thấy nhóm topping');
    }

    Object.assign(group, dto);
    await this.toppingGroupRepository.save(group);
    return this.getToppingGroupById(tenantId, groupId);
  }

  // Delete a shared topping group
  async deleteToppingGroup(tenantId: string, groupId: string) {
    const result = await this.toppingGroupRepository.delete({
      tenantId,
      id: groupId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy nhóm topping');
    }

    return { success: true };
  }

  // Toggle active status of a topping group
  async toggleToppingGroupActive(tenantId: string, groupId: string) {
    const group = await this.toppingGroupRepository.findOne({
      where: { tenantId, id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Không tìm thấy nhóm topping');
    }

    group.isActive = !group.isActive;
    await this.toppingGroupRepository.save(group);
    return this.getToppingGroupById(tenantId, groupId);
  }

  // === Topping Group Item Management ===

  // Add a topping item to a group
  async addToppingItem(tenantId: string, groupId: string, dto: AddToppingItemDto) {
    // Verify group exists
    const group = await this.toppingGroupRepository.findOne({
      where: { tenantId, id: groupId },
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
    const existing = await this.toppingGroupItemRepository.findOne({
      where: { groupId, toppingId: dto.toppingId },
    });
    if (existing) {
      throw new BadRequestException('Topping này đã có trong nhóm');
    }

    // Get max sort order
    const maxOrder = await this.toppingGroupItemRepository
      .createQueryBuilder('tgi')
      .where('tgi.group_id = :groupId', { groupId })
      .select('MAX(tgi.sort_order)', 'max')
      .getRawOne();

    const item = this.toppingGroupItemRepository.create({
      tenantId,
      groupId,
      toppingId: dto.toppingId,
      priceAdjustment: dto.priceAdjustment ?? 0,
      maxQuantity: dto.maxQuantity ?? 5,
      sortOrder: dto.sortOrder ?? (maxOrder?.max ?? -1) + 1,
    });

    await this.toppingGroupItemRepository.save(item);
    return this.getToppingGroupById(tenantId, groupId);
  }

  // Update a topping item in a group
  async updateToppingItem(tenantId: string, groupId: string, itemId: string, dto: UpdateToppingItemDto) {
    const item = await this.toppingGroupItemRepository.findOne({
      where: { tenantId, groupId, id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy topping trong nhóm');
    }

    Object.assign(item, dto);
    await this.toppingGroupItemRepository.save(item);
    return this.getToppingGroupById(tenantId, groupId);
  }

  // Remove a topping item from a group
  async removeToppingItem(tenantId: string, groupId: string, itemId: string) {
    const result = await this.toppingGroupItemRepository.delete({
      tenantId,
      groupId,
      id: itemId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy topping trong nhóm');
    }

    return this.getToppingGroupById(tenantId, groupId);
  }

  // === Product Topping Group Assignment ===

  // Get topping groups assigned to a product
  async getProductToppingGroups(tenantId: string, productId: string) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    const assignments = await this.productToppingGroupRepository.find({
      where: { tenantId, productId },
      relations: ['group'],
      order: { sortOrder: 'ASC' },
    });

    const result = await Promise.all(
      assignments.map(async (assignment) => {
        const items = await this.toppingGroupItemRepository.find({
          where: { tenantId, groupId: assignment.groupId },
          relations: ['topping'],
          order: { sortOrder: 'ASC' },
        });

        return {
          id: assignment.group.id,
          name: assignment.group.name,
          description: assignment.group.description,
          isRequired: assignment.group.isRequired,
          minSelection: assignment.group.minSelection,
          maxSelection: assignment.group.maxSelection,
          sortOrder: assignment.sortOrder,
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

  // Assign multiple topping groups to a product
  async assignToppingGroupsToProduct(tenantId: string, productId: string, dto: AssignToppingGroupsDto) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    // Remove all existing assignments
    await this.productToppingGroupRepository.delete({
      tenantId,
      productId,
    });

    // Create new assignments
    const assignments = dto.groupIds.map((groupId, index) =>
      this.productToppingGroupRepository.create({
        tenantId,
        productId,
        groupId,
        sortOrder: index,
      }),
    );

    if (assignments.length > 0) {
      await this.productToppingGroupRepository.save(assignments);
    }

    return this.getProductToppingGroups(tenantId, productId);
  }

  // Add a single topping group to a product
  async addToppingGroupToProduct(tenantId: string, productId: string, groupId: string) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    // Verify group exists
    const group = await this.toppingGroupRepository.findOne({
      where: { tenantId, id: groupId },
    });
    if (!group) {
      throw new BadRequestException('Nhóm topping không tồn tại');
    }

    // Check if already assigned
    const existing = await this.productToppingGroupRepository.findOne({
      where: { productId, groupId },
    });
    if (existing) {
      throw new BadRequestException('Nhóm topping đã được gán cho món này');
    }

    // Get max sort order
    const maxOrder = await this.productToppingGroupRepository
      .createQueryBuilder('ptg')
      .where('ptg.product_id = :productId', { productId })
      .select('MAX(ptg.sort_order)', 'max')
      .getRawOne();

    const assignment = this.productToppingGroupRepository.create({
      tenantId,
      productId,
      groupId,
      sortOrder: (maxOrder?.max ?? -1) + 1,
    });

    await this.productToppingGroupRepository.save(assignment);
    return this.getProductToppingGroups(tenantId, productId);
  }

  // Remove a topping group from a product
  async removeToppingGroupFromProduct(tenantId: string, productId: string, groupId: string) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    const result = await this.productToppingGroupRepository.delete({
      tenantId,
      productId,
      groupId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Nhóm topping không được gán cho món này');
    }

    return this.getProductToppingGroups(tenantId, productId);
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

  // Get products that have a specific note assigned
  async getProductsByNote(tenantId: string, noteId: string) {
    const assignments = await this.productNoteAssignmentRepository.find({
      where: { tenantId, noteId },
      relations: ['product'],
    });

    return assignments.map(a => a.product);
  }

  // Assign a note to multiple products at once
  async assignNoteToProducts(tenantId: string, noteId: string, dto: AssignNoteToProductsDto) {
    // Verify note exists
    const note = await this.productNoteRepository.findOne({
      where: { tenantId, id: noteId },
    });
    if (!note) {
      throw new NotFoundException('Không tìm thấy ghi chú');
    }

    // Remove all existing assignments for this note
    await this.productNoteAssignmentRepository.delete({
      tenantId,
      noteId,
    });

    // Create new assignments
    const assignments: ProductNoteAssignment[] = [];
    for (const productId of dto.productIds) {
      // Verify product exists
      const product = await this.productRepository.findOne({
        where: { tenantId, id: productId },
      });
      if (product) {
        const assignment = this.productNoteAssignmentRepository.create({
          tenantId,
          productId,
          noteId,
          sortOrder: 0,
        });
        assignments.push(assignment);
      }
    }

    if (assignments.length > 0) {
      await this.productNoteAssignmentRepository.save(assignments);
    }

    return {
      noteId,
      productCount: assignments.length,
      products: await this.getProductsByNote(tenantId, noteId),
    };
  }

  // === Combo Items Management ===

  // Get all products that can be added to a combo (exclude combos and toppings)
  async getAvailableProductsForCombo(tenantId: string, brandId?: string) {
    const where: any = {
      tenantId,
      type: Not(In([ProductType.COMBO, ProductType.TOPPING])),
      isActive: true,
    };
    if (brandId) {
      where.brandId = brandId;
    }
    return this.productRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  // Get items in a combo
  async getComboItems(tenantId: string, comboId: string) {
    // Verify combo exists and is actually a combo
    const combo = await this.productRepository.findOne({
      where: { tenantId, id: comboId },
    });
    if (!combo) {
      throw new NotFoundException('Không tìm thấy combo');
    }
    if (combo.type !== ProductType.COMBO) {
      throw new BadRequestException('Sản phẩm này không phải là combo');
    }

    const items = await this.comboItemRepository.find({
      where: { tenantId, comboId },
      relations: ['product'],
      order: { sortOrder: 'ASC' },
    });

    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
      sortOrder: item.sortOrder,
    }));
  }

  // Assign items to a combo
  async assignComboItems(tenantId: string, comboId: string, dto: AssignComboItemsDto) {
    // Verify combo exists and is actually a combo
    const combo = await this.productRepository.findOne({
      where: { tenantId, id: comboId },
    });
    if (!combo) {
      throw new NotFoundException('Không tìm thấy combo');
    }
    if (combo.type !== ProductType.COMBO) {
      throw new BadRequestException('Sản phẩm này không phải là combo');
    }

    // Validate all products
    for (const item of dto.items) {
      const product = await this.productRepository.findOne({
        where: { tenantId, id: item.productId },
      });
      if (!product) {
        throw new NotFoundException(`Không tìm thấy món: ${item.productId}`);
      }
      if (product.type === ProductType.COMBO) {
        throw new BadRequestException(`Không thể thêm combo "${product.name}" vào combo khác`);
      }
      if (product.type === ProductType.TOPPING) {
        throw new BadRequestException(`Không thể thêm topping "${product.name}" vào combo`);
      }
    }

    // Remove all existing items
    await this.comboItemRepository.delete({ tenantId, comboId });

    // Create new items
    const items = dto.items.map((item, index) =>
      this.comboItemRepository.create({
        tenantId,
        comboId,
        productId: item.productId,
        quantity: item.quantity || 1,
        sortOrder: index,
      }),
    );

    if (items.length > 0) {
      await this.comboItemRepository.save(items);
    }

    return this.getComboItems(tenantId, comboId);
  }

  // Add a single item to combo
  async addItemToCombo(tenantId: string, comboId: string, productId: string, quantity: number = 1) {
    // Verify combo
    const combo = await this.productRepository.findOne({
      where: { tenantId, id: comboId },
    });
    if (!combo) {
      throw new NotFoundException('Không tìm thấy combo');
    }
    if (combo.type !== ProductType.COMBO) {
      throw new BadRequestException('Sản phẩm này không phải là combo');
    }

    // Verify product
    const product = await this.productRepository.findOne({
      where: { tenantId, id: productId },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy món');
    }
    if (product.type === ProductType.COMBO) {
      throw new BadRequestException('Không thể thêm combo vào combo khác');
    }
    if (product.type === ProductType.TOPPING) {
      throw new BadRequestException('Không thể thêm topping vào combo');
    }

    // Check if already exists
    const existing = await this.comboItemRepository.findOne({
      where: { tenantId, comboId, productId },
    });
    if (existing) {
      // Update quantity
      existing.quantity = quantity;
      await this.comboItemRepository.save(existing);
    } else {
      // Get max sort order
      const maxSortOrder = await this.comboItemRepository
        .createQueryBuilder('item')
        .where('item.comboId = :comboId', { comboId })
        .select('MAX(item.sortOrder)', 'max')
        .getRawOne();

      const item = this.comboItemRepository.create({
        tenantId,
        comboId,
        productId,
        quantity,
        sortOrder: (maxSortOrder?.max || 0) + 1,
      });
      await this.comboItemRepository.save(item);
    }

    return this.getComboItems(tenantId, comboId);
  }

  // Remove item from combo
  async removeItemFromCombo(tenantId: string, comboId: string, productId: string) {
    const result = await this.comboItemRepository.delete({
      tenantId,
      comboId,
      productId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy món trong combo');
    }

    return this.getComboItems(tenantId, comboId);
  }
}
