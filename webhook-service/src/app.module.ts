import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookModule } from './webhook/webhook.module';
import { SocketClientModule } from './socket-client/socket-client.module';
import { ConfigStoreModule } from './config-store/config-store.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ConfigStoreModule,
    WebhookModule,
    SocketClientModule,
  ],
})
export class AppModule {}
