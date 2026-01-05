import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateVoucherDto, UpdateVoucherDto } from './dto';

@ApiTags('Vouchers')
@Controller('vouchers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách voucher' })
  @ApiQuery({ name: 'brandId', required: false })
  findAll(@Request() req, @Query('brandId') brandId?: string) {
    return this.vouchersService.findAll(req.user.tenantId, brandId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin voucher' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.vouchersService.findOne(req.user.tenantId, id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Tìm voucher theo mã' })
  findByCode(@Request() req, @Param('code') code: string) {
    return this.vouchersService.findByCode(req.user.tenantId, code);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo voucher mới' })
  create(@Request() req, @Body() createDto: CreateVoucherDto) {
    const brandId = req.user.brandId;
    return this.vouchersService.create(req.user.tenantId, brandId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật voucher' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateVoucherDto) {
    return this.vouchersService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng voucher' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.vouchersService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa voucher' })
  delete(@Request() req, @Param('id') id: string) {
    return this.vouchersService.delete(req.user.tenantId, id);
  }
}
