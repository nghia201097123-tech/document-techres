import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GiftItemsService } from './gift-items.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateGiftItemDto, UpdateGiftItemDto } from './dto';

@ApiTags('Gift Items')
@Controller('gift-items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GiftItemsController {
  constructor(private readonly giftItemsService: GiftItemsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách món tặng' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(@Request() req, @Query('branchId') branchId?: string) {
    return this.giftItemsService.findAll(req.user.tenantId, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin món tặng' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.giftItemsService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo món tặng mới' })
  create(@Request() req, @Body() createDto: CreateGiftItemDto) {
    const branchId = req.user.branchId;
    return this.giftItemsService.create(req.user.tenantId, branchId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật món tặng' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateGiftItemDto) {
    return this.giftItemsService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng món tặng' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.giftItemsService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa món tặng' })
  delete(@Request() req, @Param('id') id: string) {
    return this.giftItemsService.delete(req.user.tenantId, id);
  }
}
