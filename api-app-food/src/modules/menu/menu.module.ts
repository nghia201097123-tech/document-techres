import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FoodPlatformAccount,
  FoodPlatformExternalItem,
  FoodPlatformItemMapping,
} from '../../database/entities';
import { AccountsModule } from '../accounts/accounts.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FoodPlatformAccount,
      FoodPlatformExternalItem,
      FoodPlatformItemMapping,
    ]),
    AccountsModule,
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
