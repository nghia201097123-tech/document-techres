import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillTemplatesService } from './bill-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateBillTemplateDto, UpdateBillTemplateDto, UpdateBillTemplateWithPrinterDto, CreateBillTemplateWithPrinterDto } from './dto';

@ApiTags('Bill Templates')
@Controller('bill-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillTemplatesController {
  constructor(private readonly service: BillTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách mẫu bill' })
  @ApiQuery({ name: 'brandId', required: false })
  async findAll(@Request() req, @Query('brandId') brandId?: string) {
    // If brandId provided, get branch IDs for that brand
    // For now, just return all templates for the tenant
    return this.service.findAll(req.user.tenantId);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Lấy danh sách mẫu bill theo chi nhánh' })
  findByBranch(@Request() req, @Param('branchId') branchId: string) {
    return this.service.findByBranch(req.user.tenantId, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin mẫu bill' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo mẫu bill mới' })
  @ApiQuery({ name: 'brandId', required: false })
  create(@Request() req, @Body() createDto: CreateBillTemplateDto) {
    return this.service.create(req.user.tenantId, createDto);
  }

  @Post('with-printer')
  @ApiOperation({ summary: 'Tạo mẫu bill mới kèm cấu hình máy in' })
  @ApiQuery({ name: 'brandId', required: false })
  createWithPrinter(@Request() req, @Body() createDto: CreateBillTemplateWithPrinterDto) {
    return this.service.createWithPrinter(req.user.tenantId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật mẫu bill' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateBillTemplateDto) {
    return this.service.update(req.user.tenantId, id, updateDto);
  }

  @Put(':id/with-printer')
  @ApiOperation({ summary: 'Cập nhật mẫu bill và cấu hình máy in cùng lúc' })
  updateWithPrinter(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateBillTemplateWithPrinterDto) {
    return this.service.updateWithPrinter(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng mẫu bill' })
  toggle(@Request() req, @Param('id') id: string) {
    return this.service.toggle(req.user.tenantId, id);
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Đặt làm mẫu mặc định' })
  setDefault(@Request() req, @Param('id') id: string) {
    return this.service.setDefault(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mẫu bill' })
  delete(@Request() req, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }
}
