import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post('seed')
  @ApiOperation({
    summary: 'Import dữ liệu địa chỉ hành chính Việt Nam sau sáp nhập 07/2025',
    description: 'Nguồn: QĐ 19/2025/QĐ-TTg. Cấu trúc 2 cấp: 34 tỉnh/thành → xã/phường (bỏ cấp quận/huyện)'
  })
  async seedLocations() {
    return this.locationsService.seedFromAPI();
  }

  @Get('provinces')
  @ApiOperation({ summary: 'Lấy danh sách 34 tỉnh/thành phố (sau sáp nhập 07/2025)' })
  async getProvinces() {
    return this.locationsService.getProvinces();
  }

  @Get('provinces/:provinceCode/wards')
  @ApiOperation({
    summary: 'Lấy danh sách xã/phường theo tỉnh',
    description: 'Xã/phường thuộc trực tiếp tỉnh/thành phố (không còn cấp quận/huyện)'
  })
  async getWards(@Param('provinceCode') provinceCode: string) {
    return this.locationsService.getWards(provinceCode);
  }
}
