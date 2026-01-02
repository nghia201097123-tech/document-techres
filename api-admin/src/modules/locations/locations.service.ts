import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Province, District, Ward } from '../../database/entities';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
  ) {}

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
