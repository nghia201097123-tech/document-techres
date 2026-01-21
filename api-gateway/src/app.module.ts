import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';
import { PayosModule } from './payos/payos.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SocketModule, // Global module for Socket.IO
    HealthModule,
    ProxyModule,
    PayosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
