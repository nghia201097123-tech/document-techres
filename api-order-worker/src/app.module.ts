import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { BullModule } from '@nestjs/bull';

// Modules
import { OrdersModule } from './modules/orders/orders.module';
import { WorkersModule } from './modules/workers/workers.module';
import { QueueModule } from './modules/queue/queue.module';
import { ConnectorsModule } from './modules/connectors/connectors.module';

// Entities
import { FoodOrder } from './database/entities/food-order.entity';
import { FoodOrderItem } from './database/entities/food-order-item.entity';
import { FoodPlatformAccount } from './database/entities/food-platform-account.entity';

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
        host: configService.get('CONFIG_POSTGRESQL_HOST_APP_FOOD', '172.16.10.146'),
        port: configService.get('CONFIG_POSTGRESQL_PORT_APP_FOOD', 5432),
        username: configService.get('CONFIG_POSTGRESQL_USERNAME_APP_FOOD', 'techres_app_food'),
        password: configService.get('CONFIG_POSTGRESQL_PASSWORD_APP_FOOD', 'techres_app_food'),
        database: configService.get('CONFIG_POSTGRESQL_DB_NAME_APP_FOOD', 'techres_app_food'),
        entities: [
          FoodOrder,
          FoodOrderItem,
          FoodPlatformAccount,
        ],
        synchronize: configService.get('DB_SYNCHRONIZE', 'false') === 'true',
        logging: configService.get('DB_LOGGING', 'false') === 'true',
      }),
    }),

    // Redis (for caching, pub/sub, and Bull queue)
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('CONFIG_REDIS_HOST', '172.16.10.146')}:${configService.get('CONFIG_REDIS_PORT', 6379)}`,
      }),
    }),

    // Bull Queue for job processing
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('CONFIG_REDIS_HOST', '172.16.10.146'),
          port: configService.get('CONFIG_REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),

    // Feature Modules
    ConnectorsModule,
    WorkersModule,
    QueueModule,
    OrdersModule,
  ],
})
export class AppModule {}
