import { PartialType } from '@nestjs/swagger';
import { CreateSeasonalPriceDto } from './create-seasonal-price.dto';

export class UpdateSeasonalPriceDto extends PartialType(CreateSeasonalPriceDto) {}
