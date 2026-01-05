import { PartialType } from '@nestjs/swagger';
import { CreateGiftItemDto } from './create-gift-item.dto';

export class UpdateGiftItemDto extends PartialType(CreateGiftItemDto) {}
