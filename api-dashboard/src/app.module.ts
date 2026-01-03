import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { StaffModule } from './modules/staff/staff.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { BrandsModule } from './modules/brands/brands.module';
import { BranchesModule } from './modules/branches/branches.module';
import { LocationsModule } from './modules/locations/locations.module';
import { AreasModule } from './modules/areas/areas.module';
import { TablesModule } from './modules/tables/tables.module';
import { UnitsModule } from './modules/units/units.module';
import { DatabaseMigrationService } from './database/database-migration.service';
import {
  Company,
  Brand,
  Branch,
  Department,
  Staff,
  Package,
  Province,
  Ward,
  AdminUser,
  Permission,
  PermissionGroup,
  TransactionCategory,
  Product,
  Category,
  Kitchen,
  Area,
  Table,
  ToppingGroup,
  ToppingGroupItem,
  ProductToppingGroup,
  ProductTopping,
  ProductNote,
  ProductNoteAssignment,
  Unit,
} from './database/entities';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'techres'),
        entities: [
          Company,
          Brand,
          Branch,
          Department,
          Staff,
          Package,
          Province,
          Ward,
          AdminUser,
          Permission,
          PermissionGroup,
          TransactionCategory,
          Product,
          Category,
          Kitchen,
          Area,
          Table,
          ToppingGroup,
          ToppingGroupItem,
          ProductToppingGroup,
          ProductTopping,
          ProductNote,
          ProductNoteAssignment,
          Unit,
        ],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    StaffModule,
    ProductsModule,
    CategoriesModule,
    KitchenModule,
    DepartmentsModule,
    DashboardModule,
    BrandsModule,
    BranchesModule,
    LocationsModule,
    AreasModule,
    TablesModule,
    UnitsModule,
  ],
  providers: [DatabaseMigrationService],
})
export class AppModule {}
