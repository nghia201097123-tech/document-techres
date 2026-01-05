import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    // Read directly from environment variables
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 's3.techres.vn');
    const port = parseInt(this.configService.get<string>('MINIO_PORT', '443'), 10);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'true') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', '');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', '');

    this.logger.log(`Connecting to MinIO at ${endpoint}:${port} (SSL: ${useSSL})`);

    this.client = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });

    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'techres-uploads');
    const protocol = useSSL ? 'https' : 'http';
    this.baseUrl = `${protocol}://${endpoint}/${this.bucket}`;
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        this.logger.log(`Creating bucket: ${this.bucket}`);
        await this.client.makeBucket(this.bucket, 'us-east-1');

        // Set public read policy
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        };
        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
        this.logger.log(`Bucket ${this.bucket} created with public read policy`);
      } else {
        this.logger.log(`Connected to MinIO. Bucket ${this.bucket} is ready`);
      }
    } catch (error) {
      this.logger.error(`Error connecting to MinIO: ${error.message}`);
      this.logger.warn('Upload service will retry on first upload request');
    }
  }

  getClient(): Minio.Client {
    return this.client;
  }

  getBucket(): string {
    return this.bucket;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Upload file to MinIO
   */
  async uploadFile(
    objectName: string,
    buffer: Buffer,
    size: number,
    contentType: string,
  ): Promise<string> {
    await this.client.putObject(this.bucket, objectName, buffer, size, {
      'Content-Type': contentType,
      'x-amz-acl': 'public-read',
    });

    return `${this.baseUrl}/${objectName}`;
  }

  /**
   * Delete file from MinIO
   */
  async deleteFile(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectName);
  }

  /**
   * Get presigned URL for temporary access
   */
  async getPresignedUrl(objectName: string, expirySeconds: number = 3600): Promise<string> {
    return await this.client.presignedGetObject(this.bucket, objectName, expirySeconds);
  }

  /**
   * Check if file exists
   */
  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, objectName);
      return true;
    } catch {
      return false;
    }
  }
}
