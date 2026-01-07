import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TransactionCategoriesService } from './transaction-categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTransactionCategoryDto, UpdateTransactionCategoryDto } from './dto';
import { TransactionType } from '../../database/entities';

@ApiTags('Transaction Categories - Danh mục thu chi')
@Controller('transaction-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionCategoriesController {
  constructor(
    private readonly categoriesService: TransactionCategoriesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách danh mục thu chi (có phân trang)' })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false, description: 'Loại: income (thu) hoặc expense (chi)' })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo tên hoặc mã' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('type') type?: TransactionType,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.categoriesService.findAll({
      type,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('dropdown')
  @ApiOperation({ summary: 'Lấy danh sách danh mục cho dropdown (không phân trang)' })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false })
  findAllForDropdown(@Query('type') type?: TransactionType) {
    return this.categoriesService.findAllForDropdown(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết danh mục' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  create(@Body() createDto: CreateTransactionCategoryDto) {
    return this.categoriesService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTransactionCategoryDto) {
    return this.categoriesService.update(id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng danh mục' })
  toggleActive(@Param('id') id: string) {
    return this.categoriesService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh mục (không áp dụng cho danh mục hệ thống)' })
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Khởi tạo danh mục mặc định' })
  seed() {
    return this.categoriesService.seed();
  }
}
