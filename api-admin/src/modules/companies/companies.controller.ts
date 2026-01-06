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
import { QuickCreateDto } from './dto/quick-create.dto';
import { CloneCompanyDto } from './dto/clone-company.dto';
import { CreateCompanyWithBranchesDto } from './dto/bulk-create-branches.dto';
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

  @Post('quick-create')
  @ApiOperation({
    summary: 'Quick Create - Tạo nhanh công ty chỉ từ tên',
    description:
      'Tạo nhanh công ty với tất cả thông tin tự động điền. ' +
      'Chỉ cần nhập tên công ty, hệ thống sẽ tự động tạo: ' +
      'alias, brand, branch, department, staff.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công công ty',
    type: CreateCompanyWizardResponseDto,
  })
  quickCreate(@Body() dto: QuickCreateDto) {
    return this.companiesService.quickCreate(dto.companyName, dto.isTrial);
  }

  @Post('wizard-bulk')
  @ApiOperation({
    summary: 'Create company with multiple branches',
    description:
      'Tạo công ty với wizard và thêm nhiều chi nhánh cùng lúc. ' +
      'Ngoài chi nhánh chính trong wizard, có thể thêm các chi nhánh bổ sung.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công công ty với nhiều chi nhánh',
  })
  createWithBranches(@Body() dto: CreateCompanyWithBranchesDto) {
    return this.companiesService.createWithBranches(dto);
  }

  @Post('clone')
  @ApiOperation({
    summary: 'Clone - Nhân bản công ty',
    description:
      'Nhân bản công ty từ công ty có sẵn. ' +
      'Có thể chọn clone: brands, branches, products, categories, staff.',
  })
  @ApiResponse({
    status: 201,
    description: 'Nhân bản thành công công ty',
    type: CreateCompanyWizardResponseDto,
  })
  clone(@Body() dto: CloneCompanyDto) {
    return this.companiesService.clone(
      dto.sourceCompanyId,
      dto.newCompanyName,
      dto.newAlias,
      dto.newEmail,
      dto.isTrial,
      dto.cloneOptions,
    );
  }

  @Get(':id/clone-details')
  @ApiOperation({
    summary: 'Get company details for cloning',
    description: 'Lấy thông tin chi tiết công ty để hiển thị khi clone',
  })
  getDetailsForClone(@Param('id') id: string) {
    return this.companiesService.getDetailsForClone(id);
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
