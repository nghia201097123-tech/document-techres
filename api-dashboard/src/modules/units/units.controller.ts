import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateUnitDto, UpdateUnitDto } from './dto';

@ApiTags('Units')
@Controller('units')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn vị tính' })
  @ApiQuery({ name: 'brandId', required: false })
  findAll(@Request() req, @Query('brandId') brandId?: string) {
    return this.unitsService.findAll(req.user.tenantId, brandId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin đơn vị tính' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.unitsService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo đơn vị tính mới' })
  create(@Request() req, @Body() createDto: CreateUnitDto) {
    const brandId = req.user.brandId;
    return this.unitsService.create(req.user.tenantId, brandId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật đơn vị tính' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateUnitDto) {
    return this.unitsService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng đơn vị tính' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.unitsService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đơn vị tính' })
  delete(@Request() req, @Param('id') id: string) {
    return this.unitsService.delete(req.user.tenantId, id);
  }
}
