import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncCompanyDataDto, SyncCompanyDto, SyncBrandDto, SyncBranchDto, SyncTransactionCategoryDto } from './dto/sync.dto';

@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Post('company-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync full company data from api-admin' })
  @ApiResponse({ status: 200, description: 'Company data synced successfully' })
  async syncCompanyData(@Body() dto: SyncCompanyDataDto) {
    this.logger.log(`Received sync request for company: ${dto.company.code}`);
    return this.syncService.syncCompanyData(dto);
  }

  @Post('company')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync single company from api-admin' })
  @ApiResponse({ status: 200, description: 'Company synced successfully' })
  async syncCompany(@Body() dto: SyncCompanyDto) {
    this.logger.log(`Received sync request for company: ${dto.name}`);
    return this.syncService.syncSingleCompany(dto);
  }

  @Post('brand')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync single brand from api-admin' })
  @ApiResponse({ status: 200, description: 'Brand synced successfully' })
  async syncBrand(@Body() dto: SyncBrandDto) {
    this.logger.log(`Received sync request for brand: ${dto.name}`);
    return this.syncService.syncSingleBrand(dto);
  }

  @Post('branch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync single branch from api-admin' })
  @ApiResponse({ status: 200, description: 'Branch synced successfully' })
  async syncBranch(@Body() dto: SyncBranchDto) {
    this.logger.log(`Received sync request for branch: ${dto.name}`);
    return this.syncService.syncSingleBranch(dto);
  }

  @Post('transaction-category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync single transaction category from api-admin' })
  @ApiResponse({ status: 200, description: 'Transaction category synced successfully' })
  async syncTransactionCategory(@Body() dto: SyncTransactionCategoryDto) {
    this.logger.log(`Received sync request for transaction category: ${dto.name}`);
    return this.syncService.syncSingleTransactionCategory(dto);
  }
}
