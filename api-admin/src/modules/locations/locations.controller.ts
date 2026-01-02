import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('provinces')
  @ApiOperation({ summary: 'Lấy danh sách tỉnh/thành phố' })
  async getProvinces() {
    return this.locationsService.getProvinces();
  }

  @Get('provinces/:provinceCode/districts')
  @ApiOperation({ summary: 'Lấy danh sách quận/huyện theo tỉnh' })
  async getDistricts(@Param('provinceCode') provinceCode: string) {
    return this.locationsService.getDistricts(provinceCode);
  }

  @Get('districts/:districtCode/wards')
  @ApiOperation({ summary: 'Lấy danh sách phường/xã theo quận' })
  async getWards(@Param('districtCode') districtCode: string) {
    return this.locationsService.getWards(districtCode);
  }
}
