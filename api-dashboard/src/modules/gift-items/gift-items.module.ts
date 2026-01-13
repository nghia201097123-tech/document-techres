import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GiftItem, Product } from '../../database/entities';
import { GiftItemsService } from './gift-items.service';
import { GiftItemsController } from './gift-items.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GiftItem, Product])],
  controllers: [GiftItemsController],
  providers: [GiftItemsService],
  exports: [GiftItemsService],
})
export class GiftItemsModule {}
