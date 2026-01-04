import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class BrandListDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsOptional()
  @IsString()
  companyId?: string;
}
