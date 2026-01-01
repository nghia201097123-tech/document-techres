import { IsNotEmpty, IsOptional, IsString, IsEmail, IsEnum, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '../../../database/entities';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'admin@techres.vn' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn Admin' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.SUPPORT })
  @IsEnum(AdminRole)
  role: AdminRole;

  @ApiPropertyOptional({ example: 'uuid-of-permission-group' })
  @IsOptional()
  @IsUUID()
  permissionGroupId?: string;
}
