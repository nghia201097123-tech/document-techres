import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';

// Modules
import { AccountsModule } from './modules/accounts/accounts.module';
import { StoresModule } from './modules/stores/stores.module';
import { MenuModule } from './modules/menu/menu.module';
import { ConnectorsModule } from './modules/connectors/connectors.module';

// Entities
import { FoodPlatformAccount } from './database/entities/food-platform-account.entity';
import { FoodPlatformStoreMapping } from './database/entities/food-platform-store-mapping.entity';
import { FoodPlatformExternalItem } from './database/entities/food-platform-external-item.entity';
import { FoodPlatformItemMapping } from './database/entities/food-platform-item-mapping.entity';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'food_platform'),
        entities: [
          FoodPlatformAccount,
          FoodPlatformStoreMapping,
          FoodPlatformExternalItem,
          FoodPlatformItemMapping,
        ],
        synchronize: false,
        logging: configService.get('DB_LOGGING', 'false') === 'true',
      }),
    }),

    // Redis (for caching and communication with Order Worker)
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),

    // Feature Modules
    ConnectorsModule,
    AccountsModule,
    StoresModule,
    MenuModule,
  ],
})
export class AppModule {}
