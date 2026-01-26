import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./modules/auth/auth.module";
import { SyncModule } from "./modules/sync/sync.module";
import { DatabaseModule } from "./database/database.module";
import { PublicModule } from "./modules/public/public.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("CONFIG_POSTGRESQL_HOST_TECHRES", "172.16.10.146"),
        port: configService.get("CONFIG_POSTGRESQL_PORT_TECHRES", 5432),
        username: configService.get("CONFIG_POSTGRESQL_USERNAME_TECHRES", "techres"),
        password: configService.get("CONFIG_POSTGRESQL_PASSWORD_TECHRES", "techres"),
        database: configService.get("CONFIG_POSTGRESQL_DB_NAME_TECHRES", "techres"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: false,
        logging: configService.get("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    SyncModule,
    PublicModule,
  ],
})
export class AppModule {}
