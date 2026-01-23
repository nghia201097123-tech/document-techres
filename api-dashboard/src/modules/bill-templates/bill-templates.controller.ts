import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillTemplatesService } from './bill-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateBillTemplateDto, UpdateBillTemplateDto } from './dto';

@ApiTags('Bill Templates')
@Controller('bill-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillTemplatesController {
  constructor(private readonly service: BillTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách mẫu bill' })
  async findAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get('brand/:brandId')
  @ApiOperation({ summary: 'Lấy danh sách mẫu bill theo thương hiệu' })
  findByBrand(@Request() req, @Param('brandId') brandId: string) {
    return this.service.findByBrand(req.user.tenantId, brandId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin mẫu bill' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo mẫu bill mới cho thương hiệu' })
  create(@Request() req, @Body() createDto: CreateBillTemplateDto) {
    return this.service.create(req.user.tenantId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật mẫu bill' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateBillTemplateDto) {
    return this.service.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng mẫu bill' })
  toggle(@Request() req, @Param('id') id: string) {
    return this.service.toggle(req.user.tenantId, id);
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Đặt làm mẫu mặc định cho thương hiệu' })
  setDefault(@Request() req, @Param('id') id: string) {
    return this.service.setDefault(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mẫu bill' })
  delete(@Request() req, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }
}
