import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto, VerifyPinDto, VerifyPinResponseDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập thiết bị bằng mã cửa hàng' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cửa hàng' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('verify-pin')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xác thực mã PIN nhân viên' })
  @ApiResponse({ status: 200, type: VerifyPinResponseDto })
  @ApiResponse({ status: 401, description: 'Mã PIN không đúng' })
  async verifyPin(
    @Request() req,
    @Body() verifyPinDto: VerifyPinDto,
  ): Promise<VerifyPinResponseDto> {
    return this.authService.verifyPin(req.user.branchId, verifyPinDto);
  }
}
