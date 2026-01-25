import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import {
  CreateStoreMappingsDto,
  UpdateStoreMappingDto,
  ToggleStoreMappingDto,
} from './dto/store-mapping.dto';

@ApiTags('stores')
@Controller('food-platforms')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  /**
   * Get store mappings by account
   */
  @Get('accounts/:accountId/store-mappings')
  @ApiOperation({ summary: 'Lấy danh sách store mappings theo account' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getMappingsByAccount(@Param('accountId') accountId: string) {
    const mappings = await this.storesService.getMappingsByAccount(accountId);
    return ApiResponseDto.success(mappings);
  }

  /**
   * Create store mappings for an account
   */
  @Post('accounts/:accountId/store-mappings')
  @ApiOperation({ summary: 'Tạo store mappings cho account' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 201, description: 'Tạo mappings thành công' })
  async createMappings(
    @Param('accountId') accountId: string,
    @Body() dto: CreateStoreMappingsDto,
  ) {
    const mappings = await this.storesService.createMappings(accountId, dto);
    return ApiResponseDto.success(mappings, `Đã lưu ${mappings.length} mapping thành công`);
  }

  /**
   * Get store mapping by ID
   */
  @Get('store-mappings/:id')
  @ApiOperation({ summary: 'Lấy thông tin store mapping theo ID' })
  @ApiParam({ name: 'id', description: 'Store Mapping ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getMappingById(@Param('id') id: string) {
    const mapping = await this.storesService.getMappingById(id);
    return ApiResponseDto.success(mapping);
  }

  /**
   * Update store mapping
   */
  @Put('store-mappings/:id')
  @ApiOperation({ summary: 'Cập nhật store mapping' })
  @ApiParam({ name: 'id', description: 'Store Mapping ID' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateMapping(
    @Param('id') id: string,
    @Body() dto: UpdateStoreMappingDto,
  ) {
    const mapping = await this.storesService.updateMapping(id, dto);
    return ApiResponseDto.success(mapping, 'Cập nhật mapping thành công');
  }

  /**
   * Toggle store mapping active status
   */
  @Put('store-mappings/:id/toggle')
  @ApiOperation({ summary: 'Bật/tắt store mapping' })
  @ApiParam({ name: 'id', description: 'Store Mapping ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async toggleMapping(
    @Param('id') id: string,
    @Body() dto: ToggleStoreMappingDto,
  ) {
    const mapping = await this.storesService.toggleMapping(id, dto);
    const status = mapping.isActive ? 'bật' : 'tắt';
    return ApiResponseDto.success(mapping, `Đã ${status} mapping thành công`);
  }

  /**
   * Sync store info from platform
   */
  @Post('store-mappings/:id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đồng bộ thông tin cửa hàng từ platform' })
  @ApiParam({ name: 'id', description: 'Store Mapping ID' })
  @ApiResponse({ status: 200, description: 'Đồng bộ thành công' })
  async syncStoreInfo(@Param('id') id: string) {
    const mapping = await this.storesService.syncStoreInfo(id);
    return ApiResponseDto.success(mapping, 'Đồng bộ thông tin cửa hàng thành công');
  }

  /**
   * Delete store mapping
   */
  @Delete('store-mappings/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa store mapping' })
  @ApiParam({ name: 'id', description: 'Store Mapping ID' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteMapping(@Param('id') id: string) {
    await this.storesService.deleteMapping(id);
    return ApiResponseDto.success(null, 'Xóa mapping thành công');
  }

  /**
   * Get store mappings by branch
   */
  @Get('branches/:branchId/store-mappings')
  @ApiOperation({ summary: 'Lấy danh sách store mappings theo chi nhánh' })
  @ApiParam({ name: 'branchId', description: 'Branch ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getMappingsByBranch(@Param('branchId') branchId: string) {
    const mappings = await this.storesService.getMappingsByBranch(branchId);
    return ApiResponseDto.success(mappings);
  }

  /**
   * Get food platform status for a branch
   */
  @Get('branches/:branchId/platform-status')
  @ApiOperation({ summary: 'Lấy trạng thái food platform của chi nhánh' })
  @ApiParam({ name: 'branchId', description: 'Branch ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getBranchPlatformStatus(@Param('branchId') branchId: string) {
    const status = await this.storesService.getBranchPlatformStatus(branchId);
    return ApiResponseDto.success(status);
  }
}
