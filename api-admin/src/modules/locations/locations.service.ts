import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Province, District, Ward } from '../../database/entities';
import axios from 'axios';

interface ProvinceAPI {
  code: number;
  name: string;
  codename: string;
  districts?: DistrictAPI[];
}

interface DistrictAPI {
  code: number;
  name: string;
  codename: string;
  wards?: WardAPI[];
}

interface WardAPI {
  code: number;
  name: string;
  codename: string;
}

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Import dữ liệu địa chỉ hành chính Việt Nam từ API công khai
   */
  async seedFromAPI(): Promise<{ provinces: number; districts: number; wards: number }> {
    this.logger.log('Starting location seed from API...');

    // Fetch all provinces with districts and wards
    const response = await axios.get<ProvinceAPI[]>('https://provinces.open-api.vn/api/?depth=3');
    const provinces = response.data;
    this.logger.log(`Found ${provinces.length} provinces`);

    // Use transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Clear existing data
      await queryRunner.query('DELETE FROM wards');
      await queryRunner.query('DELETE FROM districts');
      await queryRunner.query('DELETE FROM provinces');
      this.logger.log('Cleared existing location data');

      let districtCount = 0;
      let wardCount = 0;

      // Insert provinces
      for (const province of provinces) {
        await queryRunner.query(
          `INSERT INTO provinces (code, name, full_name, code_name)
           VALUES ($1, $2, $3, $4)`,
          [String(province.code), province.name, province.name, province.codename]
        );

        // Insert districts
        if (province.districts) {
          for (const district of province.districts) {
            await queryRunner.query(
              `INSERT INTO districts (code, name, full_name, code_name, province_code)
               VALUES ($1, $2, $3, $4, $5)`,
              [String(district.code), district.name, district.name, district.codename, String(province.code)]
            );
            districtCount++;

            // Insert wards
            if (district.wards) {
              for (const ward of district.wards) {
                await queryRunner.query(
                  `INSERT INTO wards (code, name, full_name, code_name, district_code)
                   VALUES ($1, $2, $3, $4, $5)`,
                  [String(ward.code), ward.name, ward.name, ward.codename, String(district.code)]
                );
                wardCount++;
              }
            }
          }
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Seed completed: ${provinces.length} provinces, ${districtCount} districts, ${wardCount} wards`);

      return {
        provinces: provinces.length,
        districts: districtCount,
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

  async getProvinces(): Promise<Province[]> {
    return this.provinceRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getDistricts(provinceCode: string): Promise<District[]> {
    return this.districtRepository.find({
      where: { provinceCode },
      order: { name: 'ASC' },
    });
  }

  async getWards(districtCode: string): Promise<Ward[]> {
    return this.wardRepository.find({
      where: { districtCode },
      order: { name: 'ASC' },
    });
  }

  async getProvinceByCode(code: string): Promise<Province | null> {
    return this.provinceRepository.findOne({ where: { code } });
  }

  async getDistrictByCode(code: string): Promise<District | null> {
    return this.districtRepository.findOne({ where: { code } });
  }

  async getWardByCode(code: string): Promise<Ward | null> {
    return this.wardRepository.findOne({ where: { code } });
  }
}
