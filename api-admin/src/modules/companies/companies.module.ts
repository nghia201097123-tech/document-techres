import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company, Brand, Branch, Staff } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Brand, Branch, Staff])],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
