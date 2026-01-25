import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to change branch_id from INT to VARCHAR(50)
 * This supports both UUID branchIds (new system) and legacy integer branchIds
 *
 * Affected tables:
 * - food_platform_store_mappings
 * - food_orders
 */
export class ChangeBranchIdToVarchar1706400000000 implements MigrationInterface {
  name = 'ChangeBranchIdToVarchar1706400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change branch_id in food_platform_store_mappings
    // First, alter the column type from INT to VARCHAR(50)
    await queryRunner.query(`
      ALTER TABLE "food_platform_store_mappings"
      ALTER COLUMN "branch_id" TYPE VARCHAR(50)
      USING "branch_id"::VARCHAR(50)
    `);

    console.log('Changed food_platform_store_mappings.branch_id to VARCHAR(50)');

    // Change branch_id in food_orders
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      ALTER COLUMN "branch_id" TYPE VARCHAR(50)
      USING "branch_id"::VARCHAR(50)
    `);

    console.log('Changed food_orders.branch_id to VARCHAR(50)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to INT type (this may fail if there are non-numeric values)
    await queryRunner.query(`
      ALTER TABLE "food_platform_store_mappings"
      ALTER COLUMN "branch_id" TYPE INT
      USING "branch_id"::INT
    `);

    await queryRunner.query(`
      ALTER TABLE "food_orders"
      ALTER COLUMN "branch_id" TYPE INT
      USING "branch_id"::INT
    `);
  }
}
