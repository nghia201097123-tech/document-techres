import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Config
import databaseConfig from './config/database.config';
import platformConfig from './config/platform.config';
import jwtConfig from './config/jwt.config';

// Common
import { CommonModule } from './common/common.module';

// Modules
import { AccountsModule } from './modules/accounts/accounts.module';
import { StoresModule } from './modules/stores/stores.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ConnectorsModule } from './modules/connectors/connectors.module';
import { SyncModule } from './modules/sync/sync.module';
import { PublicModule } from './modules/public/public.module';
import { MenuModule } from './modules/menu/menu.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, platformConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: configService.get('database.entities'),
        migrations: configService.get('database.migrations'),
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('database.logging'),
      }),
      inject: [ConfigService],
    }),

    // Schedule (for cron jobs)
    ScheduleModule.forRoot(),

    // Common
    CommonModule,

    // Redis (for caching, pub/sub)
    RedisModule,

    // Feature Modules
    ConnectorsModule,
    AccountsModule,
    StoresModule,
    OrdersModule,
    SyncModule,
    PublicModule,
    MenuModule,
  ],
})
export class AppModule {}
