import { IsNotEmpty, IsArray, ValidateNested, IsInt, Min, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ComboItemDto {
  @ApiProperty({ description: 'ID của món' })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Số lượng', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class AssignComboItemsDto {
  @ApiProperty({ description: 'Danh sách món trong combo', type: [ComboItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items: ComboItemDto[];
}
