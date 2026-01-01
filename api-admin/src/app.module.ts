import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entities
import {
  Company,
  Brand,
  Branch,
  Package,
  TransactionCategory,
  Permission,
  PermissionGroup,
  AdminUser,
  Staff,
} from './database/entities';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { BrandsModule } from './modules/brands/brands.module';
import { BranchesModule } from './modules/branches/branches.module';
import { PackagesModule } from './modules/packages/packages.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';

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
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [
          Company,
          Brand,
          Branch,
          Package,
          TransactionCategory,
          Permission,
          PermissionGroup,
          AdminUser,
          Staff,
        ],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    CompaniesModule,
    BrandsModule,
    BranchesModule,
    PackagesModule,
    CategoriesModule,
    PermissionsModule,
    AdminUsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
