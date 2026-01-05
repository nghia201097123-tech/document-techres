import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateDepartmentDto, UpdateDepartmentDto, TransferAndDeleteDto } from './dto';

@ApiTags('Departments')
@Controller('departments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bộ phận' })
  findAll(@Request() req) {
    return this.departmentsService.findAll(req.user.tenantId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Lấy cây bộ phận (parent-children)' })
  findTree(@Request() req) {
    return this.departmentsService.findTree(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin bộ phận' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.departmentsService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo bộ phận mới' })
  create(@Request() req, @Body() createDto: CreateDepartmentDto) {
    return this.departmentsService.create(
      req.user.tenantId,
      req.user.companyId,
      req.user.branchId,
      createDto,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bộ phận' })
  update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateDepartmentDto) {
    return this.departmentsService.update(req.user.tenantId, id, updateDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng bộ phận' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.departmentsService.toggleActive(req.user.tenantId, id);
  }

  @Get(':id/staff-count')
  @ApiOperation({ summary: 'Lấy số lượng nhân viên của bộ phận và các bộ phận con' })
  getStaffCount(@Request() req, @Param('id') id: string) {
    return this.departmentsService.getStaffCount(req.user.tenantId, id);
  }

  @Patch(':id/toggle-active-cascade')
  @ApiOperation({ summary: 'Kích hoạt/Tạm ngưng bộ phận và tất cả bộ phận con, nhân viên' })
  toggleActiveCascade(@Request() req, @Param('id') id: string) {
    return this.departmentsService.toggleActiveCascade(req.user.tenantId, id);
  }

  @Post(':id/transfer-and-delete')
  @ApiOperation({ summary: 'Chuyển nhân viên sang bộ phận khác và xóa bộ phận' })
  transferAndDelete(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: TransferAndDeleteDto,
  ) {
    return this.departmentsService.transferStaffAndDelete(
      req.user.tenantId,
      id,
      dto.targetDepartmentId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bộ phận (chỉ khi không có nhân viên)' })
  delete(@Request() req, @Param('id') id: string) {
    return this.departmentsService.delete(req.user.tenantId, id);
  }
}
