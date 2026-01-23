import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import {
  FoodPlatformType,
  FoodPlatformAuthType,
} from '../../../database/entities/food-platform-account.entity';

export class CreateFoodPlatformDto {
  @ApiProperty({ description: 'Branch ID' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ description: 'Tên hiển thị (VD: "Grab Food - Chi nhánh Q1")' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Loại nền tảng',
    enum: FoodPlatformType,
    example: FoodPlatformType.GRAB,
  })
  @IsEnum(FoodPlatformType)
  platform: FoodPlatformType;

  @ApiPropertyOptional({
    description: 'Loại xác thực',
    enum: FoodPlatformAuthType,
    default: FoodPlatformAuthType.USERNAME_PASSWORD,
  })
  @IsOptional()
  @IsEnum(FoodPlatformAuthType)
  authType?: FoodPlatformAuthType;

  @ApiPropertyOptional({
    description: 'Khoảng thời gian poll (giây)',
    default: 30,
    minimum: 10,
    maximum: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  pollIntervalSeconds?: number;

  @ApiPropertyOptional({
    description: 'Thứ tự hiển thị',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Kích hoạt',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
