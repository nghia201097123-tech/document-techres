import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

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
}
