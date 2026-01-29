import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to increase phone column sizes
 *
 * Some platform phone numbers can be longer than 20 chars
 * e.g., "0936677676_1681365268212_R" from Grab API
 */
export class IncreasePhoneColumnSize1707000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Increase customer_phone from varchar(20) to varchar(50)
    await queryRunner.query(`
      ALTER TABLE food_orders
      ALTER COLUMN customer_phone TYPE varchar(50)
    `);

    // Increase driver_phone from varchar(20) to varchar(50)
    await queryRunner.query(`
      ALTER TABLE food_orders
      ALTER COLUMN driver_phone TYPE varchar(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert customer_phone to varchar(20) - may truncate data
    await queryRunner.query(`
      ALTER TABLE food_orders
      ALTER COLUMN customer_phone TYPE varchar(20)
    `);

    // Revert driver_phone to varchar(20) - may truncate data
    await queryRunner.query(`
      ALTER TABLE food_orders
      ALTER COLUMN driver_phone TYPE varchar(20)
    `);
  }
}
