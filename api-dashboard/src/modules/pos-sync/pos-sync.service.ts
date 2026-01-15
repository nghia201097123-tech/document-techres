import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Product,
  Category,
  Area,
  Table,
  Staff,
  Kitchen,
  ProductKitchen,
  Branch,
  ToppingGroup,
  ToppingGroupItem,
  ProductToppingGroup,
  ProductNote,
  ProductNoteAssignment,
  ComboItem,
  SeasonalPrice,
  SeasonalPriceProduct,
  Coupon,
  BillTemplate,
  BillPrinterConfig,
} from '../../database/entities';
import {
  PosFullSyncResponseDto,
  PosCategoryDto,
  PosProductDto,
  PosProductToppingDto,
  PosAreaDto,
  PosTableDto,
  PosStaffDto,
  PosKitchenDto,
  PosBranchInfoDto,
  PosToppingGroupDto,
  PosToppingItemDto,
  PosProductNoteDto,
  PosComboItemDto,
  PosSeasonalPriceDto,
  PosCouponDto,
  PosBillTemplateDto,
  PosBillPrinterConfigDto,
} from './dto/pos-sync.dto';

@Injectable()
export class PosSyncService {
  private readonly logger = new Logger(PosSyncService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(Kitchen)
    private readonly kitchenRepository: Repository<Kitchen>,
    @InjectRepository(ProductKitchen)
    private readonly productKitchenRepository: Repository<ProductKitchen>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
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
    @InjectRepository(SeasonalPrice)
    private readonly seasonalPriceRepository: Repository<SeasonalPrice>,
    @InjectRepository(SeasonalPriceProduct)
    private readonly seasonalPriceProductRepository: Repository<SeasonalPriceProduct>,
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(BillTemplate)
    private readonly billTemplateRepository: Repository<BillTemplate>,
    @InjectRepository(BillPrinterConfig)
    private readonly billPrinterConfigRepository: Repository<BillPrinterConfig>,
  ) {}

  /**
   * Get full sync data for a branch
   * This endpoint is called by CCB app on startup or manual sync
   */
  async getFullSyncData(branchId: string, tenantId: string): Promise<PosFullSyncResponseDto> {
    this.logger.log(`Getting full sync data for branch: ${branchId}`);

    // Verify branch exists
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }

    // Get brandId from branch for filtering products
    const brandId = branch.brandId;

    // Fetch all data in parallel
    const [
      categories,
      productsRaw,
      productKitchenMappings,
      areas,
      tables,
      staff,
      kitchens,
      toppingGroups,
      toppingGroupItems,
      productToppingGroups,
      productNotes,
      productNoteAssignments,
      comboItems,
      seasonalPrices,
      seasonalPriceProducts,
      coupons,
      billTemplates,
      billPrinterConfigs,
    ] = await Promise.all([
      this.categoryRepository.find({
        where: { tenantId, brandId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.productRepository.find({
        where: { tenantId, brandId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.productKitchenRepository.find({
        where: { tenantId },
      }),
      this.areaRepository.find({
        where: { tenantId, branchId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.tableRepository.find({
        where: { tenantId, branchId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.staffRepository.find({
        where: { tenantId, isActive: true },
        order: { name: 'ASC' },
      }),
      this.kitchenRepository.find({
        where: { tenantId, branchId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.toppingGroupRepository.find({
        where: { tenantId, brandId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.toppingGroupItemRepository.find({
        where: { tenantId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.productToppingGroupRepository.find({
        where: { tenantId },
      }),
      this.productNoteRepository.find({
        where: { tenantId, brandId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.productNoteAssignmentRepository.find({
        where: { tenantId },
      }),
      this.comboItemRepository.find({
        where: { tenantId },
        order: { sortOrder: 'ASC' },
      }),
      this.seasonalPriceRepository.find({
        where: { tenantId, brandId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.seasonalPriceProductRepository.find({
        where: { tenantId },
      }),
      this.couponRepository.find({
        where: { tenantId, brandId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.billTemplateRepository.find({
        where: { tenantId, branchId, isActive: true },
      }),
      this.billPrinterConfigRepository.find({
        where: { tenantId, branchId, isActive: true },
      }),
    ]);

    // Build product-kitchen mapping (productId -> comma-separated kitchenIds)
    const productKitchenMap = new Map<string, string[]>();
    for (const pk of productKitchenMappings) {
      if (!productKitchenMap.has(pk.productId)) {
        productKitchenMap.set(pk.productId, []);
      }
      productKitchenMap.get(pk.productId)!.push(pk.kitchenId);
    }

    // Build product-topping mapping
    const productToppingMap = new Map<string, PosProductToppingDto[]>();
    for (const ptg of productToppingGroups) {
      const group = toppingGroups.find(g => g.id === ptg.toppingGroupId);
      if (group) {
        if (!productToppingMap.has(ptg.productId)) {
          productToppingMap.set(ptg.productId, []);
        }
        // Get all items in this group
        const items = toppingGroupItems.filter(i => i.toppingGroupId === group.id);
        for (const item of items) {
          productToppingMap.get(ptg.productId)!.push({
            toppingId: item.id,
            groupName: group.name,
            groupType: group.groupType || 'topping',
            isRequired: group.isRequired,
            isMultiple: group.isMultiple,
            extraPrice: item.price || 0,
            isDefault: item.isDefault,
            sortOrder: item.sortOrder,
          });
        }
      }
    }

    // Transform products with kitchenIds and toppings
    const products: PosProductDto[] = productsRaw.map(p => ({
      id: p.id,
      categoryId: p.categoryId,
      code: p.code,
      name: p.name,
      searchName: p.searchName,
      abbreviation: p.abbreviation,
      description: p.description,
      imageUrl: p.imageUrl,
      price: p.price,
      costPrice: p.costPrice,
      vatRate: p.vatRate,
      unit: p.unit,
      type: p.type,
      isAvailable: true,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      preparationTime: p.preparationTime,
      printToKitchen: p.printDish,
      printToBar: p.printLabel,
      // CRITICAL: Include kitchen IDs for print routing
      kitchenIds: productKitchenMap.get(p.id)?.join(',') || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      toppings: productToppingMap.get(p.id) || [],
    }));

    // Transform categories
    const categoriesDto: PosCategoryDto[] = categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    // Transform areas
    const areasDto: PosAreaDto[] = areas.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      sortOrder: a.sortOrder,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    // Transform tables
    const tablesDto: PosTableDto[] = tables.map(t => ({
      id: t.id,
      areaId: t.areaId,
      name: t.name,
      capacity: t.capacity || 4,
      status: t.status || 'available',
      sortOrder: t.sortOrder,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    // Transform staff
    const staffDto: PosStaffDto[] = staff.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      phone: s.phone,
      email: s.email,
      role: s.role,
      departmentId: s.departmentId,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    // Transform kitchens
    const kitchensDto: PosKitchenDto[] = kitchens.map(k => ({
      id: k.id,
      name: k.name,
      kitchenType: k.kitchenType,
      printerName: k.printerName,
      printerIp: k.printerIp,
      printerPort: k.printerPort,
      paperWidth: k.paperWidth,
      printMode: k.printMode,
      description: k.description,
      isActive: k.isActive,
      sortOrder: k.sortOrder,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    }));

    // Transform branch info
    const branchInfoDto: PosBranchInfoDto = {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      logoUrl: branch.logoUrl,
      address: branch.addressDetail,
      phone: branch.phone,
      email: branch.email,
      openTime: branch.openTime,
      closeTime: branch.closeTime,
      isActive: branch.isActive,
    };

    // Build topping groups with items and product assignments
    const toppingGroupsDto: PosToppingGroupDto[] = toppingGroups.map(g => {
      const items = toppingGroupItems
        .filter(i => i.toppingGroupId === g.id)
        .map(i => ({
          id: i.id,
          name: i.name,
          price: i.price || 0,
          isDefault: i.isDefault,
          sortOrder: i.sortOrder,
          isActive: i.isActive,
        }));

      const productIds = productToppingGroups
        .filter(ptg => ptg.toppingGroupId === g.id)
        .map(ptg => ptg.productId);

      return {
        id: g.id,
        name: g.name,
        groupType: g.groupType || 'topping',
        isRequired: g.isRequired,
        isMultiple: g.isMultiple,
        minSelect: g.minSelect || 0,
        maxSelect: g.maxSelect || 10,
        sortOrder: g.sortOrder,
        isActive: g.isActive,
        items,
        productIds,
      };
    });

    // Build product notes with assignments
    const productNotesDto: PosProductNoteDto[] = productNotes.map(n => {
      const productIds = productNoteAssignments
        .filter(a => a.noteId === n.id)
        .map(a => a.productId);

      return {
        id: n.id,
        name: n.name,
        sortOrder: n.sortOrder,
        isActive: n.isActive,
        productIds,
      };
    });

    // Transform combo items
    const comboItemsDto: PosComboItemDto[] = comboItems.map(ci => ({
      comboId: ci.comboId,
      productId: ci.productId,
      quantity: ci.quantity,
      sortOrder: ci.sortOrder,
    }));

    // Build seasonal prices with products
    const seasonalPricesDto: PosSeasonalPriceDto[] = seasonalPrices.map(sp => {
      const spProducts = seasonalPriceProducts
        .filter(spp => spp.seasonalPriceId === sp.id)
        .map(spp => ({ productId: spp.productId }));

      return {
        id: sp.id,
        name: sp.name,
        description: sp.description,
        adjustmentType: sp.adjustmentType,
        adjustmentValue: sp.adjustmentValue,
        startDate: sp.startDate?.toISOString() || '',
        endDate: sp.endDate?.toISOString() || '',
        sortOrder: sp.sortOrder,
        isActive: sp.isActive,
        products: spProducts,
        createdAt: sp.createdAt.toISOString(),
        updatedAt: sp.updatedAt.toISOString(),
      };
    });

    // Transform coupons
    const couponsDto: PosCouponDto[] = coupons.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      couponType: c.couponType,
      applyTo: c.applyTo || 'bill',
      activationType: c.activationType || 'manual',
      discountValue: c.discountValue,
      maxDiscount: c.maxDiscount,
      minOrderAmount: c.minOrderAmount || 0,
      minQuantity: c.minQuantity || 1,
      productIds: c.productIds,
      categoryIds: c.categoryIds,
      isCombinable: c.isCombinable || false,
      priority: c.priority || 100,
      usageLimit: c.usageLimit,
      usageCount: c.usageCount || 0,
      dailyLimit: c.dailyLimit,
      dailyUsageCount: c.dailyUsageCount || 0,
      requiresApproval: c.requiresApproval || false,
      approvalThreshold: c.approvalThreshold,
      startDate: c.startDate?.toISOString(),
      endDate: c.endDate?.toISOString(),
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    // Transform bill templates
    const billTemplatesDto: PosBillTemplateDto[] = billTemplates.map(bt => ({
      id: bt.id,
      name: bt.name,
      paperWidth: bt.paperWidth || 80,
      headerText: bt.headerText,
      footerText: bt.footerText,
      showLogo: bt.showLogo ?? true,
      showQrCode: bt.showQrCode ?? false,
      showBarcode: bt.showBarcode ?? false,
      isDefault: bt.isDefault ?? false,
      isActive: bt.isActive,
      createdAt: bt.createdAt.toISOString(),
      updatedAt: bt.updatedAt.toISOString(),
    }));

    // Transform bill printer configs
    const billPrinterConfigsDto: PosBillPrinterConfigDto[] = billPrinterConfigs.map(bpc => ({
      id: bpc.id,
      name: bpc.name,
      printerType: bpc.printerType || 'network',
      printerIp: bpc.printerIp,
      printerPort: bpc.printerPort || 9100,
      paperWidth: bpc.paperWidth || 80,
      isDefault: bpc.isDefault ?? false,
      isActive: bpc.isActive,
      templateId: bpc.templateId,
      createdAt: bpc.createdAt.toISOString(),
      updatedAt: bpc.updatedAt.toISOString(),
    }));

    this.logger.log(`Full sync data prepared: ${products.length} products, ${kitchens.length} kitchens`);

    return {
      categories: categoriesDto,
      products,
      areas: areasDto,
      tables: tablesDto,
      staff: staffDto,
      kitchens: kitchensDto,
      branchInfo: branchInfoDto,
      seasonalPrices: seasonalPricesDto,
      coupons: couponsDto,
      toppingGroups: toppingGroupsDto,
      productNotes: productNotesDto,
      comboItems: comboItemsDto,
      billTemplates: billTemplatesDto,
      billPrinterConfigs: billPrinterConfigsDto,
    };
  }

  /**
   * Get products with kitchen IDs for a specific branch
   */
  async getProducts(branchId: string, tenantId: string): Promise<PosProductDto[]> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }

    const brandId = branch.brandId;

    const [products, productKitchenMappings] = await Promise.all([
      this.productRepository.find({
        where: { tenantId, brandId, isActive: true },
        order: { sortOrder: 'ASC' },
      }),
      this.productKitchenRepository.find({
        where: { tenantId },
      }),
    ]);

    // Build product-kitchen mapping
    const productKitchenMap = new Map<string, string[]>();
    for (const pk of productKitchenMappings) {
      if (!productKitchenMap.has(pk.productId)) {
        productKitchenMap.set(pk.productId, []);
      }
      productKitchenMap.get(pk.productId)!.push(pk.kitchenId);
    }

    return products.map(p => ({
      id: p.id,
      categoryId: p.categoryId,
      code: p.code,
      name: p.name,
      searchName: p.searchName,
      abbreviation: p.abbreviation,
      description: p.description,
      imageUrl: p.imageUrl,
      price: p.price,
      costPrice: p.costPrice,
      vatRate: p.vatRate,
      unit: p.unit,
      type: p.type,
      isAvailable: true,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      preparationTime: p.preparationTime,
      printToKitchen: p.printDish,
      printToBar: p.printLabel,
      kitchenIds: productKitchenMap.get(p.id)?.join(',') || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Get kitchens for a branch
   */
  async getKitchens(branchId: string, tenantId: string): Promise<PosKitchenDto[]> {
    const kitchens = await this.kitchenRepository.find({
      where: { tenantId, branchId, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    return kitchens.map(k => ({
      id: k.id,
      name: k.name,
      kitchenType: k.kitchenType,
      printerName: k.printerName,
      printerIp: k.printerIp,
      printerPort: k.printerPort,
      paperWidth: k.paperWidth,
      printMode: k.printMode,
      description: k.description,
      isActive: k.isActive,
      sortOrder: k.sortOrder,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    }));
  }
}
