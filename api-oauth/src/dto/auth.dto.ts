import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType, UserRole } from '../entities/user.entity';

export class LoginDto {
  @ApiPropertyOptional({ description: 'Tenant ID (required for tenant users)' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Email (for admin users)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'admin', description: 'Username (for tenant users)' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: '2FA code if enabled' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  twoFactorCode?: string;
}

export class RegisterDto {
  @ApiPropertyOptional({ description: 'Tenant ID' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*\d)/, {
    message: 'Mật khẩu phải có chữ thường và số',
  })
  password: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserType })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*\d)/, {
    message: 'Mật khẩu phải có chữ thường và số',
  })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*\d)/, {
    message: 'Mật khẩu phải có chữ thường và số',
  })
  newPassword: string;
}

export class Enable2FADto {
  @ApiProperty({ description: '6-digit TOTP code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class Verify2FADto {
  @ApiProperty({ description: '6-digit TOTP code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class VerifyTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}

export class RevokeSessionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;
}

// DTO for creating tenant users (internal API)
export class CreateTenantUserDto {
  @ApiProperty({ description: 'Tenant ID (Company ID from api-admin)' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'admin', description: 'Username for tenant login' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.OWNER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;
}

// Response for created tenant user
export class TenantUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  createdAt: Date;
}

// Response DTOs
export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokenType: string;
}

export class LoginResponseDto extends TokenResponseDto {
  @ApiProperty()
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
    branchId?: string;
    isTwoFactorEnabled: boolean;
  };

  @ApiPropertyOptional()
  requiresTwoFactor?: boolean;
}

export class TwoFactorSetupResponseDto {
  @ApiProperty()
  secret: string;

  @ApiProperty()
  qrCodeUrl: string;

  @ApiProperty()
  otpauthUrl: string;
}

export class UserProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone?: string;

  @ApiProperty()
  avatarUrl?: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  userType: string;

  @ApiProperty()
  tenantId?: string;

  @ApiProperty()
  branchId?: string;

  @ApiProperty()
  isTwoFactorEnabled: boolean;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty()
  lastLoginAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
