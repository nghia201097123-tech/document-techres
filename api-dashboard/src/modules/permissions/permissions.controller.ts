import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AssignDepartmentPermissionsDto,
  AssignStaffPermissionsDto,
} from './dto';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả quyền hệ thống' })
  findAll() {
    return this.permissionsService.findAllPermissions();
  }

  @Get('grouped')
  @ApiOperation({ summary: 'Lấy danh sách quyền theo nhóm module' })
  findGrouped() {
    return this.permissionsService.findPermissionsGrouped();
  }

  @Get('department/:departmentId')
  @ApiOperation({ summary: 'Lấy danh sách quyền của bộ phận' })
  getDepartmentPermissions(
    @Request() req,
    @Param('departmentId') departmentId: string,
  ) {
    return this.permissionsService.getDepartmentPermissions(
      req.user.tenantId,
      departmentId,
    );
  }

  @Post('department')
  @ApiOperation({ summary: 'Gán quyền cho bộ phận' })
  assignDepartmentPermissions(
    @Request() req,
    @Body() dto: AssignDepartmentPermissionsDto,
  ) {
    return this.permissionsService.assignDepartmentPermissions(
      req.user.tenantId,
      dto.departmentId,
      dto.permissionIds,
    );
  }

  @Get('staff/:staffId')
  @ApiOperation({ summary: 'Lấy danh sách quyền của nhân viên (bao gồm quyền thừa hưởng)' })
  getStaffPermissions(@Request() req, @Param('staffId') staffId: string) {
    return this.permissionsService.getStaffPermissions(
      req.user.tenantId,
      staffId,
    );
  }

  @Get('staff/:staffId/own')
  @ApiOperation({ summary: 'Lấy danh sách quyền riêng của nhân viên' })
  getStaffOwnPermissions(@Request() req, @Param('staffId') staffId: string) {
    return this.permissionsService.getStaffOwnPermissions(
      req.user.tenantId,
      staffId,
    );
  }

  @Post('staff')
  @ApiOperation({ summary: 'Gán quyền riêng cho nhân viên' })
  assignStaffPermissions(
    @Request() req,
    @Body() dto: AssignStaffPermissionsDto,
  ) {
    return this.permissionsService.assignStaffPermissions(
      req.user.tenantId,
      dto.staffId,
      dto.permissionIds,
    );
  }

  @Get('staff/:staffId/codes')
  @ApiOperation({ summary: 'Lấy danh sách mã quyền của nhân viên' })
  getStaffPermissionCodes(@Request() req, @Param('staffId') staffId: string) {
    return this.permissionsService.getStaffPermissionCodes(
      req.user.tenantId,
      staffId,
    );
  }
}
