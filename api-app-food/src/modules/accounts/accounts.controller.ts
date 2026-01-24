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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import {
  CreateAccountDto,
  LoginDto,
  RequestOtpDto,
  VerifyOtpDto,
  SelectStoreDto,
  UpdateAccountSettingsDto,
} from './dto/login.dto';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Create a new food platform account
   */
  @Post()
  @ApiOperation({ summary: 'Tạo tài khoản food platform mới' })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản thành công' })
  async createAccount(@Body() dto: CreateAccountDto) {
    const account = await this.accountsService.createAccount(dto);
    return ApiResponseDto.success(account, 'Tạo tài khoản thành công');
  }

  /**
   * Get accounts by tenant
   */
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tài khoản theo tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getAccounts(@Query('tenantId') tenantId: string) {
    const accounts = await this.accountsService.getAccountsByTenant(tenantId);
    return ApiResponseDto.success(accounts);
  }

  /**
   * Get accounts by branch
   */
  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Lấy danh sách tài khoản theo chi nhánh' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getAccountsByBranch(@Param('branchId') branchId: string) {
    const accounts = await this.accountsService.getAccountsByBranch(branchId);
    return ApiResponseDto.success(accounts);
  }

  /**
   * Get account by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản theo ID' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getAccountById(@Param('id') id: string) {
    const account = await this.accountsService.getAccountById(id);
    return ApiResponseDto.success(account);
  }

  /**
   * Login with username/password
   */
  @Post(':id/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng username/password' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 400, description: 'Đăng nhập thất bại' })
  async login(@Param('id') id: string, @Body() dto: LoginDto) {
    const account = await this.accountsService.login(id, dto);
    return ApiResponseDto.success(
      {
        accountId: account.id,
        status: account.status,
        merchantId: account.externalMerchantId,
        merchantName: account.externalMerchantName,
      },
      'Đăng nhập thành công',
    );
  }

  /**
   * Request OTP
   */
  @Post(':id/request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu gửi mã OTP' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'OTP đã được gửi' })
  @ApiResponse({ status: 400, description: 'Gửi OTP thất bại' })
  async requestOtp(@Param('id') id: string, @Body() dto: RequestOtpDto) {
    const result = await this.accountsService.requestOtp(id, dto);
    return ApiResponseDto.success(result, result.message);
  }

  /**
   * Verify OTP
   */
  @Post(':id/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực mã OTP' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Xác thực OTP thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP không chính xác' })
  async verifyOtp(@Param('id') id: string, @Body() dto: VerifyOtpDto) {
    const result = await this.accountsService.verifyOtp(id, dto);
    return ApiResponseDto.success(result, 'Xác thực OTP thành công');
  }

  /**
   * Select store (after OTP verification)
   */
  @Post(':id/select-store')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chọn cửa hàng sau khi xác thực OTP' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Liên kết cửa hàng thành công' })
  async selectStore(@Param('id') id: string, @Body() dto: SelectStoreDto) {
    const account = await this.accountsService.selectStore(id, dto);
    return ApiResponseDto.success(
      {
        accountId: account.id,
        status: account.status,
        merchantId: account.externalMerchantId,
        merchantName: account.externalMerchantName,
      },
      'Liên kết cửa hàng thành công',
    );
  }

  /**
   * Get stores from platform
   */
  @Get(':id/stores')
  @ApiOperation({ summary: 'Lấy danh sách cửa hàng từ platform' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getStores(@Param('id') id: string) {
    const stores = await this.accountsService.getStores(id);
    return ApiResponseDto.success(stores);
  }

  /**
   * Update account settings
   */
  @Put(':id/settings')
  @ApiOperation({ summary: 'Cập nhật cài đặt tài khoản' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateAccountSettingsDto,
  ) {
    const account = await this.accountsService.updateSettings(id, dto);
    return ApiResponseDto.success(account, 'Cập nhật cài đặt thành công');
  }

  /**
   * Disconnect account
   */
  @Post(':id/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ngắt kết nối tài khoản' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Ngắt kết nối thành công' })
  async disconnect(@Param('id') id: string) {
    const account = await this.accountsService.disconnect(id);
    return ApiResponseDto.success(
      { accountId: account.id, status: account.status },
      'Ngắt kết nối thành công',
    );
  }

  /**
   * Update account branch assignment
   */
  @Patch(':id/branch')
  @ApiOperation({ summary: 'Cập nhật chi nhánh cho tài khoản' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateBranch(
    @Param('id') id: string,
    @Body() dto: { branchId: string },
  ) {
    const account = await this.accountsService.updateBranch(id, dto.branchId);
    return ApiResponseDto.success(account, 'Cập nhật chi nhánh thành công');
  }

  /**
   * Delete account
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa tài khoản' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteAccount(@Param('id') id: string) {
    await this.accountsService.deleteAccount(id);
    return ApiResponseDto.success(null, 'Xóa tài khoản thành công');
  }
}
