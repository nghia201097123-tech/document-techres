import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import axios from 'axios';

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

async function seedLocations() {
  console.log('🚀 Starting location seed...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'techres_admin',
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  try {
    // Fetch all provinces with districts and wards
    console.log('📥 Fetching data from provinces.open-api.vn...');
    const response = await axios.get<ProvinceAPI[]>(`${API_BASE}/?depth=3`);
    const provinces = response.data;
    console.log(`📦 Found ${provinces.length} provinces`);

    // Clear existing data
    console.log('🗑️  Clearing existing location data...');
    await dataSource.query('DELETE FROM wards');
    await dataSource.query('DELETE FROM districts');
    await dataSource.query('DELETE FROM provinces');

    // Insert provinces
    console.log('📍 Inserting provinces...');
    for (const province of provinces) {
      await dataSource.query(
        `INSERT INTO provinces (code, name, name_en, full_name, full_name_en, code_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          String(province.code),
          province.name,
          null, // name_en
          province.name,
          null, // full_name_en
          province.codename,
        ]
      );

      // Insert districts for this province
      if (province.districts) {
        for (const district of province.districts) {
          await dataSource.query(
            `INSERT INTO districts (code, name, name_en, full_name, full_name_en, code_name, province_code)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              String(district.code),
              district.name,
              null,
              district.name,
              null,
              district.codename,
              String(province.code),
            ]
          );

          // Insert wards for this district
          if (district.wards) {
            for (const ward of district.wards) {
              await dataSource.query(
                `INSERT INTO wards (code, name, name_en, full_name, full_name_en, code_name, district_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  String(ward.code),
                  ward.name,
                  null,
                  ward.name,
                  null,
                  ward.codename,
                  String(district.code),
                ]
              );
            }
          }
        }
      }
    }

    // Count results
    const provinceCount = await dataSource.query('SELECT COUNT(*) FROM provinces');
    const districtCount = await dataSource.query('SELECT COUNT(*) FROM districts');
    const wardCount = await dataSource.query('SELECT COUNT(*) FROM wards');

    console.log('✅ Seed completed!');
    console.log(`   - Provinces: ${provinceCount[0].count}`);
    console.log(`   - Districts: ${districtCount[0].count}`);
    console.log(`   - Wards: ${wardCount[0].count}`);

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
