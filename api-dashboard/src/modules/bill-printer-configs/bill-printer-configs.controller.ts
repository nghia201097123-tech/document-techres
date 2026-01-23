import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillPrinterConfigsService } from './bill-printer-configs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateBillPrinterConfigDto, UpdateBillPrinterConfigDto } from './dto';

@ApiTags('Bill Printer Configs')
@Controller('bill-printer-configs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillPrinterConfigsController {
  constructor(private readonly service: BillPrinterConfigsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách cấu hình máy in bill' })
  @ApiQuery({ name: 'brandId', required: false })
  async findAll(@Request() req, @Query('brandId') brandId?: string) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Lấy danh sách cấu hình máy in theo chi nhánh' })
  findByBranch(@Request() req, @Param('branchId') branchId: string) {
    return this.service.findByBranch(req.user.tenantId, branchId);
  }

  @Get('by-template/:templateId')
  @ApiOperation({ summary: 'Lấy danh sách cấu hình máy in đang sử dụng mẫu bill' })
  findByTemplate(@Request() req, @Param('templateId') templateId: string) {
    return this.service.findByTemplate(req.user.tenantId, templateId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin cấu hình máy in' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo cấu hình máy in mới' })
  @ApiQuery({ name: 'brandId', required: false })
  create(@Request() req, @Body() createDto: CreateBillPrinterConfigDto) {
    return this.service.create(req.user.tenantId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật cấu hình máy in' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateBillPrinterConfigDto) {
    return this.service.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng máy in' })
  toggle(@Request() req, @Param('id') id: string) {
    return this.service.toggle(req.user.tenantId, id);
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Đặt làm máy in mặc định' })
  setDefault(@Request() req, @Param('id') id: string) {
    return this.service.setDefault(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa cấu hình máy in' })
  delete(@Request() req, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test kết nối máy in' })
  testConnection(@Request() req, @Param('id') id: string) {
    return this.service.testConnection(req.user.tenantId, id);
  }
}
