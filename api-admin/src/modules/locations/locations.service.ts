import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Province, Ward } from '../../database/entities';
import axios from 'axios';

/**
 * Dữ liệu từ GitHub: sunshine-tech/VietnamProvinces
 * Cập nhật theo Quyết định 19/2025/QĐ-TTg (34 tỉnh sau sáp nhập 07/2025)
 * Cấu trúc 2 cấp: Tỉnh/Thành phố → Xã/Phường
 */
const DATA_URL = 'https://raw.githubusercontent.com/sunshine-tech/VietnamProvinces/main/vietnam_provinces/data/nested-divisions.json';

interface ProvinceAPI {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  phone_code: number;
  wards?: WardAPI[];
}

interface WardAPI {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  short_codename: string;
}

/**
 * Build full name with division type prefix
 * Ví dụ: "thành phố trung ương" + "Hồ Chí Minh" => "Thành phố Hồ Chí Minh"
 */
function buildFullName(divisionType: string, name: string): string {
  // Map division_type to proper prefix
  const prefixMap: Record<string, string> = {
    'thành phố trung ương': 'Thành phố',
    'tỉnh': 'Tỉnh',
    'phường': 'Phường',
    'xã': 'Xã',
    'thị trấn': 'Thị trấn',
  };

  const prefix = prefixMap[divisionType?.toLowerCase()] || '';
  if (prefix) {
    return `${prefix} ${name}`;
  }
  return name;
}

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Import dữ liệu địa chỉ hành chính Việt Nam sau sáp nhập 07/2025
   * Nguồn: GitHub sunshine-tech/VietnamProvinces
   * Cấu trúc: 34 tỉnh/thành phố → xã/phường (không còn cấp quận/huyện)
   */
  async seedFromAPI(): Promise<{ provinces: number; wards: number }> {
    this.logger.log('Starting location seed from API (post 07/2025 merger)...');

    // Fetch all provinces with wards
    const response = await axios.get<ProvinceAPI[]>(DATA_URL);
    const provinces = response.data;
    this.logger.log(`Found ${provinces.length} provinces (post-merger)`);

    // Use transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Clear existing data
      await queryRunner.query('DELETE FROM wards');
      await queryRunner.query('DELETE FROM provinces');
      // Drop districts table if exists (legacy)
      await queryRunner.query('DROP TABLE IF EXISTS districts CASCADE');
      this.logger.log('Cleared existing location data');

      let wardCount = 0;

      // Insert provinces
      for (const province of provinces) {
        // Build full_name with division_type prefix
        // Ví dụ: "thành phố trung ương" + "Hồ Chí Minh" => "Thành phố Hồ Chí Minh"
        const provinceFullName = buildFullName(province.division_type, province.name);

        await queryRunner.query(
          `INSERT INTO provinces (code, name, full_name, code_name, division_type, phone_code)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            String(province.code),
            province.name,
            provinceFullName,
            province.codename,
            province.division_type,
            province.phone_code,
          ]
        );

        // Insert wards (directly under province, no district level)
        if (province.wards) {
          for (const ward of province.wards) {
            // Build full_name with division_type prefix
            // Ví dụ: "phường" + "Bến Nghé" => "Phường Bến Nghé"
            const wardFullName = buildFullName(ward.division_type, ward.name);

            await queryRunner.query(
              `INSERT INTO wards (code, name, full_name, code_name, division_type, short_codename, province_code)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                String(ward.code),
                ward.name,
                wardFullName,
                ward.codename,
                ward.division_type,
                ward.short_codename,
                String(province.code),
              ]
            );
            wardCount++;
          }
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Seed completed: ${provinces.length} provinces, ${wardCount} wards`);

      return {
        provinces: provinces.length,
        wards: wardCount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error seeding locations:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lấy danh sách tỉnh/thành phố (34 tỉnh sau sáp nhập)
   */
  async getProvinces(): Promise<Province[]> {
    return this.provinceRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Lấy danh sách xã/phường theo tỉnh
   * Sau sáp nhập 07/2025, xã/phường thuộc trực tiếp tỉnh/thành phố
   */
  async getWards(provinceCode: string): Promise<Ward[]> {
    return this.wardRepository.find({
      where: { provinceCode },
      order: { name: 'ASC' },
    });
  }

  async getProvinceByCode(code: string): Promise<Province | null> {
    return this.provinceRepository.findOne({ where: { code } });
  }

  async getWardByCode(code: string): Promise<Ward | null> {
    return this.wardRepository.findOne({ where: { code } });
  }
}
