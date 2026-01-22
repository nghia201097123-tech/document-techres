import { Module, Global } from '@nestjs/common';
import { ConfigStoreService } from './config-store.service';
import { ConfigStoreController } from './config-store.controller';

@Global()
@Module({
  controllers: [ConfigStoreController],
  providers: [ConfigStoreService],
  exports: [ConfigStoreService],
})
export class ConfigStoreModule {}
