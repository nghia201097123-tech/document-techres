import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import configuration from "./config/configuration";
import { AuthModule } from "./modules/auth/auth.module";
import {
  User,
  RefreshToken,
  Session,
  PasswordReset,
  AuditLog,
} from "./entities";

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
        type: "postgres",
        host: configService.get("database.host", "172.16.10.146"),
        port: configService.get("database.port", 5432),
        username: configService.get("database.username", "fnbpos_oauth"),
        password: configService.get("database.password", "fnbpos_oauth"),
        database: configService.get("database.database", "fnbpos_oauth"),
        entities: [User, RefreshToken, Session, PasswordReset, AuditLog],
        synchronize: configService.get("nodeEnv") === "development",
        logging: configService.get("nodeEnv") === "development",
      }),
    }),

    // Feature Modules
    AuthModule,
  ],
})
export class AppModule {}
