import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to alter techres_brand_id and techres_item_id columns
 * from INT to VARCHAR(100) to support UUID strings
 */
export class AlterItemMappingIdsToVarchar1706100000000 implements MigrationInterface {
  name = 'AlterItemMappingIdsToVarchar1706100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the table exists
    const tableExists = await queryRunner.hasTable('food_platform_item_mappings');
    if (!tableExists) {
      // Table doesn't exist yet, nothing to migrate
      return;
    }

    // Alter techres_brand_id from INT to VARCHAR(100)
    await queryRunner.query(`
      ALTER TABLE "food_platform_item_mappings"
      ALTER COLUMN "techres_brand_id" TYPE VARCHAR(100)
      USING "techres_brand_id"::VARCHAR(100)
    `);

    // Alter techres_item_id from INT to VARCHAR(100)
    await queryRunner.query(`
      ALTER TABLE "food_platform_item_mappings"
      ALTER COLUMN "techres_item_id" TYPE VARCHAR(100)
      USING "techres_item_id"::VARCHAR(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert techres_brand_id back to INT
    await queryRunner.query(`
      ALTER TABLE "food_platform_item_mappings"
      ALTER COLUMN "techres_brand_id" TYPE INTEGER
      USING "techres_brand_id"::INTEGER
    `);

    // Revert techres_item_id back to INT
    await queryRunner.query(`
      ALTER TABLE "food_platform_item_mappings"
      ALTER COLUMN "techres_item_id" TYPE INTEGER
      USING "techres_item_id"::INTEGER
    `);
  }
}
