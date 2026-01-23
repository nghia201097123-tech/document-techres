import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FoodPlatformsService } from './food-platforms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateFoodPlatformDto,
  UpdateFoodPlatformDto,
  LoginUsernamePasswordDto,
  RequestOtpDto,
  VerifyOtpDto,
  SelectStoreDto,
} from './dto';

@ApiTags('Food Platforms')
@Controller('food-platforms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FoodPlatformsController {
  constructor(private readonly service: FoodPlatformsService) {}

  // ====== CRUD Operations ======

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả cổng kết nối food apps' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Lọc theo thương hiệu' })
  findAll(@Request() req, @Query('brandId') brandId?: string) {
    return this.service.findAll(req.user.tenantId, brandId);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Lấy danh sách cổng kết nối theo chi nhánh' })
  @ApiParam({ name: 'branchId', description: 'ID chi nhánh' })
  findByBranch(@Request() req, @Param('branchId') branchId: string) {
    return this.service.findByBranch(req.user.tenantId, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết cổng kết nối' })
  @ApiParam({ name: 'id', description: 'ID cổng kết nối' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo cổng kết nối mới' })
  create(@Request() req, @Body() dto: CreateFoodPlatformDto) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin cổng kết nối' })
  @ApiParam({ name: 'id', description: 'ID cổng kết nối' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateFoodPlatformDto,
  ) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa cổng kết nối' })
  @ApiParam({ name: 'id', description: 'ID cổng kết nối' })
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Bật/tắt cổng kết nối' })
  @ApiParam({ name: 'id', description: 'ID cổng kết nối' })
  toggle(@Request() req, @Param('id') id: string) {
    return this.service.toggle(req.user.tenantId, id);
  }

  // ====== Authentication Operations (Called from CCB) ======

  @Post(':id/login')
  @ApiOperation({ summary: 'Đăng nhập bằng username/password (Grab, BeFood)' })
  @ApiParam({ name: 'id', description: 'ID cổng kết nối' })
  login(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: LoginUsernamePasswordDto,
  ) {
    return this.service.loginWithUsernamePassword(req.user.tenantId, id, dto);
  }

  @Post(':id/request-otp')
  @ApiOperation({ summary: 'Yêu cầu gửi OTP (ShopeeFood)' })
  @ApiParam({ name: 'id', description: 'ID cổng kết nối' })
  requestOtp(@Request() req, @Param('id') id: string, @Body() dto: RequestOtpDto) {
    return this.service.requestOtp(req.user.tenantId, id, dto);
  }

  @Post(':id/verify-otp')
  @ApiOperation({ summary: 'Xác thực OTP (ShopeeFood)' })
  @ApiParam({ name: 'id', description: 'ID cổng kết nối' })
  verifyOtp(@Request() req, @Param('id') id: string, @Body() dto: VerifyOtpDto) {
    return this.service.verifyOtp(req.user.tenantId, id, dto);
  }

  @Post(':id/select-store')
  @ApiOperation({ summary: 'Chọn cửa hàng sau khi xác thực OTP (ShopeeFood)' })
  @ApiParam({ name: 'id', description: 'ID cổng kết nối' })
  selectStore(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SelectStoreDto,
  ) {
    return this.service.selectStore(req.user.tenantId, id, dto);
  }

  @Post(':id/disconnect')
  @ApiOperation({ summary: 'Ngắt kết nối' })
  @ApiParam({ name: 'id', description: 'ID cổng kết nối' })
  disconnect(@Request() req, @Param('id') id: string) {
    return this.service.disconnect(req.user.tenantId, id);
  }

  // ====== Sync Operations (For CCB) ======

  @Get('sync/branch/:branchId')
  @ApiOperation({ summary: 'Lấy danh sách cổng cho CCB sync (không có sensitive data)' })
  @ApiParam({ name: 'branchId', description: 'ID chi nhánh' })
  getForCCBSync(@Request() req, @Param('branchId') branchId: string) {
    return this.service.getForCCBSync(req.user.tenantId, branchId);
  }
}
