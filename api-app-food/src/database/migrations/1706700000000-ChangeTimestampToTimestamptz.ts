import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to change timestamp columns to timestamptz (timestamp with time zone)
 * This ensures proper timezone handling for Vietnam timezone (+0700)
 */
export class ChangeTimestampToTimestamptz1706700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // food_orders table
    await queryRunner.query(`
      ALTER TABLE food_orders
        ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN confirmed_at TYPE timestamptz USING confirmed_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN printed_at TYPE timestamptz USING printed_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN accepted_at TYPE timestamptz USING accepted_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN prepared_at TYPE timestamptz USING prepared_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN cancelled_at TYPE timestamptz USING cancelled_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN platform_created_at TYPE timestamptz USING platform_created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN platform_updated_at TYPE timestamptz USING platform_updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN last_sync_at TYPE timestamptz USING last_sync_at AT TIME ZONE 'Asia/Ho_Chi_Minh'
    `);

    // food_order_items table
    await queryRunner.query(`
      ALTER TABLE food_order_items
        ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh'
    `);

    // food_platform_accounts table
    await queryRunner.query(`
      ALTER TABLE food_platform_accounts
        ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN otp_expires_at TYPE timestamptz USING otp_expires_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN token_expires_at TYPE timestamptz USING token_expires_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN last_poll_at TYPE timestamptz USING last_poll_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN next_poll_at TYPE timestamptz USING next_poll_at AT TIME ZONE 'Asia/Ho_Chi_Minh'
    `);

    // food_platform_store_mappings table
    await queryRunner.query(`
      ALTER TABLE food_platform_store_mappings
        ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN last_synced_at TYPE timestamptz USING last_synced_at AT TIME ZONE 'Asia/Ho_Chi_Minh'
    `);

    // food_platform_external_items table
    await queryRunner.query(`
      ALTER TABLE food_platform_external_items
        ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN synced_at TYPE timestamptz USING synced_at AT TIME ZONE 'Asia/Ho_Chi_Minh'
    `);

    // food_platform_ports table
    await queryRunner.query(`
      ALTER TABLE food_platform_ports
        ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh'
    `);

    // food_platform_product_mappings table
    await queryRunner.query(`
      ALTER TABLE food_platform_product_mappings
        ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh'
    `);

    // food_platform_item_mappings table
    await queryRunner.query(`
      ALTER TABLE food_platform_item_mappings
        ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
        ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // food_orders table - revert to timestamp without timezone
    await queryRunner.query(`
      ALTER TABLE food_orders
        ALTER COLUMN created_at TYPE timestamp,
        ALTER COLUMN updated_at TYPE timestamp,
        ALTER COLUMN confirmed_at TYPE timestamp,
        ALTER COLUMN printed_at TYPE timestamp,
        ALTER COLUMN accepted_at TYPE timestamp,
        ALTER COLUMN prepared_at TYPE timestamp,
        ALTER COLUMN completed_at TYPE timestamp,
        ALTER COLUMN cancelled_at TYPE timestamp,
        ALTER COLUMN platform_created_at TYPE timestamp,
        ALTER COLUMN platform_updated_at TYPE timestamp,
        ALTER COLUMN last_sync_at TYPE timestamp
    `);

    // food_order_items table
    await queryRunner.query(`
      ALTER TABLE food_order_items
        ALTER COLUMN created_at TYPE timestamp,
        ALTER COLUMN updated_at TYPE timestamp
    `);

    // food_platform_accounts table
    await queryRunner.query(`
      ALTER TABLE food_platform_accounts
        ALTER COLUMN created_at TYPE timestamp,
        ALTER COLUMN updated_at TYPE timestamp,
        ALTER COLUMN otp_expires_at TYPE timestamp,
        ALTER COLUMN token_expires_at TYPE timestamp,
        ALTER COLUMN last_poll_at TYPE timestamp,
        ALTER COLUMN next_poll_at TYPE timestamp
    `);

    // food_platform_store_mappings table
    await queryRunner.query(`
      ALTER TABLE food_platform_store_mappings
        ALTER COLUMN created_at TYPE timestamp,
        ALTER COLUMN updated_at TYPE timestamp,
        ALTER COLUMN last_synced_at TYPE timestamp
    `);

    // food_platform_external_items table
    await queryRunner.query(`
      ALTER TABLE food_platform_external_items
        ALTER COLUMN created_at TYPE timestamp,
        ALTER COLUMN updated_at TYPE timestamp,
        ALTER COLUMN synced_at TYPE timestamp
    `);

    // food_platform_ports table
    await queryRunner.query(`
      ALTER TABLE food_platform_ports
        ALTER COLUMN created_at TYPE timestamp,
        ALTER COLUMN updated_at TYPE timestamp
    `);

    // food_platform_product_mappings table
    await queryRunner.query(`
      ALTER TABLE food_platform_product_mappings
        ALTER COLUMN created_at TYPE timestamp,
        ALTER COLUMN updated_at TYPE timestamp
    `);

    // food_platform_item_mappings table
    await queryRunner.query(`
      ALTER TABLE food_platform_item_mappings
        ALTER COLUMN created_at TYPE timestamp,
        ALTER COLUMN updated_at TYPE timestamp
    `);
  }
}
