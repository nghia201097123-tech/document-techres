import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDriverAvatarColumn1706600000000 implements MigrationInterface {
  name = 'AddDriverAvatarColumn1706600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add driver_avatar column
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      ADD COLUMN IF NOT EXISTS "driver_avatar" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "food_orders"
      DROP COLUMN IF EXISTS "driver_avatar"
    `);
  }
}
