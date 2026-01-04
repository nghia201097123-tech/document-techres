import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { ProductType } from '../../database/entities/product.entity';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách danh mục' })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'productType', required: false, enum: ProductType })
  findAll(
    @Request() req,
    @Query('brandId') brandId?: string,
    @Query('productType') productType?: ProductType,
  ) {
    return this.categoriesService.findAll(req.user.tenantId, brandId, productType);
  }

  @Get('count-by-type')
  @ApiOperation({ summary: 'Đếm số danh mục theo loại sản phẩm' })
  @ApiQuery({ name: 'brandId', required: false })
  countByType(@Request() req, @Query('brandId') brandId?: string) {
    return this.categoriesService.countByType(req.user.tenantId, brandId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin danh mục' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.categoriesService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  create(@Request() req, @Body() createDto: CreateCategoryDto) {
    const brandId = req.user.brandId;
    return this.categoriesService.create(req.user.tenantId, brandId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
    return this.categoriesService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng danh mục' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.categoriesService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh mục' })
  delete(@Request() req, @Param('id') id: string) {
    return this.categoriesService.delete(req.user.tenantId, id);
  }
}
