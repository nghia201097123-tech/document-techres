import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as https from 'https';
import * as http from 'http';

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

    this.logger.log(`Connecting to MinIO at ${endpoint}:${port} (SSL: ${useSSL})`);

    // Create custom transport agent to handle SSL
    const transportAgent = useSSL
      ? new https.Agent({ rejectUnauthorized: true })
      : new http.Agent();

    this.client = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
      pathStyle: true,
      transportAgent: transportAgent,
    });

    this.bucket = this.configService.get<string>('CONFIG_MINIO_BUCKET', 'techres-uploads');
    const protocol = useSSL ? 'https' : 'http';
    this.baseUrl = `${protocol}://${endpoint}:${port}/${this.bucket}`;

    this.logger.log(`Bucket: ${this.bucket}`);
    this.logger.log(`Base URL: ${this.baseUrl}`);
  }

  async onModuleInit() {
    // Check if bucket exists, create if not
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        this.logger.log(`Bucket "${this.bucket}" does not exist, creating...`);
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" created successfully`);

        // Set public read policy
        await this.setBucketPublicPolicy();
      } else {
        this.logger.log(`Bucket "${this.bucket}" exists`);
        // Ensure public policy is set
        await this.setBucketPublicPolicy();
      }
    } catch (error: any) {
      this.logger.error(`Failed to check/create bucket: ${error.message}`);
      throw error;
    }
    this.logger.log(`MinIO Service initialized for bucket: ${this.bucket}`);
  }

  /**
   * Set bucket policy to allow public read access
   */
  private async setBucketPublicPolicy(): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };

    try {
      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
      this.logger.log(`Public read policy set for bucket "${this.bucket}"`);
    } catch (error: any) {
      this.logger.warn(`Failed to set bucket policy: ${error.message}`);
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
    try {
      this.logger.log(`Uploading ${objectName} (${size} bytes, ${contentType})`);

      const result = await this.client.putObject(this.bucket, objectName, buffer, size, {
        'Content-Type': contentType,
      });

      this.logger.log(`Upload successful: ${objectName}, ETag: ${result.etag}`);
      return `${this.baseUrl}/${objectName}`;
    } catch (error: any) {
      this.logger.error(`Upload failed for ${objectName}`);
      this.logger.error(`Error: ${error}`);
      this.logger.error(`Error name: ${error.name}`);
      this.logger.error(`Error message: ${error.message}`);
      this.logger.error(`Error code: ${error.code}`);
      this.logger.error(`Error resource: ${error.resource}`);
      this.logger.error(`Error requestId: ${error.requestId}`);

      // Try to get more details
      if (error.cause) {
        this.logger.error(`Error cause: ${error.cause}`);
      }

      throw error;
    }
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
