import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Staff')
@Controller('staff')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhân viên trong tenant' })
  findAll(@Request() req) {
    return this.staffService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin nhân viên' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.staffService.findOne(req.user.tenantId, id);
  }
}
