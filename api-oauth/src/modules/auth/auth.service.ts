import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

import {
  User,
  UserType,
  RefreshToken,
  Session,
  PasswordReset,
  AuditLog,
  AuditAction,
} from '../../entities';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LoginResponseDto,
  TokenResponseDto,
  TwoFactorSetupResponseDto,
} from '../../dto/auth.dto';

interface JwtPayload {
  sub: string;
  email: string;
  tenantId?: string;
  branchId?: string;
  role: string;
  userType: string;
}

interface RequestInfo {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ==================== LOGIN ====================
  async login(
    loginDto: LoginDto,
    requestInfo: RequestInfo,
  ): Promise<LoginResponseDto> {
    const { email, password, tenantId, twoFactorCode } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: tenantId
        ? { email, tenantId }
        : { email, userType: UserType.ADMIN },
    });

    if (!user) {
      await this.logAudit(null, email, tenantId, AuditAction.LOGIN_FAILED, requestInfo, false, 'User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account is locked. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user, requestInfo);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check 2FA if enabled
    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) {
        return {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
          tokenType: 'Bearer',
          user: null,
          requiresTwoFactor: true,
        };
      }

      const isCodeValid = authenticator.verify({
        token: twoFactorCode,
        secret: user.twoFactorSecret,
      });

      if (!isCodeValid) {
        await this.logAudit(user.id, email, tenantId, AuditAction.LOGIN_FAILED, requestInfo, false, 'Invalid 2FA code');
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    // Reset failed attempts
    await this.userRepository.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: requestInfo.ipAddress,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user, requestInfo);

    // Log successful login
    await this.logAudit(user.id, email, tenantId, AuditAction.LOGIN, requestInfo, true);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        branchId: user.branchId,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
    };
  }

  // ==================== REGISTER ====================
  async register(
    registerDto: RegisterDto,
    requestInfo: RequestInfo,
  ): Promise<LoginResponseDto> {
    const { email, password, name, phone, tenantId, userType } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: tenantId ? { email, tenantId } : { email, userType: UserType.ADMIN },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const saltRounds = this.configService.get('security.bcryptSaltRounds');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      name,
      phone,
      tenantId,
      userType: userType || (tenantId ? UserType.TENANT : UserType.ADMIN),
    });

    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user, requestInfo);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        branchId: user.branchId,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
    };
  }

  // ==================== REFRESH TOKEN ====================
  async refreshToken(
    refreshToken: string,
    requestInfo: RequestInfo,
  ): Promise<TokenResponseDto> {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: {
        token: refreshToken,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Revoke old refresh token
    await this.refreshTokenRepository.update(tokenRecord.id, {
      isRevoked: true,
      revokedAt: new Date(),
    });

    // Generate new tokens
    const tokens = await this.generateTokens(tokenRecord.user, requestInfo);

    await this.logAudit(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.user.tenantId,
      AuditAction.TOKEN_REFRESH,
      requestInfo,
      true,
    );

    return tokens;
  }

  // ==================== LOGOUT ====================
  async logout(userId: string, accessToken: string, requestInfo: RequestInfo): Promise<void> {
    // Revoke all refresh tokens for user
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    // Deactivate session
    await this.sessionRepository.update(
      { userId, accessToken },
      { isActive: false },
    );

    const user = await this.userRepository.findOne({ where: { id: userId } });
    await this.logAudit(userId, user?.email, user?.tenantId, AuditAction.LOGOUT, requestInfo, true);
  }

  // ==================== CHANGE PASSWORD ====================
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    requestInfo: RequestInfo,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const saltRounds = this.configService.get('security.bcryptSaltRounds');
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(userId, { passwordHash });

    // Revoke all refresh tokens (force re-login)
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    await this.logAudit(userId, user.email, user.tenantId, AuditAction.PASSWORD_CHANGE, requestInfo, true);
  }

  // ==================== FORGOT PASSWORD ====================
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    requestInfo: RequestInfo,
  ): Promise<void> {
    const { email, tenantId } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: tenantId ? { email, tenantId } : { email, userType: UserType.ADMIN },
    });

    // Don't reveal if user exists
    if (!user) {
      return;
    }

    // Generate reset token
    const token = uuidv4();
    const expiresAt = new Date(
      Date.now() + this.configService.get('passwordReset.expiresIn'),
    );

    await this.passwordResetRepository.save({
      userId: user.id,
      email: user.email,
      token,
      expiresAt,
      ipAddress: requestInfo.ipAddress,
    });

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordResetEmail(user.email, token);

    await this.logAudit(user.id, email, tenantId, AuditAction.PASSWORD_RESET_REQUEST, requestInfo, true);
  }

  // ==================== RESET PASSWORD ====================
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    requestInfo: RequestInfo,
  ): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    const resetRecord = await this.passwordResetRepository.findOne({
      where: {
        token,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = this.configService.get('security.bcryptSaltRounds');
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(resetRecord.userId, { passwordHash });

    await this.passwordResetRepository.update(resetRecord.id, {
      isUsed: true,
      usedAt: new Date(),
    });

    // Revoke all refresh tokens
    await this.refreshTokenRepository.update(
      { userId: resetRecord.userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    await this.logAudit(
      resetRecord.userId,
      resetRecord.email,
      null,
      AuditAction.PASSWORD_RESET_COMPLETE,
      requestInfo,
      true,
    );
  }

  // ==================== 2FA SETUP ====================
  async setup2FA(userId: string): Promise<TwoFactorSetupResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = authenticator.generateSecret();
    const appName = this.configService.get('twoFactor.appName');
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    // Store secret temporarily (will be confirmed on verification)
    await this.userRepository.update(userId, { twoFactorSecret: secret });

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCodeUrl,
      otpauthUrl,
    };
  }

  // ==================== 2FA ENABLE ====================
  async enable2FA(
    userId: string,
    code: string,
    requestInfo: RequestInfo,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up. Call setup endpoint first.');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.userRepository.update(userId, { isTwoFactorEnabled: true });

    await this.logAudit(userId, user.email, user.tenantId, AuditAction.TWO_FACTOR_ENABLE, requestInfo, true);
  }

  // ==================== 2FA DISABLE ====================
  async disable2FA(
    userId: string,
    code: string,
    requestInfo: RequestInfo,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isTwoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.userRepository.update(userId, {
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
    });

    await this.logAudit(userId, user.email, user.tenantId, AuditAction.TWO_FACTOR_DISABLE, requestInfo, true);
  }

  // ==================== VERIFY TOKEN ====================
  async verifyToken(accessToken: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify(accessToken, {
        secret: this.configService.get('jwt.secret'),
      });
      return payload;
    } catch {
      return null;
    }
  }

  // ==================== GET USER PROFILE ====================
  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // ==================== GET ACTIVE SESSIONS ====================
  async getActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });
  }

  // ==================== REVOKE SESSION ====================
  async revokeSession(
    userId: string,
    sessionId: string,
    requestInfo: RequestInfo,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.sessionRepository.update(sessionId, { isActive: false });

    const user = await this.userRepository.findOne({ where: { id: userId } });
    await this.logAudit(userId, user?.email, user?.tenantId, AuditAction.SESSION_REVOKE, requestInfo, true);
  }

  // ==================== PRIVATE METHODS ====================
  private async generateTokens(
    user: User,
    requestInfo: RequestInfo,
  ): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      },
    );

    // Calculate expiry
    const expiresIn = this.parseExpiry(this.configService.get('jwt.expiresIn'));
    const refreshExpiresIn = this.parseExpiry(
      this.configService.get('jwt.refreshExpiresIn'),
    );

    // Save refresh token
    await this.refreshTokenRepository.save({
      userId: user.id,
      token: refreshToken,
      userAgent: requestInfo.userAgent,
      ipAddress: requestInfo.ipAddress,
      expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
    });

    // Create session
    await this.sessionRepository.save({
      userId: user.id,
      accessToken,
      userAgent: requestInfo.userAgent,
      ipAddress: requestInfo.ipAddress,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      lastActivityAt: new Date(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  private async handleFailedLogin(user: User, requestInfo: RequestInfo): Promise<void> {
    const maxAttempts = this.configService.get('security.maxLoginAttempts');
    const lockoutDuration = this.configService.get('security.lockoutDuration');

    const newAttempts = user.failedLoginAttempts + 1;
    const updateData: Partial<User> = { failedLoginAttempts: newAttempts };

    if (newAttempts >= maxAttempts) {
      updateData.lockedUntil = new Date(Date.now() + lockoutDuration);
      await this.logAudit(user.id, user.email, user.tenantId, AuditAction.ACCOUNT_LOCKED, requestInfo, true);
    }

    await this.userRepository.update(user.id, updateData);
    await this.logAudit(user.id, user.email, user.tenantId, AuditAction.LOGIN_FAILED, requestInfo, false, 'Invalid password');
  }

  private async logAudit(
    userId: string,
    email: string,
    tenantId: string,
    action: AuditAction,
    requestInfo: RequestInfo,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.auditLogRepository.save({
      userId,
      email,
      tenantId,
      action,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      success,
      errorMessage,
    });
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
