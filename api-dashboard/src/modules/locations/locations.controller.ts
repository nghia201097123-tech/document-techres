import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('provinces')
  @ApiOperation({ summary: 'Lấy danh sách tỉnh/thành phố' })
  findAllProvinces() {
    return this.locationsService.findAllProvinces();
  }

  @Get('provinces/:provinceCode/wards')
  @ApiOperation({ summary: 'Lấy danh sách phường/xã theo tỉnh' })
  findWardsByProvince(@Param('provinceCode') provinceCode: string) {
    return this.locationsService.findWardsByProvince(provinceCode);
  }

  @Get('wards')
  @ApiOperation({ summary: 'Lấy tất cả phường/xã' })
  findAllWards() {
    return this.locationsService.findAllWards();
  }

  @Post('seed')
  @ApiOperation({
    summary: 'Import dữ liệu địa chỉ hành chính Việt Nam sau sáp nhập 07/2025',
    description: 'Nguồn: QĐ 19/2025/QĐ-TTg. Cấu trúc 2 cấp: 34 tỉnh/thành → xã/phường (bỏ cấp quận/huyện)'
  })
  seedLocations() {
    return this.locationsService.seedFromAPI();
  }
}
