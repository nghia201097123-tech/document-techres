import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../../database/entities';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  async findAll(tenantId: string) {
    return this.brandRepository.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });
  }
}
