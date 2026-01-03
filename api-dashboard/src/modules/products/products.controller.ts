import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateProductDto, UpdateProductDto, ProductType, SetToppingsDto, AddToppingDto } from './dto';

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

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin món' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.productsService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo món mới' })
  create(@Request() req, @Body() createDto: CreateProductDto) {
    // Use brandId from token or from DTO
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

  // === Topping Management ===

  @Get('toppings/available')
  @ApiOperation({ summary: 'Lấy danh sách topping có thể gán' })
  @ApiQuery({ name: 'brandId', required: false })
  getAvailableToppings(@Request() req, @Query('brandId') brandId?: string) {
    return this.productsService.getAvailableToppings(req.user.tenantId, brandId);
  }

  @Get(':id/toppings')
  @ApiOperation({ summary: 'Lấy danh sách topping của món' })
  getToppings(@Request() req, @Param('id') id: string) {
    return this.productsService.getToppings(req.user.tenantId, id);
  }

  @Put(':id/toppings')
  @ApiOperation({ summary: 'Cập nhật toàn bộ danh sách topping của món' })
  setToppings(@Request() req, @Param('id') id: string, @Body() dto: SetToppingsDto) {
    return this.productsService.setToppings(req.user.tenantId, id, dto);
  }

  @Post(':id/toppings')
  @ApiOperation({ summary: 'Thêm topping vào món' })
  addTopping(@Request() req, @Param('id') id: string, @Body() dto: AddToppingDto) {
    return this.productsService.addTopping(req.user.tenantId, id, dto);
  }

  @Delete(':id/toppings/:toppingId')
  @ApiOperation({ summary: 'Xóa topping khỏi món' })
  removeTopping(
    @Request() req,
    @Param('id') id: string,
    @Param('toppingId') toppingId: string,
  ) {
    return this.productsService.removeTopping(req.user.tenantId, id, toppingId);
  }
}
