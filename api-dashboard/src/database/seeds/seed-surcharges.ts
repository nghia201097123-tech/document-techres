import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * Seed surcharges data for development/testing
 * Run with: npx ts-node src/database/seeds/seed-surcharges.ts
 */
async function seedSurcharges() {
  console.log('🚀 Starting surcharges seed...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.CONFIG_POSTGRESQL_HOST_TECHRES || '172.16.10.146',
    port: parseInt(process.env.CONFIG_POSTGRESQL_PORT_TECHRES || '5432'),
    username: process.env.CONFIG_POSTGRESQL_USERNAME_TECHRES || 'techres',
    password: process.env.CONFIG_POSTGRESQL_PASSWORD_TECHRES || 'techres',
    database: process.env.CONFIG_POSTGRESQL_DB_NAME_TECHRES || 'techres',
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  try {
    // Get existing brands to add surcharges
    const brands = await dataSource.query(`
      SELECT id, tenant_id, name FROM brands WHERE is_active = true LIMIT 10
    `);

    if (brands.length === 0) {
      console.log('⚠️  No brands found. Please create brands first.');
      return;
    }

    console.log(`📦 Found ${brands.length} brands`);

    // Common surcharges for restaurants
    const surchargeTemplates = [
      { name: 'Phí đóng gói', description: 'Phí đóng gói mang đi', amount: 5000, vatRate: 10, sortOrder: 1 },
      { name: 'Phí phục vụ', description: 'Phí phục vụ bàn VIP', amount: 10000, vatRate: 10, sortOrder: 2 },
      { name: 'Upsize ly', description: 'Phụ thu upsize ly lớn', amount: 7000, vatRate: 10, sortOrder: 3 },
      { name: 'Thêm đá', description: 'Phụ thu thêm đá riêng', amount: 3000, vatRate: 10, sortOrder: 4 },
      { name: 'Túi giữ nhiệt', description: 'Túi giữ nhiệt cho đồ uống', amount: 15000, vatRate: 10, sortOrder: 5 },
      { name: 'Phí ship nội thành', description: 'Phí giao hàng nội thành', amount: 20000, vatRate: 0, sortOrder: 6 },
      { name: 'Phí ship ngoại thành', description: 'Phí giao hàng ngoại thành', amount: 35000, vatRate: 0, sortOrder: 7 },
    ];

    let insertedCount = 0;

    for (const brand of brands) {
      console.log(`\n📍 Processing brand: ${brand.name} (${brand.id})`);

      // Check if surcharges already exist for this brand
      const existingCount = await dataSource.query(
        `SELECT COUNT(*) FROM surcharges WHERE brand_id = $1`,
        [brand.id]
      );

      if (parseInt(existingCount[0].count) > 0) {
        console.log(`   ⏭️  Surcharges already exist (${existingCount[0].count}), skipping...`);
        continue;
      }

      // Insert surcharges for this brand
      for (const template of surchargeTemplates) {
        await dataSource.query(
          `INSERT INTO surcharges (tenant_id, brand_id, name, description, amount, vat_rate, sort_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
          [
            brand.tenant_id,
            brand.id,
            template.name,
            template.description,
            template.amount,
            template.vatRate,
            template.sortOrder,
          ]
        );
        insertedCount++;
      }

      console.log(`   ✅ Added ${surchargeTemplates.length} surcharges`);
    }

    // Count results
    const totalCount = await dataSource.query('SELECT COUNT(*) FROM surcharges');

    console.log('\n✅ Seed completed!');
    console.log(`   - Total surcharges: ${totalCount[0].count}`);
    console.log(`   - Newly inserted: ${insertedCount}`);

    // Show sample data
    console.log('\n📊 Sample surcharges:');
    const samples = await dataSource.query('SELECT id, name, amount, vat_rate FROM surcharges LIMIT 5');
    for (const s of samples) {
      console.log(`   - ${s.name}: ${s.amount}đ (VAT: ${s.vat_rate}%)`);
    }

  } catch (error) {
    console.error('❌ Error seeding surcharges:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

seedSurcharges()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
