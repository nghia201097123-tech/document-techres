import { Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateStaffDto, UpdateStaffDto } from './dto';

@ApiTags('Staff')
@Controller('staff')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhân viên trong tenant' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(@Request() req, @Query('branchId') branchId?: string) {
    return this.staffService.findAll(req.user.tenantId, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin nhân viên' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.staffService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo nhân viên mới' })
  create(@Request() req, @Body() createDto: CreateStaffDto) {
    // Sử dụng branchId và brandId từ DTO thay vì từ user context
    return this.staffService.create(
      req.user.tenantId,
      req.user.companyId,
      createDto,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin nhân viên' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateStaffDto) {
    return this.staffService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng nhân viên' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.staffService.toggleActive(req.user.tenantId, id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset mật khẩu nhân viên' })
  resetPassword(@Request() req, @Param('id') id: string) {
    return this.staffService.resetPassword(req.user.tenantId, id);
  }
}
