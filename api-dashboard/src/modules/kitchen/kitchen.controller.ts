import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Lấy danh sách bếp' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(@Request() req, @Query('branchId') branchId?: string) {
    return this.kitchenService.findAll(req.user.tenantId, branchId);
  }

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
}
