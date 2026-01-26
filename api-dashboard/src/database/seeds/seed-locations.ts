import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// API source: https://provinces.open-api.vn/
const API_BASE = 'https://provinces.open-api.vn/api';

interface ProvinceAPI {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  phone_code: number;
  districts?: DistrictAPI[];
}

interface DistrictAPI {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  province_code: number;
  wards?: WardAPI[];
}

interface WardAPI {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  district_code: number;
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function seedLocations() {
  console.log('🚀 Starting location seed for api-dashboard...');
  console.log('📋 Structure: Provinces → Wards (2-level hierarchy)');

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
    // Fetch all provinces with districts and wards
    console.log('📥 Fetching data from provinces.open-api.vn...');
    const provinces = await fetchWithRetry(`${API_BASE}/?depth=3`) as ProvinceAPI[];
    console.log(`📦 Found ${provinces.length} provinces`);

    // Count total wards
    let totalWards = 0;
    for (const province of provinces) {
      if (province.districts) {
        for (const district of province.districts) {
          if (district.wards) {
            totalWards += district.wards.length;
          }
        }
      }
    }
    console.log(`📦 Found ${totalWards} wards to insert`);

    // Clear existing data
    console.log('🗑️  Clearing existing location data...');
    await dataSource.query('DELETE FROM wards');
    await dataSource.query('DELETE FROM provinces');

    // Insert provinces
    console.log('📍 Inserting provinces...');
    for (const province of provinces) {
      await dataSource.query(
        `INSERT INTO provinces (code, name, name_en, full_name, full_name_en, code_name, division_type, phone_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          String(province.code),
          province.name,
          null, // name_en
          province.name,
          null, // full_name_en
          province.codename,
          province.division_type,
          province.phone_code ? String(province.phone_code) : null,
        ]
      );

      // Insert wards directly under province (including district info in the name)
      // This structure maps districts and wards to a flat ward table under provinces
      if (province.districts) {
        for (const district of province.districts) {
          if (district.wards) {
            for (const ward of district.wards) {
              // Create ward with combined info: ward name belongs to district
              const shortCodename = `${district.codename}_${ward.codename}`;
              await dataSource.query(
                `INSERT INTO wards (code, name, name_en, full_name, full_name_en, code_name, division_type, short_codename, province_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  String(ward.code),
                  ward.name,
                  null,
                  `${ward.name}, ${district.name}`, // Full name includes district
                  null,
                  ward.codename,
                  ward.division_type,
                  shortCodename,
                  String(province.code),
                ]
              );
            }
          }
        }
      }
    }

    // Count results
    const provinceCount = await dataSource.query('SELECT COUNT(*) FROM provinces');
    const wardCount = await dataSource.query('SELECT COUNT(*) FROM wards');

    console.log('✅ Seed completed!');
    console.log(`   - Provinces: ${provinceCount[0].count}`);
    console.log(`   - Wards: ${wardCount[0].count}`);

    // Show sample data
    console.log('\n📊 Sample data:');
    const sampleProvince = await dataSource.query('SELECT * FROM provinces LIMIT 1');
    console.log('Province:', sampleProvince[0]);
    const sampleWard = await dataSource.query('SELECT * FROM wards LIMIT 1');
    console.log('Ward:', sampleWard[0]);

  } catch (error) {
    console.error('❌ Error seeding locations:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

seedLocations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
