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
import { MenuService, CreateItemMappingDto, BatchItemMappingDto } from './menu.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * Sync menu items from platform to database
   */
  @Post(':accountId/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đồng bộ menu từ platform vào database' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Đồng bộ thành công' })
  async syncMenu(@Param('accountId') accountId: string) {
    const result = await this.menuService.syncMenu(accountId);
    return ApiResponseDto.success(result, result.message);
  }

  /**
   * Get sync status for an account
   */
  @Get(':accountId/sync-status')
  @ApiOperation({ summary: 'Lấy trạng thái đồng bộ menu' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getSyncStatus(@Param('accountId') accountId: string) {
    const status = await this.menuService.getSyncStatus(accountId);
    return ApiResponseDto.success(status);
  }

  /**
   * Get synced external items for an account
   */
  @Get(':accountId/items')
  @ApiOperation({ summary: 'Lấy danh sách món ăn đã đồng bộ' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'includeInactive', required: false, description: 'Include inactive items' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getExternalItems(
    @Param('accountId') accountId: string,
    @Query('categoryId') categoryId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const items = await this.menuService.getExternalItems(accountId, {
      categoryId,
      includeInactive: includeInactive === 'true',
    });
    return ApiResponseDto.success(items);
  }

  /**
   * Get synced external items grouped by category
   */
  @Get(':accountId/items/by-category')
  @ApiOperation({ summary: 'Lấy danh sách món ăn theo danh mục' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getExternalItemsByCategory(@Param('accountId') accountId: string) {
    const categories = await this.menuService.getExternalItemsByCategory(accountId);
    return ApiResponseDto.success(categories);
  }

  /**
   * Get item mappings for an account
   */
  @Get(':accountId/mappings')
  @ApiOperation({ summary: 'Lấy danh sách liên kết món ăn' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getItemMappings(@Param('accountId') accountId: string) {
    const mappings = await this.menuService.getItemMappings(accountId);
    return ApiResponseDto.success(mappings);
  }

  /**
   * Create item mapping
   */
  @Post(':accountId/mappings')
  @ApiOperation({ summary: 'Tạo liên kết món ăn' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 201, description: 'Tạo liên kết thành công' })
  async createItemMapping(
    @Param('accountId') accountId: string,
    @Body() dto: CreateItemMappingDto,
  ) {
    const mapping = await this.menuService.createItemMapping(accountId, dto);
    return ApiResponseDto.success(mapping, 'Tạo liên kết thành công');
  }

  /**
   * Batch create/update item mappings
   */
  @Post(':accountId/mappings/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo/cập nhật nhiều liên kết món ăn' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async batchItemMappings(
    @Param('accountId') accountId: string,
    @Body() dto: BatchItemMappingDto,
  ) {
    const result = await this.menuService.batchItemMappings(accountId, dto);
    return ApiResponseDto.success(result, result.message);
  }

  /**
   * Update item mapping
   */
  @Put('mappings/:mappingId')
  @ApiOperation({ summary: 'Cập nhật liên kết món ăn' })
  @ApiParam({ name: 'mappingId', description: 'Mapping ID' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateItemMapping(
    @Param('mappingId') mappingId: string,
    @Body() dto: Partial<CreateItemMappingDto>,
  ) {
    const mapping = await this.menuService.updateItemMapping(mappingId, dto);
    return ApiResponseDto.success(mapping, 'Cập nhật liên kết thành công');
  }

  /**
   * Delete item mapping
   */
  @Delete('mappings/:mappingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa liên kết món ăn' })
  @ApiParam({ name: 'mappingId', description: 'Mapping ID' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteItemMapping(@Param('mappingId') mappingId: string) {
    await this.menuService.deleteItemMapping(mappingId);
    return ApiResponseDto.success(null, 'Xóa liên kết thành công');
  }
}
