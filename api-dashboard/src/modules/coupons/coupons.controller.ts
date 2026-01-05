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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách coupon' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.couponsService.findAll(tenantId, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết coupon' })
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.couponsService.findOne(tenantId, id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Tìm coupon theo mã' })
  @ApiQuery({ name: 'branchId', required: true })
  findByCode(
    @TenantId() tenantId: string,
    @Query('branchId') branchId: string,
    @Param('code') code: string,
  ) {
    return this.couponsService.findByCode(tenantId, branchId, code);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo coupon mới' })
  @ApiQuery({ name: 'branchId', required: true })
  create(
    @TenantId() tenantId: string,
    @Query('branchId') branchId: string,
    @Body() createDto: CreateCouponDto,
  ) {
    return this.couponsService.create(tenantId, branchId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật coupon' })
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCouponDto,
  ) {
    return this.couponsService.update(tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Bật/tắt trạng thái coupon' })
  toggleActive(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.couponsService.toggleActive(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa coupon' })
  delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.couponsService.delete(tenantId, id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Kiểm tra coupon có hợp lệ không' })
  @ApiQuery({ name: 'branchId', required: true })
  validateCoupon(
    @TenantId() tenantId: string,
    @Query('branchId') branchId: string,
    @Body() body: { code: string; orderAmount: number },
  ) {
    return this.couponsService.validateCoupon(tenantId, branchId, body.code, body.orderAmount);
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Sử dụng coupon (tăng số lượt đã dùng)' })
  useCoupon(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.couponsService.useCoupon(tenantId, id);
  }
}
