import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
}
