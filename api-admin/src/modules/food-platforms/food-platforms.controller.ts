import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FoodPlatformsService } from './food-platforms.service';
import { CreateFoodPlatformDto, UpdateFoodPlatformDto } from './dto';

@ApiTags('Food Platforms')
@Controller('food-platforms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FoodPlatformsController {
  constructor(private readonly foodPlatformsService: FoodPlatformsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách cổng kết nối food app' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Filter by tenant (company code)' })
  @ApiResponse({ status: 200, description: 'Danh sách cổng kết nối' })
  findAll(@Query('tenantId') tenantId?: string) {
    return this.foodPlatformsService.findAll(tenantId);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Lấy danh sách cổng kết nối theo chi nhánh' })
  @ApiResponse({ status: 200, description: 'Danh sách cổng kết nối của chi nhánh' })
  findByBranch(@Param('branchId') branchId: string) {
    return this.foodPlatformsService.findByBranch(branchId);
  }

  @Get('company/:companyCode')
  @ApiOperation({ summary: 'Lấy danh sách cổng kết nối theo công ty' })
  @ApiResponse({ status: 200, description: 'Danh sách cổng kết nối của công ty' })
  findByCompany(@Param('companyCode') companyCode: string) {
    return this.foodPlatformsService.findByCompany(companyCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết cổng kết nối' })
  @ApiResponse({ status: 200, description: 'Chi tiết cổng kết nối' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cổng kết nối' })
  findOne(@Param('id') id: string) {
    return this.foodPlatformsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo cổng kết nối mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy chi nhánh' })
  @ApiResponse({ status: 409, description: 'Cổng kết nối đã tồn tại cho platform này' })
  create(@Body() dto: CreateFoodPlatformDto) {
    return this.foodPlatformsService.create(dto);
  }

  @Post('branch/:branchId/all-platforms')
  @ApiOperation({
    summary: 'Tạo cổng kết nối cho tất cả platforms',
    description: 'Tự động tạo cổng kết nối Grab, BeFood, ShopeeFood cho chi nhánh',
  })
  @ApiResponse({ status: 201, description: 'Tạo thành công các cổng kết nối' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy chi nhánh' })
  createAllPlatforms(@Param('branchId') branchId: string) {
    return this.foodPlatformsService.createAllPlatformsForBranch(branchId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật cổng kết nối' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cổng kết nối' })
  update(@Param('id') id: string, @Body() dto: UpdateFoodPlatformDto) {
    return this.foodPlatformsService.update(id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Bật/tắt cổng kết nối' })
  @ApiResponse({ status: 200, description: 'Toggle thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cổng kết nối' })
  toggleActive(@Param('id') id: string) {
    return this.foodPlatformsService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa cổng kết nối' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cổng kết nối' })
  remove(@Param('id') id: string) {
    return this.foodPlatformsService.remove(id);
  }
}
