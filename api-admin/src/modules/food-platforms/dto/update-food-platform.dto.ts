import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateFoodPlatformDto {
  @ApiPropertyOptional({ description: 'Tên hiển thị' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Khoảng thời gian poll (giây)',
    minimum: 10,
    maximum: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  pollIntervalSeconds?: number;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Kích hoạt' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
