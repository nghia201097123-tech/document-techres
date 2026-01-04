import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsNumber, IsOptional, IsArray, ValidateNested, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

// DTO for creating a topping group
export class CreateToppingGroupDto {
  @ApiProperty({ description: 'Tên nhóm (ví dụ: Size, Topping)' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Bắt buộc chọn hay không', default: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiProperty({ description: 'Số lượng tối thiểu phải chọn', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minSelection?: number;

  @ApiProperty({ description: 'Số lượng tối đa được chọn', default: 10 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxSelection?: number;

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateToppingGroupDto {
  @ApiProperty({ description: 'Tên nhóm', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Bắt buộc chọn hay không', required: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiProperty({ description: 'Số lượng tối thiểu phải chọn', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minSelection?: number;

  @ApiProperty({ description: 'Số lượng tối đa được chọn', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxSelection?: number;

  @ApiProperty({ description: 'Thứ tự hiển thị', required: false })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

// DTO for adding a topping item to a group
export class AddToppingItemDto {
  @ApiProperty({ description: 'ID của topping (product)' })
  @IsUUID()
  toppingId: string;

  @ApiProperty({ description: 'Giá chênh lệch (ví dụ: Size L thêm 5000)', default: 0 })
  @IsNumber()
  @IsOptional()
  priceAdjustment?: number;

  @ApiProperty({ description: 'Số lượng tối đa có thể chọn', default: 5 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxQuantity?: number;

  @ApiProperty({ description: 'Thứ tự hiển thị', default: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateToppingItemDto {
  @ApiProperty({ description: 'Giá chênh lệch', required: false })
  @IsNumber()
  @IsOptional()
  priceAdjustment?: number;

  @ApiProperty({ description: 'Số lượng tối đa có thể chọn', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxQuantity?: number;

  @ApiProperty({ description: 'Thứ tự hiển thị', required: false })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

// DTO for assigning topping groups to a product
export class AssignToppingGroupsDto {
  @ApiProperty({ description: 'Danh sách ID nhóm topping cần gán', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds: string[];
}
