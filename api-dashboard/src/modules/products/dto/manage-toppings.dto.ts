import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ToppingItemDto {
  @ApiProperty({ description: 'ID của topping' })
  @IsUUID()
  toppingId: string;

  @ApiProperty({ description: 'Bắt buộc chọn hay không', default: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiProperty({ description: 'Số lượng tối đa có thể chọn', default: 5 })
  @IsNumber()
  @IsOptional()
  maxQuantity?: number;

  @ApiProperty({ description: 'Thứ tự sắp xếp', default: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class SetToppingsDto {
  @ApiProperty({ description: 'Danh sách topping', type: [ToppingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToppingItemDto)
  toppings: ToppingItemDto[];
}

export class AddToppingDto {
  @ApiProperty({ description: 'ID của topping' })
  @IsUUID()
  toppingId: string;

  @ApiProperty({ description: 'Bắt buộc chọn hay không', default: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiProperty({ description: 'Số lượng tối đa có thể chọn', default: 5 })
  @IsNumber()
  @IsOptional()
  maxQuantity?: number;
}
