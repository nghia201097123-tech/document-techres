import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodPlatformAccount, FoodPlatformStoreMapping } from '../../database/entities';
import { ConnectorsModule } from '../connectors/connectors.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FoodPlatformAccount, FoodPlatformStoreMapping]),
    ConnectorsModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
