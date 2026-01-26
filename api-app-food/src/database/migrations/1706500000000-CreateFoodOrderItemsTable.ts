import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFoodOrderItemsTable1706500000000 implements MigrationInterface {
  name = 'CreateFoodOrderItemsTable1706500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for item status
    await queryRunner.query(`
      CREATE TYPE "food_order_item_status_enum" AS ENUM (
        'pending',
        'preparing',
        'ready',
        'served',
        'cancelled'
      )
    `);

    // Create food_order_items table
    await queryRunner.query(`
      CREATE TABLE "food_order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "product_name" varchar(255) NOT NULL,
        "external_product_id" varchar(100),
        "quantity" int NOT NULL DEFAULT 1,
        "unit_price" bigint NOT NULL DEFAULT 0,
        "total_price" bigint NOT NULL DEFAULT 0,
        "discount_amount" bigint NOT NULL DEFAULT 0,
        "note" text,
        "options" text,
        "modifiers" jsonb,
        "techres_product_id" int,
        "techres_brand_id" int,
        "status" "food_order_item_status_enum" NOT NULL DEFAULT 'pending',
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_food_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_food_order_items_order" FOREIGN KEY ("order_id")
          REFERENCES "food_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_food_order_items_order_id" ON "food_order_items" ("order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_order_items_external_product_id" ON "food_order_items" ("external_product_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_food_order_items_techres_product_id" ON "food_order_items" ("techres_product_id")
    `);

    // Migrate existing JSONB items to the new table
    await queryRunner.query(`
      INSERT INTO "food_order_items" (
        "order_id",
        "product_name",
        "external_product_id",
        "quantity",
        "unit_price",
        "total_price",
        "note",
        "options",
        "techres_product_id",
        "sort_order"
      )
      SELECT
        fo.id as order_id,
        item->>'productName' as product_name,
        item->>'externalProductId' as external_product_id,
        COALESCE((item->>'quantity')::int, 1) as quantity,
        COALESCE((item->>'unitPrice')::bigint, 0) as unit_price,
        COALESCE((item->>'totalPrice')::bigint, 0) as total_price,
        item->>'note' as note,
        item->>'options' as options,
        (item->>'techresProductId')::int as techres_product_id,
        (row_number() OVER (PARTITION BY fo.id ORDER BY 1)) - 1 as sort_order
      FROM "food_orders" fo
      CROSS JOIN LATERAL jsonb_array_elements(fo.items) as item
      WHERE jsonb_array_length(fo.items) > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_food_order_items_techres_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_food_order_items_external_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_food_order_items_order_id"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "food_order_items"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "food_order_item_status_enum"`);
  }
}
