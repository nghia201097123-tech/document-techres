import { IsNotEmpty, IsOptional, IsString, IsEmail, MaxLength, ValidateIf, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../../database/entities/enums';

export class CreateStaffDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty({ message: 'Tên nhân viên không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '1990-01-15', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  birthDate: string;

  @ApiProperty({ enum: Gender, example: 'male', description: 'Giới tính: male/female' })
  @IsNotEmpty({ message: 'Giới tính không được để trống' })
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender: Gender;

  @ApiProperty({ example: '123 Nguyễn Văn Linh, P.1, Q.7, TP.HCM', description: 'Địa chỉ hành chính' })
  @IsNotEmpty({ message: 'Địa chỉ hành chính không được để trống' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'ID bộ phận' })
  @IsNotEmpty({ message: 'Bộ phận không được để trống' })
  @IsString()
  departmentId: string;

  @ApiProperty({ description: 'ID thương hiệu' })
  @IsNotEmpty({ message: 'Thương hiệu không được để trống' })
  @IsString()
  brandId: string;

  @ApiProperty({ description: 'ID chi nhánh' })
  @IsNotEmpty({ message: 'Chi nhánh không được để trống' })
  @IsString()
  branchId: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'nva@company.vn' })
  @IsOptional()
  @ValidateIf((o) => o.email && o.email.length > 0)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '001234567890', description: 'Căn cước công dân' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  idNumber?: string;

  @ApiPropertyOptional({ example: 'staff' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    example: 'tr',
    description: 'Prefix cho username (2 ký tự), mặc định là "tr". VD: tr000001'
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  usernamePrefix?: string;
}
