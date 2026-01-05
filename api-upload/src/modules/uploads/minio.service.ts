import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    // Read from CONFIG_MINIO_* environment variables (same as other services)
    const endpoint = this.configService.get<string>(
      "CONFIG_MINIO_ENDPOINT",
      "s3.techres.vn"
    );
    const port = parseInt(
      this.configService.get<string>("CONFIG_MINIO_PORT", "443"),
      10
    );
    const useSSL =
      this.configService.get<string>("CONFIG_MINIO_ENABLE_SSL", "true") ===
      "true";
    const accessKey = this.configService.get<string>(
      "CONFIG_MINIO_ACCESSKEY",
      ""
    );
    const secretKey = this.configService.get<string>(
      "CONFIG_MINIO_SECRETKEY",
      ""
    );

    console.log("accessKey", accessKey);
    console.log("secretKey", secretKey);
    console.log("endpoint", endpoint);
    console.log("port", port);
    console.log("useSSL", useSSL);

    // Get region from config - required to bypass auto-detection (which causes Access Denied)
    const region = this.configService.get<string>(
      "CONFIG_MINIO_REGION",
      "us-east-1"
    );

    this.logger.log(
      `Connecting to MinIO at ${endpoint}:${port} (SSL: ${useSSL}, Region: ${region})`
    );

    // Don't specify port when using default HTTPS port (443)
    const clientConfig: Minio.ClientOptions = {
      endPoint: endpoint,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
      region: region,
      pathStyle: true, // Use path-style URLs instead of virtual-hosted style
    };

    // Only add port if it's not the default for the protocol
    if ((useSSL && port !== 443) || (!useSSL && port !== 80)) {
      clientConfig.port = port;
    }

    this.logger.log(
      `Client config: ${JSON.stringify({ ...clientConfig, accessKey: "***", secretKey: "***" })}`
    );

    this.client = new Minio.Client(clientConfig);

    this.bucket = this.configService.get<string>(
      "CONFIG_MINIO_BUCKET",
      "techres-uploads"
    );
    const protocol = useSSL ? "https" : "http";
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
    contentType: string
  ): Promise<string> {
    try {
      this.logger.log(
        `Uploading ${objectName} (${size} bytes, ${contentType})`
      );
      await this.client.putObject(this.bucket, objectName, buffer, size, {
        "Content-Type": contentType,
      });
      this.logger.log(`Upload successful: ${objectName}`);
      return `${this.baseUrl}/${objectName}`;
    } catch (error: any) {
      this.logger.error(`Upload failed for ${objectName}`);
      this.logger.error(
        `Full error: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`
      );
      this.logger.error(`Error name: ${error.name}`);
      this.logger.error(`Error code: ${error.code}`);
      this.logger.error(`Error message: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      // Log all enumerable properties
      for (const key of Object.keys(error)) {
        this.logger.error(`Error.${key}: ${JSON.stringify(error[key])}`);
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
  async getPresignedUrl(
    objectName: string,
    expirySeconds: number = 3600
  ): Promise<string> {
    return await this.client.presignedGetObject(
      this.bucket,
      objectName,
      expirySeconds
    );
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
