import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AreasService } from './areas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateAreaDto, UpdateAreaDto } from './dto';

@ApiTags('Areas')
@Controller('areas')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khu vực của chi nhánh' })
  findAll(@Request() req) {
    return this.areasService.findAll(req.user.tenantId, req.user.branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin khu vực' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.areasService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khu vực mới' })
  create(@Request() req, @Body() createDto: CreateAreaDto) {
    return this.areasService.create(req.user.tenantId, req.user.branchId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật khu vực' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateAreaDto) {
    return this.areasService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng khu vực' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.areasService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa khu vực' })
  delete(@Request() req, @Param('id') id: string) {
    return this.areasService.delete(req.user.tenantId, id);
  }
}
