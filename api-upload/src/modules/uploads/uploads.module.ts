import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { MinioService } from './minio.service';
import minioConfig from '../../config/minio.config';

@Module({
  imports: [ConfigModule.forFeature(minioConfig)],
  controllers: [UploadsController],
  providers: [UploadsService, MinioService],
  exports: [UploadsService, MinioService],
})
export class UploadsModule {}
