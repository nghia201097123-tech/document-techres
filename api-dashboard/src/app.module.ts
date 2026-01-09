import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./modules/auth/auth.module";
import { StaffModule } from "./modules/staff/staff.module";
import { ProductsModule } from "./modules/products/products.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { KitchenModule } from "./modules/kitchen/kitchen.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { AreasModule } from "./modules/areas/areas.module";
import { TablesModule } from "./modules/tables/tables.module";
import { UnitsModule } from "./modules/units/units.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { SurchargesModule } from "./modules/surcharges/surcharges.module";
import { SeasonalPricesModule } from "./modules/seasonal-prices/seasonal-prices.module";
import { GiftItemsModule } from "./modules/gift-items/gift-items.module";
import { VouchersModule } from "./modules/vouchers/vouchers.module";
import { CouponsModule } from "./modules/coupons/coupons.module";
import { BranchProductsModule } from "./modules/branch-products/branch-products.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SyncModule } from "./modules/sync/sync.module";
import { TransactionCategoriesModule } from "./modules/transaction-categories/transaction-categories.module";
import { TransactionVouchersModule } from "./modules/transaction-vouchers/transaction-vouchers.module";
import { StaffBranchModule } from "./modules/staff-branch/staff-branch.module";
import { DatabaseMigrationService } from "./database/database-migration.service";
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
  ProductKitchen,
  DepartmentPermission,
  StaffPermission,
  StaffBranch,
  ComboItem,
  Surcharge,
  SeasonalPrice,
  SeasonalPriceProduct,
  GiftItem,
  Voucher,
  Coupon,
  BranchProduct,
  PaymentMethod,
  BankAccount,
  EInvoiceConfig,
  TransactionVoucher,
} from "./database/entities";
import { DashboardModule } from "./modules/dashboard/dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
          ProductKitchen,
          DepartmentPermission,
          StaffPermission,
          StaffBranch,
          ComboItem,
          Surcharge,
          SeasonalPrice,
          SeasonalPriceProduct,
          GiftItem,
          Voucher,
          Coupon,
          BranchProduct,
          PaymentMethod,
          BankAccount,
          EInvoiceConfig,
          TransactionVoucher,
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
    PermissionsModule,
    SurchargesModule,
    SeasonalPricesModule,
    GiftItemsModule,
    VouchersModule,
    CouponsModule,
    BranchProductsModule,
    SettingsModule,
    SyncModule,
    TransactionCategoriesModule,
    TransactionVouchersModule,
    StaffBranchModule,
  ],
  providers: [DatabaseMigrationService],
})
export class AppModule {}
