import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../../database/entities';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  async findAll(tenantId: string) {
    return this.staffRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.staffRepository.findOne({
      where: { tenantId, id },
    });
  }
}
