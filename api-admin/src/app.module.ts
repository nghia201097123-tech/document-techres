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
  Department,
  Package,
  TransactionCategory,
  Permission,
  PermissionGroup,
  AdminUser,
  Staff,
  Province,
  Ward,
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
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'techres_master'),
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
    LocationsModule,
    TransactionCategoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
