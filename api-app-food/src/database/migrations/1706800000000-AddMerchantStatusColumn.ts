import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMerchantStatusColumn1706800000000 implements MigrationInterface {
  name = 'AddMerchantStatusColumn1706800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create merchant_order_status_enum type if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_order_status_enum') THEN
          CREATE TYPE "merchant_order_status_enum" AS ENUM (
            'ORDER_IN_PREPARE',
            'ORDER_EXECUTING',
            'COMPLETED',
            'CANCELLED',
            'CANCELLED_MAX',
            'CANCELLED_PASSENGER',
            'CANCELLED_OPERATOR',
            'FAILED'
          );
        END IF;
      END
      $$;
    `);

    // Create food_order_status_enum if not exists (for fresh databases)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'food_order_status_enum') THEN
          CREATE TYPE "food_order_status_enum" AS ENUM (
            'new',
            'confirmed',
            'completed',
            'cancelled'
          );
        END IF;
      END
      $$;
    `);

    // Add 'confirmed' value to food_order_status_enum if it exists but doesn't have 'confirmed'
    // Note: ALTER TYPE ADD VALUE cannot run inside a transaction block in PostgreSQL
    // We use a workaround by checking first and only adding if needed
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Check if 'confirmed' value exists in the enum
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'food_order_status_enum')
          AND enumlabel = 'confirmed'
        ) THEN
          -- We need to commit current transaction and add the value
          -- Since we can't do ALTER TYPE ADD VALUE in a transaction, we'll recreate the enum
          -- by creating a new type and migrating

          -- Create a temporary enum with all values including 'confirmed'
          CREATE TYPE "food_order_status_enum_new" AS ENUM (
            'new',
            'accepted',
            'preparing',
            'ready',
            'delivering',
            'confirmed',
            'completed',
            'cancelled'
          );

          -- Alter the column to use the new type
          ALTER TABLE "food_orders"
            ALTER COLUMN "status" TYPE "food_order_status_enum_new"
            USING ("status"::text::"food_order_status_enum_new");

          -- Drop the old type and rename the new one
          DROP TYPE "food_order_status_enum";
          ALTER TYPE "food_order_status_enum_new" RENAME TO "food_order_status_enum";
        END IF;
      EXCEPTION
        WHEN others THEN
          -- If anything fails, just continue (the type might already be correct)
          NULL;
      END
      $$;
    `);

    // Add merchant_status column with default value ORDER_IN_PREPARE
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      ADD COLUMN IF NOT EXISTS "merchant_status" "merchant_order_status_enum" DEFAULT 'ORDER_IN_PREPARE'
    `);

    // Add previous_merchant_status column
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      ADD COLUMN IF NOT EXISTS "previous_merchant_status" varchar(50)
    `);

    // Migrate existing data: Map old TechRes statuses to Grab merchant statuses
    await queryRunner.query(`
      UPDATE "food_orders"
      SET "merchant_status" = CASE
        WHEN "status"::text = 'new' THEN 'ORDER_IN_PREPARE'::merchant_order_status_enum
        WHEN "status"::text = 'accepted' THEN 'ORDER_IN_PREPARE'::merchant_order_status_enum
        WHEN "status"::text = 'preparing' THEN 'ORDER_IN_PREPARE'::merchant_order_status_enum
        WHEN "status"::text = 'ready' THEN 'ORDER_IN_PREPARE'::merchant_order_status_enum
        WHEN "status"::text = 'delivering' THEN 'ORDER_EXECUTING'::merchant_order_status_enum
        WHEN "status"::text = 'completed' THEN 'COMPLETED'::merchant_order_status_enum
        WHEN "status"::text = 'cancelled' THEN 'CANCELLED'::merchant_order_status_enum
        ELSE 'ORDER_IN_PREPARE'::merchant_order_status_enum
      END
      WHERE "merchant_status" IS NULL OR "merchant_status" = 'ORDER_IN_PREPARE'
    `);

    // Update TechRes status for orders that were in progress
    // If order was accepted/preparing/ready/delivering, set TechRes status to 'confirmed'
    await queryRunner.query(`
      UPDATE "food_orders"
      SET "status" = 'confirmed'::"food_order_status_enum"
      WHERE "status"::text IN ('accepted', 'preparing', 'ready', 'delivering')
    `);

    // Create index on merchant_status for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_food_orders_merchant_status" ON "food_orders" ("merchant_status")
    `);

    // Create composite index for TechRes + Merchant status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_food_orders_status_merchant_status" ON "food_orders" ("status", "merchant_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_food_orders_status_merchant_status"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_food_orders_merchant_status"
    `);

    // Revert TechRes status - convert 'confirmed' back to 'new' (safest option)
    // Check if 'accepted' exists in enum, otherwise use 'new'
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'food_order_status_enum')
          AND enumlabel = 'accepted'
        ) THEN
          UPDATE "food_orders"
          SET "status" = 'accepted'::"food_order_status_enum"
          WHERE "status"::text = 'confirmed';
        ELSE
          UPDATE "food_orders"
          SET "status" = 'new'::"food_order_status_enum"
          WHERE "status"::text = 'confirmed';
        END IF;
      EXCEPTION
        WHEN others THEN
          NULL;
      END
      $$;
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      DROP COLUMN IF EXISTS "previous_merchant_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "food_orders"
      DROP COLUMN IF EXISTS "merchant_status"
    `);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "merchant_order_status_enum"
    `);

    // Note: Cannot remove 'confirmed' from food_order_status_enum easily in PostgreSQL
    // The value will remain but won't be used
  }
}
