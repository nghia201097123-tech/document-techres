import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class BranchListDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by brand ID' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsOptional()
  @IsString()
  companyId?: string;
}
