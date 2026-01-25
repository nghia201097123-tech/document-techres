import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExternalMerchantIdToStoreMapping1706300000000 implements MigrationInterface {
  name = 'AddExternalMerchantIdToStoreMapping1706300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add external_merchant_id column to food_platform_store_mappings table
    await queryRunner.addColumn(
      'food_platform_store_mappings',
      new TableColumn({
        name: 'external_merchant_id',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: 'Merchant ID on platform (for BeFood)',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('food_platform_store_mappings', 'external_merchant_id');
  }
}
