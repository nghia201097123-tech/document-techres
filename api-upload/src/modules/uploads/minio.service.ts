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
    // Read from CONFIG_MINIO_* environment variables (same as other services)
    const endpoint = this.configService.get<string>('CONFIG_MINIO_ENDPOINT', 's3.techres.vn');
    const port = parseInt(this.configService.get<string>('CONFIG_MINIO_PORT', '443'), 10);
    const useSSL = this.configService.get<string>('CONFIG_MINIO_ENABLE_SSL', 'true') === 'true';
    const accessKey = this.configService.get<string>('CONFIG_MINIO_ACCESSKEY', '');
    const secretKey = this.configService.get<string>('CONFIG_MINIO_SECRETKEY', '');

    // Get region from config - required to bypass auto-detection (which causes Access Denied)
    const region = this.configService.get<string>('CONFIG_MINIO_REGION', 'us-east-1');

    this.logger.log(`Connecting to MinIO at ${endpoint}:${port} (SSL: ${useSSL}, Region: ${region})`);

    this.client = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
      region: region,
    });

    this.bucket = this.configService.get<string>('CONFIG_MINIO_BUCKET', 'techres-uploads');
    const protocol = useSSL ? 'https' : 'http';
    this.baseUrl = `${protocol}://${endpoint}/${this.bucket}`;
  }

  async onModuleInit() {
    // Skip bucket check on startup - just log the configuration
    // Bucket operations will be checked when uploading
    this.logger.log(`MinIO configured for bucket: ${this.bucket}`);
    this.logger.log(`Base URL: ${this.baseUrl}`);
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
