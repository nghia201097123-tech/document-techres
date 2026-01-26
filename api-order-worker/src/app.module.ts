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
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'food_platform'),
        entities: [
          FoodOrder,
          FoodOrderItem,
          FoodPlatformAccount,
        ],
        synchronize: false,
        logging: configService.get('DB_LOGGING', 'false') === 'true',
      }),
    }),

    // Redis (for caching, pub/sub, and Bull queue)
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),

    // Bull Queue for job processing
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
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
