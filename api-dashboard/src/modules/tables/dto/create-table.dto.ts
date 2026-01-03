import { IsNotEmpty, IsOptional, IsString, IsInt, IsUUID, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsNotEmpty({ message: 'Khu vực không được để trống' })
  @IsUUID()
  areaId: string;

  @ApiProperty({ example: 'Bàn 01' })
  @IsNotEmpty({ message: 'Tên bàn không được để trống' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 4, default: 4, description: 'Số người tối đa' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  capacity?: number;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
