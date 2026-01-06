import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'STORE001', description: 'Mã cửa hàng (store code)' })
  @IsNotEmpty()
  @IsString()
  storeCode: string;

  @ApiProperty({ example: 'device-uuid-123', description: 'ID thiết bị' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty({ example: 'POS Thu ngân 1', description: 'Tên thiết bị' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({ example: 'android', description: 'Loại thiết bị' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiProperty({ example: '1.0.0', description: 'Phiên bản app' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  branchName: string;

  @ApiProperty()
  brandName: string;

  @ApiProperty()
  deviceId: string;
}

export class VerifyPinDto {
  @ApiProperty({ example: '1234', description: 'Mã PIN nhân viên' })
  @IsNotEmpty()
  @IsString()
  pinCode: string;
}

export class VerifyPinResponseDto {
  @ApiProperty()
  staffId: string;

  @ApiProperty()
  staffName: string;

  @ApiProperty()
  staffCode: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  avatarUrl: string;
}
