import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // Permission endpoints
  @Post()
  @ApiOperation({ summary: 'Create permission' })
  createPermission(@Body() dto: CreatePermissionDto) { return this.permissionsService.createPermission(dto); }

  @Get()
  @ApiOperation({ summary: 'Get all permissions' })
  findAllPermissions(@Query() dto: PaginationDto) { return this.permissionsService.findAllPermissions(dto); }

  @Get('module/:module')
  @ApiOperation({ summary: 'Get permissions by module' })
  findByModule(@Param('module') module: string) { return this.permissionsService.findPermissionsByModule(module); }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission by ID' })
  findOnePermission(@Param('id') id: string) { return this.permissionsService.findOnePermission(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update permission' })
  updatePermission(@Param('id') id: string, @Body() dto: UpdatePermissionDto) { return this.permissionsService.updatePermission(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete permission' })
  removePermission(@Param('id') id: string) { return this.permissionsService.removePermission(id); }
}

@ApiTags('Permission Groups')
@Controller('permission-groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionGroupsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create permission group' })
  create(@Body() dto: CreatePermissionGroupDto) { return this.permissionsService.createPermissionGroup(dto); }

  @Get()
  @ApiOperation({ summary: 'Get all permission groups' })
  findAll(@Query() dto: PaginationDto) { return this.permissionsService.findAllPermissionGroups(dto); }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission group by ID' })
  findOne(@Param('id') id: string) { return this.permissionsService.findOnePermissionGroup(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update permission group' })
  update(@Param('id') id: string, @Body() dto: UpdatePermissionGroupDto) { return this.permissionsService.updatePermissionGroup(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete permission group' })
  remove(@Param('id') id: string) { return this.permissionsService.removePermissionGroup(id); }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle status' })
  toggleStatus(@Param('id') id: string) { return this.permissionsService.togglePermissionGroupStatus(id); }
}
