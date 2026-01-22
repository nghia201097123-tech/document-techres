import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * Seed script to configure PayOS bank account
 *
 * Usage: npx ts-node src/database/seeds/seed-payos-bank.ts
 */
async function seedPayOSBankAccount() {
  console.log('🚀 Starting PayOS bank account seed...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.CONFIG_POSTGRESQL_HOST || '172.16.10.146',
    port: parseInt(process.env.CONFIG_POSTGRESQL_PORT || '5432'),
    username: process.env.CONFIG_POSTGRESQL_USERNAME || 'techres',
    password: process.env.CONFIG_POSTGRESQL_PASSWORD || 'techres',
    database: process.env.CONFIG_POSTGRESQL_DB_NAME || 'techres',
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  try {
    // PayOS credentials
    const payosConfig = {
      paymentPartner: 'payos',
      payosClientId: '309cd981-25b9-4139-91af-ebc55bf6256e',
      payosApiKey: '85fc4cd5-6b4a-4402-ba4d-5ce8a915577b',
      payosChecksumKey: 'c028b7bba18cfe4e7dc5dfb5f4fe80a293776fb396eebb48025e5bcdca18aa9f',
    };

    // Get the first brand to associate with
    const brands = await dataSource.query('SELECT id, tenant_id, name FROM brands LIMIT 1');

    if (brands.length === 0) {
      console.log('⚠️  No brands found. Creating a sample bank account without brand association...');
      console.log('   Please run the system setup first to create brands.');
      return;
    }

    const brand = brands[0];
    console.log(`📍 Using brand: ${brand.name} (${brand.id})`);

    // Check if there's an existing PayOS bank account for this brand
    const existingPayOS = await dataSource.query(
      `SELECT id FROM bank_accounts WHERE brand_id = $1 AND payment_partner = 'payos'`,
      [brand.id]
    );

    if (existingPayOS.length > 0) {
      // Update existing PayOS bank account
      console.log('📝 Updating existing PayOS bank account...');
      await dataSource.query(
        `UPDATE bank_accounts SET
          payos_client_id = $1,
          payos_api_key = $2,
          payos_checksum_key = $3,
          is_active = true,
          updated_at = NOW()
        WHERE id = $4`,
        [
          payosConfig.payosClientId,
          payosConfig.payosApiKey,
          payosConfig.payosChecksumKey,
          existingPayOS[0].id,
        ]
      );
      console.log(`✅ Updated bank account: ${existingPayOS[0].id}`);
    } else {
      // Check if there's any bank account for this brand to update
      const existingBank = await dataSource.query(
        `SELECT id, bank_name, account_number FROM bank_accounts WHERE brand_id = $1 AND is_primary = true LIMIT 1`,
        [brand.id]
      );

      if (existingBank.length > 0) {
        // Update existing primary bank account with PayOS
        console.log(`📝 Adding PayOS to existing bank account: ${existingBank[0].bank_name}...`);
        await dataSource.query(
          `UPDATE bank_accounts SET
            payment_partner = $1,
            payos_client_id = $2,
            payos_api_key = $3,
            payos_checksum_key = $4,
            is_active = true,
            updated_at = NOW()
          WHERE id = $5`,
          [
            payosConfig.paymentPartner,
            payosConfig.payosClientId,
            payosConfig.payosApiKey,
            payosConfig.payosChecksumKey,
            existingBank[0].id,
          ]
        );
        console.log(`✅ Updated bank account: ${existingBank[0].account_number}`);
      } else {
        // Create new bank account with PayOS
        console.log('📝 Creating new bank account with PayOS configuration...');
        await dataSource.query(
          `INSERT INTO bank_accounts (
            tenant_id, brand_id, bank_code, bank_name, account_number, account_name,
            bank_bin, transfer_template, payment_partner,
            payos_client_id, payos_api_key, payos_checksum_key,
            is_primary, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            brand.tenant_id,
            brand.id,
            'VCB',
            'Vietcombank - Ngân hàng TMCP Ngoại Thương Việt Nam',
            '19039164318014',
            'CONG TY TNHH TECHRES',
            '970436',
            'TT {order_code}',
            payosConfig.paymentPartner,
            payosConfig.payosClientId,
            payosConfig.payosApiKey,
            payosConfig.payosChecksumKey,
            true,
            true,
          ]
        );
        console.log('✅ Created new bank account with PayOS configuration');
      }
    }

    // Verify the configuration
    const verifyResult = await dataSource.query(
      `SELECT id, bank_name, account_number, payment_partner, payos_client_id, is_active
       FROM bank_accounts WHERE brand_id = $1 AND payment_partner = 'payos'`,
      [brand.id]
    );

    console.log('\n📊 PayOS Bank Account Configuration:');
    console.log('─'.repeat(50));
    for (const bank of verifyResult) {
      console.log(`   Bank: ${bank.bank_name}`);
      console.log(`   Account: ${bank.account_number}`);
      console.log(`   Payment Partner: ${bank.payment_partner}`);
      console.log(`   Client ID: ${bank.payos_client_id}`);
      console.log(`   Active: ${bank.is_active ? 'Yes' : 'No'}`);
    }
    console.log('─'.repeat(50));

    console.log('\n✅ PayOS bank account seed completed!');
    console.log('   The POS app should now be able to generate PayOS QR codes.');

  } catch (error) {
    console.error('❌ Error seeding PayOS bank account:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

seedPayOSBankAccount()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
