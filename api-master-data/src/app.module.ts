import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./modules/auth/auth.module";
import { SyncModule } from "./modules/sync/sync.module";

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
        host: configService.get("DB_HOST", "172.16.10.146"),
        port: configService.get("DB_PORT", 5432),
        username: configService.get("DB_USERNAME", "techres"),
        password: configService.get("DB_PASSWORD", "techres"),
        database: configService.get("DB_DATABASE", "techres"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: false, // Use migrations in production
        logging: configService.get("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    SyncModule,
  ],
})
export class AppModule {}
