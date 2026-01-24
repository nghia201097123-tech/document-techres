import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SocketModule } from './socket/socket.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SocketModule,
    EventsModule,
    HealthModule,
    PublicModule,
  ],
})
export class AppModule {}
