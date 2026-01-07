import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SurchargesService } from './surcharges.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateSurchargeDto, UpdateSurchargeDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../../database/entities';

@ApiTags('Surcharges')
@Controller('surcharges')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SurchargesController {
  constructor(
    private readonly surchargesService: SurchargesService,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phụ thu' })
  @ApiQuery({ name: 'brandId', required: false })
  findAll(@Request() req, @Query('brandId') brandId?: string) {
    return this.surchargesService.findAll(req.user.tenantId, brandId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin phụ thu' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.surchargesService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo phụ thu mới' })
  async create(@Request() req, @Body() createDto: CreateSurchargeDto) {
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

    return this.surchargesService.create(req.user.tenantId, brandId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật phụ thu' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateSurchargeDto) {
    return this.surchargesService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng phụ thu' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.surchargesService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phụ thu' })
  delete(@Request() req, @Param('id') id: string) {
    return this.surchargesService.delete(req.user.tenantId, id);
  }
}
