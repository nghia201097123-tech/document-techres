import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1706000000000 implements MigrationInterface {
  name = 'InitialSchema1706000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "food_platform_type_enum" AS ENUM ('grab', 'shopee_food', 'befood')
    `);

    await queryRunner.query(`
      CREATE TYPE "auth_type_enum" AS ENUM ('username_password', 'phone_otp')
    `);

    await queryRunner.query(`
      CREATE TYPE "account_status_enum" AS ENUM ('pending', 'connecting', 'connected', 'disconnected', 'error')
    `);

    await queryRunner.query(`
      CREATE TYPE "food_order_status_enum" AS ENUM ('new', 'accepted', 'preparing', 'ready', 'delivering', 'completed', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TYPE "product_mapping_type_enum" AS ENUM ('direct', 'combo', 'variant')
    `);

    // Create food_platform_ports table
    await queryRunner.query(`
      CREATE TABLE "food_platform_ports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "platform" varchar(50) NOT NULL,
        "display_name" varchar(100) NOT NULL,
        "logo_url" varchar(255),
        "color" varchar(20),
        "client_id" varchar(255),
        "client_secret" varchar(255),
        "api_base_url" varchar(255),
        "webhook_url" varchar(255),
        "supported_auth_types" jsonb NOT NULL DEFAULT '["username_password"]',
        "is_active" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_food_platform_ports_platform" UNIQUE ("platform"),
        CONSTRAINT "PK_food_platform_ports" PRIMARY KEY ("id")
      )
    `);

    // Create food_platform_accounts table
    await queryRunner.query(`
      CREATE TABLE "food_platform_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" varchar(50) NOT NULL,
        "branch_id" uuid,
        "port_id" uuid,
        "platform" "food_platform_type_enum" NOT NULL,
        "auth_type" "auth_type_enum" NOT NULL,
        "display_name" varchar(100),
        "username" varchar(255),
        "password" varchar(255),
        "phone_number" varchar(20),
        "otp_session_id" varchar(100),
        "otp_expires_at" TIMESTAMP,
        "access_token" text,
        "refresh_token" text,
        "token_expires_at" TIMESTAMP,
        "external_merchant_id" varchar(100),
        "external_merchant_name" varchar(255),
        "status" "account_status_enum" NOT NULL DEFAULT 'pending',
        "is_active" boolean NOT NULL DEFAULT false,
        "auto_confirm_enabled" boolean NOT NULL DEFAULT true,
        "auto_print_enabled" boolean NOT NULL DEFAULT true,
        "poll_interval_seconds" int NOT NULL DEFAULT 30,
        "last_poll_at" TIMESTAMP,
        "next_poll_at" TIMESTAMP,
        "error_count" int NOT NULL DEFAULT 0,
        "last_error" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_food_platform_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_food_platform_accounts_port" FOREIGN KEY ("port_id") REFERENCES "food_platform_ports"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_platform_accounts_tenant_platform" ON "food_platform_accounts" ("tenant_id", "platform")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_platform_accounts_branch" ON "food_platform_accounts" ("branch_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_platform_accounts_status" ON "food_platform_accounts" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_platform_accounts_next_poll" ON "food_platform_accounts" ("next_poll_at")
    `);

    // Create food_platform_store_mappings table
    await queryRunner.query(`
      CREATE TABLE "food_platform_store_mappings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "account_id" uuid NOT NULL,
        "tenant_id" varchar(50) NOT NULL,
        "external_store_id" varchar(100) NOT NULL,
        "external_store_name" varchar(255) NOT NULL,
        "external_store_address" text,
        "external_store_phone" varchar(20),
        "is_store_active" boolean DEFAULT true,
        "branch_id" int NOT NULL,
        "branch_name" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_synced_at" TIMESTAMP,
        CONSTRAINT "PK_food_platform_store_mappings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_store_mapping_account_store" UNIQUE ("account_id", "external_store_id"),
        CONSTRAINT "UQ_store_mapping_branch_account" UNIQUE ("branch_id", "account_id"),
        CONSTRAINT "FK_food_platform_store_mappings_account" FOREIGN KEY ("account_id") REFERENCES "food_platform_accounts"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_platform_store_mappings_account" ON "food_platform_store_mappings" ("account_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_platform_store_mappings_branch" ON "food_platform_store_mappings" ("branch_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_platform_store_mappings_external" ON "food_platform_store_mappings" ("external_store_id")
    `);

    // Create food_orders table
    await queryRunner.query(`
      CREATE TABLE "food_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" varchar(50) NOT NULL,
        "branch_id" int NOT NULL,
        "account_id" uuid,
        "store_mapping_id" uuid,
        "external_order_id" varchar(100) NOT NULL,
        "order_code" varchar(50) NOT NULL,
        "platform" "food_platform_type_enum" NOT NULL,
        "status" "food_order_status_enum" NOT NULL DEFAULT 'new',
        "previous_status" varchar(50),
        "customer_name" varchar(255) NOT NULL,
        "customer_phone" varchar(20) NOT NULL,
        "customer_address" text,
        "customer_note" text,
        "items" jsonb NOT NULL DEFAULT '[]',
        "subtotal" bigint NOT NULL DEFAULT 0,
        "delivery_fee" bigint NOT NULL DEFAULT 0,
        "platform_fee" bigint NOT NULL DEFAULT 0,
        "discount" bigint NOT NULL DEFAULT 0,
        "total_amount" bigint NOT NULL DEFAULT 0,
        "is_paid" boolean NOT NULL DEFAULT false,
        "payment_method" varchar(50),
        "driver_name" varchar(255),
        "driver_phone" varchar(20),
        "driver_license_plate" varchar(100),
        "estimated_delivery_time" varchar(255),
        "is_auto_confirmed" boolean NOT NULL DEFAULT false,
        "is_printed" boolean NOT NULL DEFAULT false,
        "confirmed_at" TIMESTAMP,
        "printed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "accepted_at" TIMESTAMP,
        "prepared_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "cancelled_at" TIMESTAMP,
        "cancel_reason" varchar(255),
        "platform_created_at" TIMESTAMP,
        "platform_updated_at" TIMESTAMP,
        "last_sync_at" TIMESTAMP NOT NULL DEFAULT now(),
        "raw_data" jsonb,
        CONSTRAINT "PK_food_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_food_orders_external_platform" UNIQUE ("external_order_id", "platform"),
        CONSTRAINT "FK_food_orders_account" FOREIGN KEY ("account_id") REFERENCES "food_platform_accounts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_food_orders_store_mapping" FOREIGN KEY ("store_mapping_id") REFERENCES "food_platform_store_mappings"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_orders_tenant_branch" ON "food_orders" ("tenant_id", "branch_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_orders_platform_status" ON "food_orders" ("platform", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_orders_created_at" ON "food_orders" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_orders_last_sync_at" ON "food_orders" ("last_sync_at")
    `);

    // Create food_platform_product_mappings table (for future use)
    await queryRunner.query(`
      CREATE TABLE "food_platform_product_mappings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "store_mapping_id" uuid NOT NULL,
        "tenant_id" varchar(50) NOT NULL,
        "external_product_id" varchar(100) NOT NULL,
        "external_product_name" varchar(255) NOT NULL,
        "external_product_price" bigint,
        "external_category" varchar(255),
        "product_id" int,
        "product_name" varchar(255),
        "mapping_type" "product_mapping_type_enum" NOT NULL DEFAULT 'direct',
        "variant_mapping" jsonb,
        "combo_items" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_synced" boolean NOT NULL DEFAULT false,
        "confidence" decimal(5,2),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_food_platform_product_mappings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_product_mapping_store_external" UNIQUE ("store_mapping_id", "external_product_id"),
        CONSTRAINT "FK_food_platform_product_mappings_store" FOREIGN KEY ("store_mapping_id") REFERENCES "food_platform_store_mappings"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_platform_product_mappings_store" ON "food_platform_product_mappings" ("store_mapping_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_platform_product_mappings_product" ON "food_platform_product_mappings" ("product_id")
    `);

    // Insert default platform ports
    await queryRunner.query(`
      INSERT INTO "food_platform_ports" ("platform", "display_name", "color", "supported_auth_types", "is_active")
      VALUES
        ('grab', 'GrabFood', '#00B14F', '["username_password"]', true),
        ('shopee_food', 'ShopeeFood', '#EE4D2D', '["phone_otp"]', true),
        ('befood', 'BeFood', '#2196F3', '["username_password"]', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "food_platform_product_mappings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "food_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "food_platform_store_mappings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "food_platform_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "food_platform_ports"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "product_mapping_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "food_order_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "account_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "auth_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "food_platform_type_enum"`);
  }
}
