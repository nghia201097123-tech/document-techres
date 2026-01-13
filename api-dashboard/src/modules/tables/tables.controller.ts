import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTableDto, UpdateTableDto } from './dto';
import { TableStatus } from '../../database/entities';

@ApiTags('Tables')
@Controller('tables')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bàn' })
  @ApiQuery({ name: 'areaId', required: false })
  findAll(@Request() req, @Query('areaId') areaId?: string) {
    return this.tablesService.findAll(req.user.tenantId, req.user.branchId, areaId);
  }

  @Get('count-by-area')
  @ApiOperation({ summary: 'Đếm số bàn theo khu vực' })
  countByArea(@Request() req) {
    return this.tablesService.countByArea(req.user.tenantId, req.user.branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin bàn' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.tablesService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo bàn mới' })
  create(@Request() req, @Body() createDto: CreateTableDto) {
    return this.tablesService.create(req.user.tenantId, req.user.branchId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bàn' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateTableDto) {
    return this.tablesService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái bàn' })
  updateStatus(@Request() req, @Param('id') id: string, @Body('status') status: TableStatus) {
    return this.tablesService.updateStatus(req.user.tenantId, id, status);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng bàn' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.tablesService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bàn' })
  delete(@Request() req, @Param('id') id: string) {
    return this.tablesService.delete(req.user.tenantId, id);
  }
}
