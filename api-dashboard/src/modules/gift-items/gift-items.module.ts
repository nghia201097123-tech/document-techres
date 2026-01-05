import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GiftItem } from '../../database/entities';
import { GiftItemsService } from './gift-items.service';
import { GiftItemsController } from './gift-items.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GiftItem])],
  controllers: [GiftItemsController],
  providers: [GiftItemsService],
  exports: [GiftItemsService],
})
export class GiftItemsModule {}
