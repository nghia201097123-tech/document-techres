import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to remove the unique constraint on branchId + accountId
 * This allows one branch to be linked to multiple stores on the same platform
 */
export class RemoveBranchAccountUniqueConstraint1706200000000
  implements MigrationInterface
{
  name = 'RemoveBranchAccountUniqueConstraint1706200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint on branchId + accountId
    // The constraint name may vary, so we find it dynamically
    const constraintResult = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'food_platform_store_mappings'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%branch_id%account_id%'
    `);

    if (constraintResult && constraintResult.length > 0) {
      for (const row of constraintResult) {
        console.log(`Dropping constraint: ${row.constraint_name}`);
        await queryRunner.query(
          `ALTER TABLE "food_platform_store_mappings" DROP CONSTRAINT "${row.constraint_name}"`
        );
      }
    }

    // Also try to drop by known TypeORM generated names
    const possibleNames = [
      'UQ_food_platform_store_mappings_branch_id_account_id',
      'food_platform_store_mappings_branch_id_account_id_key',
    ];

    for (const name of possibleNames) {
      try {
        await queryRunner.query(
          `ALTER TABLE "food_platform_store_mappings" DROP CONSTRAINT IF EXISTS "${name}"`
        );
      } catch (e) {
        // Ignore if doesn't exist
      }
    }

    console.log('Removed branchId + accountId unique constraint');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the unique constraint if needed
    await queryRunner.query(`
      ALTER TABLE "food_platform_store_mappings"
      ADD CONSTRAINT "UQ_food_platform_store_mappings_branch_id_account_id"
      UNIQUE ("branch_id", "account_id")
    `);
  }
}
