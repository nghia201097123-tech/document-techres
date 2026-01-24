import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Common module
import { CommonModule } from './common/common.module';

// Entities
import {
  Company,
  Brand,
  Branch,
  Department,
  Package,
  TransactionCategory,
  Permission,
  PermissionGroup,
  AdminUser,
  Staff,
  Province,
  Ward,
  FoodPlatformAccount,
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
import { LocationsModule } from './modules/locations/locations.module';
import { TransactionCategoriesModule } from './modules/transaction-categories/transaction-categories.module';
import { FoodPlatformsModule } from './modules/food-platforms/food-platforms.module';
import { PublicModule } from './modules/public/public.module';

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
        host: configService.get('CONFIG_POSTGRESQL_HOST', '172.16.10.146'),
        port: configService.get<number>('CONFIG_POSTGRESQL_PORT', 5432),
        username: configService.get('CONFIG_POSTGRESQL_USERNAME', 'techres_master'),
        password: configService.get('CONFIG_POSTGRESQL_PASSWORD', 'techres_master'),
        database: configService.get('CONFIG_POSTGRESQL_DB_NAME', 'techres_master'),
        entities: [
          Company,
          Brand,
          Branch,
          Department,
          Package,
          TransactionCategory,
          Permission,
          PermissionGroup,
          AdminUser,
          Staff,
          Province,
          Ward,
          FoodPlatformAccount,
        ],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Common module (global)
    CommonModule,

    // Feature modules
    AuthModule,
    CompaniesModule,
    BrandsModule,
    BranchesModule,
    PackagesModule,
    CategoriesModule,
    PermissionsModule,
    AdminUsersModule,
    LocationsModule,
    TransactionCategoriesModule,
    FoodPlatformsModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
