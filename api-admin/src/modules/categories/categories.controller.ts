import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create category' })
  create(@Body() dto: CreateCategoryDto) { return this.categoriesService.create(dto); }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  findAll(@Query() dto: PaginationDto) { return this.categoriesService.findAll(dto); }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get categories by type' })
  findByType(@Param('type') type: string, @Query() dto: PaginationDto) { return this.categoriesService.findByType(type, dto); }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@Param('id') id: string) { return this.categoriesService.findOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.categoriesService.update(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  remove(@Param('id') id: string) { return this.categoriesService.remove(id); }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle status' })
  toggleStatus(@Param('id') id: string) { return this.categoriesService.toggleStatus(id); }
}
