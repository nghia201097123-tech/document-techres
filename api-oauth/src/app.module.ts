import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import {
  User,
  RefreshToken,
  Session,
  PasswordReset,
  AuditLog,
} from './entities';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [User, RefreshToken, Session, PasswordReset, AuditLog],
        synchronize: configService.get('nodeEnv') === 'development',
        logging: configService.get('nodeEnv') === 'development',
      }),
    }),

    // Feature Modules
    AuthModule,
  ],
})
export class AppModule {}
