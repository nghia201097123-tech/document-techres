import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Packages')
@Controller('packages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create package' })
  create(@Body() dto: CreatePackageDto) { return this.packagesService.create(dto); }

  @Get()
  @ApiOperation({ summary: 'Get all packages' })
  findAll(@Query() dto: PaginationDto) { return this.packagesService.findAll(dto); }

  @Get(':id')
  @ApiOperation({ summary: 'Get package by ID' })
  findOne(@Param('id') id: string) { return this.packagesService.findOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update package' })
  update(@Param('id') id: string, @Body() dto: UpdatePackageDto) { return this.packagesService.update(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete package' })
  remove(@Param('id') id: string) { return this.packagesService.remove(id); }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle status' })
  toggleStatus(@Param('id') id: string) { return this.packagesService.toggleStatus(id); }
}
