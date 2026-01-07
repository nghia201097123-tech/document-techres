import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateUnitDto, UpdateUnitDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../../database/entities';

@ApiTags('Units')
@Controller('units')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UnitsController {
  constructor(
    private readonly unitsService: UnitsService,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

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
  async create(@Request() req, @Body() createDto: CreateUnitDto) {
    // Ưu tiên: 1) brandId từ DTO, 2) brandId từ token, 3) brand đầu tiên của tenant
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
