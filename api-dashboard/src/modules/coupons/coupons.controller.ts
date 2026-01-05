import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách coupon' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(
    @Request() req,
    @Query('branchId') branchId?: string,
  ) {
    return this.couponsService.findAll(req.user.tenantId, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết coupon' })
  findOne(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.couponsService.findOne(req.user.tenantId, id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Tìm coupon theo mã' })
  @ApiQuery({ name: 'branchId', required: true })
  findByCode(
    @Request() req,
    @Query('branchId') branchId: string,
    @Param('code') code: string,
  ) {
    return this.couponsService.findByCode(req.user.tenantId, branchId, code);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo coupon mới' })
  @ApiQuery({ name: 'branchId', required: true })
  create(
    @Request() req,
    @Query('branchId') branchId: string,
    @Body() createDto: CreateCouponDto,
  ) {
    return this.couponsService.create(req.user.tenantId, branchId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật coupon' })
  update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCouponDto,
  ) {
    return this.couponsService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Bật/tắt trạng thái coupon' })
  toggleActive(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.couponsService.toggleActive(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa coupon' })
  delete(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.couponsService.delete(req.user.tenantId, id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Kiểm tra coupon có hợp lệ không' })
  @ApiQuery({ name: 'branchId', required: true })
  validateCoupon(
    @Request() req,
    @Query('branchId') branchId: string,
    @Body() body: { code: string; orderAmount: number },
  ) {
    return this.couponsService.validateCoupon(req.user.tenantId, branchId, body.code, body.orderAmount);
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Sử dụng coupon (tăng số lượt đã dùng)' })
  useCoupon(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.couponsService.useCoupon(req.user.tenantId, id);
  }
}
