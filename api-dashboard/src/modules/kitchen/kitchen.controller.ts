import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateKitchenDto, UpdateKitchenDto } from './dto';

@ApiTags('Kitchen')
@Controller('kitchen')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bếp với số lượng món' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(@Request() req, @Query('branchId') branchId?: string) {
    return this.kitchenService.findAllWithProductCount(req.user.tenantId, branchId);
  }

  // IMPORTANT: Static routes MUST be placed BEFORE parameterized routes (:id)
  // Otherwise NestJS will match 'products' or 'product' as :id value

  @Get('products/with-assignments')
  @ApiOperation({ summary: 'Lấy danh sách món ăn với các bếp đã gán (cho dialog gán món)' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  getProductsWithKitchenAssignments(
    @Request() req,
    @Query('branchId') branchId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.kitchenService.getProductsWithKitchenAssignments(
      req.user.tenantId,
      branchId,
      categoryId,
      search,
    );
  }

  @Get('product/:productId/kitchens')
  @ApiOperation({ summary: 'Lấy danh sách bếp của món ăn' })
  getProductKitchens(@Request() req, @Param('productId') productId: string) {
    return this.kitchenService.getProductKitchens(req.user.tenantId, productId);
  }

  @Put('product/:productId/kitchens')
  @ApiOperation({ summary: 'Gán danh sách bếp cho món ăn (thay thế toàn bộ)' })
  @ApiBody({ schema: { type: 'object', properties: { kitchenIds: { type: 'array', items: { type: 'string' } } } } })
  setProductKitchens(
    @Request() req,
    @Param('productId') productId: string,
    @Body('kitchenIds') kitchenIds: string[],
  ) {
    return this.kitchenService.setProductKitchens(req.user.tenantId, productId, kitchenIds || []);
  }

  // Parameterized routes with :id below

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin bếp' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.kitchenService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo bếp mới' })
  create(@Request() req, @Body() createDto: CreateKitchenDto) {
    const branchId = req.user.branchId;
    return this.kitchenService.create(req.user.tenantId, branchId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bếp' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateKitchenDto) {
    return this.kitchenService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng bếp' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.kitchenService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bếp' })
  delete(@Request() req, @Param('id') id: string) {
    return this.kitchenService.delete(req.user.tenantId, id);
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Lấy danh sách món ăn của bếp' })
  getKitchenProducts(@Request() req, @Param('id') id: string) {
    return this.kitchenService.getKitchenProducts(req.user.tenantId, id);
  }

  @Put(':id/products')
  @ApiOperation({ summary: 'Gán danh sách món ăn cho bếp (thay thế toàn bộ)' })
  @ApiBody({ schema: { type: 'object', properties: { productIds: { type: 'array', items: { type: 'string' } } } } })
  setKitchenProducts(
    @Request() req,
    @Param('id') id: string,
    @Body('productIds') productIds: string[],
  ) {
    return this.kitchenService.setKitchenProducts(req.user.tenantId, id, productIds || []);
  }

  @Post(':id/products/:productId')
  @ApiOperation({ summary: 'Thêm món ăn vào bếp' })
  addProductToKitchen(
    @Request() req,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.kitchenService.addProductToKitchen(req.user.tenantId, id, productId);
  }

  @Delete(':id/products/:productId')
  @ApiOperation({ summary: 'Xóa món ăn khỏi bếp' })
  removeProductFromKitchen(
    @Request() req,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.kitchenService.removeProductFromKitchen(req.user.tenantId, id, productId);
  }

  @Post(':id/products/category/:categoryId')
  @ApiOperation({ summary: 'Thêm tất cả món ăn trong danh mục vào bếp' })
  @ApiQuery({ name: 'branchId', required: false })
  addCategoryProductsToKitchen(
    @Request() req,
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.kitchenService.addCategoryProductsToKitchen(
      req.user.tenantId,
      id,
      categoryId,
      branchId,
    );
  }

  @Delete(':id/products/category/:categoryId')
  @ApiOperation({ summary: 'Xóa tất cả món ăn trong danh mục khỏi bếp' })
  @ApiQuery({ name: 'branchId', required: false })
  removeCategoryProductsFromKitchen(
    @Request() req,
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.kitchenService.removeCategoryProductsFromKitchen(
      req.user.tenantId,
      id,
      categoryId,
      branchId,
    );
  }
}
