import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadedFile } from '../../database/entities/uploaded-file.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UploadedFile]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
