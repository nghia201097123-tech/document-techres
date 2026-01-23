import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GrabConnector } from './grab.connector';
import { ShopeeConnector } from './shopee.connector';
import { BeFoodConnector } from './befood.connector';
import { ConnectorFactory } from './connector.factory';

@Module({
  imports: [ConfigModule],
  providers: [
    GrabConnector,
    ShopeeConnector,
    BeFoodConnector,
    ConnectorFactory,
  ],
  exports: [
    GrabConnector,
    ShopeeConnector,
    BeFoodConnector,
    ConnectorFactory,
  ],
})
export class ConnectorsModule {}
