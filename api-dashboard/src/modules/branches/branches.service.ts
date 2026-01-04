import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../database/entities';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async findAll(tenantId: string, brandId?: string) {
    const where: any = { tenantId, isActive: true };
    if (brandId) {
      where.brandId = brandId;
    }
    return this.branchRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }
}
