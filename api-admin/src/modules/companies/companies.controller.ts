import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import {
  CreateCompanyWizardDto,
  CreateCompanyWizardResponseDto,
} from './dto/create-company-wizard.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company (simple)' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Post('wizard')
  @ApiOperation({
    summary: 'Create company with wizard (Company + Brand + Branch)',
    description:
      'Tạo công ty mới với wizard 3 bước bắt buộc: Công ty → Thương hiệu → Chi nhánh. ' +
      'Tất cả phải hoàn thành trong cùng một request. ' +
      'Có thể tùy chọn tạo Owner với thông tin đăng nhập tạm thời.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công công ty, thương hiệu và chi nhánh',
    type: CreateCompanyWizardResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Mã công ty/thương hiệu/chi nhánh đã tồn tại',
  })
  createWithWizard(@Body() wizardDto: CreateCompanyWizardDto) {
    return this.companiesService.createWithWizard(wizardDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies with pagination' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.companiesService.findAll(paginationDto);
  }

  @Get('by-code/:code')
  @ApiOperation({ summary: 'Get company by code (tenant_id)' })
  findByCode(@Param('code') code: string) {
    return this.companiesService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle company status' })
  toggleStatus(@Param('id') id: string) {
    return this.companiesService.toggleStatus(id);
  }
}
