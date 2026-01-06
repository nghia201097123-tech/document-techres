import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class QuickCreateDto {
  @ApiProperty({
    description: 'Tên công ty',
    example: 'Nhà hàng Phở Việt',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiPropertyOptional({
    description: 'Dùng thử (mặc định false)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isTrial?: boolean;
}
