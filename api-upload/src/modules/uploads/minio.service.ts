import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: S3Client;
  private bucket: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    // Read from CONFIG_MINIO_* environment variables (same as other services)
    const endpoint = this.configService.get<string>('CONFIG_MINIO_ENDPOINT', 's3.techres.vn');
    const port = parseInt(this.configService.get<string>('CONFIG_MINIO_PORT', '443'), 10);
    const useSSL = this.configService.get<string>('CONFIG_MINIO_ENABLE_SSL', 'true') === 'true';
    const accessKey = this.configService.get<string>('CONFIG_MINIO_ACCESSKEY', '');
    const secretKey = this.configService.get<string>('CONFIG_MINIO_SECRETKEY', '');
    const region = this.configService.get<string>('CONFIG_MINIO_REGION', 'us-east-1');

    const protocol = useSSL ? 'https' : 'http';
    const endpointUrl = port === 443 || port === 80
      ? `${protocol}://${endpoint}`
      : `${protocol}://${endpoint}:${port}`;

    this.logger.log(`Connecting to S3 at ${endpointUrl} (Region: ${region})`);

    this.client = new S3Client({
      endpoint: endpointUrl,
      region: region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Required for S3-compatible services like MinIO
    });

    this.bucket = this.configService.get<string>('CONFIG_MINIO_BUCKET', 'techres-uploads');
    this.baseUrl = `${protocol}://${endpoint}/${this.bucket}`;

    this.logger.log(`Bucket: ${this.bucket}`);
    this.logger.log(`Base URL: ${this.baseUrl}`);
  }

  async onModuleInit() {
    this.logger.log(`S3 Service initialized for bucket: ${this.bucket}`);
  }

  getClient(): S3Client {
    return this.client;
  }

  getBucket(): string {
    return this.bucket;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Upload file to S3/MinIO
   */
  async uploadFile(
    objectName: string,
    buffer: Buffer,
    size: number,
    contentType: string,
  ): Promise<string> {
    try {
      this.logger.log(`Uploading ${objectName} (${size} bytes, ${contentType})`);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectName,
        Body: buffer,
        ContentType: contentType,
        ContentLength: size,
      });

      const result = await this.client.send(command);
      this.logger.log(`Upload successful: ${objectName}, ETag: ${result.ETag}`);

      return `${this.baseUrl}/${objectName}`;
    } catch (error: any) {
      this.logger.error(`Upload failed for ${objectName}`);
      this.logger.error(`Error name: ${error.name}`);
      this.logger.error(`Error message: ${error.message}`);
      this.logger.error(`Error code: ${error.Code || error.$metadata?.httpStatusCode}`);
      if (error.$metadata) {
        this.logger.error(`HTTP Status: ${error.$metadata.httpStatusCode}`);
        this.logger.error(`Request ID: ${error.$metadata.requestId}`);
      }
      throw error;
    }
  }

  /**
   * Delete file from S3/MinIO
   */
  async deleteFile(objectName: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: objectName,
    });
    await this.client.send(command);
  }

  /**
   * Get presigned URL for temporary access
   */
  async getPresignedUrl(objectName: string, expirySeconds: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectName,
    });
    return await getSignedUrl(this.client, command, { expiresIn: expirySeconds });
  }

  /**
   * Check if file exists
   */
  async fileExists(objectName: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: objectName,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
