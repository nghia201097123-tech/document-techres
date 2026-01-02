import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'CTAF',
    description: 'Mã công ty (Tiên định danh) - tenant_id',
  })
  @IsNotEmpty({ message: 'Mã công ty không được để trống' })
  @IsString()
  @MaxLength(50)
  tenantId: string;

  @ApiProperty({
    example: 'admin',
    description: 'Tên đăng nhập của nhân viên',
  })
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString()
  @MaxLength(50)
  username: string;

  @ApiProperty({
    example: 'password123',
    description: 'Mật khẩu',
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword456' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @IsString()
  newPassword: string;
}
