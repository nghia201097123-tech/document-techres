import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add additional fee columns and scheduled/combined order fields
 *
 * FoodOrder:
 * - small_order_fee: Phí đơn hàng nhỏ (Grab)
 * - item_discount_amount: Tổng giảm giá món ăn
 * - promotion_amount: Số tiền khuyến mãi
 * - is_scheduled_order: Đánh dấu đơn đặt trước
 * - scheduled_delivery_time: Thời gian giao hàng dự kiến
 * - is_combined_order: Đánh dấu đơn ghép
 * - parent_order_id: ID đơn cha (đơn ghép)
 *
 * FoodOrderItems:
 * - discount_amount: Giảm giá của món
 * - modifiers: JSON chứa thông tin options/toppings
 * - sort_order: Thứ tự sắp xếp
 */
export class AddOrderFeeAndScheduleColumns1706900000000 implements MigrationInterface {
  name = 'AddOrderFeeAndScheduleColumns1706900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns to food_orders table
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      ADD COLUMN IF NOT EXISTS "small_order_fee" BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "item_discount_amount" BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "promotion_amount" BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "is_scheduled_order" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "scheduled_delivery_time" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "is_combined_order" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "parent_order_id" VARCHAR(100)
    `);

    // Add columns to food_order_items table
    await queryRunner.query(`
      ALTER TABLE "food_order_items"
      ADD COLUMN IF NOT EXISTS "discount_amount" BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "modifiers" JSONB,
      ADD COLUMN IF NOT EXISTS "sort_order" INT DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from food_orders table
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      DROP COLUMN IF EXISTS "small_order_fee",
      DROP COLUMN IF EXISTS "item_discount_amount",
      DROP COLUMN IF EXISTS "promotion_amount",
      DROP COLUMN IF EXISTS "is_scheduled_order",
      DROP COLUMN IF EXISTS "scheduled_delivery_time",
      DROP COLUMN IF EXISTS "is_combined_order",
      DROP COLUMN IF EXISTS "parent_order_id"
    `);

    // Remove columns from food_order_items table
    await queryRunner.query(`
      ALTER TABLE "food_order_items"
      DROP COLUMN IF EXISTS "discount_amount",
      DROP COLUMN IF EXISTS "modifiers",
      DROP COLUMN IF EXISTS "sort_order"
    `);
  }
}
