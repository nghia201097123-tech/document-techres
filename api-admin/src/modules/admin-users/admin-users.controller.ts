import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin Users')
@Controller('admin-users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create admin user' })
  create(@Body() dto: CreateAdminUserDto) { return this.adminUsersService.create(dto); }

  @Get()
  @ApiOperation({ summary: 'Get all admin users' })
  findAll(@Query() dto: PaginationDto) { return this.adminUsersService.findAll(dto); }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req: any) { return this.adminUsersService.findOne(req.user.sub); }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin user by ID' })
  findOne(@Param('id') id: string) { return this.adminUsersService.findOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update admin user' })
  update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) { return this.adminUsersService.update(id, dto); }

  @Patch(':id/change-password')
  @ApiOperation({ summary: 'Change password' })
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) { return this.adminUsersService.changePassword(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete admin user' })
  remove(@Param('id') id: string) { return this.adminUsersService.remove(id); }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle status' })
  toggleStatus(@Param('id') id: string) { return this.adminUsersService.toggleStatus(id); }
}
