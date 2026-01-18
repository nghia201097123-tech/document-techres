import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class SortOrderItem {
  @ApiProperty({ description: 'Category ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Sort order (0 = first)', minimum: 0 })
  @IsNumber()
  @Min(0)
  sortOrder: number;
}

export class UpdateSortOrderDto {
  @ApiProperty({ description: 'Array of category sort orders', type: [SortOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortOrderItem)
  sortOrders: SortOrderItem[];
}
