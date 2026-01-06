import { IsString, IsBoolean, IsNumber, IsOptional, IsArray, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBranchProductDto {
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  customPrice?: number | null;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}

export class BulkToggleAvailabilityDto {
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @IsBoolean()
  isAvailable: boolean;
}

export class SyncBranchProductsDto {
  @IsUUID()
  branchId: string;
}
