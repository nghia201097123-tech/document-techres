import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  BulkImportProductDto,
  BulkUpdateCategoryDto,
  BulkToggleActiveDto,
  BulkDeleteProductsDto,
  BulkUpdateVatRateDto,
  BulkUpdatePriceDto,
  BulkUpdatePrintLabelDto,
  BulkUpdatePrintSeafoodDto,
  BulkUpdatePrintDishDto,
  BulkUpdateUnitDto,
  BulkUpdateSellingTypeDto,
  BulkUpdatePreparationTimeDto,
  BulkUpdateAvatarDto,
} from './dto';
import { ProductType } from '../../database/entities';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách món' })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ProductType })
  findAll(
    @Request() req,
    @Query('brandId') brandId?: string,
    @Query('type') type?: ProductType,
  ) {
    return this.productsService.findAll(req.user.tenantId, brandId, type);
  }

  @Get('with-seasonal-prices')
  @ApiOperation({ summary: 'Lấy danh sách món với thông tin giá thời vụ' })
  @ApiQuery({ name: 'brandId', required: true })
  @ApiQuery({ name: 'branchId', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ProductType })
  findAllWithSeasonalPrices(
    @Request() req,
    @Query('brandId') brandId: string,
    @Query('branchId') branchId: string,
    @Query('type') type?: ProductType,
  ) {
    return this.productsService.findAllWithSeasonalPrices(req.user.tenantId, brandId, branchId, type);
  }

  @Get('toppings/available')
  @ApiOperation({ summary: 'Lấy danh sách topping có thể gán' })
  @ApiQuery({ name: 'brandId', required: false })
  getAvailableToppings(@Request() req, @Query('brandId') brandId?: string) {
    return this.productsService.getAvailableToppings(req.user.tenantId, brandId);
  }

  // === Shared Topping Group Management ===

  @Get('topping-groups')
  @ApiOperation({ summary: 'Lấy danh sách tất cả nhóm topping (shared)' })
  getAllToppingGroups(@Request() req) {
    return this.productsService.getAllToppingGroups(req.user.tenantId);
  }

  @Get('topping-groups/:groupId')
  @ApiOperation({ summary: 'Lấy thông tin nhóm topping' })
  getToppingGroupById(@Request() req, @Param('groupId') groupId: string) {
    return this.productsService.getToppingGroupById(req.user.tenantId, groupId);
  }

  @Post('topping-groups')
  @ApiOperation({ summary: 'Tạo nhóm topping mới (shared)' })
  createToppingGroup(@Request() req, @Body() dto: CreateToppingGroupDto) {
    return this.productsService.createToppingGroup(req.user.tenantId, dto);
  }

  @Put('topping-groups/:groupId')
  @ApiOperation({ summary: 'Cập nhật nhóm topping' })
  updateToppingGroup(
    @Request() req,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateToppingGroupDto,
  ) {
    return this.productsService.updateToppingGroup(req.user.tenantId, groupId, dto);
  }

  @Delete('topping-groups/:groupId')
  @ApiOperation({ summary: 'Xóa nhóm topping' })
  deleteToppingGroup(@Request() req, @Param('groupId') groupId: string) {
    return this.productsService.deleteToppingGroup(req.user.tenantId, groupId);
  }

  @Patch('topping-groups/:groupId/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng nhóm topping' })
  toggleToppingGroupActive(@Request() req, @Param('groupId') groupId: string) {
    return this.productsService.toggleToppingGroupActive(req.user.tenantId, groupId);
  }

  // === Topping Group Item Management ===

  @Post('topping-groups/:groupId/items')
  @ApiOperation({ summary: 'Thêm topping vào nhóm' })
  addToppingItem(
    @Request() req,
    @Param('groupId') groupId: string,
    @Body() dto: AddToppingItemDto,
  ) {
    return this.productsService.addToppingItem(req.user.tenantId, groupId, dto);
  }

  @Put('topping-groups/:groupId/items/:itemId')
  @ApiOperation({ summary: 'Cập nhật topping trong nhóm' })
  updateToppingItem(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateToppingItemDto,
  ) {
    return this.productsService.updateToppingItem(req.user.tenantId, groupId, itemId, dto);
  }

  @Delete('topping-groups/:groupId/items/:itemId')
  @ApiOperation({ summary: 'Xóa topping khỏi nhóm' })
  removeToppingItem(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.productsService.removeToppingItem(req.user.tenantId, groupId, itemId);
  }

  // === Product Topping Group Assignment ===

  @Get(':id/topping-groups')
  @ApiOperation({ summary: 'Lấy danh sách nhóm topping đã gán cho món' })
  getProductToppingGroups(@Request() req, @Param('id') id: string) {
    return this.productsService.getProductToppingGroups(req.user.tenantId, id);
  }

  @Post(':id/topping-groups')
  @ApiOperation({ summary: 'Gán nhiều nhóm topping cho món' })
  assignToppingGroupsToProduct(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AssignToppingGroupsDto,
  ) {
    return this.productsService.assignToppingGroupsToProduct(req.user.tenantId, id, dto);
  }

  @Post(':id/topping-groups/:groupId')
  @ApiOperation({ summary: 'Thêm một nhóm topping vào món' })
  addToppingGroupToProduct(
    @Request() req,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
  ) {
    return this.productsService.addToppingGroupToProduct(req.user.tenantId, id, groupId);
  }

  @Delete(':id/topping-groups/:groupId')
  @ApiOperation({ summary: 'Xóa nhóm topping khỏi món' })
  removeToppingGroupFromProduct(
    @Request() req,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
  ) {
    return this.productsService.removeToppingGroupFromProduct(req.user.tenantId, id, groupId);
  }

  // === Bulk Operations (MUST be before :id routes) ===

  @Post('bulk-import')
  @ApiOperation({ summary: 'Import nhiều món từ Excel' })
  bulkImport(@Request() req, @Body() dto: BulkImportProductDto) {
    return this.productsService.bulkImport(req.user.tenantId, dto);
  }

  @Post('bulk/update-category')
  @ApiOperation({ summary: 'Chuyển danh mục cho nhiều món' })
  bulkUpdateCategory(@Request() req, @Body() dto: BulkUpdateCategoryDto) {
    return this.productsService.bulkUpdateCategory(
      req.user.tenantId,
      dto.productIds,
      dto.categoryId,
    );
  }

  @Post('bulk/toggle-active')
  @ApiOperation({ summary: 'Bật/tắt trạng thái nhiều món' })
  bulkToggleActive(@Request() req, @Body() dto: BulkToggleActiveDto) {
    return this.productsService.bulkToggleActive(
      req.user.tenantId,
      dto.productIds,
      dto.isActive,
    );
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Xóa nhiều món' })
  bulkDelete(@Request() req, @Body() dto: BulkDeleteProductsDto) {
    return this.productsService.bulkDelete(req.user.tenantId, dto.productIds);
  }

  @Post('bulk/update-vat-rate')
  @ApiOperation({ summary: 'Cập nhật VAT cho nhiều món' })
  bulkUpdateVatRate(@Request() req, @Body() dto: BulkUpdateVatRateDto) {
    return this.productsService.bulkUpdateVatRate(
      req.user.tenantId,
      dto.productIds,
      dto.vatRate,
    );
  }

  @Post('bulk/update-price')
  @ApiOperation({ summary: 'Cập nhật giá cho nhiều món' })
  bulkUpdatePrice(@Request() req, @Body() dto: BulkUpdatePriceDto) {
    return this.productsService.bulkUpdatePrice(
      req.user.tenantId,
      dto.productIds,
      dto.price,
    );
  }

  @Post('bulk/update-print-label')
  @ApiOperation({ summary: 'Cập nhật in tem cho nhiều món' })
  bulkUpdatePrintLabel(@Request() req, @Body() dto: BulkUpdatePrintLabelDto) {
    return this.productsService.bulkUpdatePrintLabel(
      req.user.tenantId,
      dto.productIds,
      dto.printLabel,
    );
  }

  @Post('bulk/update-print-seafood')
  @ApiOperation({ summary: 'Cập nhật in hồ hải sản cho nhiều món' })
  bulkUpdatePrintSeafood(@Request() req, @Body() dto: BulkUpdatePrintSeafoodDto) {
    return this.productsService.bulkUpdatePrintSeafood(
      req.user.tenantId,
      dto.productIds,
      dto.printSeafood,
    );
  }

  @Post('bulk/update-print-dish')
  @ApiOperation({ summary: 'Cập nhật in món cho nhiều món' })
  bulkUpdatePrintDish(@Request() req, @Body() dto: BulkUpdatePrintDishDto) {
    return this.productsService.bulkUpdatePrintDish(
      req.user.tenantId,
      dto.productIds,
      dto.printDish,
    );
  }

  @Post('bulk/update-unit')
  @ApiOperation({ summary: 'Cập nhật đơn vị cho nhiều món' })
  bulkUpdateUnit(@Request() req, @Body() dto: BulkUpdateUnitDto) {
    return this.productsService.bulkUpdateUnit(
      req.user.tenantId,
      dto.productIds,
      dto.unit,
    );
  }

  @Post('bulk/update-selling-type')
  @ApiOperation({ summary: 'Cập nhật loại bán cho nhiều món' })
  bulkUpdateSellingType(@Request() req, @Body() dto: BulkUpdateSellingTypeDto) {
    return this.productsService.bulkUpdateSellingType(
      req.user.tenantId,
      dto.productIds,
      dto.sellingType,
    );
  }

  @Post('bulk/update-preparation-time')
  @ApiOperation({ summary: 'Cập nhật thời gian chế biến cho nhiều món' })
  bulkUpdatePreparationTime(@Request() req, @Body() dto: BulkUpdatePreparationTimeDto) {
    return this.productsService.bulkUpdatePreparationTime(
      req.user.tenantId,
      dto.productIds,
      dto.preparationTime,
    );
  }

  @Post('bulk/update-avatar')
  @ApiOperation({ summary: 'Cập nhật ảnh cho nhiều món (theo mã món)' })
  bulkUpdateAvatar(@Request() req, @Body() dto: BulkUpdateAvatarDto) {
    return this.productsService.bulkUpdateAvatar(req.user.tenantId, dto.items);
  }

  // === Product CRUD ===

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin món' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.productsService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo món mới' })
  create(@Request() req, @Body() createDto: CreateProductDto) {
    const brandId = req.user.brandId;
    return this.productsService.create(req.user.tenantId, brandId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật món' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateProductDto) {
    return this.productsService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng món' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.productsService.toggleActive(req.user.tenantId, id);
  }

  // === Product Notes Management ===

  @Get('notes/all')
  @ApiOperation({ summary: 'Lấy danh sách tất cả ghi chú' })
  getAllNotes(@Request() req) {
    return this.productsService.getAllNotes(req.user.tenantId);
  }

  @Post('notes')
  @ApiOperation({ summary: 'Tạo ghi chú mới' })
  createNote(@Request() req, @Body() dto: CreateProductNoteDto) {
    return this.productsService.createNote(req.user.tenantId, dto);
  }

  @Put('notes/:noteId')
  @ApiOperation({ summary: 'Cập nhật ghi chú' })
  updateNote(
    @Request() req,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateProductNoteDto,
  ) {
    return this.productsService.updateNote(req.user.tenantId, noteId, dto);
  }

  @Delete('notes/:noteId')
  @ApiOperation({ summary: 'Xóa ghi chú' })
  deleteNote(@Request() req, @Param('noteId') noteId: string) {
    return this.productsService.deleteNote(req.user.tenantId, noteId);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Lấy danh sách ghi chú của món' })
  getProductNotes(@Request() req, @Param('id') id: string) {
    return this.productsService.getProductNotes(req.user.tenantId, id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Gán nhiều ghi chú cho món' })
  assignNotesToProduct(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AssignNotesToProductDto,
  ) {
    return this.productsService.assignNotesToProduct(req.user.tenantId, id, dto);
  }

  @Post(':id/notes/:noteId')
  @ApiOperation({ summary: 'Thêm một ghi chú vào món' })
  addNoteToProduct(
    @Request() req,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    return this.productsService.addNoteToProduct(req.user.tenantId, id, noteId);
  }

  @Delete(':id/notes/:noteId')
  @ApiOperation({ summary: 'Xóa ghi chú khỏi món' })
  removeNoteFromProduct(
    @Request() req,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    return this.productsService.removeNoteFromProduct(req.user.tenantId, id, noteId);
  }

  // === Note to Multiple Products Assignment ===

  @Get('notes/:noteId/products')
  @ApiOperation({ summary: 'Lấy danh sách món đã gán ghi chú' })
  getProductsByNote(@Request() req, @Param('noteId') noteId: string) {
    return this.productsService.getProductsByNote(req.user.tenantId, noteId);
  }

  @Post('notes/:noteId/products')
  @ApiOperation({ summary: 'Gán ghi chú cho nhiều món cùng lúc' })
  assignNoteToProducts(
    @Request() req,
    @Param('noteId') noteId: string,
    @Body() dto: AssignNoteToProductsDto,
  ) {
    return this.productsService.assignNoteToProducts(req.user.tenantId, noteId, dto);
  }

  // === Combo Items Management ===

  @Get('combo/available-products')
  @ApiOperation({ summary: 'Lấy danh sách món có thể thêm vào combo (trừ combo và topping)' })
  @ApiQuery({ name: 'brandId', required: false })
  getAvailableProductsForCombo(@Request() req, @Query('brandId') brandId?: string) {
    return this.productsService.getAvailableProductsForCombo(req.user.tenantId, brandId);
  }

  @Get(':id/combo-items')
  @ApiOperation({ summary: 'Lấy danh sách món trong combo' })
  getComboItems(@Request() req, @Param('id') id: string) {
    return this.productsService.getComboItems(req.user.tenantId, id);
  }

  @Post(':id/combo-items')
  @ApiOperation({ summary: 'Gán danh sách món vào combo' })
  assignComboItems(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AssignComboItemsDto,
  ) {
    return this.productsService.assignComboItems(req.user.tenantId, id, dto);
  }

  @Post(':id/combo-items/:productId')
  @ApiOperation({ summary: 'Thêm một món vào combo' })
  addItemToCombo(
    @Request() req,
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body('quantity') quantity?: number,
  ) {
    return this.productsService.addItemToCombo(req.user.tenantId, id, productId, quantity || 1);
  }

  @Delete(':id/combo-items/:productId')
  @ApiOperation({ summary: 'Xóa món khỏi combo' })
  removeItemFromCombo(
    @Request() req,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.removeItemFromCombo(req.user.tenantId, id, productId);
  }
}
