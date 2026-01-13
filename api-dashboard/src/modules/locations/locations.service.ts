import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Province, Ward } from '../../database/entities';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
  ) {}

  async findAllProvinces() {
    return this.provinceRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findWardsByProvince(provinceCode: string) {
    return this.wardRepository.find({
      where: { provinceCode },
      order: { name: 'ASC' },
    });
  }

  async findAllWards() {
    return this.wardRepository.find({
      order: { provinceCode: 'ASC', name: 'ASC' },
    });
  }
}
