import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TransactionCategoriesService } from './transaction-categories.service';
import { CreateTransactionCategoryDto } from './dto/create-transaction-category.dto';
import { UpdateTransactionCategoryDto } from './dto/update-transaction-category.dto';
import { FilterTransactionCategoryDto } from './dto/filter-transaction-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Transaction Categories')
@Controller('transaction-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionCategoriesController {
  constructor(private readonly service: TransactionCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục thu/chi mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 409, description: 'Mã danh mục đã tồn tại' })
  create(@Body() createDto: CreateTransactionCategoryDto) {
    return this.service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách danh mục thu/chi' })
  findAll(@Query() filterDto: FilterTransactionCategoryDto) {
    return this.service.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết danh mục' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  @ApiResponse({ status: 400, description: 'Không thể chỉnh sửa danh mục hệ thống' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTransactionCategoryDto,
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh mục' })
  @ApiResponse({ status: 400, description: 'Không thể xóa danh mục hệ thống' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Bật/tắt trạng thái hoạt động' })
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.toggleActive(id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Tạo danh mục mặc định' })
  seed() {
    return this.service.seedDefaults();
  }
}
