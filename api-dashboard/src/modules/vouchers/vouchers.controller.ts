import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateVoucherDto, UpdateVoucherDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../../database/entities';

@ApiTags('Vouchers')
@Controller('vouchers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VouchersController {
  constructor(
    private readonly vouchersService: VouchersService,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

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
  async create(@Request() req, @Body() createDto: CreateVoucherDto) {
    let brandId = createDto.brandId || req.user.brandId;

    if (!brandId) {
      const firstBrand = await this.brandRepository.findOne({
        where: { tenantId: req.user.tenantId, isActive: true },
        order: { createdAt: 'ASC' },
      });
      if (!firstBrand) {
        throw new BadRequestException('Không tìm thấy thương hiệu. Vui lòng tạo thương hiệu trước.');
      }
      brandId = firstBrand.id;
    }

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
