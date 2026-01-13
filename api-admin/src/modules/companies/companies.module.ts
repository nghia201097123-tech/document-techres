import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company, Brand, Branch, Department, Staff } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Brand, Branch, Department, Staff]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
