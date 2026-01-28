import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMerchantStatusColumn1706800000000 implements MigrationInterface {
  name = 'AddMerchantStatusColumn1706800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraint from food_order_items first
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "food_order_items"
      DROP CONSTRAINT IF EXISTS "FK_food_order_items_order"
    `);

    // Drop food_orders table (user allowed since test data)
    await queryRunner.query(`DROP TABLE IF EXISTS "food_orders"`);

    // Drop and recreate food_order_status_enum with new simplified values
    await queryRunner.query(`DROP TYPE IF EXISTS "food_order_status_enum"`);
    await queryRunner.query(`
      CREATE TYPE "food_order_status_enum" AS ENUM (
        'new',
        'confirmed',
        'completed',
        'cancelled'
      )
    `);

    // Create merchant_order_status_enum type with Grab API values
    await queryRunner.query(`DROP TYPE IF EXISTS "merchant_order_status_enum"`);
    await queryRunner.query(`
      CREATE TYPE "merchant_order_status_enum" AS ENUM (
        'ORDER_IN_PREPARE',
        'ORDER_EXECUTING',
        'COMPLETED',
        'CANCELLED',
        'CANCELLED_MAX',
        'CANCELLED_PASSENGER',
        'CANCELLED_OPERATOR',
        'FAILED'
      )
    `);

    // Ensure food_platform_type_enum exists (may have been dropped by previous failed migration)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'food_platform_type_enum') THEN
          CREATE TYPE "food_platform_type_enum" AS ENUM ('grab', 'shopee_food', 'befood');
        END IF;
      END
      $$;
    `);

    // Recreate food_orders table with new schema
    await queryRunner.query(`
      CREATE TABLE "food_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" varchar(50) NOT NULL,
        "branch_id" varchar(50) NOT NULL,
        "account_id" uuid,
        "store_mapping_id" uuid,
        "external_order_id" varchar(100) NOT NULL,
        "order_code" varchar(50) NOT NULL,
        "platform" "food_platform_type_enum" NOT NULL,
        "status" "food_order_status_enum" NOT NULL DEFAULT 'new',
        "merchant_status" "merchant_order_status_enum" NOT NULL DEFAULT 'ORDER_IN_PREPARE',
        "previous_status" varchar(50),
        "previous_merchant_status" varchar(50),
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
        "driver_avatar" text,
        "driver_license_plate" varchar(100),
        "estimated_delivery_time" varchar(255),
        "is_auto_confirmed" boolean NOT NULL DEFAULT false,
        "is_printed" boolean NOT NULL DEFAULT false,
        "confirmed_at" TIMESTAMPTZ,
        "printed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "accepted_at" TIMESTAMPTZ,
        "prepared_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "cancelled_at" TIMESTAMPTZ,
        "cancel_reason" varchar(255),
        "platform_created_at" TIMESTAMPTZ,
        "platform_updated_at" TIMESTAMPTZ,
        "last_sync_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "raw_data" jsonb,
        CONSTRAINT "PK_food_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_food_orders_external_platform" UNIQUE ("external_order_id", "platform"),
        CONSTRAINT "FK_food_orders_account" FOREIGN KEY ("account_id") REFERENCES "food_platform_accounts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_food_orders_store_mapping" FOREIGN KEY ("store_mapping_id") REFERENCES "food_platform_store_mappings"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes
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
    await queryRunner.query(`
      CREATE INDEX "IDX_food_orders_merchant_status" ON "food_orders" ("merchant_status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_food_orders_status_merchant_status" ON "food_orders" ("status", "merchant_status")
    `);

    // Recreate FK constraint from food_order_items to food_orders
    await queryRunner.query(`
      ALTER TABLE "food_order_items"
      ADD CONSTRAINT "FK_food_order_items_order"
      FOREIGN KEY ("order_id") REFERENCES "food_orders"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new table
    await queryRunner.query(`DROP TABLE IF EXISTS "food_orders" CASCADE`);

    // Drop new enums
    await queryRunner.query(`DROP TYPE IF EXISTS "merchant_order_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "food_order_status_enum" CASCADE`);

    // Recreate original enum
    await queryRunner.query(`
      CREATE TYPE "food_order_status_enum" AS ENUM (
        'new',
        'accepted',
        'preparing',
        'ready',
        'delivering',
        'completed',
        'cancelled'
      )
    `);

    // Recreate original table
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

    // Recreate original indexes
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
  }
}
