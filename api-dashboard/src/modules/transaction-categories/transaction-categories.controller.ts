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
  Request,
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
    @Request() req,
    @Query('type') type?: TransactionType,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.categoriesService.findAll(req.user.tenantId, {
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
  findAllForDropdown(@Request() req, @Query('type') type?: TransactionType) {
    return this.categoriesService.findAllForDropdown(req.user.tenantId, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết danh mục' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.categoriesService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  create(@Request() req, @Body() createDto: CreateTransactionCategoryDto) {
    return this.categoriesService.create(req.user.tenantId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateTransactionCategoryDto) {
    return this.categoriesService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng danh mục' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.categoriesService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh mục (không áp dụng cho danh mục hệ thống)' })
  delete(@Request() req, @Param('id') id: string) {
    return this.categoriesService.delete(req.user.tenantId, id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Khởi tạo danh mục mặc định' })
  seed(@Request() req) {
    return this.categoriesService.seed(req.user.tenantId);
  }
}
