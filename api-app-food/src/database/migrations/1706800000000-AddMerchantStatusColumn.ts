import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMerchantStatusColumn1706800000000 implements MigrationInterface {
  name = 'AddMerchantStatusColumn1706800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create merchant_order_status_enum type
    await queryRunner.query(`
      CREATE TYPE "merchant_order_status_enum" AS ENUM (
        'pending',
        'accepted',
        'preparing',
        'ready',
        'delivering',
        'completed',
        'cancelled'
      )
    `);

    // Add 'confirmed' value to food_order_status_enum if not exists
    await queryRunner.query(`
      ALTER TYPE "food_order_status_enum" ADD VALUE IF NOT EXISTS 'confirmed' AFTER 'new'
    `);

    // Add merchant_status column with default value
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      ADD COLUMN IF NOT EXISTS "merchant_status" "merchant_order_status_enum" DEFAULT 'pending'
    `);

    // Add previous_merchant_status column
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      ADD COLUMN IF NOT EXISTS "previous_merchant_status" varchar(50)
    `);

    // Migrate existing data: Map old TechRes statuses to merchant statuses
    // Orders that were 'accepted', 'preparing', 'ready', 'delivering' should have those as merchant status
    // and TechRes status should be 'confirmed' if they were accepted by user
    await queryRunner.query(`
      UPDATE "food_orders"
      SET "merchant_status" = CASE
        WHEN "status" = 'new' THEN 'pending'::merchant_order_status_enum
        WHEN "status" = 'accepted' THEN 'accepted'::merchant_order_status_enum
        WHEN "status" = 'preparing' THEN 'preparing'::merchant_order_status_enum
        WHEN "status" = 'ready' THEN 'ready'::merchant_order_status_enum
        WHEN "status" = 'delivering' THEN 'delivering'::merchant_order_status_enum
        WHEN "status" = 'completed' THEN 'completed'::merchant_order_status_enum
        WHEN "status" = 'cancelled' THEN 'cancelled'::merchant_order_status_enum
        ELSE 'pending'::merchant_order_status_enum
      END
      WHERE "merchant_status" IS NULL OR "merchant_status" = 'pending'
    `);

    // Update TechRes status for orders that were in progress
    // If order was accepted/preparing/ready/delivering, set TechRes status to 'confirmed'
    await queryRunner.query(`
      UPDATE "food_orders"
      SET "status" = 'confirmed'::food_order_status_enum
      WHERE "status" IN ('accepted', 'preparing', 'ready', 'delivering')
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

    // Revert TechRes status - convert 'confirmed' back to 'accepted'
    await queryRunner.query(`
      UPDATE "food_orders"
      SET "status" = 'accepted'::food_order_status_enum
      WHERE "status" = 'confirmed'
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
