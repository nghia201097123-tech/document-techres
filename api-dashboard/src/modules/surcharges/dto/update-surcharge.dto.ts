import { PartialType } from '@nestjs/swagger';
import { CreateSurchargeDto } from './create-surcharge.dto';

export class UpdateSurchargeDto extends PartialType(CreateSurchargeDto) {}
