import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SeasonalPricesService } from './seasonal-prices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateSeasonalPriceDto, UpdateSeasonalPriceDto } from './dto';

@ApiTags('Seasonal Prices')
@Controller('seasonal-prices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SeasonalPricesController {
  constructor(private readonly seasonalPricesService: SeasonalPricesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giá thời vụ' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(@Request() req, @Query('branchId') branchId?: string) {
    return this.seasonalPricesService.findAll(req.user.tenantId, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin giá thời vụ' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.seasonalPricesService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo giá thời vụ mới' })
  create(@Request() req, @Body() createDto: CreateSeasonalPriceDto) {
    return this.seasonalPricesService.create(req.user.tenantId, createDto.branchId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật giá thời vụ' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateSeasonalPriceDto) {
    return this.seasonalPricesService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng giá thời vụ' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.seasonalPricesService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa giá thời vụ' })
  delete(@Request() req, @Param('id') id: string) {
    return this.seasonalPricesService.delete(req.user.tenantId, id);
  }
}
