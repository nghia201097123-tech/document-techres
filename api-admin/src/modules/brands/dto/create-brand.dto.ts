import { IsNotEmpty, IsOptional, IsString, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessModel } from '../../../database/entities/brand.entity';

export class CreateBrandDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  companyId: string;

  @ApiProperty({ example: 'Coffee House ABC' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'CHABC' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ enum: BusinessModel, default: BusinessModel.FULL_SYSTEM })
  @IsOptional()
  @IsEnum(BusinessModel)
  businessModel?: BusinessModel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
