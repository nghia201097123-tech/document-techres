import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService, JwtPayload } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  Enable2FADto,
  Verify2FADto,
  VerifyTokenDto,
  RevokeSessionDto,
  LoginResponseDto,
  TokenResponseDto,
  TwoFactorSetupResponseDto,
  UserProfileResponseDto,
  CreateTenantUserDto,
  TenantUserResponseDto,
} from '../../dto/auth.dto';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================== LOGIN ====================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== REGISTER ====================
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'Registration successful', type: LoginResponseDto })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: any,
  ): Promise<LoginResponseDto> {
    return this.authService.register(registerDto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== CREATE TENANT USER (Internal API) ====================
  @Post('tenant-users')
  @ApiOperation({ summary: 'Create tenant user (Internal API for api-admin)' })
  @ApiResponse({ status: 201, description: 'Tenant user created', type: TenantUserResponseDto })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  async createTenantUser(
    @Body() createTenantUserDto: CreateTenantUserDto,
  ): Promise<TenantUserResponseDto> {
    return this.authService.createTenantUser(createTenantUserDto);
  }

  // ==================== REFRESH TOKEN ====================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: any,
  ): Promise<TokenResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== LOGOUT ====================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(@Request() req: any): Promise<void> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await this.authService.logout(req.user.sub, token, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== CHANGE PASSWORD ====================
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: any,
  ): Promise<void> {
    await this.authService.changePassword(req.user.sub, changePasswordDto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== FORGOT PASSWORD ====================
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 204, description: 'Reset email sent if user exists' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Request() req: any,
  ): Promise<void> {
    await this.authService.forgotPassword(forgotPasswordDto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== RESET PASSWORD ====================
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 204, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Request() req: any,
  ): Promise<void> {
    await this.authService.resetPassword(resetPasswordDto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== 2FA SETUP ====================
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup 2FA - get QR code' })
  @ApiResponse({ status: 200, description: '2FA setup info', type: TwoFactorSetupResponseDto })
  async setup2FA(@Request() req: any): Promise<TwoFactorSetupResponseDto> {
    return this.authService.setup2FA(req.user.sub);
  }

  // ==================== 2FA ENABLE ====================
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA with verification code' })
  @ApiResponse({ status: 204, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async enable2FA(
    @Body() enable2FADto: Enable2FADto,
    @Request() req: any,
  ): Promise<void> {
    await this.authService.enable2FA(req.user.sub, enable2FADto.code, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== 2FA DISABLE ====================
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 204, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async disable2FA(
    @Body() verify2FADto: Verify2FADto,
    @Request() req: any,
  ): Promise<void> {
    await this.authService.disable2FA(req.user.sub, verify2FADto.code, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== VERIFY TOKEN ====================
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify access token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Token is invalid' })
  async verifyToken(@Body() verifyTokenDto: VerifyTokenDto): Promise<{ valid: boolean; payload?: JwtPayload }> {
    const payload = await this.authService.verifyToken(verifyTokenDto.accessToken);
    if (!payload) {
      return { valid: false };
    }
    return { valid: true, payload };
  }

  // ==================== GET PROFILE ====================
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserProfileResponseDto })
  async getProfile(@Request() req: any): Promise<UserProfileResponseDto> {
    const user = await this.authService.getUserProfile(req.user.sub);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      userType: user.userType,
      tenantId: user.tenantId,
      branchId: user.branchId,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  // ==================== GET SESSIONS ====================
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  async getSessions(@Request() req: any) {
    return this.authService.getActiveSessions(req.user.sub);
  }

  // ==================== REVOKE SESSION ====================
  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a session' })
  @ApiResponse({ status: 204, description: 'Session revoked' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ): Promise<void> {
    await this.authService.revokeSession(req.user.sub, sessionId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
